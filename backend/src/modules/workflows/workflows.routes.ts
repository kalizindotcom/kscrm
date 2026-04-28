import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError } from '../../lib/errors.js';

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'draft']).default('draft'),
  trigger: z.object({
    type: z.string(), // contact_created | message_received | deal_stage_changed | etc
    conditions: z.record(z.any()).optional(),
  }),
  actions: z.array(
    z.object({
      type: z.string(), // send_message | create_task | update_contact | webhook | etc
      delay: z.number().optional(), // seconds
      config: z.record(z.any()),
    }),
  ),
});

const updateWorkflowSchema = createWorkflowSchema.partial();

export async function workflowsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // ── List workflows ────────────────────────────────────────────────────────
  app.get('/', async (req) => {
    const userId = req.user!.sub;
    const { status, page, pageSize } = z
      .object({
        status: z.string().optional(),
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().min(1).max(100).default(20),
      })
      .parse(req.query);

    const where: any = { userId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.workflow.count({ where }),
    ]);

    return { items, total, page, pageSize };
  });

  // ── Get workflow by ID ────────────────────────────────────────────────────
  app.get('/:id', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const workflow = await prisma.workflow.findFirst({
      where: { id, userId },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!workflow) throw new NotFoundError('Workflow não encontrado');
    return workflow;
  });

  // ── Create workflow ───────────────────────────────────────────────────────
  app.post('/', async (req) => {
    const userId = req.user!.sub;
    const body = createWorkflowSchema.parse(req.body);

    const workflow = await prisma.workflow.create({
      data: { ...body, userId },
    });

    return workflow;
  });

  // ── Update workflow ───────────────────────────────────────────────────────
  app.patch('/:id', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const body = updateWorkflowSchema.parse(req.body);

    const existing = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Workflow não encontrado');

    const workflow = await prisma.workflow.update({
      where: { id },
      data: body,
    });

    return workflow;
  });

  // ── Activate/Deactivate workflow ──────────────────────────────────────────
  app.post('/:id/toggle', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const existing = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Workflow não encontrado');

    const newStatus = existing.status === 'active' ? 'inactive' : 'active';

    const workflow = await prisma.workflow.update({
      where: { id },
      data: { status: newStatus },
    });

    return workflow;
  });

  // ── Delete workflow ───────────────────────────────────────────────────────
  app.delete('/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const existing = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Workflow não encontrado');

    await prisma.workflow.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ── Test workflow (manual execution) ──────────────────────────────────────
  app.post('/:id/test', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const { contactId, dealId } = z
      .object({
        contactId: z.string().optional(),
        dealId: z.string().optional(),
      })
      .parse(req.body);

    const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) throw new NotFoundError('Workflow não encontrado');

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: id,
        contactId,
        dealId,
        status: 'running',
        currentStep: 0,
        log: { message: 'Teste manual iniciado' },
      },
    });

    // TODO: Implement actual workflow execution logic
    // For now, just mark as completed
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        log: { message: 'Teste concluído (simulação)' },
      },
    });

    return { execution, message: 'Workflow testado com sucesso' };
  });

  // ── Workflow executions ───────────────────────────────────────────────────
  app.get('/:id/executions', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const { page, pageSize } = z
      .object({
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().min(1).max(100).default(20),
      })
      .parse(req.query);

    const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) throw new NotFoundError('Workflow não encontrado');

    const [items, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where: { workflowId: id },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.workflowExecution.count({ where: { workflowId: id } }),
    ]);

    return { items, total, page, pageSize };
  });

  // ── Workflow stats ────────────────────────────────────────────────────────
  app.get('/:id/stats', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) throw new NotFoundError('Workflow não encontrado');

    const [total, completed, failed, running] = await Promise.all([
      prisma.workflowExecution.count({ where: { workflowId: id } }),
      prisma.workflowExecution.count({ where: { workflowId: id, status: 'completed' } }),
      prisma.workflowExecution.count({ where: { workflowId: id, status: 'failed' } }),
      prisma.workflowExecution.count({ where: { workflowId: id, status: 'running' } }),
    ]);

    return {
      total,
      completed,
      failed,
      running,
      successRate: total > 0 ? (completed / total) * 100 : 0,
    };
  });
}
