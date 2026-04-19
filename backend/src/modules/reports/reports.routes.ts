import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/api/dashboard/overview', async (req) => {
    const userId = req.user!.sub;
    const { sessionId } = z.object({ sessionId: z.string().optional() }).parse(req.query);

    const availableSessions = await prisma.session.findMany({
      where: { userId, ...(sessionId ? { id: sessionId } : {}) },
      select: { id: true },
    });

    const sessionIds = availableSessions.map((s) => s.id);
    const phonesInScope =
      sessionIds.length > 0
        ? await prisma.conversation.findMany({
            where: { sessionId: { in: sessionIds } },
            select: { phone: true },
            distinct: ['phone'],
          })
        : [];

    const phones = phonesInScope.map((row) => row.phone);

    const [contactsTotal, contactsOptIn, campaigns, sessions, messagesSent, messagesRead] = await Promise.all([
      sessionId ? Promise.resolve(phones.length) : prisma.contact.count(),
      sessionId
        ? phones.length
          ? prisma.contact.count({ where: { phone: { in: phones }, optIn: 'granted' } })
          : Promise.resolve(0)
        : prisma.contact.count({ where: { optIn: 'granted' } }),
      prisma.campaign.count({ where: { userId, ...(sessionId ? { sessionId } : {}) } }),
      Promise.resolve(sessionIds.length),
      sessionIds.length
        ? prisma.message.count({
            where: {
              direction: 'outbound',
              status: { in: ['sent', 'delivered', 'read'] },
              conversation: { sessionId: { in: sessionIds } },
            },
          })
        : Promise.resolve(0),
      sessionIds.length
        ? prisma.message.count({
            where: {
              direction: 'outbound',
              status: 'read',
              conversation: { sessionId: { in: sessionIds } },
            },
          })
        : Promise.resolve(0),
    ]);

    return {
      contacts: { total: contactsTotal, optIn: contactsOptIn },
      campaigns: { total: campaigns },
      sessions: { total: sessions },
      delivery: { sent: messagesSent, read: messagesRead },
    };
  });

  app.get('/api/reports/campaigns', async (req) => {
    const userId = req.user!.sub;
    return prisma.campaign.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        status: true,
        sentCount: true,
        deliveredCount: true,
        failedCount: true,
        responseCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  app.get('/api/reports/contacts', async () => {
    const [total, active, inactive, pending] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { status: 'active' } }),
      prisma.contact.count({ where: { status: 'inactive' } }),
      prisma.contact.count({ where: { status: 'pending' } }),
    ]);
    return { total, active, inactive, pending };
  });

  app.get('/api/reports/sessions', async (req) => {
    const userId = req.user!.sub;
    const rows = await prisma.session.findMany({ where: { userId } });
    return {
      total: rows.length,
      healthAvg: Math.round(rows.reduce((a, r) => a + r.healthScore, 0) / (rows.length || 1)),
      reconnections: rows.reduce((a, r) => a + r.reconnectCount, 0),
      failures: rows.reduce((a, r) => a + r.failureCount, 0),
      byStatus: rows.reduce<Record<string, number>>((a, r) => {
        a[r.status] = (a[r.status] ?? 0) + 1;
        return a;
      }, {}),
    };
  });

  app.get('/api/reports/groups', async (req) => {
    const userId = req.user!.sub;
    const sessions = await prisma.session.findMany({ where: { userId }, select: { id: true } });
    const groups = await prisma.whatsAppGroup.findMany({ where: { sessionId: { in: sessions.map((s) => s.id) } } });
    return {
      total: groups.length,
      membersTotal: groups.reduce((a, g) => a + g.memberCount, 0),
      adminOf: groups.filter((g) => g.isAdmin).length,
    };
  });
}
