import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import * as baileys from '../../providers/baileys/manager.js';
import { NotFoundError } from '../../lib/errors.js';

export async function groupsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  /**
   * Extracts a clean phone number (digits only) from a JID.
   * Only @s.whatsapp.net JIDs carry real phone numbers in the local part.
   */
  const cleanJidPhone = (jid: string): string => {
    const domain = jid.split('@')[1] ?? '';
    if (domain === 'lid' || domain === 'g.us') return '';
    const digits = (jid.split('@')[0] ?? '').replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return '';
    return digits;
  };

  // ── List groups ────────────────────────────────────────────────────────────
  app.get('/sessions/:sessionId/groups', async (req) => {
    const { sessionId } = req.params as { sessionId: string };
    const session = await prisma.session.findFirst({ where: { id: sessionId, userId: req.user!.sub } });
    if (!session) throw new NotFoundError();
    return prisma.whatsAppGroup.findMany({ where: { sessionId }, orderBy: { updatedAt: 'desc' } });
  });

  // ── Global sync ────────────────────────────────────────────────────────────
  app.post('/sessions/:sessionId/groups/sync', async (req) => {
    const { sessionId } = req.params as { sessionId: string };
    const session = await prisma.session.findFirst({ where: { id: sessionId, userId: req.user!.sub } });
    if (!session) throw new NotFoundError();

    const groups = await baileys.fetchGroups(sessionId);
    const ownJid = baileys.getOwnJid(sessionId);

    const result: any[] = [];
    for (const g of groups) {
      // Participants come pre-resolved from manager.fetchGroups (phone JIDs when possible)
      const admins = g.participants.filter((p) => p.admin).map((p) => p.id);
      const members = g.participants.map((p) => p.id);

      const photo = await baileys.getProfilePictureUrl(sessionId, g.id);
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
          photo: photo ?? undefined,
          isAdmin: ownJid ? admins.includes(ownJid) : false,
        },
        update: {
          name: g.subject,
          description: g.desc ?? undefined,
          memberCount: members.length,
          admins,
          members,
          photo: photo ?? undefined,
          isAdmin: ownJid ? admins.includes(ownJid) : false,
        },
      });
      result.push(saved);
    }
    return result;
  });

  // ── Sync individual group members ──────────────────────────────────────────
  app.post('/:id/sync-members', async (req) => {
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
      data: { admins, members, memberCount: members.length },
    });
  });

  // ── Export members ─────────────────────────────────────────────────────────
  app.get('/:id/export', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { format } = z.object({ format: z.enum(['csv', 'xlsx']).default('csv') }).parse(req.query);

    const group = await prisma.whatsAppGroup.findUnique({ where: { id }, include: { session: true } });
    if (!group || group.session.userId !== req.user!.sub) throw new NotFoundError();

    const adminSet = new Set<string>(group.admins);
    const allJids = [...new Set([...group.admins, ...group.members])];

    interface Row { phone: string; is_admin: string }
    const rows: Row[] = [];
    for (const jid of allJids) {
      const phone = cleanJidPhone(jid);
      if (!phone) continue;
      rows.push({ phone, is_admin: adminSet.has(jid) ? 'sim' : 'nao' });
    }

    const safeFilename = group.name
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase() || 'grupo';

    if (format === 'csv') {
      const header = 'phone,is_admin\n';
      const body = rows.map((r) => `${r.phone},${r.is_admin}`).join('\n');
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${safeFilename}.csv"`);
      return header + body;
    }

    // Real XLSX binary via SheetJS
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({ Telefone: r.phone, Admin: r.is_admin === 'sim' ? 'Sim' : 'Não' })),
    );
    // Column widths
    ws['!cols'] = [{ wch: 18 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Membros');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename="${safeFilename}.xlsx"`);
    return reply.send(buf);
  });

  // ── Save members to contacts ───────────────────────────────────────────────
  app.post('/:id/save-to-contacts', async (req) => {
    const { id } = req.params as { id: string };
    const { name } = z.object({ name: z.string().optional() }).parse(req.body);

    const group = await prisma.whatsAppGroup.findUnique({ where: { id }, include: { session: true } });
    if (!group || group.session.userId !== req.user!.sub) throw new NotFoundError();

    const importName = name?.trim() || `Grupo: ${group.name}`;
    const groupTag = group.name.replace(/[^\w\s]/g, '').trim() || group.name;

    const allJids = [...new Set([...group.admins, ...group.members])];

    const userId = req.user!.sub;
    const imp = await prisma.contactImport.create({
      data: {
        userId,
        name: importName,
        filename: `${importName}.csv`,
        status: 'processing',
        contactCount: allJids.length,
      },
    });

    let processed = 0;
    for (const jid of allJids) {
      const phone = cleanJidPhone(jid);
      if (!phone) continue;
      try {
        await prisma.contact.upsert({
          where: { userId_phone: { userId, phone } },
          create: { userId, phone, name: phone, origin: `import:${imp.id}`, tags: [groupTag] },
          update: { origin: `import:${imp.id}`, tags: [groupTag] },
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
