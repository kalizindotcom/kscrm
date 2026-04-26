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

  // Se não tiver organizationId, é usuário antigo - criar organização padrão
  if (!user.organizationId) {
    // Buscar ou criar organização padrão
    let defaultOrg = await prisma.organization.findUnique({
      where: { slug: 'main' },
      include: { plan: true },
    });

    if (!defaultOrg) {
      // Criar plano padrão se não existir
      let defaultPlan = await prisma.plan.findUnique({ where: { slug: 'free' } });
      if (!defaultPlan) {
        defaultPlan = await prisma.plan.create({
          data: {
            id: 'plan_free_default',
            name: 'Free',
            slug: 'free',
            description: 'Plano gratuito com recursos básicos',
            price: 0,
            maxUsers: 5,
            maxSessions: 3,
            maxCampaigns: 50,
            maxContacts: 5000,
            maxMessagesDay: 500,
          },
        });
      }

      // Criar organização padrão
      defaultOrg = await prisma.organization.create({
        data: {
          id: 'org_default',
          name: 'Organização Principal',
          slug: 'main',
          planId: defaultPlan.id,
          billingEmail: 'admin@kscsm.com',
          status: 'active',
          maxUsers: 5,
          maxSessions: 3,
          maxCampaigns: 50,
          maxContacts: 5000,
          maxMessagesDay: 500,
        },
        include: { plan: true },
      });
    }

    // Atualizar usuário com organizationId
    await prisma.user.update({
      where: { id: user.sub },
      data: { organizationId: defaultOrg.id },
    });

    req.organization = defaultOrg as Organization & { plan: Plan };
    req.plan = defaultOrg.plan;
    return;
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
