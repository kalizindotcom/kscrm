/**
 * Campaign Worker
 * ─────────────────
 * Serviço in-process responsável por disparar campanhas respeitando:
 *  - intervalo/jitter configurado na campanha
 *  - pausar/retomar/cancelar
 *  - crash-recovery (retoma campaigns com status='running' ao iniciar o processo)
 *  - window de horário (windowStart/windowEnd — ex: "09:00".."18:00")
 *  - agendamento (scheduledAt no futuro → aguarda tick)
 *  - interpolação de variáveis + spintax
 *  - envio de mídia (image/video/audio/document)
 *
 * Cada campanha em execução tem um "controller" em memória com {status, cancelled}.
 * O target nunca é removido ao cancelar — ficam pending e podem ser retomados.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { prisma } from '../../db/client.js';
import { env } from '../../config/env.js';
import { emitTo } from '../../ws/index.js';
import { logger } from '../../lib/logger.js';
import * as baileys from '../../providers/baileys/manager.js';
import { interpolate } from './interpolate.js';

type ControllerState = 'running' | 'pausing' | 'paused' | 'stopping';

interface Controller {
  campaignId: string;
  state: ControllerState;
  /** Resolved when worker loop exits */
  done: Promise<void>;
}

const controllers = new Map<string, Controller>();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Returns true if campaign is currently being processed by an in-memory worker. */
export function isActive(campaignId: string): boolean {
  return controllers.has(campaignId);
}

/** Total number of campaigns currently being processed in this node. */
export function activeCount(): number {
  return controllers.size;
}

/**
 * Request a pause: worker will stop after the current target,
 * mark campaign as 'paused', and release the controller.
 */
export function pauseCampaign(campaignId: string): boolean {
  const c = controllers.get(campaignId);
  if (!c) return false;
  if (c.state === 'running') c.state = 'pausing';
  return true;
}

/**
 * Pause all active workers and wait for them to finish their current target.
 * Used during graceful shutdown. Workers transition to 'paused' in DB.
 */
export async function pauseAllActive(): Promise<void> {
  const all = [...controllers.values()];
  if (all.length === 0) return;

  logger.info({ count: all.length }, 'Graceful shutdown: pausing active campaign workers');
  for (const c of all) {
    if (c.state === 'running') c.state = 'pausing';
  }
  // Wait for all workers to reach their end-of-loop (drain)
  await Promise.allSettled(all.map((c) => c.done));
}

/**
 * Request a cancellation: worker will stop after the current target,
 * mark campaign as 'cancelled', and release the controller.
 */
export function cancelCampaign(campaignId: string): boolean {
  const c = controllers.get(campaignId);
  if (!c) return false;
  c.state = 'stopping';
  return true;
}

/**
 * Start (or resume) a campaign. If already running, returns the existing controller.
 * Must have at least 1 pending target.
 */
export async function startCampaign(campaignId: string): Promise<void> {
  if (controllers.has(campaignId)) return; // already running

  const camp = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!camp) throw new Error('Campanha não encontrada');
  if (!camp.sessionId) throw new Error('Campanha sem sessão atribuída');

  const pending = await prisma.campaignTarget.count({
    where: { campaignId, status: { in: ['pending', 'sending'] } },
  });
  if (pending === 0) throw new Error('Nenhum destinatário pendente para disparo');

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: 'running',
      startedAt: new Date(), // Always reset to current time when starting a new fire
      finishedAt: null,
    },
  });

  const controller: Controller = {
    campaignId,
    state: 'running',
    done: Promise.resolve(),
  };
  controller.done = runLoop(controller).catch((err) => {
    logger.error({ err, campaignId }, 'campaign worker crashed');
  });

  controllers.set(campaignId, controller);

  // Emit an immediate progress event so the UI leaves the "Iniciando..." state
  // as soon as the worker is scheduled (before the first target completes).
  emitCurrentProgress(campaignId).catch(() => undefined);
}

// ─────────────────────────────────────────────────────────────────────────────

async function runLoop(controller: Controller): Promise<void> {
  const { campaignId } = controller;

  try {
    while (controller.state === 'running') {
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign) break;

      // Respect sending window (windowStart/windowEnd "HH:mm" — UTC by default).
      if (!isWithinWindow(campaign.windowStart, campaign.windowEnd)) {
        emitProgress(campaignId, { waiting: 'Fora da janela de envio — aguardando' });
        await sleep(30_000);
        continue;
      }

      // Claim next pending target atomically (avoids double-processing if 2 workers race).
      const target = await claimNextTarget(campaignId);
      if (!target) break; // no more pending targets

      const phone = target.phone.replace(/\D/g, '');
      const baseVariables = (target.variables as Record<string, unknown> | null) ?? {};
      const variables: Record<string, unknown> = {
        ...baseVariables,
        nome: (baseVariables as any).nome ?? target.name ?? 'amigo(a)',
        name: (baseVariables as any).name ?? target.name ?? 'amigo(a)',
        primeiro_nome: firstName(target.name ?? (baseVariables as any).nome),
        telefone: phone,
      };

      try {
        // Session sanity: abort loop if session dropped
        if (!baileys.get(campaign.sessionId!)) {
          // Mark current target as pending again (not failed) so it can be retried
          await prisma.campaignTarget.update({
            where: { id: target.id },
            data: { status: 'pending', claimedAt: null },
          });
          await finalizeCampaign(campaignId, 'paused');
          emitProgress(campaignId, { error: 'Sessão desconectada — campanha pausada automaticamente' });
          await writeLog(campaignId, 'Sessão desconectada durante disparo. Use "Retomar" para continuar de onde parou.');
          return;
        }

        // Interpolate message & optional caption
        const text = interpolate(campaign.messageContent ?? '', variables);
        const caption = campaign.mediaCaption
          ? interpolate(campaign.mediaCaption, variables)
          : text;

        // Send: mídia (se houver) OU botões OU texto
        let result: any;
        if (campaign.mediaUrl && campaign.mediaType && campaign.mediaType !== 'none') {
          const buffer = await loadMediaBuffer(campaign.mediaUrl);
          result = await baileys.sendMedia(
            campaign.sessionId!,
            phone,
            {
              buffer,
              mimetype: campaign.mediaMimetype ?? guessMime(campaign.mediaType),
              caption: text ? caption : undefined,
              type: campaign.mediaType as 'image' | 'video' | 'audio' | 'document',
              filename: campaign.mediaFilename ?? undefined,
            },
            { applyDelay: false },
          );
        } else if (
          campaign.buttonsEnabled &&
          Array.isArray(campaign.buttonsJson) &&
          (campaign.buttonsJson as any[]).length > 0
        ) {
          result = await baileys.sendButtons(
            campaign.sessionId!,
            phone,
            {
              text,
              buttons: campaign.buttonsJson as any,
            },
            { applyDelay: false },
          );
        } else {
          result = await baileys.sendText(campaign.sessionId!, phone, text, { applyDelay: false });
        }

        const waMessageId = result?.key?.id ?? null;
        await prisma.campaignTarget.update({
          where: { id: target.id },
          data: {
            status: 'sent',
            processedAt: new Date(),
            attempts: { increment: 1 },
            waMessageId,
            error: null,
          },
        });

        await prisma.campaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        });
      } catch (err: any) {
        logger.warn({ err, campaignId, phone }, 'campaign target failed');
        await prisma.campaignTarget.update({
          where: { id: target.id },
          data: {
            status: 'failed',
            processedAt: new Date(),
            attempts: { increment: 1 },
            error: String(err?.message ?? err).slice(0, 500),
          },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }

      // Emit progress (counts reflect all-time, not just this run)
      await emitCurrentProgress(campaignId, phone);

      // Inter-message jitter delay
      if (controller.state === 'running') {
        const wait = computeJitterDelay(campaign.intervalSec, campaign.jitterPct);
        await interruptibleSleep(wait, controller);
      }
    }

    // Exit reasons
    if (controller.state === 'stopping') {
      await finalizeCampaign(campaignId, 'cancelled');
      emitProgress(campaignId, { stopped: true });
    } else if (controller.state === 'pausing') {
      await finalizeCampaign(campaignId, 'paused');
      emitProgress(campaignId, { paused: true });
    } else {
      // Natural end — no more pending targets
      const remaining = await prisma.campaignTarget.count({
        where: { campaignId, status: { in: ['pending', 'sending'] } },
      });
      if (remaining === 0) {
        await finalizeCampaign(campaignId, 'completed');
        emitProgress(campaignId, { completed: true });
      } else {
        await finalizeCampaign(campaignId, 'paused');
      }
    }
  } finally {
    controllers.delete(campaignId);
  }
}

async function claimNextTarget(campaignId: string) {
  // Improved atomic claim with retry logic
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const next = await prisma.campaignTarget.findFirst({
      where: { campaignId, status: 'pending' },
      orderBy: { id: 'asc' },
    });
    if (!next) return null;

    // Conditional update - only succeeds if status is still 'pending'
    const claim = await prisma.campaignTarget.updateMany({
      where: {
        id: next.id,
        status: 'pending',
        // Additional safety: ensure not claimed recently (prevents race with multiple workers)
        OR: [
          { claimedAt: null },
          { claimedAt: { lt: new Date(Date.now() - 60000) } } // older than 1 min
        ]
      },
      data: { status: 'sending', claimedAt: new Date() },
    });

    if (claim.count > 0) return next; // Successfully claimed
    // Someone else claimed it, retry with next target
  }
  return null; // All retries exhausted
}

async function markTargetFailed(targetId: string, message: string) {
  await prisma.campaignTarget.update({
    where: { id: targetId },
    data: {
      status: 'failed',
      claimedAt: null,
      error: message.slice(0, 500)
    },
  });
}

async function writeLog(campaignId: string, message: string) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { sessionId: true }
    });
    if (campaign?.sessionId) {
      await prisma.sessionLog.create({
        data: {
          sessionId: campaign.sessionId,
          severity: 'warning',
          message,
          type: 'campaign',
          origin: 'worker'
        }
      });
    }
  } catch (err) {
    logger.warn({ err, campaignId }, 'failed to write campaign log');
  }
}

async function finalizeCampaign(campaignId: string, status: string) {
  const finishedAt =
    status === 'completed' || status === 'cancelled' || status === 'failed'
      ? new Date()
      : undefined;

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status,
      finishedAt,
    },
  });

  // Emit campaign.completed for terminal states so the UI can show a summary modal
  if (status === 'completed' || status === 'cancelled' || status === 'paused' || status === 'failed') {
    const counts = await prisma.campaignTarget.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { _all: true },
    });
    const total = counts.reduce((a, b) => a + (b._count?._all ?? 0), 0);
    const sent = counts.find((c) => c.status === 'sent')?._count?._all ?? 0;
    const delivered = counts.find((c) => c.status === 'delivered')?._count?._all ?? 0;
    const failed = counts.find((c) => c.status === 'failed')?._count?._all ?? 0;
    const skipped = counts.find((c) => c.status === 'skipped')?._count?._all ?? 0;
    const startedAt = updated.startedAt ?? null;
    const finishedAtOut = updated.finishedAt ?? finishedAt ?? null;
    const durationMs =
      startedAt && finishedAtOut
        ? new Date(finishedAtOut).getTime() - new Date(startedAt).getTime()
        : 0;

    emitTo(`campaign:${campaignId}`, {
      type: 'campaign.completed',
      campaignId,
      status: status as 'completed' | 'cancelled' | 'paused' | 'failed',
      sent: sent + delivered,
      failed,
      skipped,
      total,
      durationMs,
      startedAt: startedAt ? new Date(startedAt).toISOString() : null,
      finishedAt: finishedAtOut ? new Date(finishedAtOut).toISOString() : null,
    });
  }
}

/**
 * Reset all non-pending targets back to pending and zero out campaign counters,
 * so that a terminated campaign can be fired again.
 */
export async function resetCampaignTargets(campaignId: string): Promise<number> {
  // Stop worker if somehow running
  const active = controllers.get(campaignId);
  if (active) {
    active.state = 'stopping';
    try {
      await active.done;
    } catch {
      // ignore
    }
  }

  const { count } = await prisma.campaignTarget.updateMany({
    where: { campaignId, status: { not: 'pending' } },
    data: {
      status: 'pending',
      claimedAt: null,
      processedAt: null,
      error: null,
      waMessageId: null,
      attempts: 0,
    },
  });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      sentCount: 0,
      failedCount: 0,
      deliveredCount: 0,
      responseCount: 0,
      startedAt: null,
      finishedAt: null,
      status: 'draft',
    },
  });

  return count;
}

async function emitCurrentProgress(campaignId: string, currentTarget?: string) {
  const [camp, counts] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId } }),
    prisma.campaignTarget.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { _all: true },
    }),
  ]);
  if (!camp) return;

  const total = counts.reduce((a, b) => a + (b._count?._all ?? 0), 0);
  const sent = counts.find((c) => c.status === 'sent')?._count?._all ?? 0;
  const delivered = counts.find((c) => c.status === 'delivered')?._count?._all ?? 0;
  const failed = counts.find((c) => c.status === 'failed')?._count?._all ?? 0;
  const skipped = counts.find((c) => c.status === 'skipped')?._count?._all ?? 0;
  const processed = sent + delivered + failed + skipped;
  const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

  emitTo(`campaign:${campaignId}`, {
    type: 'campaign.progress',
    campaignId,
    progress,
    currentTarget,
    sent: sent + delivered,
    failed,
    total,
  });
}

function emitProgress(campaignId: string, extra: Record<string, unknown>) {
  emitTo(`campaign:${campaignId}`, {
    type: 'campaign.progress',
    campaignId,
    progress: 0,
    sent: 0,
    failed: 0,
    ...extra,
  } as any);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeJitterDelay(intervalSec: number, jitterPct: number): number {
  const base = Math.max(1, intervalSec) * 1000;
  const pct = Math.min(80, Math.max(0, jitterPct)) / 100;
  const delta = base * pct;
  const min = Math.max(500, base - delta);
  const max = base + delta;
  return Math.floor(min + Math.random() * (max - min));
}

async function interruptibleSleep(ms: number, controller: Controller): Promise<void> {
  const step = 250;
  let waited = 0;
  while (waited < ms && controller.state === 'running') {
    await sleep(Math.min(step, ms - waited));
    waited += step;
  }
}

function isWithinWindow(startHHMM: string | null | undefined, endHHMM: string | null | undefined): boolean {
  if (!startHHMM || !endHHMM) return true;
  const start = parseHHMM(startHHMM);
  const end = parseHHMM(endHHMM);
  if (start === null || end === null) return true;

  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  if (start === end) return true;
  if (start < end) return cur >= start && cur < end;
  // window crosses midnight
  return cur >= start || cur < end;
}

function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return h * 60 + mi;
}

function firstName(full?: string | null): string {
  if (!full) return 'amigo(a)';
  const t = full.trim().split(/\s+/)[0];
  return t ? t : 'amigo(a)';
}

async function loadMediaBuffer(mediaUrl: string): Promise<Buffer> {
  try {
    // Local uploaded file (/uploads/xxx.ext)
    if (mediaUrl.startsWith('/uploads/')) {
      const fileName = mediaUrl.replace(/^\/uploads\//, '');
      const full = path.resolve(env.UPLOAD_DIR, fileName);
      return await fs.readFile(full);
    }
    if (/^https?:\/\//i.test(mediaUrl)) {
      const res = await fetch(mediaUrl);
      if (!res.ok) throw new Error(`Falha ao baixar mídia (HTTP ${res.status})`);
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    }
    // Assume local path
    const full = path.isAbsolute(mediaUrl)
      ? mediaUrl
      : path.resolve(env.UPLOAD_DIR, mediaUrl);
    return await fs.readFile(full);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      throw new Error(
        `Arquivo de mídia não encontrado no servidor (${mediaUrl}). Reanexe a mídia na campanha.`,
      );
    }
    throw new Error(`Falha ao carregar mídia: ${err?.message ?? err}`);
  }
}

function guessMime(type: string): string {
  switch (type) {
    case 'image':
      return 'image/jpeg';
    case 'video':
      return 'video/mp4';
    case 'audio':
      return 'audio/ogg';
    case 'document':
      return 'application/octet-stream';
    default:
      return 'application/octet-stream';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Boot-time recovery & scheduler tick
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called on server boot. For any campaign stuck in status='running', we reset
 * any 'sending' targets back to 'pending' (they were claimed but never finished)
 * and auto-resume the worker. Also picks up 'scheduled' campaigns whose
 * scheduledAt is in the past.
 */
export async function recoverAndSchedule(): Promise<void> {
  // 1. Unstick orphaned 'sending' targets
  await prisma.campaignTarget.updateMany({
    where: { status: 'sending' },
    data: { status: 'pending', claimedAt: null },
  });

  // 2. Resume any 'running' campaigns
  const running = await prisma.campaign.findMany({
    where: { status: 'running' },
    select: { id: true },
  });
  for (const r of running) {
    try {
      await startCampaign(r.id);
    } catch (err) {
      logger.warn({ err, campaignId: r.id }, 'failed to resume running campaign');
      await prisma.campaign.update({ where: { id: r.id }, data: { status: 'paused' } }).catch(() => undefined);
    }
  }

  // 3. Start scheduler tick (every 30s) for scheduled campaigns
  setInterval(() => {
    tickScheduler().catch((err) => logger.warn({ err }, 'scheduler tick failed'));
  }, 30_000);
}

async function tickScheduler(): Promise<void> {
  const now = new Date();
  const due = await prisma.campaign.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: now } },
    select: { id: true },
  });
  for (const d of due) {
    if (isActive(d.id)) continue;
    try {
      await startCampaign(d.id);
    } catch (err) {
      logger.warn({ err, campaignId: d.id }, 'failed to start scheduled campaign');
    }
  }
}
