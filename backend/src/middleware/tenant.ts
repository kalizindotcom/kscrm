import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/client.js';
import { UnauthorizedError, NotFoundError, ForbiddenError } from '../lib/errors.js';
import type { Organization, Plan } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    organization?: Organization & { plan: Plan };
    plan?: Plan;
  }
}

/**
 * Middleware que garante isolamento multi-tenant.
 * Carrega a organização do usuário autenticado e verifica status.
 */
export async function requireTenant(req: FastifyRequest, _reply: FastifyReply) {
  const user = req.user;
  if (!user) {
    throw new UnauthorizedError('Not authenticated');
  }

  // Carregar organização com plano
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    include: { plan: true },
  });

  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  // Verificar status da organização
  if (org.status === 'suspended') {
    throw new ForbiddenError('Organização suspensa. Entre em contato com o suporte.');
  }

  if (org.status === 'cancelled') {
    throw new ForbiddenError('Organização cancelada. Entre em contato com o suporte.');
  }

  // Verificar expiração do plano
  if (org.planExpiresAt && org.planExpiresAt < new Date()) {
    throw new ForbiddenError('Plano expirado. Renove sua assinatura para continuar.');
  }

  // Verificar trial expirado
  if (org.status === 'trial' && org.trialEndsAt && org.trialEndsAt < new Date()) {
    throw new ForbiddenError('Período de teste expirado. Assine um plano para continuar.');
  }

  // Anexar ao request para uso nos handlers
  req.organization = org as Organization & { plan: Plan };
  req.plan = org.plan;
}

/**
 * Middleware opcional que permite super_admin acessar qualquer organização.
 * Útil para endpoints administrativos.
 */
export async function optionalTenant(req: FastifyRequest, _reply: FastifyReply) {
  const user = req.user;
  if (!user) return;

  // Super admin pode acessar sem organização específica
  if (user.role === 'super_admin') {
    return;
  }

  // Para outros usuários, aplicar requireTenant
  await requireTenant(req, _reply);
}
