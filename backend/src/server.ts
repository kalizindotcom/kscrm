import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import { ZodError } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './db/client.js';
import { AppError } from './lib/errors.js';
import { initWs } from './ws/index.js';
import { startAllPersisted } from './providers/baileys/manager.js';
import { recoverAndSchedule as recoverCampaigns, pauseAllActive } from './modules/campaigns/campaign-worker.js';
import { warmupRoutes } from './modules/warmup/warmup.routes.js';
import { recoverWarmups } from './modules/warmup/warmup-worker.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { contactsRoutes } from './modules/contacts/contacts.routes.js';
import { sessionsRoutes } from './modules/sessions/sessions.routes.js';
import { messagesRoutes } from './modules/messages/messages.routes.js';
import { conversationsRoutes } from './modules/conversations/conversations.routes.js';
import { campaignsRoutes } from './modules/campaigns/campaigns.routes.js';
import { groupsRoutes } from './modules/groups/groups.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { templatesRoutes } from './modules/templates/templates.routes.js';
import { debugRoutes } from './modules/debug/debug.routes.js';
import { storiesRoutes } from './modules/stories/stories.routes.js';

async function ensureRuntimeDirs() {
  await fs.mkdir(path.resolve(env.BAILEYS_AUTH_DIR), { recursive: true });
  await fs.mkdir(path.resolve(env.UPLOAD_DIR), { recursive: true });
}

const app = Fastify({
  logger,
  bodyLimit: env.UPLOAD_MAX_MB * 1024 * 1024,
});

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

await app.register(multipart, {
  limits: {
    fileSize: env.UPLOAD_MAX_MB * 1024 * 1024,
  },
});

await app.register(staticPlugin, {
  root: path.resolve(env.UPLOAD_DIR),
  prefix: '/uploads/',
  decorateReply: false,
});

app.get('/health', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true, service: 'ks-csm-backend', timestamp: new Date().toISOString() };
});

await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(adminRoutes, { prefix: '/api/admin' });
await app.register(contactsRoutes, { prefix: '/api/contacts' });
await app.register(sessionsRoutes, { prefix: '/api/sessions' });
await app.register(messagesRoutes, { prefix: '/api/messages' });
await app.register(conversationsRoutes, { prefix: '/api/conversations' });
await app.register(campaignsRoutes, { prefix: '/api/campaigns' });
await app.register(groupsRoutes, { prefix: '/api/groups' });
await app.register(reportsRoutes, { prefix: '/api/reports' });
await app.register(templatesRoutes, { prefix: '/api/templates' });
await app.register(warmupRoutes, { prefix: '/api/warmup' });
await app.register(debugRoutes, { prefix: '/api/debug' });
await app.register(storiesRoutes, { prefix: '/api/stories' });

app.setNotFoundHandler(async (_req, reply) => {
  return reply.status(404).send({
    code: 'NOT_FOUND',
    message: 'Route not found',
  });
});

app.setErrorHandler((error, _req, reply) => {
  if (error instanceof ZodError) {
    return reply.status(422).send({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      issues: error.issues,
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      code: error.code,
      message: error.message,
    });
  }

  logger.error({ err: error }, 'Unhandled error');
  return reply.status(500).send({
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
});

async function bootstrap() {
  await ensureRuntimeDirs();
  initWs(app.server);

  await app.listen({ port: env.PORT, host: env.HOST });
  logger.info({ host: env.HOST, port: env.PORT }, 'HTTP server running');

  startAllPersisted().catch((err) => {
    logger.error({ err }, 'Failed to resume persisted Baileys sessions');
  });

  // Retoma campanhas em 'running' e inicia o agendador
  recoverCampaigns().catch((err) => {
    logger.error({ err }, 'Failed to recover campaigns');
  });

  recoverWarmups().catch((err) => {
    logger.error({ err }, 'Failed to recover warmups');
  });
}

bootstrap().catch(async (err) => {
  logger.error({ err }, 'Failed to bootstrap server');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully');

  // Pause all in-memory campaign workers and wait for them to finish the
  // current target before the process exits (max 30s).
  try {
    await Promise.race([
      pauseAllActive(),
      new Promise<void>((resolve) => setTimeout(resolve, 30_000)),
    ]);
  } catch {
    // best-effort
  }

  await app.close().catch(() => undefined);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(0);
};

process.on('SIGINT', () => {
  shutdown('SIGINT').catch(() => process.exit(0));
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch(() => process.exit(0));
});
