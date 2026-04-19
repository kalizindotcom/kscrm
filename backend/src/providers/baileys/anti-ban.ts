/**
 * Anti-ban policy para Baileys.
 *
 * Estratégias combinadas (consenso 2025/2026 para evitar flag do WhatsApp):
 *  - Delay humanizado entre mensagens (jitter MIN..MAX).
 *  - Typing indicator antes de cada envio (composing → paused).
 *  - Quotas defensivas por minuto / hora / dia.
 *  - Pausa longa a cada N mensagens enviadas.
 *  - Warm-up: sessões criadas nos últimos N dias operam com quotas reduzidas (1/3).
 *
 * Este módulo é puro (sem side effects de rede) — o manager do Baileys o consulta
 * antes de chamar `sock.sendMessage`.
 */
import { env } from '../../config/env.js';
import { RateLimitError } from '../../lib/errors.js';
import { prisma } from '../../db/client.js';

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export function jitterDelay(): number {
  return rnd(env.ANTIBAN_MIN_DELAY_MS, env.ANTIBAN_MAX_DELAY_MS);
}

export function typingMs(): number {
  return rnd(env.ANTIBAN_TYPING_MS_MIN, env.ANTIBAN_TYPING_MS_MAX);
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface QuotaCheck {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
  longPause?: boolean;
}

/**
 * Verifica quotas da sessão antes de enviar. Atualiza contadores sliding-window por janela simples.
 * Retorna allowed=false se estourou quota. O caller deve esperar `retryAfterMs`.
 */
export async function checkQuota(sessionId: string): Promise<QuotaCheck> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { allowed: false, reason: 'session not found' };

  const now = Date.now();
  const last = session.lastMessageAt?.getTime() ?? 0;

  // Warm-up — escala quotas para 1/3 se sessão tem menos de WARMUP_DAYS
  const warmupActive =
    !!session.warmupStartedAt &&
    now - session.warmupStartedAt.getTime() < env.ANTIBAN_WARMUP_DAYS * 86_400_000;

  const factor = warmupActive ? 3 : 1;
  const ratePerMinute = Math.max(1, Math.floor(env.ANTIBAN_RATE_PER_MINUTE / factor));
  const ratePerHour = Math.max(1, Math.floor(env.ANTIBAN_RATE_PER_HOUR / factor));
  const ratePerDay = Math.max(1, Math.floor(env.ANTIBAN_RATE_PER_DAY / factor));

  // Reset de janelas com base em lastMessageAt
  if (now - last > 60_000 && session.messagesLastMinute > 0) {
    await prisma.session.update({ where: { id: sessionId }, data: { messagesLastMinute: 0 } });
    session.messagesLastMinute = 0;
  }
  if (now - last > 3_600_000 && session.messagesLastHour > 0) {
    await prisma.session.update({ where: { id: sessionId }, data: { messagesLastHour: 0 } });
    session.messagesLastHour = 0;
  }
  if (now - last > 86_400_000 && session.messagesLastDay > 0) {
    await prisma.session.update({ where: { id: sessionId }, data: { messagesLastDay: 0 } });
    session.messagesLastDay = 0;
  }

  if (session.messagesLastMinute >= ratePerMinute) {
    return { allowed: false, reason: 'rate/min exceeded', retryAfterMs: 60_000 };
  }
  if (session.messagesLastHour >= ratePerHour) {
    return { allowed: false, reason: 'rate/hour exceeded', retryAfterMs: 3_600_000 };
  }
  if (session.messagesLastDay >= ratePerDay) {
    return { allowed: false, reason: 'rate/day exceeded', retryAfterMs: 86_400_000 };
  }

  // Pausa longa a cada ANTIBAN_PAUSE_AFTER mensagens
  const longPause =
    session.messagesLastHour > 0 &&
    session.messagesLastHour % env.ANTIBAN_PAUSE_AFTER === 0;

  return { allowed: true, longPause };
}

export async function incrementCounters(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      messagesLastMinute: { increment: 1 },
      messagesLastHour: { increment: 1 },
      messagesLastDay: { increment: 1 },
      lastMessageAt: new Date(),
      lastActivity: new Date(),
    },
  });
}

export function assertAllowedOrThrow(check: QuotaCheck) {
  if (!check.allowed) {
    throw new RateLimitError(check.reason ?? 'Anti-ban: envio bloqueado');
  }
}
