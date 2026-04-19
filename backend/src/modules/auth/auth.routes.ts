import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as service from './auth.service.js';
import { requireAuth } from '../../middleware/auth.js';

const loginSchema = z.object({ email: z.string().min(1), password: z.string().min(1) });
const refreshSchema = z.object({ refreshToken: z.string().min(10) });

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const result = await service.login(body.email, body.password);
    return reply.send(result);
  });

  app.post('/api/auth/refresh', async (req, reply) => {
    const body = refreshSchema.parse(req.body);
    const result = await service.refresh(body.refreshToken);
    return reply.send(result);
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const body = refreshSchema.parse(req.body);
    await service.logout(body.refreshToken);
    return reply.send({ ok: true });
  });

  app.get('/api/auth/me', { preHandler: requireAuth }, async (req, reply) => {
    const user = await service.me(req.user!.sub);
    return reply.send(user);
  });
}
