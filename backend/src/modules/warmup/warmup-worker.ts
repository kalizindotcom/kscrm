import { prisma } from '../../db/client.js';
import { sendText, sendMedia, get as getSession } from '../../providers/baileys/manager.js';
import { logger } from '../../lib/logger.js';
import { emitToUser } from '../../ws/index.js';

// ─── Message bank ────────────────────────────────────────────────────────────

const MESSAGE_BANK = [
  'Oi, tudo bem?', 'Olá! Como você está?', 'E aí, sumido(a)!', 'Oi! Tudo certo?',
  'Boa tarde!', 'Bom dia!', 'Boa noite!', 'Ei, passou por aqui?', 'Tudo bem por aí?',
  'Oi, estava pensando em você!', 'Olá, como vai?', 'Oi! Novidade?',
  'Ei! Estava com saudade.', 'Oi, pode falar?', 'Tudo tranquilo?',
  'Oi! Apareceu!', 'Como você está hoje?', 'Ei, tudo na paz?', 'Olá! Sumiu hein.', 'Oi, tô aqui!',
  'Que dia longo hein', 'Conseguiu descansar?', 'Tá com saudade não?',
  'Rsrs oi', 'Estava lembrando de você agora', 'Oi oi!', 'Eai meu amigo?',
  'Boa tarde! 😄', 'Oi tudo bom?', 'Aqui firme e forte, e você?',
];

function pickMessage(customMessages: string[]): string {
  const bank = customMessages.length >= 3 ? customMessages : MESSAGE_BANK;
  return bank[Math.floor(Math.random() * bank.length)];
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Media helpers ────────────────────────────────────────────────────────────

const IMAGE_SEEDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600];

async function fetchRandomImage(): Promise<Buffer | null> {
  try {
    const seed = IMAGE_SEEDS[Math.floor(Math.random() * IMAGE_SEEDS.length)];
    const res = await fetch(`https://picsum.photos/seed/${seed}/400/300`);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function generateAudioWav(durationMs = 2000): Buffer {
  const sampleRate = 8000;
  const samples = Math.floor(sampleRate * durationMs / 1000);
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const wave = Math.sin(2 * Math.PI * 220 * t) * 300 * Math.exp(-t * 0.8);
    const noise = (Math.random() - 0.5) * 100;
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(wave + noise))), 44 + i * 2);
  }
  return buf;
}

// ─── Controller state ────────────────────────────────────────────────────────

type ControllerState = 'running' | 'stopping' | 'pausing';
interface Controller { planId: string; state: ControllerState; done: Promise<void> }
const controllers = new Map<string, Controller>();

export function isActive(planId: string): boolean { return controllers.has(planId); }

export function stopWarmup(planId: string): boolean {
  const c = controllers.get(planId);
  if (!c) return false;
  c.state = 'stopping';
  return true;
}

export function pauseWarmup(planId: string): boolean {
  const c = controllers.get(planId);
  if (!c) return false;
  c.state = 'pausing';
  return true;
}

// ─── Chip health ─────────────────────────────────────────────────────────────

export function calcChipHealth(plan: {
  currentDay: number; durationDays: number; maxMsgsPerDay: number;
}, sent: number, failed: number): number {
  const totalExpected = plan.durationDays * plan.maxMsgsPerDay;
  const progressScore = Math.min(40, (sent / Math.max(1, totalExpected)) * 40);
  const dayScore = Math.min(30, (plan.currentDay / Math.max(1, plan.durationDays)) * 30);
  const successRate = sent / Math.max(1, sent + failed);
  const qualityScore = successRate * 30;
  return Math.max(5, Math.min(95, Math.round(progressScore + dayScore + qualityScore)));
}

// ─── Daily quota ramp ────────────────────────────────────────────────────────

function dailyQuota(plan: { currentDay: number; durationDays: number; startMsgsPerDay: number; maxMsgsPerDay: number }): number {
  const { currentDay, durationDays, startMsgsPerDay, maxMsgsPerDay } = plan;
  if (durationDays <= 1) return maxMsgsPerDay;
  const progress = Math.min(currentDay, durationDays) / durationDays;
  return Math.round(startMsgsPerDay + (maxMsgsPerDay - startMsgsPerDay) * progress);
}

// ─── Window check ─────────────────────────────────────────────────────────────

function isWithinWindow(windowStart?: string | null, windowEnd?: string | null): boolean {
  if (!windowStart || !windowEnd) return true;
  const now = new Date();
  const [sh, sm] = windowStart.split(':').map(Number);
  const [eh, em] = windowEnd.split(':').map(Number);
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();
  const start = sh * 60 + sm; const end = eh * 60 + em;
  return start <= end ? minutesNow >= start && minutesNow <= end : minutesNow >= start || minutesNow <= end;
}

// ─── Emit helpers ─────────────────────────────────────────────────────────────

async function emitProgress(planId: string, extra: Record<string, unknown> = {}) {
  try {
    const plan = await prisma.warmupPlan.findUnique({ where: { id: planId } });
    if (!plan) return;
    const todayCount = await prisma.warmupLog.count({
      where: { planId, sentAt: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) } },
    });
    const [sent, failed] = await Promise.all([
      prisma.warmupLog.count({ where: { planId, status: 'sent' } }),
      prisma.warmupLog.count({ where: { planId, status: 'failed' } }),
    ]);
    const chipHealth = calcChipHealth(plan, sent, failed);
    emitToUser(plan.userId, 'warmup.progress', {
      planId, status: plan.status, currentDay: plan.currentDay,
      durationDays: plan.durationDays, todayCount, todayQuota: dailyQuota(plan),
      sent, failed, chipHealth, ...extra,
    });
  } catch { /* non-critical */ }
}

async function emitMessage(
  userId: string,
  planId: string,
  fromId: string,
  fromName: string,
  toId: string,
  toName: string,
  message: string,
  status: 'sent' | 'failed',
  mediaType: 'text' | 'image' | 'audio' = 'text',
) {
  emitToUser(userId, 'warmup.message', {
    planId, fromId, fromName, toId, toName, message, status, mediaType,
    timestamp: new Date().toISOString(),
  });
}

// ─── Main loop ───────────────────────────────────────────────────────────────

async function runLoop(controller: Controller): Promise<void> {
  const { planId } = controller;
  let totalSentInLoop = 0;

  try {
    while (controller.state === 'running') {
      const plan = await prisma.warmupPlan.findUnique({ where: { id: planId } });
      if (!plan || plan.status !== 'running') break;

      if (!isWithinWindow(plan.windowStart, plan.windowEnd)) {
        await emitProgress(planId, { waiting: 'Fora da janela de envio' });
        await sleep(60_000);
        continue;
      }

      // Advance day
      const startedAt = plan.startedAt ?? new Date();
      const elapsedDays = Math.floor((Date.now() - startedAt.getTime()) / 86_400_000);
      const newDay = Math.min(elapsedDays + 1, plan.durationDays);
      if (newDay !== plan.currentDay) {
        await prisma.warmupPlan.update({ where: { id: planId }, data: { currentDay: newDay } });
      }

      // Daily quota
      const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
      const todayCount = await prisma.warmupLog.count({ where: { planId, sentAt: { gte: todayStart } } });
      const quota = dailyQuota({ ...plan, currentDay: newDay });

      if (todayCount >= quota) {
        const tomorrow = new Date(todayStart.getTime() + 86_400_000);
        const waitMs = Math.max(0, tomorrow.getTime() - Date.now());
        await emitProgress(planId, { waiting: `Cota do dia atingida (${todayCount}/${quota})` });
        await sleep(Math.min(waitMs, 30 * 60_000));
        continue;
      }

      // Plan completion
      if (newDay >= plan.durationDays && todayCount >= quota) {
        await prisma.warmupPlan.update({ where: { id: planId }, data: { status: 'completed', completedAt: new Date() } });
        await emitProgress(planId, { completed: true });
        break;
      }

      // Connected sessions
      const connected = plan.sessionIds.filter((sid) => !!getSession(sid));
      if (connected.length < 2) {
        await emitProgress(planId, { waiting: 'Aguardando ao menos 2 sessões conectadas' });
        await sleep(30_000);
        continue;
      }

      // Pick from/to
      const fromIdx = todayCount % connected.length;
      const toIdx = (fromIdx + 1) % connected.length;
      const fromId = connected[fromIdx];
      const toId = connected[toIdx];

      const [fromSession, toSession] = await Promise.all([
        prisma.session.findUnique({ where: { id: fromId }, select: { phoneNumber: true, name: true } }),
        prisma.session.findUnique({ where: { id: toId }, select: { phoneNumber: true, name: true } }),
      ]);

      if (!fromSession?.phoneNumber || !toSession?.phoneNumber) { await sleep(10_000); continue; }

      const text = pickMessage(plan.customMessages ?? []);

      // Decide media type
      const shouldSendMedia = plan.mediaEnabled && totalSentInLoop > 0 && totalSentInLoop % Math.max(1, plan.mediaFreq) === 0;
      const shouldSendAudio = plan.audioEnabled && totalSentInLoop > 0 && totalSentInLoop % Math.max(2, (plan as any).audioFreq ?? 7) === 0;

      // Target: group or direct
      const targetPhone = plan.useGroup && plan.groupJid
        ? plan.groupJid.replace('@g.us', '')
        : toSession.phoneNumber;
      const isGroup = !!(plan.useGroup && plan.groupJid);

      let mediaType: 'text' | 'image' | 'audio' = 'text';

      try {
        if (shouldSendAudio) {
          mediaType = 'audio';
          const audioBuf = generateAudioWav(rnd(1500, 4000));
          await sendMedia(fromId, targetPhone, {
            buffer: audioBuf, mimetype: 'audio/ogg; codecs=opus',
            type: 'audio', filename: 'audio.ogg',
          }, { applyDelay: false, isGroup });
        } else if (shouldSendMedia) {
          const imgBuf = await fetchRandomImage();
          if (imgBuf) {
            mediaType = 'image';
            await sendMedia(fromId, targetPhone, {
              buffer: imgBuf, mimetype: 'image/jpeg',
              caption: text, type: 'image',
            }, { applyDelay: false, isGroup });
          } else {
            await sendText(fromId, targetPhone, text, { applyDelay: false, isGroup });
          }
        } else {
          await sendText(fromId, targetPhone, text, { applyDelay: false, isGroup });
        }

        await prisma.warmupLog.create({
          data: { planId, fromSession: fromId, toSession: toId, message: text, status: 'sent', mediaType },
        });
        await emitMessage(plan.userId, planId, fromId, fromSession.name, toId, toSession.name, text, 'sent', mediaType);
        totalSentInLoop++;
        logger.info({ planId, from: fromSession.name, to: toSession.name, mediaType }, 'warmup msg sent');
      } catch (err: any) {
        await prisma.warmupLog.create({
          data: { planId, fromSession: fromId, toSession: toId, message: text, status: 'failed', mediaType },
        });
        await emitMessage(plan.userId, planId, fromId, fromSession.name, toId, toSession.name, text, 'failed', mediaType);
        logger.warn({ planId, err: err.message }, 'warmup msg failed');
      }

      await emitProgress(planId);

      if (controller.state === 'running') {
        const waitMs = rnd(plan.intervalMin * 1000, plan.intervalMax * 1000);
        await sleep(waitMs);
      }
    }

    if (controller.state === 'pausing') {
      await prisma.warmupPlan.update({ where: { id: planId }, data: { status: 'paused', pausedAt: new Date() } });
      await emitProgress(planId, { paused: true });
    } else if (controller.state === 'stopping') {
      await prisma.warmupPlan.update({ where: { id: planId }, data: { status: 'idle' } });
      await emitProgress(planId, { stopped: true });
    }
  } finally {
    controllers.delete(planId);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function startWarmup(planId: string): Promise<void> {
  if (controllers.has(planId)) return;
  const plan = await prisma.warmupPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error('Plano não encontrado');
  if (plan.sessionIds.length < 2) throw new Error('Selecione ao menos 2 sessões');

  await prisma.warmupPlan.update({
    where: { id: planId },
    data: { status: 'running', startedAt: plan.startedAt ?? new Date(), pausedAt: null },
  });

  const controller: Controller = { planId, state: 'running', done: Promise.resolve() };
  controller.done = runLoop(controller).catch((err) => logger.error({ err, planId }, 'warmup worker crashed'));
  controllers.set(planId, controller);
}

export async function recoverWarmups(): Promise<void> {
  const running = await prisma.warmupPlan.findMany({ where: { status: 'running' } });
  for (const plan of running) {
    startWarmup(plan.id).catch((err) => logger.error({ err, planId: plan.id }, 'failed to recover warmup'));
  }
}
