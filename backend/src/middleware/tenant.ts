import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/client.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import type { Plan, Subscription } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    subscription?: Subscription & { plan: Plan };
    plan?: Plan;
  }
}

/**
 * Middleware que carrega a assinatura e plano do usuário.
 * Verifica status e validade da assinatura.
 */
export async function requireSubscription(req: FastifyRequest, _reply: FastifyReply) {
  const user = req.user;
  if (!user) {
    throw new UnauthorizedError('Not authenticated');
  }

  // Super admin não precisa de assinatura
  if (user.role === 'super_admin') {
    return;
  }

  // Carregar assinatura com plano
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.sub },
    include: { plan: true },
  });

  if (!subscription) {
    throw new ForbiddenError('Nenhuma assinatura ativa. Entre em contato com o suporte.');
  }

  // Verificar status da assinatura
  if (subscription.status === 'cancelled') {
    throw new ForbiddenError('Assinatura cancelada. Entre em contato com o suporte.');
  }

  if (subscription.status === 'expired') {
    throw new ForbiddenError('Assinatura expirada. Renove sua assinatura para continuar.');
  }

  // Verificar expiração
  if (subscription.expiresAt && subscription.expiresAt < new Date()) {
    // Atualizar status para expirado
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'expired' },
    });
    throw new ForbiddenError('Assinatura expirada. Renove sua assinatura para continuar.');
  }

  // Anexar ao request para uso nos handlers
  req.subscription = subscription as Subscription & { plan: Plan };
  req.plan = subscription.plan;
}

/**
 * Middleware opcional que permite super_admin acessar sem assinatura.
 * Útil para endpoints administrativos.
 */
export async function optionalSubscription(req: FastifyRequest, _reply: FastifyReply) {
  const user = req.user;
  if (!user) return;

  // Super admin pode acessar sem assinatura
  if (user.role === 'super_admin') {
    return;
  }

  // Para outros usuários, aplicar requireSubscription
  await requireSubscription(req, _reply);
}
