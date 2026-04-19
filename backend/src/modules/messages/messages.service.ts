import { prisma } from '../../db/client.js';
import * as baileys from '../../providers/baileys/manager.js';
import { NotFoundError } from '../../lib/errors.js';
import { emitTo } from '../../ws/index.js';

async function ensureConversation(sessionId: string, phone: string, contactName?: string) {
  return prisma.conversation.upsert({
    where: { sessionId_phone: { sessionId, phone } },
    create: { sessionId, phone, contactName: contactName ?? phone, lastMessage: '' },
    update: { contactName: contactName ?? undefined },
  });
}

export async function sendText(userId: string, sessionId: string, phone: string, content: string) {
  const session = await prisma.session.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new NotFoundError('Sessão não encontrada');
  if (session.status !== 'connected') throw new Error('Sessão não conectada');

  const conv = await ensureConversation(sessionId, phone);

  const pending = await prisma.message.create({
    data: {
      conversationId: conv.id,
      direction: 'outbound',
      content,
      type: 'text',
      status: 'sending',
    },
  });

  emitTo(`conversation:${conv.id}`, { type: 'message.new', conversationId: conv.id, message: pending });

  try {
    const result = await baileys.sendText(sessionId, phone, content);
    const updated = await prisma.message.update({
      where: { id: pending.id },
      data: {
        status: 'sent',
        waMessageId: (result as any)?.key?.id ?? undefined,
      },
    });
    await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessage: content } });
    emitTo(`conversation:${conv.id}`, {
      type: 'message.status_update',
      conversationId: conv.id,
      messageId: updated.id,
      status: 'sent',
    });
    return updated;
  } catch (err: any) {
    await prisma.message.update({
      where: { id: pending.id },
      data: { status: 'failed', error: err?.message ?? 'Send failed' },
    });
    emitTo(`conversation:${conv.id}`, {
      type: 'message.status_update',
      conversationId: conv.id,
      messageId: pending.id,
      status: 'failed',
    });
    throw err;
  }
}

export async function sendButtons(
  userId: string,
  sessionId: string,
  phone: string,
  payload: {
    text: string;
    footer?: string;
    buttons: { id: string; text: string; type?: 'reply' | 'url' | 'call'; value?: string }[];
  },
) {
  const session = await prisma.session.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new NotFoundError('Sessão não encontrada');
  if (session.status !== 'connected') throw new Error('Sessão não conectada');

  const conv = await ensureConversation(sessionId, phone);

  const pending = await prisma.message.create({
    data: {
      conversationId: conv.id,
      direction: 'outbound',
      content: payload.text,
      type: 'buttons',
      status: 'sending',
      buttonsJson: payload as any,
    },
  });
  emitTo(`conversation:${conv.id}`, { type: 'message.new', conversationId: conv.id, message: pending });

  try {
    const result = await baileys.sendButtons(sessionId, phone, payload);
    const updated = await prisma.message.update({
      where: { id: pending.id },
      data: { status: 'sent', waMessageId: (result as any)?.key?.id ?? undefined },
    });
    await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessage: payload.text } });
    emitTo(`conversation:${conv.id}`, {
      type: 'message.status_update',
      conversationId: conv.id,
      messageId: updated.id,
      status: 'sent',
    });
    return updated;
  } catch (err: any) {
    await prisma.message.update({
      where: { id: pending.id },
      data: { status: 'failed', error: err?.message },
    });
    emitTo(`conversation:${conv.id}`, {
      type: 'message.status_update',
      conversationId: conv.id,
      messageId: pending.id,
      status: 'failed',
    });
    throw err;
  }
}

export async function sendMedia(
  userId: string,
  sessionId: string,
  phone: string,
  media: { buffer: Buffer; mimetype: string; type: 'image' | 'video' | 'audio' | 'document'; caption?: string; filename?: string },
) {
  const session = await prisma.session.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new NotFoundError('Sessão não encontrada');
  if (session.status !== 'connected') throw new Error('Sessão não conectada');

  const conv = await ensureConversation(sessionId, phone);
  const pending = await prisma.message.create({
    data: {
      conversationId: conv.id,
      direction: 'outbound',
      content: media.caption ?? '',
      type: media.type,
      status: 'sending',
      mediaMime: media.mimetype,
    },
  });
  emitTo(`conversation:${conv.id}`, { type: 'message.new', conversationId: conv.id, message: pending });

  try {
    const result = await baileys.sendMedia(sessionId, phone, media);
    const updated = await prisma.message.update({
      where: { id: pending.id },
      data: { status: 'sent', waMessageId: (result as any)?.key?.id ?? undefined },
    });
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessage: media.caption ?? '[mídia]' },
    });
    emitTo(`conversation:${conv.id}`, {
      type: 'message.status_update',
      conversationId: conv.id,
      messageId: updated.id,
      status: 'sent',
    });
    return updated;
  } catch (err: any) {
    await prisma.message.update({
      where: { id: pending.id },
      data: { status: 'failed', error: err?.message },
    });
    emitTo(`conversation:${conv.id}`, {
      type: 'message.status_update',
      conversationId: conv.id,
      messageId: pending.id,
      status: 'failed',
    });
    throw err;
  }
}

export async function retry(userId: string, messageId: string) {
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: { include: { session: true } } },
  });
  if (!msg) throw new NotFoundError('Mensagem não encontrada');
  if (msg.conversation.session.userId !== userId) throw new NotFoundError('Mensagem não encontrada');
  if (msg.direction !== 'outbound') throw new Error('Apenas mensagens outbound podem ser reenviadas');
  return sendText(userId, msg.conversation.sessionId, msg.conversation.phone, msg.content);
}
