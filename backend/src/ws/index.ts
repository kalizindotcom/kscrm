import type { Server as HttpServer } from 'http';
import { Server as IOServer, type Socket } from 'socket.io';
import { verifyAccess } from '../lib/jwt.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../db/client.js';

async function userOwnsRoom(userId: string, room: string): Promise<boolean> {
  const m = /^(session|campaign|conversation):([A-Za-z0-9_-]+)$/.exec(room);
  if (!m) return false;
  const [, kind, id] = m;
  try {
    if (kind === 'session') {
      return !!(await prisma.session.findFirst({ where: { id, userId }, select: { id: true } }));
    }
    if (kind === 'campaign') {
      return !!(await prisma.campaign.findFirst({ where: { id, userId }, select: { id: true } }));
    }
    if (kind === 'conversation') {
      const c = await prisma.conversation.findFirst({
        where: { id, session: { userId } },
        select: { id: true },
      });
      return !!c;
    }
  } catch (err) {
    logger.warn({ err, room, userId }, 'ws ownership check failed');
  }
  return false;
}

export type WsEvent =
  | { type: 'session.qr'; sessionId: string; dataUrl: string }
  | { type: 'session.status'; sessionId: string; status: string; reason?: string; healthScore?: number; phoneNumber?: string }
  | { type: 'session.log'; sessionId: string; log: any }
  | { type: 'message.new'; conversationId: string; message: any }
  | { type: 'message.status_update'; conversationId: string; messageId: string; status: string }
  | { type: 'campaign.progress'; campaignId: string; progress: number; currentTarget?: string; sent: number; failed: number; total?: number; waiting?: string; error?: string }
  | { type: 'campaign.completed'; campaignId: string; status: 'completed' | 'cancelled' | 'paused' | 'failed'; sent: number; failed: number; skipped: number; total: number; durationMs: number; startedAt: string | null; finishedAt: string | null }
  | { type: 'import.progress'; importId: string; processedCount: number; status: string };

let io: IOServer | null = null;

export function initWs(server: HttpServer) {
  io = new IOServer(server, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    path: '/ws',
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Missing token'));
    try {
      const payload = verifyAccess(token);
      (socket.data as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket.data as any).user;
    logger.debug({ userId: user?.sub }, 'ws connected');

    socket.join(`user:${user.sub}`);

    socket.on('subscribe', async (room: string) => {
      if (typeof room !== 'string') return;
      if (!/^(session|campaign|conversation):[A-Za-z0-9_-]+$/.test(room)) return;
      const ok = await userOwnsRoom(user.sub, room);
      if (ok) socket.join(room);
      else logger.debug({ userId: user.sub, room }, 'ws subscribe denied');
    });

    socket.on('unsubscribe', (room: string) => {
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      logger.debug({ userId: user?.sub }, 'ws disconnected');
    });
  });

  logger.info('WebSocket server ready at /ws');
  return io;
}

export function emitTo(room: string, event: WsEvent) {
  if (!io) return;
  io.to(room).emit(event.type, event);
}

export function emitToUser(userId: string, eventType: string, payload: Record<string, unknown>) {
  if (!io) return;
  io.to(`user:${userId}`).emit(eventType, payload);
}

export function getIO(): IOServer {
  if (!io) throw new Error('WS not initialized');
  return io;
}
