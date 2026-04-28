import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError } from '../../lib/errors.js';

const createSegmentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  filters: z.record(z.any()), // { tags: ["vip"], status: "active", etc }
  isDynamic: z.boolean().default(true),
});

const updateSegmentSchema = createSegmentSchema.partial();

export async function segmentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // ── List segments ─────────────────────────────────────────────────────────
  app.get('/', async (req) => {
    const userId = req.user!.sub;
    const { page, pageSize } = z
      .object({
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().min(1).max(100).default(50),
      })
      .parse(req.query);

    const [items, total] = await Promise.all([
      prisma.segment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.segment.count({ where: { userId } }),
    ]);

    return { items, total, page, pageSize };
  });

  // ── Get segment by ID ─────────────────────────────────────────────────────
  app.get('/:id', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const segment = await prisma.segment.findFirst({
      where: { id, userId },
    });

    if (!segment) throw new NotFoundError('Segmento não encontrado');
    return segment;
  });

  // ── Create segment ────────────────────────────────────────────────────────
  app.post('/', async (req) => {
    const userId = req.user!.sub;
    const body = createSegmentSchema.parse(req.body);

    const segment = await prisma.segment.create({
      data: { ...body, userId },
    });

    return segment;
  });

  // ── Update segment ────────────────────────────────────────────────────────
  app.patch('/:id', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const body = updateSegmentSchema.parse(req.body);

    const existing = await prisma.segment.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Segmento não encontrado');

    const segment = await prisma.segment.update({
      where: { id },
      data: body,
    });

    return segment;
  });

  // ── Delete segment ────────────────────────────────────────────────────────
  app.delete('/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const existing = await prisma.segment.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Segmento não encontrado');

    await prisma.segment.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ── Get contacts in segment ───────────────────────────────────────────────
  app.get('/:id/contacts', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const { page, pageSize } = z
      .object({
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().min(1).max(100).default(50),
      })
      .parse(req.query);

    const segment = await prisma.segment.findFirst({ where: { id, userId } });
    if (!segment) throw new NotFoundError('Segmento não encontrado');

    // Build dynamic where clause from filters
    const filters = segment.filters as any;
    const where: any = { userId };

    if (filters.tags && Array.isArray(filters.tags)) {
      where.tags = { hasSome: filters.tags };
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.lifecycle) {
      where.lifecycle = filters.lifecycle;
    }
    if (filters.lastInteraction) {
      if (filters.lastInteraction.gte) {
        where.lastInteraction = { gte: new Date(filters.lastInteraction.gte) };
      }
      if (filters.lastInteraction.lte) {
        where.lastInteraction = { ...where.lastInteraction, lte: new Date(filters.lastInteraction.lte) };
      }
    }

    const [items, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contact.count({ where }),
    ]);

    // Update cached count
    await prisma.segment.update({
      where: { id },
      data: { contactCount: total, lastCountUpdate: new Date() },
    });

    return { items, total, page, pageSize };
  });

  // ── Refresh segment count ─────────────────────────────────────────────────
  app.post('/:id/refresh', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const segment = await prisma.segment.findFirst({ where: { id, userId } });
    if (!segment) throw new NotFoundError('Segmento não encontrado');

    // Build where clause and count
    const filters = segment.filters as any;
    const where: any = { userId };

    if (filters.tags && Array.isArray(filters.tags)) {
      where.tags = { hasSome: filters.tags };
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.lifecycle) {
      where.lifecycle = filters.lifecycle;
    }

    const count = await prisma.contact.count({ where });

    const updated = await prisma.segment.update({
      where: { id },
      data: { contactCount: count, lastCountUpdate: new Date() },
    });

    return updated;
  });
}
