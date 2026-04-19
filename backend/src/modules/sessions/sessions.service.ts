import { prisma } from '../../db/client.js';
import * as baileys from '../../providers/baileys/manager.js';
import { NotFoundError } from '../../lib/errors.js';

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
  await baileys.stop(id);
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
  await baileys.stop(id);
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

export async function syncContacts(userId: string, id: string) {
  await assertSessionOwnership(userId, id);
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

  await prisma.session.update({
    where: { id },
    data: { status: 'connected' },
  });

  return get(userId, id);
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
