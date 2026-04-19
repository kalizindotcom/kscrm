import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  origin: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  optIn: z.enum(['granted', 'revoked', 'unknown']).optional(),
  tags: z.array(z.string()).optional(),
});

export async function contactsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

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

  app.post('/api/contacts', async (req) => {
    const body = createSchema.parse(req.body);
    return prisma.contact.create({ data: body });
  });

  app.put('/api/contacts/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = createSchema.partial().parse(req.body);
    return prisma.contact.update({ where: { id }, data: body });
  });

  app.delete('/api/contacts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.contact.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  app.get('/api/contacts/imports', async () => {
    return prisma.contactImport.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  });

  app.post('/api/contacts/import', async (req) => {
    const file = await (req as any).file();
    if (!file) throw new Error('Arquivo ausente');
    const name = (file.fields?.name?.value as string) ?? file.filename;

    // Parse simples de CSV (phone, name) — a primeira linha é cabeçalho opcional
    const text = (await file.toBuffer()).toString('utf8');
    const lines = text.split(/\r?\n/).filter(Boolean);
    const rows = lines
      .map((line: string) => line.split(/[;,\t]/).map((cell: string) => cell.trim()))
      .filter((row: string[]) => row[0] && /\d/.test(row[0]));

    const imp = await prisma.contactImport.create({
      data: {
        name,
        filename: file.filename,
        status: 'processing',
        contactCount: rows.length,
      },
    });

    // Processamento inline — produção usar BullMQ
    let processed = 0;
    let errors = 0;
    for (const [phone, cname] of rows) {
      try {
        await prisma.contact.upsert({
          where: { phone: phone.replace(/\D/g, '') },
          create: {
            phone: phone.replace(/\D/g, ''),
            name: cname ?? phone,
            origin: `import:${imp.id}`,
          },
          update: { name: cname ?? undefined },
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

  app.get('/api/contacts/export', async (req, reply) => {
    const { format } = z.object({ format: z.enum(['csv', 'json']).default('csv') }).parse(req.query);
    const items = await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return items;
    const header = 'phone,name,status,optIn,tags\n';
    const body = items.map((c) => `${c.phone},${c.name},${c.status},${c.optIn},"${c.tags.join('|')}"`).join('\n');
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="contacts.csv"');
    return header + body;
  });
}
