import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError } from '../../lib/errors.js';

const createWebhookSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  method: z.enum(['POST', 'GET', 'PUT']).default('POST'),
  events: z.array(z.string()).min(1), // ["contact.created", "message.received", etc]
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateWebhookSchema = createWebhookSchema.partial();

export async function webhooksRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // ── List webhooks ─────────────────────────────────────────────────────────
  app.get('/', async (req) => {
    const userId = req.user!.sub;
    const { page, pageSize } = z
      .object({
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().min(1).max(100).default(20),
      })
      .parse(req.query);

    const [items, total] = await Promise.all([
      prisma.webhook.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.webhook.count({ where: { userId } }),
    ]);

    return { items, total, page, pageSize };
  });

  // ── Get webhook by ID ─────────────────────────────────────────────────────
  app.get('/:id', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const webhook = await prisma.webhook.findFirst({
      where: { id, userId },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!webhook) throw new NotFoundError('Webhook não encontrado');
    return webhook;
  });

  // ── Create webhook ────────────────────────────────────────────────────────
  app.post('/', async (req) => {
    const userId = req.user!.sub;
    const body = createWebhookSchema.parse(req.body);

    const webhook = await prisma.webhook.create({
      data: { ...body, userId },
    });

    return webhook;
  });

  // ── Update webhook ────────────────────────────────────────────────────────
  app.patch('/:id', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const body = updateWebhookSchema.parse(req.body);

    const existing = await prisma.webhook.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Webhook não encontrado');

    const webhook = await prisma.webhook.update({
      where: { id },
      data: body,
    });

    return webhook;
  });

  // ── Delete webhook ────────────────────────────────────────────────────────
  app.delete('/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const existing = await prisma.webhook.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Webhook não encontrado');

    await prisma.webhook.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ── Test webhook ──────────────────────────────────────────────────────────
  app.post('/:id/test', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const webhook = await prisma.webhook.findFirst({ where: { id, userId } });
    if (!webhook) throw new NotFoundError('Webhook não encontrado');

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'Teste de webhook' },
    };

    try {
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.headers as Record<string, string>),
          ...(webhook.secret ? { 'X-Webhook-Secret': webhook.secret } : {}),
        },
        body: JSON.stringify(testPayload),
      });

      const responseData = await response.text().catch(() => '');

      await prisma.webhookLog.create({
        data: {
          webhookId: id,
          event: 'webhook.test',
          payload: testPayload,
          response: responseData ? { body: responseData } : null,
          statusCode: response.status,
        },
      });

      return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? 'Webhook testado com sucesso' : 'Webhook retornou erro',
      };
    } catch (error: any) {
      await prisma.webhookLog.create({
        data: {
          webhookId: id,
          event: 'webhook.test',
          payload: testPayload,
          error: error.message,
        },
      });

      return {
        success: false,
        message: 'Erro ao testar webhook',
        error: error.message,
      };
    }
  });

  // ── Webhook logs ──────────────────────────────────────────────────────────
  app.get('/:id/logs', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const { page, pageSize } = z
      .object({
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().min(1).max(100).default(50),
      })
      .parse(req.query);

    const webhook = await prisma.webhook.findFirst({ where: { id, userId } });
    if (!webhook) throw new NotFoundError('Webhook não encontrado');

    const [items, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where: { webhookId: id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.webhookLog.count({ where: { webhookId: id } }),
    ]);

    return { items, total, page, pageSize };
  });

  // ── Webhook stats ─────────────────────────────────────────────────────────
  app.get('/:id/stats', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const webhook = await prisma.webhook.findFirst({ where: { id, userId } });
    if (!webhook) throw new NotFoundError('Webhook não encontrado');

    const [total, success, failed] = await Promise.all([
      prisma.webhookLog.count({ where: { webhookId: id } }),
      prisma.webhookLog.count({
        where: { webhookId: id, statusCode: { gte: 200, lt: 300 } },
      }),
      prisma.webhookLog.count({
        where: {
          webhookId: id,
          OR: [{ statusCode: { gte: 400 } }, { error: { not: null } }],
        },
      }),
    ]);

    return {
      total,
      success,
      failed,
      successRate: total > 0 ? (success / total) * 100 : 0,
    };
  });
}
