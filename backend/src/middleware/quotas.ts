import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/client.js';
import { ForbiddenError } from '../lib/errors.js';

type QuotaResource = 'sessions' | 'campaigns' | 'contacts' | 'messages';

/**
 * Middleware que verifica se o usuário atingiu o limite de um recurso.
 * Deve ser usado APÓS requireSubscription.
 */
export function checkQuota(resource: QuotaResource) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    const plan = req.plan;
    const user = req.user;

    if (!plan) {
      throw new Error('requireSubscription must be called before checkQuota');
    }

    // Super admin não tem limites
    if (user?.role === 'super_admin') {
      return;
    }

    const userId = user!.sub;

    switch (resource) {
      case 'sessions': {
        const count = await prisma.session.count({
          where: { userId },
        });
        if (count >= plan.maxSessions) {
          throw new ForbiddenError(
            `Limite de sessões atingido (${plan.maxSessions}). Faça upgrade do seu plano.`
          );
        }
        break;
      }

      case 'campaigns': {
        const count = await prisma.campaign.count({
          where: { userId },
        });
        if (count >= plan.maxCampaigns) {
          throw new ForbiddenError(
            `Limite de campanhas atingido (${plan.maxCampaigns}). Faça upgrade do seu plano.`
          );
        }
        break;
      }

      case 'contacts': {
        const count = await prisma.contact.count({
          where: { userId },
        });
        if (count >= plan.maxContacts) {
          throw new ForbiddenError(
            `Limite de contatos atingido (${plan.maxContacts}). Faça upgrade do seu plano.`
          );
        }
        break;
      }

      case 'messages': {
        // Verificar mensagens enviadas hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const usageLog = await prisma.usageLog.findUnique({
          where: {
            userId_date: {
              userId,
              date: today,
            },
          },
        });

        const messagesSentToday = usageLog?.messagesSent ?? 0;
        if (messagesSentToday >= plan.maxMessagesDay) {
          throw new ForbiddenError(
            `Limite diário de mensagens atingido (${plan.maxMessagesDay}). Tente novamente amanhã ou faça upgrade.`
          );
        }
        break;
      }

      default:
        throw new Error(`Unknown quota resource: ${resource}`);
    }
  };
}

/**
 * Incrementa o contador de uso de um recurso.
 * Deve ser chamado APÓS a ação ser executada com sucesso.
 */
export async function incrementUsage(
  userId: string,
  resource: 'messages' | 'campaigns' | 'sessions'
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (resource) {
    case 'messages':
      await prisma.usageLog.upsert({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        create: {
          userId,
          date: today,
          messagesSent: 1,
        },
        update: {
          messagesSent: { increment: 1 },
        },
      });
      break;

    case 'campaigns':
      await prisma.usageLog.upsert({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        create: {
          userId,
          date: today,
          campaignsFired: 1,
        },
        update: {
          campaignsFired: { increment: 1 },
        },
      });
      break;

    case 'sessions':
      await prisma.usageLog.upsert({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        create: {
          userId,
          date: today,
          sessionsActive: 1,
        },
        update: {
          sessionsActive: { increment: 1 },
        },
      });
      break;
  }
}
