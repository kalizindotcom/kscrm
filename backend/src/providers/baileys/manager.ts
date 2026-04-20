/**
 * SessionManager — orquestra instâncias Baileys em memória.
 *
 * Uma instância Baileys (WASocket) por sessão no DB. authState persiste em disco
 * via useMultiFileAuthState em ${BAILEYS_AUTH_DIR}/${sessionId}.
 *
 * Expõe API: ensure(sessionId), get(sessionId), stop(sessionId), remove(sessionId).
 * Emite eventos pro WS: session.qr, session.status, session.log, message.new.
 */
import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  type WASocket,
  type proto,
  Browsers,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'node:path';
import fs from 'node:fs/promises';

import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../db/client.js';
import { emitTo } from '../../ws/index.js';
import {
  sleep,
  typingMs,
  jitterDelay,
  checkQuota,
  assertAllowedOrThrow,
  incrementCounters,
} from './anti-ban.js';

type Instance = {
  sock: WASocket;
  sessionId: string;
  connecting: boolean;
};

const instances = new Map<string, Instance>();

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function isPlausiblePhoneDigits(value: string) {
  const len = value.length;
  return len >= 8 && len <= 15;
}

function extractPreferredPhoneFromMessage(m: proto.IWebMessageInfo): { phone: string; isGroup: boolean } | null {
  const keyAny: any = m.key as any;
  const remoteJid = m.key.remoteJid ?? '';
  if (!remoteJid) return null;
  const remoteDomain = remoteJid.split('@')[1] ?? '';

  if (remoteJid.endsWith('@g.us')) {
    return { phone: remoteJid.split('@')[0] ?? '', isGroup: true };
  }

  const candidateJids: (string | undefined)[] = [
    remoteDomain === 'lid' ? undefined : remoteJid,
    keyAny?.remoteJidAlt,
    keyAny?.participantPn,
    keyAny?.senderPn,
    keyAny?.participantAlt,
    keyAny?.participant,
    (m.message as any)?.extendedTextMessage?.contextInfo?.participant,
  ];

  for (const candidate of candidateJids) {
    if (!candidate || typeof candidate !== 'string') continue;
    const local = candidate.split('@')[0] ?? '';
    const digits = normalizeDigits(local);
    if (isPlausiblePhoneDigits(digits)) {
      return { phone: digits, isGroup: false };
    }
  }

  if (remoteDomain === 'lid') {
    return null;
  }

  const fallbackLocal = remoteJid.split('@')[0] ?? '';
  const fallbackDigits = normalizeDigits(fallbackLocal);
  return { phone: fallbackDigits || fallbackLocal, isGroup: false };
}

async function writeLog(
  sessionId: string,
  severity: 'info' | 'warning' | 'error' | 'success',
  message: string,
  type = 'system',
) {
  const log = await prisma.sessionLog.create({
    data: { sessionId, severity, message, type, origin: 'engine' },
  });
  emitTo(`session:${sessionId}`, { type: 'session.log', sessionId, log });
  return log;
}

async function updateSessionStatus(
  sessionId: string,
  status: string,
  extra: Partial<{ phoneNumber: string; disconnectReason: string; qrCodeDataUrl: string | null }> = {},
) {
  const session = await prisma.session.update({
    where: { id: sessionId },
    data: {
      status,
      ...extra,
      lastConnectedAt: status === 'connected' ? new Date() : undefined,
      lastDisconnectedAt: status === 'disconnected' || status === 'error' ? new Date() : undefined,
    },
  });
  emitTo(`session:${sessionId}`, {
    type: 'session.status',
    sessionId,
    status,
    reason: extra.disconnectReason,
    healthScore: session.healthScore,
    phoneNumber: session.phoneNumber ?? undefined,
  });
}

export async function ensure(sessionId: string): Promise<WASocket> {
  const existing = instances.get(sessionId);
  if (existing) return existing.sock;

  const authDir = path.resolve(env.BAILEYS_AUTH_DIR, sessionId);
  await fs.mkdir(authDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu(env.BAILEYS_BROWSER_NAME),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    emitOwnEvents: false,
  });

  instances.set(sessionId, { sock, sessionId, connecting: true });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const dataUrl = await QRCode.toDataURL(qr);
      await prisma.session.update({
        where: { id: sessionId },
        data: { qrCodeDataUrl: dataUrl, status: 'pairing' },
      });
      emitTo(`session:${sessionId}`, { type: 'session.qr', sessionId, dataUrl });
      emitTo(`session:${sessionId}`, { type: 'session.status', sessionId, status: 'pairing' });
      await writeLog(sessionId, 'info', 'QR gerado — aguardando leitura no WhatsApp');
    }

    if (connection === 'open') {
      const phoneNumber = sock.user?.id?.split(':')[0]?.split('@')[0];
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'connected',
          phoneNumber: phoneNumber ?? null,
          qrCodeDataUrl: null,
          warmupStartedAt: (await prisma.session.findUnique({ where: { id: sessionId } }))?.warmupStartedAt ?? new Date(),
        },
      });
      await updateSessionStatus(sessionId, 'connected', { phoneNumber: phoneNumber ?? '' });
      await writeLog(sessionId, 'success', `Sessão conectada (${phoneNumber ?? 'unknown'})`);
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const reason = DisconnectReason[statusCode] ?? 'unknown';
      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.forbidden;

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: shouldReconnect ? 'disconnected' : 'terminated',
          disconnectReason: reason,
          failureCount: { increment: 1 },
        },
      });
      await updateSessionStatus(sessionId, shouldReconnect ? 'disconnected' : 'terminated', {
        disconnectReason: reason,
      });
      await writeLog(
        sessionId,
        shouldReconnect ? 'warning' : 'error',
        `Desconectado: ${reason}`,
      );

      instances.delete(sessionId);

      if (shouldReconnect) {
        // backoff exponencial simples
        const existing = await prisma.session.findUnique({ where: { id: sessionId } });
        const delay = Math.min(60_000, 2_000 * Math.pow(2, existing?.failureCount ?? 0));
        setTimeout(() => {
          ensure(sessionId).catch((err) => logger.error({ err, sessionId }, 'reconnect failed'));
        }, delay);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;
    for (const m of messages) {
      try {
        if (!m.message) continue;
        const identity = extractPreferredPhoneFromMessage(m);
        if (!identity?.phone) continue;
        const isGroup = identity.isGroup;
        const phone = identity.phone;
        const content = extractText(m.message);
        if (!content.trim()) continue;
        const direction = m.key.fromMe ? 'outbound' : 'inbound';

        // extract quoted/reply info
        const contextInfo =
          m.message?.extendedTextMessage?.contextInfo ??
          m.message?.imageMessage?.contextInfo ??
          m.message?.videoMessage?.contextInfo ??
          m.message?.audioMessage?.contextInfo ??
          m.message?.documentMessage?.contextInfo ??
          null;

        let replyToContent: string | undefined;
        let replyToFromMe: boolean | undefined;
        if (contextInfo?.quotedMessage) {
          replyToContent = extractText(contextInfo.quotedMessage) || '[mídia]';
          // stanzaId participant - if null, the quoted message was from us
          const quotedParticipant = contextInfo.participant ?? '';
          const ownJid = sock.user?.id ?? '';
          replyToFromMe = ownJid ? quotedParticipant === ownJid || quotedParticipant === '' : false;
        }
        const maybeName = !isGroup && !m.key.fromMe ? m.pushName : undefined;
        const waMessageId = m.key.id ?? undefined;

        // for group messages, get the real group name from DB
        let groupContactName: string | undefined;
        if (isGroup) {
          const groupJid = `${phone}@g.us`;
          const groupRecord = await prisma.whatsAppGroup.findFirst({
            where: { sessionId, waGroupId: groupJid },
            select: { name: true },
          });
          groupContactName = groupRecord?.name;
        }

        // for group messages, extract sender phone from participant field
        let senderPhone: string | undefined;
        let senderName: string | undefined;
        if (isGroup && !m.key.fromMe) {
          const participant = m.key.participant ?? (m as any).participant;
          if (participant && typeof participant === 'string') {
            const local = participant.split('@')[0] ?? '';
            const domain = participant.split('@')[1] ?? '';
            if (domain !== 'lid') {
              const digits = normalizeDigits(local);
              if (isPlausiblePhoneDigits(digits)) {
                senderPhone = digits;
              }
            }
          }
          senderName = m.pushName ?? undefined;
        }

        const resolvedName = isGroup
          ? (groupContactName ?? phone)
          : (maybeName ?? phone);

        // upsert conversation
        const conv = await prisma.conversation.upsert({
          where: { sessionId_phone: { sessionId, phone } },
          create: {
            sessionId,
            phone,
            contactName: resolvedName,
            lastMessage: content,
            unreadCount: m.key.fromMe ? 0 : 1,
            isGroup,
            status: 'open',
          },
          update: {
            lastMessage: content,
            unreadCount: m.key.fromMe ? undefined : { increment: 1 },
            contactName: isGroup ? (groupContactName ?? undefined) : (maybeName ?? undefined),
          },
        });

        if (waMessageId) {
          const existing = await prisma.message.findUnique({ where: { waMessageId } });
          if (existing) continue;
        }

        const saved = await prisma.message.create({
          data: {
            conversationId: conv.id,
            waMessageId,
            direction,
            content,
            type: detectType(m.message),
            status: m.key.fromMe ? 'sent' : 'delivered',
            timestamp: m.messageTimestamp ? new Date(Number(m.messageTimestamp) * 1000) : undefined,
            ...(senderPhone ? { senderPhone } : {}),
            ...(senderName ? { senderName } : {}),
            ...(replyToContent ? { replyToContent, replyToFromMe: replyToFromMe ?? false } : {}),
          } as any,
        });

        // Download and persist media if applicable
        const mediaType = detectType(m.message);
        if (mediaType !== 'text' && mediaType !== 'buttons' && mediaType !== 'list') {
          try {
            const sock = instances.get(sessionId)?.sock;
            if (sock) {
              const buffer = await (downloadMediaMessage as any)(m, 'buffer', {});
              if (buffer && Buffer.isBuffer(buffer)) {
                const ext = getMediaExtension(mediaType, m.message);
                const mediaDir = path.resolve(env.UPLOAD_DIR, 'media');
                await fs.mkdir(mediaDir, { recursive: true });
                const fileName = `${saved.id}.${ext}`;
                const filePath = path.resolve(mediaDir, fileName);
                await fs.writeFile(filePath, buffer);
                const mediaUrl = `/uploads/media/${fileName}`;
                await prisma.message.update({ where: { id: saved.id }, data: { mediaUrl } });
                (saved as any).mediaUrl = mediaUrl;
              }
            }
          } catch (mediaErr) {
            logger.warn({ mediaErr, sessionId }, 'failed to download media');
          }
        }

        emitTo(`conversation:${conv.id}`, { type: 'message.new', conversationId: conv.id, message: saved });
        emitTo(`session:${sessionId}`, { type: 'message.new', conversationId: conv.id, message: saved });
      } catch (err) {
        logger.warn({ err, sessionId }, 'failed to persist upserted message');
      }
    }
  });

  sock.ev.on('messages.update', async (updates) => {
    for (const u of updates) {
      if (!u.key.id) continue;
      const msg = await prisma.message.findUnique({ where: { waMessageId: u.key.id } });
      if (!msg) continue;
      let status = msg.status;
      const st = u.update.status;
      if (st === 2) status = 'sent';
      else if (st === 3) status = 'delivered';
      else if (st === 4) status = 'read';
      if (status !== msg.status) {
        await prisma.message.update({ where: { id: msg.id }, data: { status } });
        emitTo(`conversation:${msg.conversationId}`, {
          type: 'message.status_update',
          conversationId: msg.conversationId,
          messageId: msg.id,
          status,
        });
      }
    }
  });

  return sock;
}

function getMediaExtension(type: string, msg: proto.IMessage): string {
  const mime =
    msg.imageMessage?.mimetype ??
    msg.videoMessage?.mimetype ??
    msg.audioMessage?.mimetype ??
    msg.documentMessage?.mimetype ??
    msg.stickerMessage?.mimetype ??
    '';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('pdf')) return 'pdf';
  if (type === 'image') return 'jpg';
  if (type === 'video') return 'mp4';
  if (type === 'audio') return 'ogg';
  return 'bin';
}

function extractText(msg: proto.IMessage): string {
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.buttonsResponseMessage?.selectedDisplayText ||
    msg.listResponseMessage?.title ||
    ''
  );
}

function detectType(msg: proto.IMessage): string {
  if (msg.imageMessage) return 'image';
  if (msg.videoMessage) return 'video';
  if (msg.audioMessage) return 'audio';
  if (msg.documentMessage) return 'document';
  if (msg.stickerMessage) return 'sticker';
  if (msg.buttonsMessage) return 'buttons';
  if (msg.listMessage) return 'list';
  return 'text';
}

export function get(sessionId: string): WASocket | null {
  return instances.get(sessionId)?.sock ?? null;
}

export function getOwnJid(sessionId: string): string | undefined {
  return get(sessionId)?.user?.id;
}

export async function stop(sessionId: string) {
  const inst = instances.get(sessionId);
  if (!inst) return;
  inst.sock.end(undefined);
  instances.delete(sessionId);
}

export async function remove(sessionId: string) {
  await stop(sessionId);
  const authDir = path.resolve(env.BAILEYS_AUTH_DIR, sessionId);
  await fs.rm(authDir, { recursive: true, force: true });
}

/* ─────────── Envio com anti-ban ─────────── */

function jidOf(phone: string, isGroup = false) {
  const trimmed = phone.trim();
  if (trimmed.includes('@')) return trimmed;
  if (isGroup) {
    const cleanGroup = trimmed.replace(/[^0-9-]/g, '');
    return `${cleanGroup}@g.us`;
  }
  const clean = trimmed.replace(/\D/g, '');
  return `${clean}@s.whatsapp.net`;
}

function buildButtonsFallbackText(
  baseText: string,
  buttons: { text: string; type?: 'reply' | 'url' | 'call'; value?: string }[],
) {
  if (!buttons.length) return baseText;
  const lines = buttons.map((button, index) => {
    const prefix = `${index + 1}. ${button.text}`;
    if (!button.value) return prefix;
    if (button.type === 'url') return `${prefix} - ${button.value}`;
    if (button.type === 'call') return `${prefix} - Tel: ${button.value}`;
    return `${prefix} - Responda: ${button.value}`;
  });
  return `${baseText}\n\n${lines.join('\n')}`;
}

async function humanizedTyping(sock: WASocket, jid: string) {
  try {
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate('composing', jid);
    await sleep(typingMs());
    await sock.sendPresenceUpdate('paused', jid);
  } catch {
    // best-effort
  }
}

async function isAntiBanEnabled(sessionId: string): Promise<boolean> {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { antiBanEnabled: true } as any });
  return (session as any)?.antiBanEnabled !== false;
}

export async function sendText(
  sessionId: string,
  phone: string,
  text: string,
  opts: { applyDelay?: boolean; isGroup?: boolean; quotedWaMessageId?: string; quotedContent?: string } = {},
) {
  const sock = get(sessionId);
  if (!sock) throw new Error('Session not connected');

  const antiBan = await isAntiBanEnabled(sessionId);
  const q = await checkQuota(sessionId);
  assertAllowedOrThrow(q);
  if (antiBan && q.longPause) await sleep(env.ANTIBAN_LONG_PAUSE_MS);

  const jid = jidOf(phone, opts.isGroup);
  if (antiBan) await humanizedTyping(sock, jid);

  // Build quoted context for reply-to
  const sendOpts: any = {};
  if (opts.quotedWaMessageId) {
    sendOpts.quoted = {
      key: { id: opts.quotedWaMessageId, remoteJid: jid, fromMe: false },
      message: { conversation: opts.quotedContent ?? '' },
    };
  }

  const result = await sock.sendMessage(jid, { text }, sendOpts);
  await incrementCounters(sessionId);

  if (antiBan && opts.applyDelay !== false) await sleep(jitterDelay());
  return result;
}

export async function sendMedia(
  sessionId: string,
  phone: string,
  media: { buffer: Buffer; mimetype: string; caption?: string; type: 'image' | 'video' | 'audio' | 'document'; filename?: string },
  opts: { applyDelay?: boolean; isGroup?: boolean } = {},
) {
  const sock = get(sessionId);
  if (!sock) throw new Error('Session not connected');
  const antiBan = await isAntiBanEnabled(sessionId);
  const q = await checkQuota(sessionId);
  assertAllowedOrThrow(q);
  if (antiBan && q.longPause) await sleep(env.ANTIBAN_LONG_PAUSE_MS);

  const jid = jidOf(phone, opts.isGroup);
  if (antiBan) await humanizedTyping(sock, jid);

  const payload: any =
    media.type === 'image'
      ? { image: media.buffer, caption: media.caption, mimetype: media.mimetype }
      : media.type === 'video'
      ? { video: media.buffer, caption: media.caption, mimetype: media.mimetype }
      : media.type === 'audio'
      ? { audio: media.buffer, mimetype: media.mimetype, ptt: true }
      : { document: media.buffer, mimetype: media.mimetype, fileName: media.filename ?? 'file', caption: media.caption };

  const result = await sock.sendMessage(jid, payload);
  await incrementCounters(sessionId);
  if (antiBan && opts.applyDelay !== false) await sleep(jitterDelay());
  return result;
}

/**
 * Envio de botões via Baileys. O WhatsApp filtra buttonsMessage desde 05/2022 —
 * em muitos clientes a mensagem cai como texto puro. Mantido aqui porque o
 * frontend expõe a funcionalidade e o usuário optou por Baileys puro. Em última
 * instância, se o destinatário não renderizar, a mensagem ainda chega como texto.
 */
export async function sendButtons(
  sessionId: string,
  phone: string,
  data: {
    text: string;
    footer?: string;
    buttons: { id: string; text: string; type?: 'reply' | 'url' | 'call'; value?: string }[];
  },
  opts: { applyDelay?: boolean; isGroup?: boolean } = {},
) {
  const sock = get(sessionId);
  if (!sock) throw new Error('Session not connected');
  const antiBan = await isAntiBanEnabled(sessionId);
  const q = await checkQuota(sessionId);
  assertAllowedOrThrow(q);
  if (antiBan && q.longPause) await sleep(env.ANTIBAN_LONG_PAUSE_MS);

  const jid = jidOf(phone, opts.isGroup);
  if (antiBan) await humanizedTyping(sock, jid);

  const buttons = data.buttons.map((b, i) => ({
    buttonId: b.id || `btn_${i}`,
    buttonText: { displayText: b.text },
    type: 1,
  }));
  const fallbackText = buildButtonsFallbackText(data.text, data.buttons);

  const payload: any = {
    text: fallbackText,
    footer: data.footer,
    buttons,
    headerType: 1,
  };

  try {
    const result = await sock.sendMessage(jid, payload);
    await incrementCounters(sessionId);
    if (antiBan && opts.applyDelay !== false) await sleep(jitterDelay());
    return result;
  } catch {
    // fallback estável para clientes que não renderizam/rejeitam buttonsMessage
    const result = await sock.sendMessage(jid, { text: fallbackText });
    await incrementCounters(sessionId);
    if (antiBan && opts.applyDelay !== false) await sleep(jitterDelay());
    return result;
  }
}

export async function fetchGroups(sessionId: string) {
  const sock = get(sessionId);
  if (!sock) throw new Error('Session not connected');
  const groups = await sock.groupFetchAllParticipating();
  return Object.values(groups);
}

export async function getProfilePictureUrl(sessionId: string, jid: string): Promise<string | null> {
  const sock = get(sessionId);
  if (!sock) return null;
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    return url ?? null;
  } catch {
    return null;
  }
}

export async function requestPairingCode(sessionId: string, phone: string): Promise<string> {
  const sock = await ensure(sessionId);
  const clean = phone.replace(/\D/g, '');
  const code = await sock.requestPairingCode(clean);
  return code;
}

export async function startAllPersisted() {
  const rows = await prisma.session.findMany({
    where: { status: { in: ['connected', 'pairing', 'paused', 'disconnected'] } },
    select: { id: true, status: true },
  });
  for (const s of rows) {
    if (s.status === 'paused' || s.status === 'archived' || s.status === 'terminated') continue;
    try {
      await ensure(s.id);
    } catch (err) {
      logger.error({ err, sessionId: s.id }, 'failed to resume session');
    }
  }
  logger.info({ count: rows.length }, 'Baileys sessions resumed');
}
