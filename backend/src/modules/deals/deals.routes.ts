import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError } from '../../lib/errors.js';

const createDealSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  value: z.number().optional(),
  currency: z.string().default('BRL'),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).default('lead'),
  probability: z.number().int().min(0).max(100).default(0),
  expectedCloseDate: z.string().datetime().optional(),
  contactId: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
});

const updateDealSchema = createDealSchema.partial();

const moveStageSchema = z.object({
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  lostReason: z.string().optional(),
});

export async function dealsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // ── List deals ────────────────────────────────────────────────────────────
  app.get('/', async (req) => {
    const userId = req.user!.sub;
    const { stage, assignedTo, search, page, pageSize } = z
      .object({
        stage: z.string().optional(),
        assignedTo: z.string().optional(),
        search: z.string().optional(),
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().min(1).max(100).default(20),
      })
      .parse(req.query);

    const where: any = { userId };
    if (stage) where.stage = stage;
    if (assignedTo) where.assignedTo = assignedTo;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.deal.count({ where }),
    ]);

    return { items, total, page, pageSize };
  });

  // ── Get deal by ID ────────────────────────────────────────────────────────
  app.get('/:id', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const deal = await prisma.deal.findFirst({
      where: { id, userId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        notes: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: { dueDate: 'asc' } },
      },
    });

    if (!deal) throw new NotFoundError('Deal não encontrado');
    return deal;
  });

  // ── Create deal ───────────────────────────────────────────────────────────
  app.post('/', async (req) => {
    const userId = req.user!.sub;
    const body = createDealSchema.parse(req.body);

    const deal = await prisma.deal.create({
      data: { ...body, userId },
    });

    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        type: 'stage_change',
        description: `Deal criado no estágio: ${deal.stage}`,
        userId,
      },
    });

    return deal;
  });

  // ── Update deal ───────────────────────────────────────────────────────────
  app.patch('/:id', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const body = updateDealSchema.parse(req.body);

    const existing = await prisma.deal.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Deal não encontrado');

    const deal = await prisma.deal.update({
      where: { id },
      data: body,
    });

    return deal;
  });

  // ── Move deal to stage ────────────────────────────────────────────────────
  app.post('/:id/move', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const { stage, lostReason } = moveStageSchema.parse(req.body);

    const existing = await prisma.deal.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Deal não encontrado');

    const updates: any = { stage };
    if (stage === 'won' || stage === 'lost') {
      updates.actualCloseDate = new Date();
      if (stage === 'lost' && lostReason) {
        updates.lostReason = lostReason;
      }
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: updates,
    });

    await prisma.dealActivity.create({
      data: {
        dealId: id,
        type: 'stage_change',
        description: `Estágio alterado de ${existing.stage} para ${stage}`,
        userId,
      },
    });

    return deal;
  });

  // ── Delete deal ───────────────────────────────────────────────────────────
  app.delete('/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const existing = await prisma.deal.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Deal não encontrado');

    await prisma.deal.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ── Pipeline stats ────────────────────────────────────────────────────────
  app.get('/stats/pipeline', async (req) => {
    const userId = req.user!.sub;

    const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    const stats = await Promise.all(
      stages.map(async (stage) => {
        const deals = await prisma.deal.findMany({
          where: { userId, stage },
          select: { value: true },
        });

        const count = deals.length;
        const totalValue = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);

        return { stage, count, totalValue };
      }),
    );

    return { stats };
  });
}
