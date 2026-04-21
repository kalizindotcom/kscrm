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
import { recoverAndSchedule as recoverCampaigns } from './modules/campaigns/campaign-worker.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { contactsRoutes } from './modules/contacts/contacts.routes.js';
import { sessionsRoutes } from './modules/sessions/sessions.routes.js';
import { messagesRoutes } from './modules/messages/messages.routes.js';
import { conversationsRoutes } from './modules/conversations/conversations.routes.js';
import { campaignsRoutes } from './modules/campaigns/campaigns.routes.js';
import { groupsRoutes } from './modules/groups/groups.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { templatesRoutes } from './modules/templates/templates.routes.js';

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

await app.register(authRoutes);
await app.register(contactsRoutes);
await app.register(sessionsRoutes);
await app.register(messagesRoutes);
await app.register(conversationsRoutes);
await app.register(campaignsRoutes);
await app.register(groupsRoutes);
await app.register(reportsRoutes);
await app.register(templatesRoutes);

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
}

bootstrap().catch(async (err) => {
  logger.error({ err }, 'Failed to bootstrap server');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully');
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
