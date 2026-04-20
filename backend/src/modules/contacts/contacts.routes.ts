import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError } from '../../lib/errors.js';

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  origin: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  optIn: z.enum(['granted', 'revoked', 'unknown']).optional(),
  tags: z.array(z.string()).optional(),
});

// Header labels that indicate a CSV column is a phone number
const PHONE_LABELS = new Set(['phone', 'telefone', 'celular', 'fone']);
// Header labels that indicate a CSV column is a name
const NAME_LABELS = new Set(['name', 'nome']);

function detectHeader(firstRow: string[]): boolean {
  return firstRow.some((cell) => {
    const lower = cell.toLowerCase().trim();
    return PHONE_LABELS.has(lower) || NAME_LABELS.has(lower);
  });
}

function findColumnIndexes(headerRow: string[]): { phoneIdx: number; nameIdx: number } {
  let phoneIdx = 0;
  let nameIdx = 1;
  headerRow.forEach((cell, i) => {
    const lower = cell.toLowerCase().trim();
    if (PHONE_LABELS.has(lower)) phoneIdx = i;
    if (NAME_LABELS.has(lower)) nameIdx = i;
  });
  return { phoneIdx, nameIdx };
}

export async function contactsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // ── List ─────────────────────────────────────────────────────────────────
  app.get('/api/contacts', async (req) => {
    const { search, status, page, pageSize } = z
      .object({
        search: z.string().optional(),
        status: z.enum(['active', 'inactive', 'pending']).optional(),
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().default(50),
      })
      .parse(req.query);

    const where: any = {
      ...(status ? { status } : {}),
      ...(search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contact.count({ where }),
    ]);

    return { items, total, page, pageSize };
  });

  // ── Create ────────────────────────────────────────────────────────────────
  app.post('/api/contacts', async (req) => {
    const body = createSchema.parse(req.body);
    return prisma.contact.create({ data: body });
  });

  // ── Bulk delete by IDs (static path — must come before /:id) ───────────────
  app.post('/api/contacts/bulk-delete', async (req, reply) => {
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
    await prisma.contact.deleteMany({ where: { id: { in: ids } } });
    return reply.send({ ok: true, deleted: ids.length });
  });

  // ── Delete ALL contacts (static path — must come before /:id) ────────────
  app.delete('/api/contacts', async (req, reply) => {
    const { search } = z.object({ search: z.string().optional() }).parse(req.query);
    const where: any = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] }
      : {};
    const result = await prisma.contact.deleteMany({ where });
    return reply.send({ ok: true, deleted: result.count });
  });

  // ── Import history list (static path — must come before /:id) ────────────
  app.get('/api/contacts/imports', async () => {
    return prisma.contactImport.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  });

  // ── CSV/JSON import (static path — must come before /:id) ────────────────
  app.post('/api/contacts/import', async (req) => {
    const file = await (req as any).file();
    if (!file) throw new Error('Arquivo ausente');
    const name = (file.fields?.name?.value as string) ?? file.filename;

    // Parse optional comma-separated tags from multipart field
    const rawTags: string = (file.fields?.tags?.value as string) ?? '';
    const tags: string[] = rawTags
      ? rawTags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

    const text = (await file.toBuffer()).toString('utf8');
    const allLines = text.split(/\r?\n/).filter(Boolean);

    if (allLines.length === 0) throw new Error('Arquivo CSV vazio');

    const firstRow = allLines[0].split(/[;,\t]/).map((cell: string) => cell.trim());
    const hasHeader = detectHeader(firstRow);

    let dataLines: string[];
    let phoneIdx: number;
    let nameIdx: number;

    if (hasHeader) {
      // Skip header row and resolve column positions from it
      dataLines = allLines.slice(1);
      ({ phoneIdx, nameIdx } = findColumnIndexes(firstRow));
    } else {
      // No header: assume first col = phone, second col = name
      dataLines = allLines;
      phoneIdx = 0;
      nameIdx = 1;
    }

    // Keep only rows where the phone cell contains at least one digit
    const rows = dataLines
      .map((line: string) => line.split(/[;,\t]/).map((cell: string) => cell.trim()))
      .filter((row: string[]) => row[phoneIdx] && /\d/.test(row[phoneIdx]));

    const imp = await prisma.contactImport.create({
      data: {
        name,
        filename: file.filename,
        status: 'processing',
        contactCount: rows.length,
      },
    });

    // Inline processing — use BullMQ in production
    let processed = 0;
    let errors = 0;
    for (const row of rows) {
      const phone = row[phoneIdx];
      const cname = row[nameIdx];
      try {
        await prisma.contact.upsert({
          where: { phone: phone.replace(/\D/g, '') },
          create: {
            phone: phone.replace(/\D/g, ''),
            name: cname ?? phone,
            origin: `import:${imp.id}`,
            ...(tags.length ? { tags } : {}),
          },
          update: {
            name: cname ?? undefined,
            origin: `import:${imp.id}`,
            ...(tags.length ? { tags } : {}),
          },
        });
        processed++;
      } catch {
        errors++;
      }
    }

    return prisma.contactImport.update({
      where: { id: imp.id },
      data: { status: 'completed', processedCount: processed, errorCount: errors },
    });
  });

  // ── Export (static path — must come before /:id) ─────────────────────────
  app.get('/api/contacts/export', async (req, reply) => {
    const { format, importIds } = z
      .object({
        format: z.enum(['csv', 'json']).default('csv'),
        importIds: z.string().optional(),
      })
      .parse(req.query);

    const where: any = {};

    if (importIds) {
      const ids = importIds.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) {
        where.OR = ids.map((id) => ({ origin: { startsWith: `import:${id}` } }));
      }
    }

    const items = await prisma.contact.findMany({ where, orderBy: { createdAt: 'desc' } });

    if (format === 'json') return items;

    const header = 'phone,name,status,optIn,tags\n';
    const body = items
      .map((c) => `${c.phone},"${c.name}",${c.status},${c.optIn},"${c.tags.join('|')}"`)
      .join('\n');
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="contacts.csv"');
    return header + body;
  });

  // ── Import detail — dynamic segment after all static /imports/* ───────────
  app.get('/api/contacts/imports/:id', async (req) => {
    const { id } = req.params as { id: string };
    const imp = await prisma.contactImport.findUnique({ where: { id } });
    if (!imp) throw new NotFoundError('Importacao nao encontrada');

    const contacts = await prisma.contact.findMany({
      where: { origin: { startsWith: `import:${id}` } },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    return { ...imp, contacts };
  });

  // ── Single contact by id (dynamic — last among GETs) ─────────────────────
  app.get('/api/contacts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) return reply.status(404).send({ error: 'Contato nao encontrado' });
    return contact;
  });

  // ── Update ────────────────────────────────────────────────────────────────
  app.put('/api/contacts/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = createSchema.partial().parse(req.body);
    return prisma.contact.update({ where: { id }, data: body });
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  app.delete('/api/contacts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.contact.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}
