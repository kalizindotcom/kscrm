import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError } from '../../lib/errors.js';

export async function templatesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/api/templates', async () => {
    return prisma.messageTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  });

  app.post('/api/templates', async (req, reply) => {
    const body = z
      .object({
        title: z.string().min(1),
        category: z.string().default('Geral'),
        channel: z.enum(['whatsapp', 'sms']).default('whatsapp'),
        content: z.string().min(1),
        isFavorite: z.boolean().default(false),
      })
      .parse(req.body);

    const template = await prisma.messageTemplate.create({ data: { ...body, version: 1 } });
    return reply.status(201).send(template);
  });

  app.put('/api/templates/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({
        title: z.string().optional(),
        category: z.string().optional(),
        content: z.string().optional(),
        isFavorite: z.boolean().optional(),
      })
      .parse(req.body);

    const tpl = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundError();

    return prisma.messageTemplate.update({ where: { id }, data: { ...body, version: { increment: 1 } } });
  });

  app.delete('/api/templates/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const tpl = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundError();
    await prisma.messageTemplate.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}
