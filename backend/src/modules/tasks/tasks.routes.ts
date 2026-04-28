import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError } from '../../lib/errors.js';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['task', 'call', 'email', 'meeting', 'follow_up']).default('task'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  reminderAt: z.string().datetime().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateTaskSchema = createTaskSchema.partial();

export async function tasksRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // ── List tasks ────────────────────────────────────────────────────────────
  app.get('/', async (req) => {
    const userId = req.user!.sub;
    const { status, assignedTo, type, dealId, page, pageSize } = z
      .object({
        status: z.string().optional(),
        assignedTo: z.string().optional(),
        type: z.string().optional(),
        dealId: z.string().optional(),
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().min(1).max(100).default(50),
      })
      .parse(req.query);

    const where: any = { userId };
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;
    if (type) where.type = type;
    if (dealId) where.dealId = dealId;

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          deal: { select: { id: true, title: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return { items, total, page, pageSize };
  });

  // ── Get task by ID ────────────────────────────────────────────────────────
  app.get('/:id', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const task = await prisma.task.findFirst({
      where: { id, userId },
      include: {
        deal: { select: { id: true, title: true } },
      },
    });

    if (!task) throw new NotFoundError('Tarefa não encontrada');
    return task;
  });

  // ── Create task ───────────────────────────────────────────────────────────
  app.post('/', async (req) => {
    const userId = req.user!.sub;
    const body = createTaskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: { ...body, userId },
    });

    return task;
  });

  // ── Update task ───────────────────────────────────────────────────────────
  app.patch('/:id', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const body = updateTaskSchema.parse(req.body);

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Tarefa não encontrada');

    const task = await prisma.task.update({
      where: { id },
      data: body,
    });

    return task;
  });

  // ── Complete task ─────────────────────────────────────────────────────────
  app.post('/:id/complete', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Tarefa não encontrada');

    const task = await prisma.task.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Log activity if task is linked to a deal
    if (task.dealId) {
      await prisma.dealActivity.create({
        data: {
          dealId: task.dealId,
          type: 'task_completed',
          description: `Tarefa concluída: ${task.title}`,
          userId,
        },
      });
    }

    return task;
  });

  // ── Delete task ───────────────────────────────────────────────────────────
  app.delete('/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Tarefa não encontrada');

    await prisma.task.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ── Calendar view (tasks by date range) ───────────────────────────────────
  app.get('/calendar/range', async (req) => {
    const userId = req.user!.sub;
    const { start, end } = z
      .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
      .parse(req.query);

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        dueDate: {
          gte: new Date(start),
          lte: new Date(end),
        },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        deal: { select: { id: true, title: true } },
      },
    });

    return { tasks };
  });

  // ── Overdue tasks ─────────────────────────────────────────────────────────
  app.get('/overdue', async (req) => {
    const userId = req.user!.sub;

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ['pending', 'in_progress'] },
        dueDate: { lt: new Date() },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        deal: { select: { id: true, title: true } },
      },
    });

    return { tasks, count: tasks.length };
  });
}
