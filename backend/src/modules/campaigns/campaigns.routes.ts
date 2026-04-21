/**
 * Campaign routes.
 *
 * Core lifecycle: create → populate targets → fire/schedule → pause/resume/cancel → retry failed.
 *
 * Target sources supported:
 *  - inline:   { targets: [{ phone, name? }] }
 *  - imports:  { importIds: string[] }            (all contacts with origin starting with import:<id>)
 *  - tags:     { tags: string[] }                 (all contacts with any of those tags)
 *  - group:    { groupId: string, adminsOnly? }   (resolved phone-JIDs from the WhatsAppGroup)
 *  - csv:      multipart upload (POST /api/campaigns/:id/targets/csv)
 *
 * All sources merge into the same CampaignTarget table with dedup by phone (per campaign).
 */

import type { FastifyInstance } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { env } from '../../config/env.js';
import { NotFoundError, AppError } from '../../lib/errors.js';
import {
  startCampaign,
  pauseCampaign,
  cancelCampaign,
  isActive,
  resetCampaignTargets,
} from './campaign-worker.js';

// ─── Validation ──────────────────────────────────────────────────────────────

const buttonSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  type: z.enum(['reply', 'url', 'call']).default('reply'),
  value: z.string().default(''),
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  sessionId: z.string().optional(),
  channel: z.enum(['whatsapp', 'sms']).default('whatsapp'),
  templateId: z.string().optional(),
  segmentId: z.string().optional(),
  messageContent: z.string().max(4096).default(''),
  mediaCaption: z.string().max(1024).optional(),
  intervalSec: z.number().int().min(3).max(600).default(15),
  jitterPct: z.number().int().min(0).max(80).default(30),
  batchLimit: z.number().int().min(1).optional(),
  windowStart: z.string().regex(/^\d{1,2}:\d{2}$/).optional().or(z.literal('')),
  windowEnd: z.string().regex(/^\d{1,2}:\d{2}$/).optional().or(z.literal('')),
  scheduledAt: z.string().datetime().optional(),
  buttonsEnabled: z.boolean().default(false),
  buttons: z.array(buttonSchema).max(3).optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(['image', 'video', 'audio', 'document', 'none']).optional(),
  mediaMimetype: z.string().optional(),
  mediaFilename: z.string().optional(),
  linkUrl: z.string().url().optional().or(z.literal('')),
});

const targetSourceSchema = z.object({
  replace: z.boolean().default(false), // if true, clear existing targets first
  inline: z
    .array(
      z.object({
        phone: z.string().min(6),
        name: z.string().optional(),
        variables: z.record(z.any()).optional(),
      }),
    )
    .optional(),
  importIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  groupId: z.string().optional(),
  groupAdminsOnly: z.boolean().optional(),
});

const fireSchema = z.object({
  sessionId: z.string().optional(),
  intervalSec: z.number().int().min(3).max(600).optional(),
  scheduledAt: z.string().datetime().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function ensureCampaignOwned(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
  if (!campaign) throw new NotFoundError('Campanha não encontrada');
  return campaign;
}

async function ensureSessionOwned(sessionId: string, userId: string) {
  const session = await prisma.session.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new NotFoundError('Sessão não encontrada');
  return session;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** Returns phones gathered from the requested sources. Each phone is already normalized. */
async function gatherPhonesFromSources(
  userId: string,
  src: z.infer<typeof targetSourceSchema>,
): Promise<{ phone: string; name?: string; variables?: any }[]> {
  const out = new Map<string, { phone: string; name?: string; variables?: any }>();

  const push = (phoneRaw: string, name?: string, variables?: any) => {
    const phone = normalizePhone(phoneRaw);
    if (!phone) return;
    if (out.has(phone)) return;
    out.set(phone, { phone, name: name?.trim() || undefined, variables });
  };

  if (src.inline?.length) {
    for (const t of src.inline) push(t.phone, t.name, t.variables);
  }

  if (src.importIds?.length) {
    const conditions = src.importIds.map((id) => ({ origin: { startsWith: `import:${id}` } }));
    const contacts = await prisma.contact.findMany({
      where: { OR: conditions },
      select: { phone: true, name: true },
      take: 100_000,
    });
    for (const c of contacts) push(c.phone, c.name);
  }

  if (src.tags?.length) {
    const contacts = await prisma.contact.findMany({
      where: { tags: { hasSome: src.tags } },
      select: { phone: true, name: true },
      take: 100_000,
    });
    for (const c of contacts) push(c.phone, c.name);
  }

  if (src.groupId) {
    const group = await prisma.whatsAppGroup.findUnique({
      where: { id: src.groupId },
      include: { session: { select: { userId: true } } },
    });
    if (!group || group.session.userId !== userId) {
      throw new NotFoundError('Grupo não encontrado');
    }
    const adminSet = new Set(group.admins);
    const jids = src.groupAdminsOnly ? group.admins : [...new Set([...group.admins, ...group.members])];
    for (const jid of jids) {
      // Only @s.whatsapp.net JIDs carry phone numbers
      if (!jid.endsWith('@s.whatsapp.net')) continue;
      if (src.groupAdminsOnly && !adminSet.has(jid)) continue;
      const digits = jid.split('@')[0] ?? '';
      push(digits);
    }
  }

  return [...out.values()];
}

/** Very simple CSV parser: supports comma, semicolon, tab; quoted fields; header auto-detected. */
function parseCSV(content: string): { phone: string; name?: string; variables?: Record<string, string> }[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const delim = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === delim && !inQ) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const header = split(lines[0]).map((c) => c.toLowerCase());
  const phoneLabels = new Set(['phone', 'telefone', 'celular', 'fone', 'whatsapp', 'numero', 'número']);
  const nameLabels = new Set(['name', 'nome', 'contato']);
  const hasHeader = header.some((c) => phoneLabels.has(c) || nameLabels.has(c));

  let phoneIdx = 0;
  let nameIdx = 1;
  let varColumns: { idx: number; key: string }[] = [];
  let dataStart = 0;

  if (hasHeader) {
    phoneIdx = header.findIndex((c) => phoneLabels.has(c));
    nameIdx = header.findIndex((c) => nameLabels.has(c));
    if (phoneIdx < 0) phoneIdx = 0;
    header.forEach((col, i) => {
      if (i === phoneIdx || i === nameIdx) return;
      if (!col) return;
      varColumns.push({ idx: i, key: col });
    });
    dataStart = 1;
  }

  const rows: { phone: string; name?: string; variables?: Record<string, string> }[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const cells = split(lines[i]);
    const phone = cells[phoneIdx] ?? '';
    if (!phone) continue;
    const name = nameIdx >= 0 ? cells[nameIdx] : undefined;
    const variables: Record<string, string> = {};
    for (const vc of varColumns) {
      if (cells[vc.idx]) variables[vc.key] = cells[vc.idx];
    }
    rows.push({ phone, name, variables: Object.keys(variables).length ? variables : undefined });
  }
  return rows;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function campaignsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // ── List campaigns ─────────────────────────────────────────────────────────
  app.get('/api/campaigns', async (req) => {
    const { search, status } = z
      .object({
        search: z.string().optional(),
        status: z
          .enum(['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed'])
          .optional(),
      })
      .parse(req.query);

    return prisma.campaign.findMany({
      where: {
        userId: req.user!.sub,
        ...(status ? { status } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  // ── Get one with targets summary ───────────────────────────────────────────
  app.get('/api/campaigns/:id', async (req) => {
    const { id } = req.params as { id: string };
    const camp = await ensureCampaignOwned(id, req.user!.sub);

    const [counts, sample] = await Promise.all([
      prisma.campaignTarget.groupBy({
        by: ['status'],
        where: { campaignId: id },
        _count: { _all: true },
      }),
      prisma.campaignTarget.findMany({
        where: { campaignId: id },
        orderBy: { processedAt: 'desc' },
        take: 25,
      }),
    ]);

    const total = counts.reduce((acc, c) => acc + (c._count?._all ?? 0), 0);
    const byStatus: Record<string, number> = {};
    for (const c of counts) byStatus[c.status] = c._count?._all ?? 0;

    return {
      ...camp,
      targetTotal: total,
      targetsByStatus: byStatus,
      sampleTargets: sample,
      isActiveWorker: isActive(id),
    };
  });

  // ── List campaign targets (paginated) ──────────────────────────────────────
  app.get('/api/campaigns/:id/targets', async (req) => {
    const { id } = req.params as { id: string };
    await ensureCampaignOwned(id, req.user!.sub);

    const { page, pageSize, status } = z
      .object({
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().min(1).max(500).default(50),
        status: z.enum(['pending', 'sending', 'sent', 'failed', 'skipped']).optional(),
      })
      .parse(req.query);

    const where = { campaignId: id, ...(status ? { status } : {}) };
    const [items, total] = await Promise.all([
      prisma.campaignTarget.findMany({
        where,
        orderBy: [{ status: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.campaignTarget.count({ where }),
    ]);
    return { items, total, page, pageSize };
  });

  // ── Create campaign ────────────────────────────────────────────────────────
  app.post('/api/campaigns', async (req) => {
    const body = createSchema.parse(req.body);

    if (body.sessionId) {
      await ensureSessionOwned(body.sessionId, req.user!.sub);
    }

    return prisma.campaign.create({
      data: {
        userId: req.user!.sub,
        name: body.name,
        sessionId: body.sessionId,
        channel: body.channel,
        templateId: body.templateId,
        segmentId: body.segmentId,
        messageContent: body.messageContent,
        mediaCaption: body.mediaCaption,
        intervalSec: body.intervalSec,
        jitterPct: body.jitterPct,
        batchLimit: body.batchLimit,
        windowStart: body.windowStart || null,
        windowEnd: body.windowEnd || null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        buttonsEnabled: body.buttonsEnabled,
        buttonsJson: (body.buttons ?? []) as any,
        mediaUrl: body.mediaUrl,
        mediaType: body.mediaType,
        mediaMimetype: body.mediaMimetype,
        mediaFilename: body.mediaFilename,
        linkUrl: body.linkUrl || null,
      },
    });
  });

  // ── Update campaign ────────────────────────────────────────────────────────
  app.put('/api/campaigns/:id', async (req) => {
    const { id } = req.params as { id: string };
    const existing = await ensureCampaignOwned(id, req.user!.sub);
    if (existing.status === 'running' || isActive(id)) {
      throw new AppError('Não é possível editar uma campanha em execução. Pause-a primeiro.', 409, 'CAMPAIGN_RUNNING');
    }

    const body = createSchema.partial().parse(req.body);

    if (body.sessionId) {
      await ensureSessionOwned(body.sessionId, req.user!.sub);
    }

    const data: any = { ...body };
    if ('buttons' in body) {
      data.buttonsJson = (body.buttons ?? []) as any;
      delete data.buttons;
    }
    if ('scheduledAt' in body) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }
    if ('windowStart' in body) data.windowStart = body.windowStart || null;
    if ('windowEnd' in body) data.windowEnd = body.windowEnd || null;
    if ('linkUrl' in body) data.linkUrl = body.linkUrl || null;

    return prisma.campaign.update({ where: { id }, data });
  });

  // ── Delete campaign ────────────────────────────────────────────────────────
  app.delete('/api/campaigns/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await ensureCampaignOwned(id, req.user!.sub);
    if (isActive(id)) {
      cancelCampaign(id);
      // let worker finish; attempt delete anyway (targets cascade)
    }
    await prisma.campaign.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // ── Duplicate campaign (copy with status='draft', no targets) ─────────────
  app.post('/api/campaigns/:id/duplicate', async (req) => {
    const { id } = req.params as { id: string };
    const src = await ensureCampaignOwned(id, req.user!.sub);
    const { id: _omit, createdAt, updatedAt, startedAt, finishedAt, ...rest } = src as any;
    return prisma.campaign.create({
      data: {
        ...rest,
        name: `${src.name} (cópia)`,
        status: 'draft',
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        responseCount: 0,
        totalCount: 0,
        startedAt: null,
        finishedAt: null,
      },
    });
  });

  // ── Set / replace / append target list ─────────────────────────────────────
  app.post('/api/campaigns/:id/targets', async (req) => {
    const { id } = req.params as { id: string };
    await ensureCampaignOwned(id, req.user!.sub);
    const body = targetSourceSchema.parse(req.body);

    const phones = await gatherPhonesFromSources(req.user!.sub, body);

    if (body.replace) {
      await prisma.campaignTarget.deleteMany({ where: { campaignId: id } });
    }

    // Dedup against existing targets for this campaign
    const existing = new Set(
      (
        await prisma.campaignTarget.findMany({
          where: { campaignId: id },
          select: { phone: true },
        })
      ).map((t) => t.phone),
    );
    const fresh = phones.filter((p) => !existing.has(p.phone));

    if (fresh.length > 0) {
      await prisma.campaignTarget.createMany({
        data: fresh.map((p) => ({
          campaignId: id,
          phone: p.phone,
          name: p.name,
          variables: p.variables as any,
        })),
      });
    }

    const total = await prisma.campaignTarget.count({ where: { campaignId: id } });
    await prisma.campaign.update({ where: { id }, data: { totalCount: total } });
    return { added: fresh.length, duplicates: phones.length - fresh.length, total };
  });

  // ── Upload CSV with targets ────────────────────────────────────────────────
  app.post('/api/campaigns/:id/targets/csv', async (req, reply) => {
    const { id } = req.params as { id: string };
    await ensureCampaignOwned(id, req.user!.sub);
    const file: MultipartFile | undefined = await (req as any).file();
    if (!file) return reply.status(400).send({ error: 'Arquivo não enviado' });

    const buffer = await file.toBuffer();
    const content = buffer.toString('utf-8');
    const parsed = parseCSV(content);

    const existing = new Set(
      (
        await prisma.campaignTarget.findMany({
          where: { campaignId: id },
          select: { phone: true },
        })
      ).map((t) => t.phone),
    );

    const fresh = parsed
      .map((r) => ({ ...r, phone: normalizePhone(r.phone) }))
      .filter(
        (r): r is { phone: string; name?: string; variables?: Record<string, string> } =>
          !!r.phone && !existing.has(r.phone),
      );

    if (fresh.length > 0) {
      await prisma.campaignTarget.createMany({
        data: fresh.map((p) => ({
          campaignId: id,
          phone: p.phone,
          name: p.name,
          variables: p.variables as any,
        })),
      });
    }

    const total = await prisma.campaignTarget.count({ where: { campaignId: id } });
    await prisma.campaign.update({ where: { id }, data: { totalCount: total } });
    return {
      parsed: parsed.length,
      added: fresh.length,
      duplicates: parsed.length - fresh.length,
      total,
    };
  });

  // ── Clear targets ──────────────────────────────────────────────────────────
  app.delete('/api/campaigns/:id/targets', async (req) => {
    const { id } = req.params as { id: string };
    await ensureCampaignOwned(id, req.user!.sub);
    if (isActive(id)) {
      throw new AppError('Campanha em execução. Pause antes de limpar os alvos.', 409, 'CAMPAIGN_RUNNING');
    }
    const result = await prisma.campaignTarget.deleteMany({ where: { campaignId: id } });
    await prisma.campaign.update({
      where: { id },
      data: { totalCount: 0, sentCount: 0, failedCount: 0 },
    });
    return { deleted: result.count };
  });

  // ── Upload media ───────────────────────────────────────────────────────────
  app.post('/api/campaigns/:id/media', async (req, reply) => {
    const { id } = req.params as { id: string };
    await ensureCampaignOwned(id, req.user!.sub);
    const file: MultipartFile | undefined = await (req as any).file();
    if (!file) return reply.status(400).send({ error: 'Arquivo não enviado' });

    const mime = file.mimetype || 'application/octet-stream';
    const ext = path.extname(file.filename || '') || guessExt(mime);
    const safeName = `${id}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const fullPath = path.resolve(env.UPLOAD_DIR, safeName);
    const buffer = await file.toBuffer();
    await fs.writeFile(fullPath, buffer);

    const mediaType: 'image' | 'video' | 'audio' | 'document' = mime.startsWith('image/')
      ? 'image'
      : mime.startsWith('video/')
      ? 'video'
      : mime.startsWith('audio/')
      ? 'audio'
      : 'document';

    const mediaUrl = `/uploads/${safeName}`;
    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        mediaUrl,
        mediaType,
        mediaMimetype: mime,
        mediaFilename: file.filename ?? safeName,
      },
    });
    return {
      mediaUrl,
      mediaType,
      mediaMimetype: mime,
      mediaFilename: updated.mediaFilename,
      size: buffer.length,
    };
  });

  // ── Remove media ───────────────────────────────────────────────────────────
  app.delete('/api/campaigns/:id/media', async (req) => {
    const { id } = req.params as { id: string };
    const camp = await ensureCampaignOwned(id, req.user!.sub);
    if (camp.mediaUrl && camp.mediaUrl.startsWith('/uploads/')) {
      const p = path.resolve(env.UPLOAD_DIR, camp.mediaUrl.replace('/uploads/', ''));
      await fs.unlink(p).catch(() => undefined);
    }
    return prisma.campaign.update({
      where: { id },
      data: { mediaUrl: null, mediaType: null, mediaMimetype: null, mediaFilename: null },
    });
  });

  // ── Fire / schedule campaign ───────────────────────────────────────────────
  app.post('/api/campaigns/:id/fire', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = fireSchema.parse(req.body);
    const camp = await ensureCampaignOwned(id, req.user!.sub);

    const sessionId = body.sessionId ?? camp.sessionId;
    if (!sessionId) throw new AppError('Selecione uma sessão antes de disparar', 400, 'SESSION_REQUIRED');
    const session = await ensureSessionOwned(sessionId, req.user!.sub);
    if (session.status !== 'connected') {
      throw new AppError('Sessão não está conectada', 400, 'SESSION_NOT_CONNECTED');
    }

    let pending = await prisma.campaignTarget.count({
      where: { campaignId: id, status: { in: ['pending', 'sending'] } },
    });

    // Auto-reset: if the campaign is in a terminal state with no pending targets,
    // treat "fire" as "restart" — reset all targets to pending and dispatch again.
    if (
      pending === 0 &&
      ['completed', 'cancelled', 'failed'].includes(camp.status)
    ) {
      const total = await prisma.campaignTarget.count({ where: { campaignId: id } });
      if (total > 0) {
        await resetCampaignTargets(id);
        pending = total;
      }
    }

    if (pending === 0) {
      throw new AppError('Nenhum destinatário pendente. Adicione alvos antes de disparar.', 400, 'NO_TARGETS');
    }

    const updates: any = {
      sessionId,
      intervalSec: body.intervalSec ?? camp.intervalSec,
    };

    // Scheduled in the future → status='scheduled', worker's scheduler tick will pick it up
    if (body.scheduledAt && new Date(body.scheduledAt).getTime() > Date.now() + 5_000) {
      updates.status = 'scheduled';
      updates.scheduledAt = new Date(body.scheduledAt);
      await prisma.campaign.update({ where: { id }, data: updates });
      return reply.send({ ok: true, status: 'scheduled', scheduledAt: updates.scheduledAt });
    }

    updates.scheduledAt = null;
    await prisma.campaign.update({ where: { id }, data: updates });

    await startCampaign(id);
    return reply.send({ ok: true, status: 'running', total: pending });
  });

  // ── Pause (soft-stop after current target) ────────────────────────────────
  app.post('/api/campaigns/:id/pause', async (req) => {
    const { id } = req.params as { id: string };
    await ensureCampaignOwned(id, req.user!.sub);
    const stopped = pauseCampaign(id);
    if (!stopped) {
      // No active worker — just set status
      await prisma.campaign.update({ where: { id }, data: { status: 'paused' } });
    }
    return { ok: true };
  });

  // ── Resume (same as fire, but without requiring params) ───────────────────
  app.post('/api/campaigns/:id/resume', async (req) => {
    const { id } = req.params as { id: string };
    const camp = await ensureCampaignOwned(id, req.user!.sub);

    if (!camp.sessionId) throw new AppError('Sessão não definida', 400, 'SESSION_REQUIRED');
    const session = await ensureSessionOwned(camp.sessionId, req.user!.sub);
    if (session.status !== 'connected') {
      throw new AppError('Sessão não está conectada', 400, 'SESSION_NOT_CONNECTED');
    }

    await startCampaign(id);
    return { ok: true, status: 'running' };
  });

  // ── Cancel (mark 'cancelled', keep history) ───────────────────────────────
  app.post('/api/campaigns/:id/cancel', async (req) => {
    const { id } = req.params as { id: string };
    await ensureCampaignOwned(id, req.user!.sub);
    const stopping = cancelCampaign(id);
    if (!stopping) {
      await prisma.campaign.update({ where: { id }, data: { status: 'cancelled', finishedAt: new Date() } });
    }
    return { ok: true };
  });

  // ── Restart: reset all targets to pending, zero counters, keep targets ────
  app.post('/api/campaigns/:id/restart', async (req) => {
    const { id } = req.params as { id: string };
    await ensureCampaignOwned(id, req.user!.sub);
    if (isActive(id)) {
      throw new AppError('Campanha em execução. Pause antes de reiniciar.', 409, 'CAMPAIGN_RUNNING');
    }
    const reset = await resetCampaignTargets(id);
    return { ok: true, reset };
  });

  // ── History: list terminal campaigns with summary stats ───────────────────
  app.get('/api/campaigns/history', async (req) => {
    const { limit } = z
      .object({ limit: z.coerce.number().min(1).max(200).default(50) })
      .parse(req.query);

    const rows = await prisma.campaign.findMany({
      where: {
        userId: req.user!.sub,
        status: { in: ['completed', 'cancelled', 'failed', 'paused'] },
      },
      orderBy: [{ finishedAt: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      include: { session: { select: { id: true, name: true, phoneNumber: true } } },
    });

    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? await prisma.campaignTarget.groupBy({
          by: ['campaignId', 'status'],
          where: { campaignId: { in: ids } },
          _count: { _all: true },
        })
      : [];

    const byCamp: Record<string, Record<string, number>> = {};
    for (const c of counts) {
      (byCamp[c.campaignId] ??= {})[c.status] = c._count?._all ?? 0;
    }

    return rows.map((r) => {
      const s = byCamp[r.id] ?? {};
      const total = Object.values(s).reduce((a, b) => a + b, 0);
      const sent = s.sent ?? 0;
      const failed = s.failed ?? 0;
      const skipped = s.skipped ?? 0;
      const pending = (s.pending ?? 0) + (s.sending ?? 0);
      const durationMs =
        r.startedAt && r.finishedAt
          ? new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()
          : 0;
      const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        channel: r.channel,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        durationMs,
        total,
        sent,
        failed,
        skipped,
        pending,
        successRate,
        session: r.session
          ? { id: r.session.id, label: r.session.name, phoneNumber: r.session.phoneNumber }
          : null,
        mediaType: r.mediaType,
        hasMedia: !!r.mediaUrl,
        messagePreview: (r.messageContent ?? '').slice(0, 160),
      };
    });
  });

  // ── Retry failed targets (resets them to pending, optionally fires) ───────
  app.post('/api/campaigns/:id/retry-failed', async (req) => {
    const { id } = req.params as { id: string };
    const camp = await ensureCampaignOwned(id, req.user!.sub);
    const { startNow } = z.object({ startNow: z.boolean().default(true) }).parse(req.body ?? {});

    const updated = await prisma.campaignTarget.updateMany({
      where: { campaignId: id, status: 'failed' },
      data: { status: 'pending', error: null, claimedAt: null },
    });

    if (updated.count === 0) return { reset: 0, started: false };

    // Decrement failedCount to keep counters accurate
    await prisma.campaign.update({
      where: { id },
      data: { failedCount: Math.max(0, (camp.failedCount ?? 0) - updated.count) },
    });

    if (startNow && camp.sessionId) {
      const session = await ensureSessionOwned(camp.sessionId, req.user!.sub);
      if (session.status === 'connected') {
        await startCampaign(id);
        return { reset: updated.count, started: true };
      }
    }
    return { reset: updated.count, started: false };
  });
}

function guessExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'application/pdf': '.pdf',
  };
  return map[mime] ?? '';
}
