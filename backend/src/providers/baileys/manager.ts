/**
 * SessionManager â€” orquestra instÃ¢ncias Baileys em memÃ³ria.
 *
 * Uma instÃ¢ncia Baileys (WASocket) por sessÃ£o no DB. authState persiste em disco
 * via useMultiFileAuthState em ${BAILEYS_AUTH_DIR}/${sessionId}.
 *
 * ExpÃµe API: ensure(sessionId), get(sessionId), stop(sessionId), remove(sessionId).
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

type Instance = {
  sock: WASocket;
  sessionId: string;
  connecting: boolean;
  lidToPhone: Map<string, string>; // lid JID â†’ phone digits
};

type ManualStopReason = 'pause' | 'terminate' | 'remove' | 'archive' | 'restart';

const instances = new Map<string, Instance>();
const pairingCodeRequests = new Map<string, Promise<string>>();
const manualStopReasons = new Map<string, ManualStopReason>();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function isPlausiblePhoneDigits(value: string) {
  const len = value.length;
  return len >= 8 && len <= 15;
}

function isTransientPairingError(error: unknown) {
  const message = String((error as any)?.message ?? '').toLowerCase();
  return (
    message.includes('connection closed') ||
    message.includes('connection terminated') ||
    message.includes('stream errored out') ||
    message.includes('connection close') ||
    message.includes('timed out') ||
    message.includes('not connected')
  );
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

  const lidToPhone = new Map<string, string>();
  instances.set(sessionId, { sock, sessionId, connecting: true, lidToPhone });

  // Build lidâ†’phone map from contacts so group member @lid JIDs can be resolved
  const indexContacts = (contacts: { id?: string; lid?: string }[]) => {
    for (const c of contacts) {
      if (!c.id || !c.lid) continue;
      const domain = c.id.split('@')[1] ?? '';
      if (domain === 'lid' || domain === 'g.us') continue;
      const phone = normalizeDigits(c.id.split('@')[0] ?? '');
      if (isPlausiblePhoneDigits(phone)) {
        lidToPhone.set(c.lid, phone);
      }
    }
  };

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    try {
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
        manualStopReasons.delete(sessionId);
        const phoneNumber = sock.user?.id?.split(':')[0]?.split('@')[0];
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            status: 'connected',
            phoneNumber: phoneNumber ?? null,
            qrCodeDataUrl: null,
            disconnectReason: null,
            failureCount: 0,
            healthScore: 100,
            warmupStartedAt:
              (await prisma.session.findUnique({ where: { id: sessionId } }))?.warmupStartedAt ?? new Date(),
          },
        });
        await updateSessionStatus(sessionId, 'connected', { phoneNumber: phoneNumber ?? '' });
        await writeLog(sessionId, 'success', `Sessão conectada (${phoneNumber ?? 'unknown'})`);
        return;
      }

      if (connection !== 'close') return;

      const manualReason = manualStopReasons.get(sessionId);
      if (manualReason) {
        manualStopReasons.delete(sessionId);
        instances.delete(sessionId);
        await writeLog(sessionId, 'info', `Conexão encerrada manualmente (${manualReason})`);
        return;
      }

      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const reason = DisconnectReason[statusCode] ?? 'unknown';
      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.forbidden;

      const current = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { failureCount: true, healthScore: true },
      });
      const failureCount = (current?.failureCount ?? 0) + 1;
      const healthScore = Math.max(0, (current?.healthScore ?? 100) - (shouldReconnect ? 10 : 30));

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: shouldReconnect ? 'disconnected' : 'terminated',
          disconnectReason: reason,
          failureCount: { increment: 1 },
          healthScore,
          ...(shouldReconnect ? { reconnectCount: { increment: 1 } } : {}),
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
        const delay = Math.min(60_000, 2_000 * Math.pow(2, Math.min(failureCount, 5)));
        setTimeout(() => {
          if (manualStopReasons.has(sessionId)) return;
          ensure(sessionId).catch((err) => logger.error({ err, sessionId }, 'reconnect failed'));
        }, delay);
      }
    } catch (err) {
      logger.error({ err, sessionId }, 'connection.update handler failed');
    }
  });

  // Populate lidâ†’phone map whenever WhatsApp sends contact info
  sock.ev.on('contacts.upsert', (contacts) => indexContacts(contacts));
  sock.ev.on('contacts.update', (updates) => indexContacts(updates as any[]));

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
        const msgType = detectType(m.message);
        const hasMedia = msgType !== 'text' && msgType !== 'buttons' && msgType !== 'list';
        if (!content.trim() && !hasMedia) continue;
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
          replyToContent = extractText(contextInfo.quotedMessage) || '[midia]';
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

        const mediaLabels: Record<string, string> = {
          image: '[imagem]', video: '[vídeo]', audio: '[áudio]',
          sticker: '[figurinha]', document: '[documento]', ptt: '[áudio]',
        };
        const lastMessagePreview = content.trim() || (hasMedia ? (mediaLabels[msgType] ?? `[${msgType}]`) : '');

        // upsert conversation
        // fetch avatar for new conversations (non-blocking)
        const jidFull = isGroup ? `${phone}@g.us` : `${phone}@s.whatsapp.net`;
        const avatarUrl = await getProfilePictureUrl(sessionId, jidFull).catch(() => null);

        const conv = await prisma.conversation.upsert({
          where: { sessionId_phone: { sessionId, phone } },
          create: {
            sessionId,
            phone,
            contactName: resolvedName,
            lastMessage: lastMessagePreview,
            unreadCount: m.key.fromMe ? 0 : 1,
            isGroup,
            status: 'open',
            ...(avatarUrl ? { avatar: avatarUrl } : {}),
          },
          update: {
            lastMessage: lastMessagePreview,
            unreadCount: m.key.fromMe ? undefined : { increment: 1 },
            contactName: isGroup ? (groupContactName ?? undefined) : (maybeName ?? undefined),
            ...(avatarUrl ? { avatar: avatarUrl } : {}),
          },
        });

        if (waMessageId) {
          const existing = await prisma.message.findUnique({ where: { waMessageId } });
          if (existing) continue;
        }

        // extract mediaMime for media messages
        const mediaMime: string | undefined =
          (m.message?.imageMessage?.mimetype) ??
          (m.message?.videoMessage?.mimetype) ??
          (m.message?.audioMessage?.mimetype) ??
          (m.message?.documentMessage?.mimetype) ??
          (m.message?.stickerMessage?.mimetype) ??
          (m.message?.ptvMessage?.mimetype) ??
          undefined;

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
            ...(mediaMime ? { mediaMime } : {}),
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
                if (mediaMime) (saved as any).mediaMime = mediaMime;
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

export function getLidToPhone(sessionId: string): Map<string, string> {
  return instances.get(sessionId)?.lidToPhone ?? new Map();
}

export async function stop(sessionId: string, reason: ManualStopReason = 'restart') {
  const inst = instances.get(sessionId);
  if (!inst) {
    manualStopReasons.delete(sessionId);
    return;
  }
  manualStopReasons.set(sessionId, reason);
  inst.sock.end(undefined);
  instances.delete(sessionId);
}

export async function remove(sessionId: string) {
  await stop(sessionId, 'remove');
  const authDir = path.resolve(env.BAILEYS_AUTH_DIR, sessionId);
  await fs.rm(authDir, { recursive: true, force: true });
  manualStopReasons.delete(sessionId);
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Envio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

export async function sendText(
  sessionId: string,
  phone: string,
  text: string,
  opts: { applyDelay?: boolean; isGroup?: boolean; quotedWaMessageId?: string; quotedContent?: string } = {},
) {
  const sock = get(sessionId);
  if (!sock) throw new Error('Session not connected');

  const jid = jidOf(phone, opts.isGroup);

  // Build quoted context for reply-to
  const sendOpts: any = {};
  if (opts.quotedWaMessageId) {
    sendOpts.quoted = {
      key: { id: opts.quotedWaMessageId, remoteJid: jid, fromMe: false },
      message: { conversation: opts.quotedContent ?? '' },
    };
  }

  const result = await sock.sendMessage(jid, { text }, sendOpts);
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

  const jid = jidOf(phone, opts.isGroup);

  const payload: any =
    media.type === 'image'
      ? { image: media.buffer, caption: media.caption, mimetype: media.mimetype }
      : media.type === 'video'
      ? { video: media.buffer, caption: media.caption, mimetype: media.mimetype }
      : media.type === 'audio'
      ? { audio: media.buffer, mimetype: media.mimetype, ptt: true }
      : { document: media.buffer, mimetype: media.mimetype, fileName: media.filename ?? 'file', caption: media.caption };

  return sock.sendMessage(jid, payload);
}

/**
 * Envio de botÃµes via Baileys. O WhatsApp filtra buttonsMessage desde 05/2022 â€”
 * em muitos clientes a mensagem cai como texto puro. Mantido aqui porque o
 * frontend expÃµe a funcionalidade e o usuÃ¡rio optou por Baileys puro. Em Ãºltima
 * instÃ¢ncia, se o destinatÃ¡rio nÃ£o renderizar, a mensagem ainda chega como texto.
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

  const jid = jidOf(phone, opts.isGroup);

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
    return result;
  } catch {
    // fallback estÃ¡vel para clientes que nÃ£o renderizam/rejeitam buttonsMessage
    const result = await sock.sendMessage(jid, { text: fallbackText });
    return result;
  }
}

export type ResolvedParticipant = {
  id: string; // always @s.whatsapp.net when resolved, or raw @lid when unresolvable
  admin: 'admin' | 'superadmin' | null;
  resolvedPhone: string | null; // phone digits if resolved, null otherwise
};

export type ResolvedGroup = {
  id: string;
  subject: string;
  desc: string | null;
  participants: ResolvedParticipant[];
};

/**
 * Attempts to resolve a @lid JID to a phone JID (@s.whatsapp.net) using multiple sources:
 * 1. Participant object's own alternative fields (phoneNumber, jid, pn)
 * 2. Baileys signalRepository.lidMapping store (populated from all WhatsApp network traffic)
 * 3. In-memory lidToPhone map (populated from contacts.upsert events)
 */
async function resolveLidToPhone(
  sock: WASocket,
  lidJid: string,
  participant: any,
  lidToPhone: Map<string, string>,
): Promise<string | null> {
  // 1. Check alt fields on participant object
  const altCandidates = [
    participant?.phoneNumber,
    participant?.jid,
    participant?.pn,
    participant?.phone,
  ];
  for (const cand of altCandidates) {
    if (!cand || typeof cand !== 'string') continue;
    const domain = cand.split('@')[1] ?? '';
    if (domain === 'lid' || domain === 'g.us') continue;
    const local = cand.includes('@') ? cand.split('@')[0] ?? '' : cand;
    const digits = normalizeDigits(local);
    if (isPlausiblePhoneDigits(digits)) return digits;
  }

  // 2. Check in-memory map (fastest)
  const cached = lidToPhone.get(lidJid);
  if (cached) return cached;

  // 3. Check Baileys signalRepository.lidMapping (async, queries internal store)
  try {
    const repo: any = (sock as any).signalRepository;
    const mapper = repo?.lidMapping ?? repo?.getLIDMappingStore?.();
    if (mapper?.getPNForLID) {
      const pnJid = await mapper.getPNForLID(lidJid);
      if (pnJid && typeof pnJid === 'string') {
        const digits = normalizeDigits(pnJid.split('@')[0] ?? '');
        if (isPlausiblePhoneDigits(digits)) {
          lidToPhone.set(lidJid, digits); // cache for next time
          return digits;
        }
      }
    }
  } catch {
    // best effort
  }

  return null;
}

export async function fetchGroups(sessionId: string): Promise<ResolvedGroup[]> {
  const sock = get(sessionId);
  const inst = instances.get(sessionId);
  if (!sock || !inst) throw new Error('Session not connected');

  const groups = await sock.groupFetchAllParticipating();
  const results: ResolvedGroup[] = [];

  for (const g of Object.values(groups)) {
    const resolvedParticipants: ResolvedParticipant[] = [];

    // Collect unresolved @lid for batch onWhatsApp fallback
    const unresolvedLids: { lid: string; index: number; admin: 'admin' | 'superadmin' | null }[] = [];

    for (const p of g.participants) {
      const anyP = p as any;
      const id = p.id;
      const admin = (p.admin ?? null) as 'admin' | 'superadmin' | null;
      const domain = id.split('@')[1] ?? '';

      if (domain === 'g.us') continue;

      // Already a phone JID
      if (domain === 's.whatsapp.net' || domain === 'c.us') {
        const digits = normalizeDigits(id.split('@')[0] ?? '');
        if (isPlausiblePhoneDigits(digits)) {
          resolvedParticipants.push({
            id: `${digits}@s.whatsapp.net`,
            admin,
            resolvedPhone: digits,
          });
        }
        continue;
      }

      // @lid â€” try to resolve
      if (domain === 'lid') {
        const phone = await resolveLidToPhone(sock, id, anyP, inst.lidToPhone);
        if (phone) {
          resolvedParticipants.push({
            id: `${phone}@s.whatsapp.net`,
            admin,
            resolvedPhone: phone,
          });
        } else {
          const idx = resolvedParticipants.push({
            id, // keep @lid as placeholder
            admin,
            resolvedPhone: null,
          }) - 1;
          unresolvedLids.push({ lid: id, index: idx, admin });
        }
        continue;
      }

      // Unknown domain â€” try digits from local part
      const digits = normalizeDigits(id.split('@')[0] ?? '');
      if (isPlausiblePhoneDigits(digits)) {
        resolvedParticipants.push({
          id: `${digits}@s.whatsapp.net`,
          admin,
          resolvedPhone: digits,
        });
      }
    }

    // Batch fallback: try onWhatsApp for still-unresolved lids (in chunks)
    if (unresolvedLids.length > 0 && typeof (sock as any).onWhatsApp === 'function') {
      const CHUNK = 50;
      for (let i = 0; i < unresolvedLids.length; i += CHUNK) {
        const chunk = unresolvedLids.slice(i, i + CHUNK);
        try {
          const lookup = await (sock as any).onWhatsApp(...chunk.map((c) => c.lid));
          if (Array.isArray(lookup)) {
            for (const entry of lookup) {
              const e: any = entry;
              const lidHit = e?.lid || e?.jid;
              const pnHit = e?.jid && !String(e.jid).endsWith('@lid') ? e.jid : e?.pn || e?.phoneNumber;
              if (!pnHit) continue;
              const digits = normalizeDigits(String(pnHit).split('@')[0] ?? '');
              if (!isPlausiblePhoneDigits(digits)) continue;
              // Find matching entry by lid
              const match = chunk.find(
                (c) => c.lid === lidHit || c.lid === e?.lid || e?.jid === c.lid,
              );
              if (match) {
                inst.lidToPhone.set(match.lid, digits);
                resolvedParticipants[match.index] = {
                  id: `${digits}@s.whatsapp.net`,
                  admin: match.admin,
                  resolvedPhone: digits,
                };
              }
            }
          }
        } catch {
          // network errors â€” ignore, keep placeholders
        }
      }
    }

    results.push({
      id: g.id,
      subject: g.subject ?? '',
      desc: (g as any).desc ?? null,
      participants: resolvedParticipants,
    });
  }

  return results;
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
  const clean = normalizeDigits(phone);
  if (!isPlausiblePhoneDigits(clean)) {
    throw new Error('Numero invalido. Use DDI + DDD + numero.');
  }

  const inflight = pairingCodeRequests.get(sessionId);
  if (inflight) return inflight;

  const requestPromise = (async () => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const sock = await ensure(sessionId);
        if (sock.authState?.creds?.registered) {
          throw new Error('Sessao ja vinculada. Recrie a sessao para parear outro numero.');
        }

        await sock.waitForSocketOpen();
        await sleep(200);

        const code = await sock.requestPairingCode(clean);
        await prisma.session.update({
          where: { id: sessionId },
          data: { status: 'pairing', disconnectReason: null },
        });
        await writeLog(sessionId, 'info', `Codigo de pareamento gerado para ${clean}`);
        return code;
      } catch (error) {
        lastError = error;
        const retryable = isTransientPairingError(error);
        if (!retryable || attempt >= 3) break;

        logger.warn(
          { err: error, sessionId, attempt },
          'pairing-code transient failure, recreating socket',
        );
        await stop(sessionId, 'restart').catch(() => undefined);
        await sleep(400 * attempt);
      }
    }

    logger.warn({ err: lastError, sessionId }, 'pairing-code failed');
    throw new Error('Nao foi possivel gerar o codigo agora. Tente novamente em alguns segundos.');
  })().finally(() => {
    pairingCodeRequests.delete(sessionId);
  });

  pairingCodeRequests.set(sessionId, requestPromise);
  return requestPromise;
}

export async function reconnectViaQr(sessionId: string): Promise<void> {
  // Stop any running instance, wipe saved credentials, then start fresh (will emit QR)
  await stop(sessionId, 'restart');
  const authDir = path.resolve(env.BAILEYS_AUTH_DIR, sessionId);
  await fs.rm(authDir, { recursive: true, force: true });
  await fs.mkdir(authDir, { recursive: true });
  await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'pairing', qrCodeDataUrl: null, disconnectReason: null },
  });
  await ensure(sessionId);
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

