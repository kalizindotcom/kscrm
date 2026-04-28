import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError } from '../../lib/errors.js';

const createNoteSchema = z.object({
  content: z.string().min(1),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  isInternal: z.boolean().default(false),
});

const updateNoteSchema = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().optional(),
});

export async function notesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // ── List notes ────────────────────────────────────────────────────────────
  app.get('/', async (req) => {
    const userId = req.user!.sub;
    const { contactId, dealId, page, pageSize } = z
      .object({
        contactId: z.string().optional(),
        dealId: z.string().optional(),
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().min(1).max(100).default(50),
      })
      .parse(req.query);

    const where: any = { userId };
    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;

    const [items, total] = await Promise.all([
      prisma.note.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.note.count({ where }),
    ]);

    return { items, total, page, pageSize };
  });

  // ── Get note by ID ────────────────────────────────────────────────────────
  app.get('/:id', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const note = await prisma.note.findFirst({
      where: { id, userId },
    });

    if (!note) throw new NotFoundError('Nota não encontrada');
    return note;
  });

  // ── Create note ───────────────────────────────────────────────────────────
  app.post('/', async (req) => {
    const userId = req.user!.sub;
    const body = createNoteSchema.parse(req.body);

    const note = await prisma.note.create({
      data: { ...body, userId },
    });

    // Log activity if note is linked to a deal
    if (note.dealId) {
      await prisma.dealActivity.create({
        data: {
          dealId: note.dealId,
          type: 'note_added',
          description: `Nota adicionada: ${note.content.substring(0, 50)}...`,
          userId,
        },
      });
    }

    return note;
  });

  // ── Update note ───────────────────────────────────────────────────────────
  app.patch('/:id', async (req) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };
    const body = updateNoteSchema.parse(req.body);

    const existing = await prisma.note.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Nota não encontrada');

    const note = await prisma.note.update({
      where: { id },
      data: body,
    });

    return note;
  });

  // ── Delete note ───────────────────────────────────────────────────────────
  app.delete('/:id', async (req, reply) => {
    const userId = req.user!.sub;
    const { id } = req.params as { id: string };

    const existing = await prisma.note.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Nota não encontrada');

    await prisma.note.delete({ where: { id } });
    return reply.status(204).send();
  });
}
