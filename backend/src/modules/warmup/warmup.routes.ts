import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { startWarmup, stopWarmup, pauseWarmup, isActive, calcChipHealth } from './warmup-worker.js';

const createSchema = z.object({
  name: z.string().min(1),
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
  mediaFreq: z.coerce.number().int().min(1).max(50).optional().default(5),
  audioEnabled: z.boolean().optional().default(false),
  customMessages: z.array(z.string()).optional().default([]),
});

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
    const body = createSchema.parse(req.body);

    // Validate sessions belong to user
    const sessions = await prisma.session.findMany({
      where: { id: { in: body.sessionIds }, userId },
      select: { id: true },
    });
    if (sessions.length < 2) {
      return reply.status(400).send({ error: 'Sessões inválidas ou insuficientes' });
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

    const body = createSchema.partial().parse(req.body);
    const updated = await prisma.warmupPlan.update({ where: { id }, data: body });
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
    await startWarmup(id);
    return reply.send({ ok: true, status: 'running' });
  });

  // ── Pause ───────────────────────────────────────────────────────────────────
  app.post('/api/warmup/:id/pause', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const plan = await prisma.warmupPlan.findFirst({ where: { id, userId } });
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado' });
    const stopped = pauseWarmup(id);
    if (!stopped) {
      await prisma.warmupPlan.update({ where: { id }, data: { status: 'paused' } });
    }
    return reply.send({ ok: true, status: 'paused' });
  });

  // ── Stop ────────────────────────────────────────────────────────────────────
  app.post('/api/warmup/:id/stop', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const plan = await prisma.warmupPlan.findFirst({ where: { id, userId } });
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado' });
    const stopped = stopWarmup(id);
    if (!stopped) {
      await prisma.warmupPlan.update({ where: { id }, data: { status: 'idle' } });
    }
    return reply.send({ ok: true, status: 'idle' });
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

    const [items, total] = await Promise.all([
      prisma.warmupLog.findMany({
        where: { planId: id },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.warmupLog.count({ where: { planId: id } }),
    ]);

    // Daily stats (last 14 days)
    const dailyStats = await prisma.$queryRaw<{ day: string; sent: bigint; failed: bigint }[]>`
      SELECT DATE(sent_at)::text AS day,
             COUNT(*) FILTER (WHERE status = 'sent') AS sent,
             COUNT(*) FILTER (WHERE status = 'failed') AS failed
      FROM "WarmupLog"
      WHERE plan_id = ${id}
        AND sent_at >= NOW() - INTERVAL '14 days'
      GROUP BY DATE(sent_at)
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
      prisma.warmupLog.count({ where: { planId: id, sentAt: { gte: todayStart } } }),
      prisma.warmupLog.count({ where: { planId: id, status: 'failed' } }),
    ]);

    const progress = plan.durationDays > 0
      ? Math.min(100, Math.round((plan.currentDay / plan.durationDays) * 100))
      : 0;

    const chipHealth = calcChipHealth(plan, total, failed);

    // Fetch session details
    const sessions = await prisma.session.findMany({
      where: { id: { in: plan.sessionIds } },
      select: { id: true, name: true, phoneNumber: true, status: true },
    });

    return { total, todayCount, failed, progress, currentDay: plan.currentDay, durationDays: plan.durationDays, chipHealth, sessions };
  });
}
