import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as service from './sessions.service.js';
import { requireAuth } from '../../middleware/auth.js';

const createSchema = z.object({
  name: z.string().min(1),
  nickname: z.string().optional(),
  environment: z.enum(['production', 'test', 'sandbox']).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  responsible: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  notes: z.string().optional(),
  favorite: z.boolean().optional(),
});

export async function sessionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (req) => service.list(req.user!.sub));

  app.get('/metrics', async (req) => service.metrics(req.user!.sub));

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string };
    return service.get(req.user!.sub, id);
  });

  app.post('/', async (req) => {
    const body = createSchema.parse(req.body);
    return service.create(req.user!.sub, body);
  });

  app.patch('/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = updateSchema.parse(req.body);
    return service.update(req.user!.sub, id, body);
  });

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await service.remove(req.user!.sub, id);
    return reply.send({ ok: true });
  });

  app.post('/:id/connect', async (req) => {
    const { id } = req.params as { id: string };
    return service.connect(req.user!.sub, id);
  });

  app.post('/:id/reconnect-qr', async (req) => {
    const { id } = req.params as { id: string };
    return service.reconnectViaQr(req.user!.sub, id);
  });

  app.post('/:id/pairing-code', async (req) => {
    const { id } = req.params as { id: string };
    const { phone } = z.object({ phone: z.string().min(8) }).parse(req.body);
    return service.pairingCode(req.user!.sub, id, phone);
  });

  app.post('/:id/pause', async (req) => {
    const { id } = req.params as { id: string };
    return service.pause(req.user!.sub, id);
  });

  app.post('/:id/resume', async (req) => {
    const { id } = req.params as { id: string };
    return service.resume(req.user!.sub, id);
  });

  app.post('/:id/terminate', async (req) => {
    const { id } = req.params as { id: string };
    return service.terminate(req.user!.sub, id);
  });

  app.post('/:id/archive', async (req) => {
    const { id } = req.params as { id: string };
    return service.archive(req.user!.sub, id);
  });

  app.post('/:id/unarchive', async (req) => {
    const { id } = req.params as { id: string };
    return service.unarchive(req.user!.sub, id);
  });

  app.get('/:id/qr', async (req) => {
    const { id } = req.params as { id: string };
    return service.qr(req.user!.sub, id);
  });

  app.post('/:id/sync-contacts', async (req) => {
    const { id } = req.params as { id: string };
    return service.syncContacts(req.user!.sub, id);
  });

  app.post('/:id/sync-whatsapp', async (req) => {
    const { id } = req.params as { id: string };
    return service.syncWhatsApp(req.user!.sub, id);
  });

  app.get('/:id/logs', async (req) => {
    const { id } = req.params as { id: string };
    const { limit } = z.object({ limit: z.coerce.number().optional() }).parse(req.query);
    return service.logs(req.user!.sub, id, limit);
  });
}
