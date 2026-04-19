import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import * as baileys from '../../providers/baileys/manager.js';
import { NotFoundError } from '../../lib/errors.js';

export async function groupsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/api/sessions/:sessionId/groups', async (req) => {
    const { sessionId } = req.params as { sessionId: string };
    const session = await prisma.session.findFirst({ where: { id: sessionId, userId: req.user!.sub } });
    if (!session) throw new NotFoundError();
    return prisma.whatsAppGroup.findMany({ where: { sessionId }, orderBy: { updatedAt: 'desc' } });
  });

  app.post('/api/sessions/:sessionId/groups/sync', async (req) => {
    const { sessionId } = req.params as { sessionId: string };
    const session = await prisma.session.findFirst({ where: { id: sessionId, userId: req.user!.sub } });
    if (!session) throw new NotFoundError();

    const groups = await baileys.fetchGroups(sessionId);
    const ownJid = baileys.getOwnJid(sessionId);
    const result: any[] = [];
    for (const g of groups) {
      const admins = g.participants.filter((p) => p.admin).map((p) => p.id);
      const members = g.participants.map((p) => p.id);
      const saved = await prisma.whatsAppGroup.upsert({
        where: { sessionId_waGroupId: { sessionId, waGroupId: g.id } },
        create: {
          sessionId,
          waGroupId: g.id,
          name: g.subject,
          description: g.desc ?? undefined,
          memberCount: members.length,
          admins,
          members,
          isAdmin: ownJid ? admins.includes(ownJid) : false,
        },
        update: {
          name: g.subject,
          description: g.desc ?? undefined,
          memberCount: members.length,
          admins,
          members,
          isAdmin: ownJid ? admins.includes(ownJid) : false,
        },
      });
      result.push(saved);
    }
    return result;
  });

  app.post('/api/groups/:id/sync-members', async (req) => {
    const { id } = req.params as { id: string };
    const group = await prisma.whatsAppGroup.findUnique({ where: { id }, include: { session: true } });
    if (!group || group.session.userId !== req.user!.sub) throw new NotFoundError();

    const groups = await baileys.fetchGroups(group.sessionId);
    const remote = groups.find((g) => g.id === group.waGroupId);
    if (!remote) throw new NotFoundError('Grupo não encontrado na sessão conectada');

    const admins = remote.participants.filter((p) => p.admin).map((p) => p.id);
    const members = remote.participants.map((p) => p.id);
    return prisma.whatsAppGroup.update({
      where: { id: group.id },
      data: {
        admins,
        members,
        memberCount: members.length,
      },
    });
  });

  app.get('/api/groups/:id/export', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { format } = z.object({ format: z.enum(['csv', 'xlsx']).default('csv') }).parse(req.query);

    const group = await prisma.whatsAppGroup.findUnique({ where: { id }, include: { session: true } });
    if (!group || group.session.userId !== req.user!.sub) throw new NotFoundError();

    const phones = group.members.map((jid) => jid.split('@')[0]);
    if (format === 'csv') {
      const text = 'phone\n' + phones.join('\n');
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="${group.name}.csv"`);
      return text;
    }
    // xlsx simplificado como TSV
    reply.header('Content-Type', 'text/tab-separated-values');
    reply.header('Content-Disposition', `attachment; filename="${group.name}.tsv"`);
    return 'phone\n' + phones.join('\n');
  });

  app.post('/api/groups/:id/save-to-contacts', async (req) => {
    const { id } = req.params as { id: string };
    const group = await prisma.whatsAppGroup.findUnique({ where: { id }, include: { session: true } });
    if (!group || group.session.userId !== req.user!.sub) throw new NotFoundError();

    const imp = await prisma.contactImport.create({
      data: {
        name: `Grupo: ${group.name}`,
        filename: `${group.name}.csv`,
        status: 'processing',
        contactCount: group.members.length,
      },
    });
    let processed = 0;
    for (const jid of group.members) {
      const phone = jid.split('@')[0];
      try {
        await prisma.contact.upsert({
          where: { phone },
          create: { phone, name: phone, origin: `import:${imp.id}:group:${group.id}` },
          update: { origin: `import:${imp.id}:group:${group.id}` },
        });
        processed++;
      } catch {}
    }
    return prisma.contactImport.update({
      where: { id: imp.id },
      data: { status: 'completed', processedCount: processed },
    });
  });
}
