/**
 * Warmup worker — makes two or more WhatsApp sessions exchange messages with
 * each other to gradually warm up phone numbers.
 *
 * Each WarmupPlan has N sessions. On every tick the worker picks a (from, to)
 * pair in round-robin, sends a random message from the built-in bank, waits
 * the configured interval, then repeats until the daily quota is reached.
 */

import { prisma } from '../../db/client.js';
import { sendText, get as getSession } from '../../providers/baileys/manager.js';
import { logger } from '../../lib/logger.js';
import { emitToUser } from '../../ws/index.js';

// ─── Message bank ────────────────────────────────────────────────────────────

const MESSAGE_BANK = [
  'Oi, tudo bem?',
  'Olá! Como você está?',
  'E aí, sumido(a)!',
  'Oi! Tudo certo?',
  'Boa tarde!',
  'Bom dia!',
  'Boa noite!',
  'Ei, passou por aqui?',
  'Tudo bem por aí?',
  'Oi, estava pensando em você!',
  'Olá, como vai?',
  'Oi! Novidade?',
  'Ei! Estava com saudade.',
  'Oi, pode falar?',
  'Tudo tranquilo?',
  'Oi! Apareceu!',
  'Como você está hoje?',
  'Ei, tudo na paz?',
  'Olá! Sumiu hein.',
  'Oi, tô aqui!',
];

function randomMessage(): string {
  return MESSAGE_BANK[Math.floor(Math.random() * MESSAGE_BANK.length)];
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Controller state ────────────────────────────────────────────────────────

type ControllerState = 'running' | 'stopping' | 'pausing';

interface Controller {
  planId: string;
  state: ControllerState;
  done: Promise<void>;
}

const controllers = new Map<string, Controller>();

export function isActive(planId: string): boolean {
  return controllers.has(planId);
}

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

// ─── Daily quota ramp ────────────────────────────────────────────────────────

function dailyQuota(plan: {
  currentDay: number;
  durationDays: number;
  startMsgsPerDay: number;
  maxMsgsPerDay: number;
}): number {
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
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return start <= end ? minutesNow >= start && minutesNow <= end : minutesNow >= start || minutesNow <= end;
}

// ─── Emit helper ─────────────────────────────────────────────────────────────

async function emitProgress(planId: string, extra: Record<string, unknown> = {}) {
  try {
    const plan = await prisma.warmupPlan.findUnique({ where: { id: planId } });
    if (!plan) return;
    const todayCount = await prisma.warmupLog.count({
      where: { planId, sentAt: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) } },
    });
    const payload = {
      planId,
      status: plan.status,
      currentDay: plan.currentDay,
      durationDays: plan.durationDays,
      todayCount,
      todayQuota: dailyQuota(plan),
      ...extra,
    };
    emitToUser(plan.userId, 'warmup.progress', payload);
  } catch {
    // non-critical
  }
}

// ─── Main loop ───────────────────────────────────────────────────────────────

async function runLoop(controller: Controller): Promise<void> {
  const { planId } = controller;

  try {
    while (controller.state === 'running') {
      const plan = await prisma.warmupPlan.findUnique({ where: { id: planId } });
      if (!plan || plan.status !== 'running') break;

      // Window check
      if (!isWithinWindow(plan.windowStart, plan.windowEnd)) {
        await emitProgress(planId, { waiting: 'Fora da janela de envio' });
        await sleep(60_000);
        continue;
      }

      // Advance day if needed
      const startedAt = plan.startedAt ?? new Date();
      const elapsedDays = Math.floor((Date.now() - startedAt.getTime()) / 86_400_000);
      const newDay = Math.min(elapsedDays + 1, plan.durationDays);
      if (newDay !== plan.currentDay) {
        await prisma.warmupPlan.update({ where: { id: planId }, data: { currentDay: newDay } });
      }

      // Check daily quota
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayCount = await prisma.warmupLog.count({
        where: { planId, sentAt: { gte: todayStart } },
      });
      const quota = dailyQuota({ ...plan, currentDay: newDay });

      if (todayCount >= quota) {
        // Quota met for today — wait until next day
        const tomorrow = new Date(todayStart.getTime() + 86_400_000);
        const waitMs = Math.max(0, tomorrow.getTime() - Date.now());
        await emitProgress(planId, { waiting: `Cota do dia atingida (${todayCount}/${quota}) — aguardando amanhã` });
        await sleep(Math.min(waitMs, 30 * 60_000)); // check again in 30min max
        continue;
      }

      // Check plan completion
      if (newDay >= plan.durationDays && todayCount >= quota) {
        await prisma.warmupPlan.update({
          where: { id: planId },
          data: { status: 'completed', completedAt: new Date() },
        });
        await emitProgress(planId, { completed: true });
        break;
      }

      // Pick connected sessions
      const connected = plan.sessionIds.filter((sid) => !!getSession(sid));
      if (connected.length < 2) {
        await emitProgress(planId, { waiting: 'Aguardando ao menos 2 sessões conectadas' });
        await sleep(30_000);
        continue;
      }

      // Round-robin pair: pick from/to based on current log count
      const fromIdx = todayCount % connected.length;
      const toIdx = (fromIdx + 1) % connected.length;
      const fromId = connected[fromIdx];
      const toId = connected[toIdx];

      // Get phone numbers
      const [fromSession, toSession] = await Promise.all([
        prisma.session.findUnique({ where: { id: fromId }, select: { phoneNumber: true, name: true } }),
        prisma.session.findUnique({ where: { id: toId }, select: { phoneNumber: true, name: true } }),
      ]);

      if (!fromSession?.phoneNumber || !toSession?.phoneNumber) {
        await sleep(10_000);
        continue;
      }

      const text = randomMessage();

      try {
        await sendText(fromId, toSession.phoneNumber, text, { applyDelay: false });
        await prisma.warmupLog.create({
          data: { planId, fromSession: fromId, toSession: toId, message: text, status: 'sent' },
        });
        logger.info({ planId, from: fromSession.name, to: toSession.name }, 'warmup message sent');
      } catch (err: any) {
        await prisma.warmupLog.create({
          data: { planId, fromSession: fromId, toSession: toId, message: text, status: 'failed' },
        });
        logger.warn({ planId, err: err.message }, 'warmup message failed');
      }

      await emitProgress(planId);

      // Wait interval
      if (controller.state === 'running') {
        const waitMs = rnd(plan.intervalMin * 1000, plan.intervalMax * 1000);
        await sleep(waitMs);
      }
    }

    // Handle exit reason
    if (controller.state === 'pausing') {
      await prisma.warmupPlan.update({
        where: { id: planId },
        data: { status: 'paused', pausedAt: new Date() },
      });
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
    data: {
      status: 'running',
      startedAt: plan.startedAt ?? new Date(),
      pausedAt: null,
    },
  });

  const controller: Controller = { planId, state: 'running', done: Promise.resolve() };
  controller.done = runLoop(controller).catch((err) =>
    logger.error({ err, planId }, 'warmup worker crashed'),
  );
  controllers.set(planId, controller);
}

export async function recoverWarmups(): Promise<void> {
  const running = await prisma.warmupPlan.findMany({ where: { status: 'running' } });
  for (const plan of running) {
    startWarmup(plan.id).catch((err) =>
      logger.error({ err, planId: plan.id }, 'failed to recover warmup'),
    );
  }
}
