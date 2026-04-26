import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/client.js';
import { ForbiddenError } from '../lib/errors.js';

type QuotaResource = 'sessions' | 'campaigns' | 'contacts' | 'messages' | 'users';

/**
 * Middleware que verifica se a organização atingiu o limite de um recurso.
 * Deve ser usado APÓS requireTenant.
 */
export function checkQuota(resource: QuotaResource) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    const org = req.organization;
    const plan = req.plan;
    const user = req.user;

    if (!org || !plan) {
      throw new Error('requireTenant must be called before checkQuota');
    }

    // Super admin não tem limites
    if (user?.role === 'super_admin') {
      return;
    }

    switch (resource) {
      case 'sessions': {
        if (org.currentSessions >= plan.maxSessions) {
          throw new ForbiddenError(
            `Limite de sessões atingido (${plan.maxSessions}). Faça upgrade do seu plano.`
          );
        }
        break;
      }

      case 'campaigns': {
        const count = await prisma.campaign.count({
          where: {
            user: { organizationId: org.id },
          },
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
          where: {
            user: { organizationId: org.id },
          },
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
            organizationId_date: {
              organizationId: org.id,
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

      case 'users': {
        if (org.currentUsers >= plan.maxUsers) {
          throw new ForbiddenError(
            `Limite de usuários atingido (${plan.maxUsers}). Faça upgrade do seu plano.`
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
  organizationId: string,
  resource: 'messages' | 'campaigns' | 'sessions'
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (resource) {
    case 'messages':
      await prisma.usageLog.upsert({
        where: {
          organizationId_date: {
            organizationId,
            date: today,
          },
        },
        create: {
          organizationId,
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
          organizationId_date: {
            organizationId,
            date: today,
          },
        },
        create: {
          organizationId,
          date: today,
          campaignsFired: 1,
        },
        update: {
          campaignsFired: { increment: 1 },
        },
      });
      break;

    case 'sessions':
      await prisma.organization.update({
        where: { id: organizationId },
        data: { currentSessions: { increment: 1 } },
      });
      break;
  }
}

/**
 * Decrementa o contador de uso de um recurso.
 * Usado quando um recurso é removido (ex: sessão deletada).
 */
export async function decrementUsage(
  organizationId: string,
  resource: 'sessions' | 'users'
) {
  switch (resource) {
    case 'sessions':
      await prisma.organization.update({
        where: { id: organizationId },
        data: { currentSessions: { decrement: 1 } },
      });
      break;

    case 'users':
      await prisma.organization.update({
        where: { id: organizationId },
        data: { currentUsers: { decrement: 1 } },
      });
      break;
  }
}
