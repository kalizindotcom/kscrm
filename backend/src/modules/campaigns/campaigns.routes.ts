import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import * as baileys from '../../providers/baileys/manager.js';
import { emitTo } from '../../ws/index.js';
import { NotFoundError } from '../../lib/errors.js';

const buttonSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  type: z.enum(['reply', 'url', 'call']).optional(),
  value: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  sessionId: z.string().optional(),
  channel: z.enum(['whatsapp', 'sms']).default('whatsapp'),
  templateId: z.string().optional(),
  segmentId: z.string().optional(),
  messageContent: z.string().default(''),
  intervalSec: z.number().min(1).max(120).default(5),
  buttonsEnabled: z.boolean().default(false),
  buttons: z.array(buttonSchema).optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(['image', 'video', 'audio', 'none']).optional(),
});

const fireSchema = z.object({
  sessionId: z.string(),
  targets: z.array(z.object({ phone: z.string(), name: z.string().optional() })).min(1),
  intervalSec: z.number().min(1).max(120).optional(),
});

const fireControl = new Map<string, { cancelled: boolean }>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureCampaignOwned(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
  if (!campaign) throw new NotFoundError('Campanha não encontrada');
  return campaign;
}

async function ensureSessionOwned(sessionId: string, userId: string) {
  const session = await prisma.session.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new NotFoundError('Sessão não encontrada');
  return session;
}

export async function campaignsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/api/campaigns', async (req) => {
    return prisma.campaign.findMany({ where: { userId: req.user!.sub }, orderBy: { createdAt: 'desc' } });
  });

  app.get('/api/campaigns/:id', async (req) => {
    const { id } = req.params as { id: string };
    const camp = await prisma.campaign.findFirst({
      where: { id, userId: req.user!.sub },
      include: { targets: true },
    });
    if (!camp) throw new NotFoundError('Campanha não encontrada');
    return camp;
  });

  app.post('/api/campaigns', async (req) => {
    const body = createSchema.parse(req.body);

    if (body.sessionId) {
      await ensureSessionOwned(body.sessionId, req.user!.sub);
    }

    return prisma.campaign.create({
      data: {
        userId: req.user!.sub,
        name: body.name,
        sessionId: body.sessionId,
        channel: body.channel,
        templateId: body.templateId,
        segmentId: body.segmentId,
        messageContent: body.messageContent,
        intervalSec: body.intervalSec,
        buttonsEnabled: body.buttonsEnabled,
        buttonsJson: body.buttons as any,
        mediaUrl: body.mediaUrl,
        mediaType: body.mediaType,
      },
    });
  });

  app.put('/api/campaigns/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = createSchema.partial().parse(req.body);
    await ensureCampaignOwned(id, req.user!.sub);

    if (body.sessionId) {
      await ensureSessionOwned(body.sessionId, req.user!.sub);
    }

    return prisma.campaign.update({
      where: { id },
      data: {
        ...body,
        buttonsJson: body.buttons ?? undefined,
      } as any,
    });
  });

  app.delete('/api/campaigns/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await ensureCampaignOwned(id, req.user!.sub);
    fireControl.delete(id);
    await prisma.campaign.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  app.post('/api/campaigns/:id/fire', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = fireSchema.parse(req.body);

    const camp = await ensureCampaignOwned(id, req.user!.sub);
    const session = await ensureSessionOwned(body.sessionId, req.user!.sub);
    if (session.status !== 'connected') {
      throw new Error('Sessão não conectada');
    }

    await prisma.campaignTarget.deleteMany({ where: { campaignId: id } });
    await prisma.campaignTarget.createMany({
      data: body.targets.map((target) => ({
        campaignId: id,
        phone: target.phone.replace(/\D/g, ''),
        name: target.name,
      })),
    });

    await prisma.campaign.update({
      where: { id },
      data: {
        status: 'running',
        sessionId: body.sessionId,
        intervalSec: body.intervalSec ?? camp.intervalSec,
        sentCount: 0,
        failedCount: 0,
      },
    });

    const control = { cancelled: false };
    fireControl.set(id, control);

    reply.send({ ok: true, status: 'running', total: body.targets.length });

    (async () => {
      const total = body.targets.length;
      let sent = 0;
      let failed = 0;

      for (const target of body.targets) {
        if (control.cancelled) break;

        const phone = target.phone.replace(/\D/g, '');
        try {
          if (camp.buttonsEnabled && Array.isArray(camp.buttonsJson) && camp.buttonsJson.length > 0) {
            await baileys.sendButtons(
              body.sessionId,
              phone,
              {
                text: camp.messageContent,
                buttons: camp.buttonsJson as any,
              },
              { applyDelay: false },
            );
          } else {
            await baileys.sendText(body.sessionId, phone, camp.messageContent, { applyDelay: false });
          }

          sent++;
          await prisma.campaignTarget.updateMany({
            where: { campaignId: id, phone },
            data: { status: 'sent', processedAt: new Date() },
          });
        } catch (err: any) {
          failed++;
          await prisma.campaignTarget.updateMany({
            where: { campaignId: id, phone },
            data: { status: 'failed', error: err?.message, processedAt: new Date() },
          });
        }

        const progress = Math.round(((sent + failed) / total) * 100);
        await prisma.campaign.update({
          where: { id },
          data: { sentCount: sent, failedCount: failed },
        });
        emitTo(`campaign:${id}`, {
          type: 'campaign.progress',
          campaignId: id,
          progress,
          currentTarget: target.phone,
          sent,
          failed,
        });

        const waitMs = (body.intervalSec ?? camp.intervalSec) * 1000;
        if (waitMs > 0) await sleep(waitMs);
      }

      const finalStatus = control.cancelled ? 'paused' : 'completed';
      await prisma.campaign.update({ where: { id }, data: { status: finalStatus } });
      emitTo(`campaign:${id}`, {
        type: 'campaign.progress',
        campaignId: id,
        progress: control.cancelled ? Math.round(((sent + failed) / total) * 100) : 100,
        sent,
        failed,
      });
      fireControl.delete(id);
    })().catch(async (err) => {
      await prisma.campaign.update({ where: { id }, data: { status: 'paused' } }).catch(() => undefined);
      fireControl.delete(id);
      console.error('campaign fire error', err);
    });
  });

  app.post('/api/campaigns/:id/cancel', async (req) => {
    const { id } = req.params as { id: string };
    await ensureCampaignOwned(id, req.user!.sub);

    const control = fireControl.get(id);
    if (control) {
      control.cancelled = true;
    }

    await prisma.campaign.update({ where: { id }, data: { status: 'paused' } });
    return { ok: true };
  });
}
