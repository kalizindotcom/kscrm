import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError } from '../../lib/errors.js';

export async function conversationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/api/conversations', async (req) => {
    const { sessionId, status, search } = z
      .object({
        sessionId: z.string().optional(),
        status: z.enum(['open', 'pending', 'resolved']).optional(),
        search: z.string().optional(),
      })
      .parse(req.query);

    const sessions = await prisma.session.findMany({ where: { userId: req.user!.sub }, select: { id: true } });
    const sessionIds = sessions.map((s) => s.id);

    return prisma.conversation.findMany({
      where: {
        sessionId: sessionId ?? { in: sessionIds },
        ...(status ? { status } : {}),
        ...(search
          ? { OR: [{ contactName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  });

  app.get('/api/conversations/:id', async (req) => {
    const { id } = req.params as { id: string };
    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: { session: true },
    });
    if (!conv || conv.session.userId !== req.user!.sub) throw new NotFoundError();
    return conv;
  });

  app.get('/api/conversations/:id/messages', async (req) => {
    const { id } = req.params as { id: string };
    const { before, limit } = z
      .object({ before: z.string().optional(), limit: z.coerce.number().default(50) })
      .parse(req.query);

    const conv = await prisma.conversation.findUnique({ where: { id }, include: { session: true } });
    if (!conv || conv.session.userId !== req.user!.sub) throw new NotFoundError();

    return prisma.message.findMany({
      where: {
        conversationId: id,
        ...(before ? { timestamp: { lt: new Date(before) } } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 200),
    });
  });

  app.patch('/api/conversations/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({ status: z.enum(['open', 'pending', 'resolved']).optional(), unreadCount: z.number().optional() })
      .parse(req.body);

    const conv = await prisma.conversation.findUnique({ where: { id }, include: { session: true } });
    if (!conv || conv.session.userId !== req.user!.sub) throw new NotFoundError();

    return prisma.conversation.update({ where: { id }, data: body });
  });

  app.delete('/api/conversations/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const conv = await prisma.conversation.findUnique({ where: { id }, include: { session: true } });
    if (!conv || conv.session.userId !== req.user!.sub) throw new NotFoundError();
    await prisma.conversation.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}
