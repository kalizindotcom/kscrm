import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as service from './messages.service.js';
import { requireAuth } from '../../middleware/auth.js';

const sendTextSchema = z.object({
  sessionId: z.string(),
  phone: z.string().min(8),
  content: z.string().min(1),
  quotedMessageId: z.string().optional(), // internal DB message id to reply to
});

const buttonSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(['reply', 'url', 'call']).optional(),
  value: z.string().optional(),
});

const sendButtonsSchema = z.object({
  sessionId: z.string(),
  phone: z.string().min(8),
  text: z.string().min(1),
  footer: z.string().optional(),
  buttons: z.array(buttonSchema).min(1).max(3),
});

export async function messagesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.post('/send', async (req) => {
    const b = sendTextSchema.parse(req.body);
    return service.sendText(req.user!.sub, b.sessionId, b.phone, b.content, b.quotedMessageId);
  });

  app.post('/send-buttons', async (req) => {
    const b = sendButtonsSchema.parse(req.body);
    return service.sendButtons(req.user!.sub, b.sessionId, b.phone, {
      text: b.text,
      footer: b.footer,
      buttons: b.buttons,
    });
  });

  app.post('/send-media', async (req) => {
    const data = await (req as any).file();
    if (!data) throw new Error('Arquivo ausente');
    const buffer = await data.toBuffer();
    const { sessionId, phone, caption, type } = data.fields as any;
    return service.sendMedia(req.user!.sub, sessionId.value, phone.value, {
      buffer,
      mimetype: data.mimetype,
      caption: caption?.value,
      type: (type?.value ?? 'document') as any,
      filename: data.filename,
    });
  });

  app.post('/:id/retry', async (req) => {
    const { id } = req.params as { id: string };
    return service.retry(req.user!.sub, id);
  });
}
