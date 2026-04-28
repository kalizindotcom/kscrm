import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import * as service from './auth.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { logLogin, logLogout } from '../../lib/activity-logger.js';

const loginSchema = z.object({ email: z.string().min(1), password: z.string().min(1) });
const refreshSchema = z.object({ refreshToken: z.string().min(10) });

// Simple in-memory fixed-window rate limit: 10 hits / 60s / (ip + bucket)
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 60_000;
const loginHits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(bucket: string, req: FastifyRequest): { ok: boolean; retryAfter: number } {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = loginHits.get(key);
  if (!entry || entry.resetAt <= now) {
    loginHits.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  entry.count++;
  if (entry.count > LOGIN_LIMIT) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

// Periodic cleanup to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of loginHits) if (v.resetAt <= now) loginHits.delete(k);
}, 5 * 60_000).unref?.();

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (req, reply) => {
    const rl = rateLimit('login', req);
    if (!rl.ok) {
      reply.header('Retry-After', String(rl.retryAfter));
      return reply.status(429).send({ error: 'Muitas tentativas. Tente novamente em instantes.' });
    }
    const body = loginSchema.parse(req.body);
    const result = await service.login(body.email, body.password);

    // Log login activity
    await logLogin(req, result.user.id, result.user.email);

    return reply.send(result);
  });

  app.post('/refresh', async (req, reply) => {
    const rl = rateLimit('refresh', req);
    if (!rl.ok) {
      reply.header('Retry-After', String(rl.retryAfter));
      return reply.status(429).send({ error: 'Muitas tentativas.' });
    }
    const body = refreshSchema.parse(req.body);
    const result = await service.refresh(body.refreshToken);
    return reply.send(result);
  });

  app.post('/logout', async (req, reply) => {
    const body = refreshSchema.parse(req.body);
    await service.logout(body.refreshToken);

    // Log logout if user is authenticated
    if (req.user) {
      await logLogout(req, req.user.sub);
    }

    return reply.send({ ok: true });
  });

  app.get('/me', { preHandler: requireAuth }, async (req, reply) => {
    const user = await service.me(req.user!.sub);
    return reply.send(user);
  });
}
