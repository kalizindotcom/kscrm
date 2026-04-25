import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { startWarmup, stopWarmup, pauseWarmup, isActive, calcChipHealth } from './warmup-worker.js';
import { get as getSession } from '../../providers/baileys/manager.js';

const HH_MM_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

const baseSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  sessionIds: z.array(z.string()).min(2, 'Selecione ao menos 2 sessões'),
  durationDays: z.coerce.number().int().min(1).max(90).default(14),
  startMsgsPerDay: z.coerce.number().int().min(1).max(50).default(5),
  maxMsgsPerDay: z.coerce.number().int().min(1).max(200).default(40),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
  intervalMin: z.coerce.number().int().min(10).max(3600).default(30),
  intervalMax: z.coerce.number().int().min(10).max(3600).default(120),
  useGroup: z.boolean().optional().default(false),
  groupJid: z.string().optional(),
  mediaEnabled: z.boolean().optional().default(false),
  mediaFreq: z.coerce.number().int().min(3).max(50).optional().default(5),
  audioEnabled: z.boolean().optional().default(false),
  audioFreq: z.coerce.number().int().min(3).max(50).optional().default(7),
  customMessages: z.array(z.string()).optional().default([]),
});

const createSchema = baseSchema.superRefine((data, ctx) => {
  if (data.intervalMin > data.intervalMax) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['intervalMin'], message: 'Intervalo minimo deve ser <= maximo' });
  }
  if (data.startMsgsPerDay > data.maxMsgsPerDay) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startMsgsPerDay'], message: 'Inicio deve ser <= maximo de msgs/dia' });
  }
  if (data.useGroup && !data.groupJid) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['groupJid'], message: 'JID do grupo e obrigatorio quando modo grupo esta ativo' });
  }
  if (data.useGroup && data.groupJid && !data.groupJid.endsWith('@g.us')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['groupJid'], message: 'JID do grupo deve terminar com @g.us' });
  }
  if (data.windowStart && !HH_MM_RE.test(data.windowStart)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['windowStart'], message: 'Formato invalido (HH:mm)' });
  }
  if (data.windowEnd && !HH_MM_RE.test(data.windowEnd)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['windowEnd'], message: 'Formato invalido (HH:mm)' });
  }
});

const updateSchema = baseSchema.partial().superRefine((data, ctx) => {
  if (data.intervalMin !== undefined && data.intervalMax !== undefined && data.intervalMin > data.intervalMax) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['intervalMin'], message: 'Intervalo minimo deve ser <= maximo' });
  }
  if (data.startMsgsPerDay !== undefined && data.maxMsgsPerDay !== undefined && data.startMsgsPerDay > data.maxMsgsPerDay) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startMsgsPerDay'], message: 'Inicio deve ser <= maximo de msgs/dia' });
  }
  if (data.useGroup && !data.groupJid) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['groupJid'], message: 'JID do grupo e obrigatorio quando modo grupo esta ativo' });
  }
  if (data.useGroup && data.groupJid && !data.groupJid.endsWith('@g.us')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['groupJid'], message: 'JID do grupo deve terminar com @g.us' });
  }
  if (data.windowStart && !HH_MM_RE.test(data.windowStart)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['windowStart'], message: 'Formato invalido (HH:mm)' });
  }
  if (data.windowEnd && !HH_MM_RE.test(data.windowEnd)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['windowEnd'], message: 'Formato invalido (HH:mm)' });
  }
});

// Per-session health calc — based on each session's own activity
function calcSessionHealth(plan: { currentDay: number; durationDays: number; maxMsgsPerDay: number }, sent: number, failed: number): number {
  const expectedShare = plan.durationDays * plan.maxMsgsPerDay;
  const progressScore = Math.min(40, (sent / Math.max(1, expectedShare)) * 40);
  const dayScore = Math.min(30, (plan.currentDay / Math.max(1, plan.durationDays)) * 30);
  const successRate = sent / Math.max(1, sent + failed);
  const qualityScore = successRate * 30;
  return Math.max(5, Math.min(95, Math.round(progressScore + dayScore + qualityScore)));
}

export async function warmupRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // ── List plans ──────────────────────────────────────────────────────────────
  app.get('/api/warmup', async (req) => {
    const userId = req.user!.sub;
    const plans = await prisma.warmupPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return plans.map((p) => ({ ...p, isActive: isActive(p.id) }));
  });

  // ── Create plan ─────────────────────────────────────────────────────────────
  app.post('/api/warmup', async (req, reply) => {
    const userId = req.user!.sub;
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      return reply.status(400).send({ error: first?.message ?? 'Dados inválidos' });
    }
    const body = parsed.data;

    const sessions = await prisma.session.findMany({
      where: { id: { in: body.sessionIds }, userId },
      select: { id: true },
    });
    if (sessions.length < 2) {
      return reply.status(400).send({ error: 'Sessoes invalidas ou insuficientes' });
    }

    const plan = await prisma.warmupPlan.create({ data: { ...body, userId } });
    return reply.status(201).send(plan);
  });

  // ── Get plan ────────────────────────────────────────────────────────────────
  app.get('/api/warmup/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const plan = await prisma.warmupPlan.findFirst({ where: { id, userId } });
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado' });
    return { ...plan, isActive: isActive(id) };
  });

  // ── Update plan ─────────────────────────────────────────────────────────────
  app.put('/api/warmup/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const plan = await prisma.warmupPlan.findFirst({ where: { id, userId } });
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado' });
    if (isActive(id)) return reply.status(400).send({ error: 'Pare o aquecimento antes de editar' });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      return reply.status(400).send({ error: first?.message ?? 'Dados inválidos' });
    }
    const patch = parsed.data;

    if (patch.sessionIds) {
      const sessions = await prisma.session.findMany({
        where: { id: { in: patch.sessionIds }, userId },
        select: { id: true },
      });
      if (sessions.length < 2) {
        return reply.status(400).send({ error: 'Sessoes invalidas ou insuficientes' });
      }
    }

    const merged = { ...plan, ...patch };
    if (merged.intervalMin > merged.intervalMax) {
      return reply.status(400).send({ error: 'Intervalo minimo deve ser <= maximo' });
    }
    if (merged.startMsgsPerDay > merged.maxMsgsPerDay) {
      return reply.status(400).send({ error: 'Inicio deve ser <= maximo de msgs/dia' });
    }
    if (merged.useGroup && !merged.groupJid) {
      return reply.status(400).send({ error: 'JID do grupo e obrigatorio quando modo grupo esta ativo' });
    }
    if (merged.useGroup && merged.groupJid && !merged.groupJid.endsWith('@g.us')) {
      return reply.status(400).send({ error: 'JID do grupo deve terminar com @g.us' });
    }
    if (merged.windowStart && !HH_MM_RE.test(merged.windowStart)) {
      return reply.status(400).send({ error: 'Formato invalido (HH:mm) em janela inicio' });
    }
    if (merged.windowEnd && !HH_MM_RE.test(merged.windowEnd)) {
      return reply.status(400).send({ error: 'Formato invalido (HH:mm) em janela fim' });
    }

    const updated = await prisma.warmupPlan.update({ where: { id }, data: patch });
    return updated;
  });

  // ── Delete plan ─────────────────────────────────────────────────────────────
  app.delete('/api/warmup/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const plan = await prisma.warmupPlan.findFirst({ where: { id, userId } });
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado' });
    stopWarmup(id);
    await prisma.warmupPlan.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // ── Start ───────────────────────────────────────────────────────────────────
  app.post('/api/warmup/:id/start', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const plan = await prisma.warmupPlan.findFirst({ where: { id, userId } });
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado' });
    const connectedCount = plan.sessionIds.filter((sid) => !!getSession(sid)).length;
    if (connectedCount < 2) {
      return reply.status(400).send({ error: 'Conecte ao menos 2 sessoes antes de iniciar o aquecimento' });
    }
    await startWarmup(id);
    return reply.send({ ok: true, status: 'running' });
  });

  // ── Pause ───────────────────────────────────────────────────────────────────
  app.post('/api/warmup/:id/pause', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const plan = await prisma.warmupPlan.findFirst({ where: { id, userId } });
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado' });
    const changed = pauseWarmup(id);
    if (!changed) {
      await prisma.warmupPlan.update({ where: { id }, data: { status: 'paused', pausedAt: new Date() } });
      return reply.send({ ok: true, status: 'paused' });
    }
    return reply.send({ ok: true, status: 'pausing' });
  });

  // ── Stop ────────────────────────────────────────────────────────────────────
  app.post('/api/warmup/:id/stop', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const plan = await prisma.warmupPlan.findFirst({ where: { id, userId } });
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado' });
    const changed = stopWarmup(id);
    if (!changed) {
      await prisma.warmupPlan.update({ where: { id }, data: { status: 'idle' } });
      return reply.send({ ok: true, status: 'idle' });
    }
    return reply.send({ ok: true, status: 'stopping' });
  });

  // ── Logs ────────────────────────────────────────────────────────────────────
  app.get('/api/warmup/:id/logs', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const { page = 1, pageSize = 50 } = z
      .object({ page: z.coerce.number().default(1), pageSize: z.coerce.number().default(50) })
      .parse(req.query);

    const plan = await prisma.warmupPlan.findFirst({ where: { id, userId } });
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado' });

    const [rawItems, total] = await Promise.all([
      prisma.warmupLog.findMany({
        where: { planId: id },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.warmupLog.count({ where: { planId: id } }),
    ]);

    // Resolve session names for fromSession/toSession ids
    const sessionIds = Array.from(new Set(rawItems.flatMap((l) => [l.fromSession, l.toSession])));
    const sessions = sessionIds.length > 0
      ? await prisma.session.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true, name: true, phoneNumber: true },
        })
      : [];
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    const groupTargetLabel = plan.useGroup && plan.groupJid ? `Grupo (${plan.groupJid})` : null;
    const items = rawItems.map((log) => ({
      ...log,
      fromName: sessionMap.get(log.fromSession)?.name ?? null,
      toName: groupTargetLabel ?? sessionMap.get(log.toSession)?.name ?? null,
      fromPhone: sessionMap.get(log.fromSession)?.phoneNumber ?? null,
      toPhone: plan.useGroup ? plan.groupJid ?? null : sessionMap.get(log.toSession)?.phoneNumber ?? null,
    }));

    // Daily stats (last 14 days)
    const dailyStats = await prisma.$queryRaw<{ day: string; sent: bigint; failed: bigint }[]>`
      SELECT DATE("sentAt")::text AS day,
             COUNT(*) FILTER (WHERE status = 'sent') AS sent,
             COUNT(*) FILTER (WHERE status = 'failed') AS failed
      FROM "WarmupLog"
      WHERE "planId" = ${id}
        AND "sentAt" >= NOW() - INTERVAL '14 days'
      GROUP BY DATE("sentAt")
      ORDER BY day ASC
    `;

    return {
      items,
      total,
      page,
      pageSize,
      dailyStats: dailyStats.map((d) => ({
        day: d.day,
        sent: Number(d.sent),
        failed: Number(d.failed),
      })),
    };
  });

  // ── Stats summary ───────────────────────────────────────────────────────────
  app.get('/api/warmup/:id/stats', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const plan = await prisma.warmupPlan.findFirst({ where: { id, userId } });
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado' });

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [total, todayCount, failed] = await Promise.all([
      prisma.warmupLog.count({ where: { planId: id, status: 'sent' } }),
      prisma.warmupLog.count({ where: { planId: id, status: 'sent', sentAt: { gte: todayStart } } }),
      prisma.warmupLog.count({ where: { planId: id, status: 'failed' } }),
    ]);

    const progress = plan.durationDays > 0
      ? Math.min(100, Math.round((plan.currentDay / plan.durationDays) * 100))
      : 0;

    const chipHealth = plan.startedAt ? calcChipHealth(plan, total, failed) : 0;

    // Per-session health
    const perSessionAgg = await prisma.warmupLog.groupBy({
      by: ['fromSession', 'status'],
      where: { planId: id },
      _count: { _all: true },
    });

    const sessionStatsMap = new Map<string, { sent: number; failed: number }>();
    for (const sid of plan.sessionIds) sessionStatsMap.set(sid, { sent: 0, failed: 0 });
    for (const row of perSessionAgg) {
      const cur = sessionStatsMap.get(row.fromSession) ?? { sent: 0, failed: 0 };
      if (row.status === 'sent') cur.sent = row._count._all;
      else if (row.status === 'failed') cur.failed = row._count._all;
      sessionStatsMap.set(row.fromSession, cur);
    }

    const sessions = await prisma.session.findMany({
      where: { id: { in: plan.sessionIds } },
      select: { id: true, name: true, phoneNumber: true, status: true },
    });

    const sessionsWithHealth = sessions.map((s) => {
      const agg = sessionStatsMap.get(s.id) ?? { sent: 0, failed: 0 };
      const sessionHealth = plan.startedAt ? calcSessionHealth(plan, agg.sent, agg.failed) : 0;
      return {
        ...s,
        sent: agg.sent,
        failed: agg.failed,
        sessionHealth,
      };
    });

    return {
      total,
      todayCount,
      failed,
      progress,
      currentDay: plan.currentDay,
      durationDays: plan.durationDays,
      chipHealth,
      hasStarted: !!plan.startedAt,
      sessions: sessionsWithHealth,
    };
  });
}

