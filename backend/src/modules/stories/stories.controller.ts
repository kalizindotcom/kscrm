import { FastifyRequest, FastifyReply } from 'fastify';
import { storiesService } from './stories.service';

export const storiesController = {
  async listBySession(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId } = request.params;
      const stories = await storiesService.fetchStoriesFromWhatsApp(sessionId);
      return reply.send(stories);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: error.message || 'Erro ao buscar stories' });
    }
  },

  async getMedia(request: FastifyRequest<{ Params: { sessionId: string; storyId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId, storyId } = request.params;
      const mediaPath = await storiesService.getStoryMedia(sessionId, storyId);

      if (!mediaPath) {
        return reply.status(404).send({ error: 'Mídia não encontrada' });
      }

      return reply.sendFile(mediaPath);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: error.message || 'Erro ao buscar mídia' });
    }
  },

  async markViewed(request: FastifyRequest<{ Params: { sessionId: string; storyId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId, storyId } = request.params;
      await storiesService.markStoryAsViewed(sessionId, storyId);
      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: error.message || 'Erro ao marcar story como visualizado' });
    }
  },

  async reply(
    request: FastifyRequest<{
      Params: { sessionId: string; storyId: string };
      Body: { message: string; contactJid: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { sessionId, storyId } = request.params;
      const { message, contactJid } = request.body;

      if (!message || !contactJid) {
        return reply.status(400).send({ error: 'Mensagem e contactJid são obrigatórios' });
      }

      await storiesService.sendStoryReply(sessionId, storyId, contactJid, message);
      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: error.message || 'Erro ao enviar resposta' });
    }
  },
};
