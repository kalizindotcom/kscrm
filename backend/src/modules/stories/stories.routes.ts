import { FastifyInstance } from 'fastify';
import { storiesController } from './stories.controller';
import { requireAuth } from '../../middleware/auth.js';

export async function storiesRoutes(fastify: FastifyInstance) {
  // Todas as rotas requerem autenticação
  fastify.addHook('preHandler', requireAuth);

  // Listar stories de uma sessão
  fastify.get('/:sessionId', storiesController.listBySession);

  // Buscar mídia de um story específico
  fastify.get('/:sessionId/:storyId/media', storiesController.getMedia);

  // Marcar story como visualizado
  fastify.post('/:sessionId/:storyId/view', storiesController.markViewed);

  // Responder a um story
  fastify.post('/:sessionId/:storyId/reply', storiesController.reply);
}
