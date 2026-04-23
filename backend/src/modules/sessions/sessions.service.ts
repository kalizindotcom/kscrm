import { prisma } from '../../db/client.js';
import * as baileys from '../../providers/baileys/manager.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';

export function toApi(s: any) {
  return {
    id: s.id,
    name: s.name,
    nickname: s.nickname ?? undefined,
    channel: s.channel,
    phoneNumber: s.phoneNumber ?? undefined,
    status: s.status,
    environment: s.environment,
    responsible: s.responsible ?? undefined,
    description: s.description ?? undefined,
    tags: s.tags ?? [],
    notes: s.notes ?? undefined,
    favorite: s.favorite,
    qrCodeDataUrl: s.qrCodeDataUrl ?? undefined,
    healthScore: s.healthScore,
    reconnectCount: s.reconnectCount,
    failureCount: s.failureCount,
    syncCount: s.syncCount,
    lastActivity: s.lastActivity?.toISOString(),
    lastConnectedAt: s.lastConnectedAt?.toISOString(),
    lastDisconnectedAt: s.lastDisconnectedAt?.toISOString(),
    disconnectReason: s.disconnectReason ?? undefined,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    recentLogs: (s.logs ?? []).map((l: any) => ({
      id: l.id,
      sessionId: l.sessionId,
      timestamp: l.timestamp.toISOString(),
      type: l.type,
      severity: l.severity,
      message: l.message,
      origin: l.origin,
      user: l.user ?? undefined,
    })),
  };
}

async function assertSessionOwnership(userId: string, id: string) {
  const session = await prisma.session.findFirst({ where: { id, userId }, select: { id: true } });
  if (!session) throw new NotFoundError('Sessão não encontrada');
  return session;
}

export async function list(userId: string) {
  const rows = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { logs: { orderBy: { timestamp: 'desc' }, take: 50 } },
  });
  return rows.map(toApi);
}

export async function get(userId: string, id: string) {
  const s = await prisma.session.findFirst({
    where: { id, userId },
    include: { logs: { orderBy: { timestamp: 'desc' }, take: 50 } },
  });
  if (!s) throw new NotFoundError('Sessão não encontrada');
  return toApi(s);
}

export async function create(
  userId: string,
  data: {
    name: string;
    nickname?: string;
    environment?: string;
    tags?: string[];
    description?: string;
    responsible?: string;
  },
) {
  const s = await prisma.session.create({
    data: {
      userId,
      name: data.name,
      nickname: data.nickname,
      environment: data.environment ?? 'production',
      tags: data.tags ?? [],
      description: data.description,
      responsible: data.responsible,
    },
    include: { logs: true },
  });
  return toApi(s);
}

export async function update(userId: string, id: string, data: any) {
  await assertSessionOwnership(userId, id);

  await prisma.session.update({
    where: { id },
    data: {
      name: data.name,
      nickname: data.nickname,
      tags: data.tags,
      notes: data.notes,
      description: data.description,
      favorite: data.favorite,
      environment: data.environment,
      responsible: data.responsible,
      ...(data.antiBanEnabled !== undefined ? { antiBanEnabled: data.antiBanEnabled } as any : {}),
    },
  });
  return get(userId, id);
}

export async function remove(userId: string, id: string) {
  await assertSessionOwnership(userId, id);
  await baileys.remove(id);
  await prisma.session.delete({ where: { id } });
}

export async function connect(userId: string, id: string) {
  await assertSessionOwnership(userId, id);
  await baileys.ensure(id);
  await prisma.session.update({ where: { id }, data: { status: 'pairing' } });
  return { ok: true };
}

export async function pairingCode(userId: string, id: string, phone: string) {
  await assertSessionOwnership(userId, id);
  const code = await baileys.requestPairingCode(id, phone);
  return { code };
}

export async function pause(userId: string, id: string) {
  await assertSessionOwnership(userId, id);
  await baileys.stop(id, 'pause');
  await prisma.session.update({ where: { id }, data: { status: 'paused' } });
  return { ok: true };
}

export async function resume(userId: string, id: string) {
  await assertSessionOwnership(userId, id);
  await baileys.ensure(id);
  await prisma.session.update({ where: { id }, data: { status: 'pairing' } });
  return { ok: true };
}

export async function terminate(userId: string, id: string) {
  await assertSessionOwnership(userId, id);
  await baileys.stop(id, 'terminate');
  await prisma.session.update({ where: { id }, data: { status: 'terminated' } });
  return { ok: true };
}

export async function qr(userId: string, id: string) {
  await assertSessionOwnership(userId, id);
  const session = await prisma.session.findUnique({
    where: { id },
    select: { id: true, qrCodeDataUrl: true, status: true },
  });
  if (!session) throw new NotFoundError('Sessão não encontrada');
  return {
    sessionId: session.id,
    status: session.status,
    dataUrl: session.qrCodeDataUrl ?? null,
  };
}

const cleanJidPhone = (jid: string): string => {
  const domain = jid.split('@')[1] ?? '';
  if (domain === 'lid' || domain === 'g.us') return '';
  const digits = (jid.split('@')[0] ?? '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return '';
  return digits;
};

export async function archive(userId: string, id: string) {
  await assertSessionOwnership(userId, id);
  await baileys.stop(id, 'archive').catch(() => undefined);

  const session = await prisma.session.findUnique({
    where: { id },
    select: { tags: true },
  });
  const tags = Array.from(new Set([...(session?.tags ?? []), 'archived']));

  await prisma.session.update({
    where: { id },
    data: {
      status: 'archived',
      tags,
      lastDisconnectedAt: new Date(),
    },
  });
  return get(userId, id);
}

export async function unarchive(userId: string, id: string) {
  await assertSessionOwnership(userId, id);
  const session = await prisma.session.findUnique({
    where: { id },
    select: { tags: true },
  });
  const tags = (session?.tags ?? []).filter((tag) => tag !== 'archived');
  await prisma.session.update({
    where: { id },
    data: {
      status: 'disconnected',
      tags,
    },
  });
  return get(userId, id);
}

export async function syncContacts(userId: string, id: string) {
  await assertSessionOwnership(userId, id);
  const session = await prisma.session.findUnique({
    where: { id },
    select: { id: true, name: true, status: true },
  });
  if (!session) throw new NotFoundError('Sessão não encontrada');
  if (session.status !== 'connected') throw new ValidationError('Sessão não conectada');

  await prisma.session.update({
    where: { id },
    data: {
      status: 'syncing',
      syncCount: { increment: 1 },
      lastActivity: new Date(),
    },
  });

  await prisma.sessionLog.create({
    data: {
      sessionId: id,
      type: 'sync_contacts',
      severity: 'info',
      message: 'Sincronização de contatos iniciada',
      origin: 'system',
    },
  });

  const importName = `Contatos WhatsApp - ${session.name}`;
  const importRow = await prisma.contactImport.create({
    data: {
      userId,
      name: importName,
      filename: `${importName}.csv`,
      status: 'processing',
    },
  });

  let processedCount = 0;
  let errorCount = 0;
  const errorPhones: string[] = [];

  try {
    const groups = await baileys.fetchGroups(id);
    const sessionTag = `sessao:${session.name}`.trim();
    const allJids = groups.flatMap((group) => group.participants.map((participant) => participant.id));
    const uniquePhones = Array.from(new Set(allJids.map(cleanJidPhone).filter(Boolean)));

    for (const phone of uniquePhones) {
      try {
        const existing = await prisma.contact.findFirst({
          where: { userId, phone },
          select: { tags: true },
        });
        const tags = Array.from(new Set([...(existing?.tags ?? []), sessionTag]));
        await prisma.contact.upsert({
          where: { userId_phone: { userId, phone } },
          create: {
            userId,
            phone,
            name: phone,
            origin: `session:${id}`,
            tags,
          },
          update: {
            origin: `session:${id}`,
            tags,
          },
        });
        processedCount += 1;
      } catch {
        errorCount += 1;
        if (errorPhones.length < 20) errorPhones.push(phone);
      }
    }

    await prisma.contactImport.update({
      where: { id: importRow.id },
      data: {
        status: 'completed',
        contactCount: uniquePhones.length,
        processedCount,
        errorCount,
        errorLog: errorPhones.length ? errorPhones.join(',') : null,
      },
    });

    await prisma.sessionLog.create({
      data: {
        sessionId: id,
        type: 'sync_contacts',
        severity: errorCount > 0 ? 'warning' : 'success',
        message:
          errorCount > 0
            ? `Sincronização concluída com ${processedCount} contatos salvos e ${errorCount} falhas`
            : `Sincronização concluída com ${processedCount} contatos salvos`,
        origin: 'system',
      },
    });
  } catch (error: any) {
    await prisma.contactImport.update({
      where: { id: importRow.id },
      data: {
        status: 'failed',
        errorLog: error?.message ? String(error.message) : 'Falha na sincronização de contatos',
      },
    });
    await prisma.sessionLog.create({
      data: {
        sessionId: id,
        type: 'sync_contacts',
        severity: 'error',
        message: error?.message ?? 'Falha na sincronização de contatos',
        origin: 'system',
      },
    });
    throw error;
  } finally {
    await prisma.session.update({
      where: { id },
      data: { status: 'connected' },
    });
  }

  return get(userId, id);
}

export async function syncWhatsApp(userId: string, id: string) {
  await assertSessionOwnership(userId, id);
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) throw new NotFoundError('Sessão não encontrada');
  if (session.status !== 'connected') throw new ValidationError('Sessão não conectada');

  await prisma.session.update({
    where: { id },
    data: {
      status: 'syncing',
      syncCount: { increment: 1 },
      lastActivity: new Date(),
    },
  });

  await prisma.sessionLog.create({
    data: {
      sessionId: id,
      type: 'sync_whatsapp',
      severity: 'info',
      message: 'Sincronização completa do WhatsApp iniciada',
      origin: 'system',
    },
  });

  const groups = await baileys.fetchGroups(id);
  const ownJid = baileys.getOwnJid(id);

  for (const g of groups) {
    const admins = g.participants.filter((p) => p.admin).map((p) => p.id);
    const members = g.participants.map((p) => p.id);
    await prisma.whatsAppGroup.upsert({
      where: { sessionId_waGroupId: { sessionId: id, waGroupId: g.id } },
      create: {
        sessionId: id,
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
  }

  await prisma.session.update({
    where: { id },
    data: {
      status: 'connected',
      lastActivity: new Date(),
    },
  });

  await prisma.sessionLog.create({
    data: {
      sessionId: id,
      type: 'sync_whatsapp',
      severity: 'success',
      message: `Sincronização concluída com ${groups.length} grupos atualizados`,
      origin: 'system',
    },
  });

  return {
    session: await get(userId, id),
    groupsSynced: groups.length,
  };
}

export async function logs(userId: string, id: string, limit = 100) {
  await assertSessionOwnership(userId, id);
  return prisma.sessionLog.findMany({
    where: { sessionId: id },
    orderBy: { timestamp: 'desc' },
    take: Math.min(limit, 500),
  });
}

export async function metrics(userId: string) {
  const rows = await prisma.session.findMany({ where: { userId } });
  const counter = (s: string) => rows.filter((r) => r.status === s).length;
  return {
    total: rows.length,
    connected: counter('connected'),
    disconnected: counter('disconnected'),
    paused: counter('paused'),
    error: counter('error'),
    pairing: counter('pairing'),
    archived: counter('archived'),
    reconnectionsInPeriod: rows.reduce((a, r) => a + r.reconnectCount, 0),
  };
}
