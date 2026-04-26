import { prisma } from '../../db/client.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import bcrypt from 'bcryptjs';

// ─────────── Organizations ───────────

export async function listOrganizations(params?: {
  search?: string;
  status?: string;
  planId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = Math.min(params?.pageSize ?? 50, 100);
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { slug: { contains: params.search, mode: 'insensitive' } },
      { billingEmail: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  if (params?.status) where.status = params.status;
  if (params?.planId) where.planId = params.planId;

  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      include: {
        plan: true,
        _count: {
          select: {
            users: true,
            subscriptions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.organization.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getOrganization(id: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      plan: true,
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { plan: true },
      },
      usageLogs: {
        orderBy: { date: 'desc' },
        take: 30,
      },
    },
  });

  if (!org) throw new NotFoundError('Organization not found');

  // Buscar sessões ativas
  const sessions = await prisma.session.findMany({
    where: { user: { organizationId: id } },
    include: {
      user: { select: { name: true, email: true } },
      groups: { select: { id: true, name: true, memberCount: true } },
    },
  });

  return { ...org, sessions };
}

export async function createOrganization(data: {
  name: string;
  slug: string;
  planId: string;
  billingEmail: string;
  status?: string;
  trialEndsAt?: Date;
}) {
  // Verificar se slug já existe
  const existing = await prisma.organization.findUnique({
    where: { slug: data.slug },
  });
  if (existing) throw new ForbiddenError('Slug already in use');

  // Buscar limites do plano
  const plan = await prisma.plan.findUnique({ where: { id: data.planId } });
  if (!plan) throw new NotFoundError('Plan not found');

  return prisma.organization.create({
    data: {
      name: data.name,
      slug: data.slug,
      planId: data.planId,
      billingEmail: data.billingEmail,
      status: data.status ?? 'active',
      trialEndsAt: data.trialEndsAt,
      maxUsers: plan.maxUsers,
      maxSessions: plan.maxSessions,
      maxCampaigns: plan.maxCampaigns,
      maxContacts: plan.maxContacts,
      maxMessagesDay: plan.maxMessagesDay,
    },
    include: { plan: true },
  });
}

export async function updateOrganization(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    domain: string;
    logo: string;
    planId: string;
    billingEmail: string;
    status: string;
    trialEndsAt: Date;
    planExpiresAt: Date;
  }>
) {
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new NotFoundError('Organization not found');

  // Se mudou o plano, atualizar limites
  if (data.planId && data.planId !== org.planId) {
    const plan = await prisma.plan.findUnique({ where: { id: data.planId } });
    if (!plan) throw new NotFoundError('Plan not found');

    return prisma.organization.update({
      where: { id },
      data: {
        ...data,
        maxUsers: plan.maxUsers,
        maxSessions: plan.maxSessions,
        maxCampaigns: plan.maxCampaigns,
        maxContacts: plan.maxContacts,
        maxMessagesDay: plan.maxMessagesDay,
        planStartedAt: new Date(),
      },
      include: { plan: true },
    });
  }

  return prisma.organization.update({
    where: { id },
    data,
    include: { plan: true },
  });
}

export async function deleteOrganization(id: string) {
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new NotFoundError('Organization not found');

  // Deletar em cascata (Prisma cuida disso)
  await prisma.organization.delete({ where: { id } });
  return { ok: true };
}

export async function suspendOrganization(id: string) {
  return prisma.organization.update({
    where: { id },
    data: { status: 'suspended' },
  });
}

export async function activateOrganization(id: string) {
  return prisma.organization.update({
    where: { id },
    data: { status: 'active' },
  });
}

// ─────────── Users (Admin) ───────────

export async function listAllUsers(params?: {
  search?: string;
  organizationId?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = Math.min(params?.pageSize ?? 50, 100);
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  if (params?.organizationId) where.organizationId = params.organizationId;
  if (params?.role) where.role = params.role;
  if (params?.status) where.status = params.status;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        _count: {
          select: {
            sessions: true,
            campaigns: true,
            contacts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getUserDetails(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      organization: { include: { plan: true } },
      sessions: {
        select: {
          id: true,
          name: true,
          status: true,
          phoneNumber: true,
          createdAt: true,
          lastConnectedAt: true,
        },
      },
      campaigns: {
        select: {
          id: true,
          name: true,
          status: true,
          sentCount: true,
          totalCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      activityLogs: {
        orderBy: { timestamp: 'desc' },
        take: 100,
      },
    },
  });

  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function createUser(data: {
  organizationId: string;
  email: string;
  password: string;
  name: string;
  role?: string;
  status?: string;
}) {
  // Verificar se email já existe
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ForbiddenError('Email already in use');

  // Verificar se organização existe
  const org = await prisma.organization.findUnique({
    where: { id: data.organizationId },
  });
  if (!org) throw new NotFoundError('Organization not found');

  // Hash da senha
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Criar usuário
  const user = await prisma.user.create({
    data: {
      organizationId: data.organizationId,
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role ?? 'user',
      status: data.status ?? 'active',
    },
    include: { organization: true },
  });

  // Incrementar contador de usuários
  await prisma.organization.update({
    where: { id: data.organizationId },
    data: { currentUsers: { increment: 1 } },
  });

  return user;
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    role: string;
    status: string;
    password: string;
    permissions: Record<string, boolean>;
  }>
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User not found');

  const updateData: any = { ...data };

  // Se mudou a senha, fazer hash
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
    delete updateData.password;
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    include: { organization: true },
  });
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User not found');

  await prisma.user.delete({ where: { id } });

  // Decrementar contador de usuários
  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { currentUsers: { decrement: 1 } },
  });

  return { ok: true };
}

export async function suspendUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { status: 'suspended' },
  });
}

// ─────────── Plans ───────────

export async function listPlans() {
  return prisma.plan.findMany({
    include: {
      _count: {
        select: { organizations: true },
      },
    },
    orderBy: { price: 'asc' },
  });
}

export async function createPlan(data: {
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency?: string;
  interval?: string;
  maxUsers: number;
  maxSessions: number;
  maxCampaigns: number;
  maxContacts: number;
  maxMessagesDay: number;
  maxGroupsPerSession?: number;
  features?: Record<string, unknown>;
  isActive?: boolean;
  isPublic?: boolean;
}) {
  const existing = await prisma.plan.findUnique({ where: { slug: data.slug } });
  if (existing) throw new ForbiddenError('Slug already in use');

  return prisma.plan.create({ data: data as any });
}

export async function updatePlan(id: string, data: Partial<typeof createPlan>) {
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) throw new NotFoundError('Plan not found');

  return prisma.plan.update({
    where: { id },
    data: data as any,
  });
}

export async function deletePlan(id: string) {
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: { _count: { select: { organizations: true } } },
  });

  if (!plan) throw new NotFoundError('Plan not found');
  if (plan._count.organizations > 0) {
    throw new ForbiddenError('Cannot delete plan with active organizations');
  }

  await prisma.plan.delete({ where: { id } });
  return { ok: true };
}

// ─────────── Subscriptions ───────────

export async function listSubscriptions(params?: {
  organizationId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = Math.min(params?.pageSize ?? 50, 100);
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params?.organizationId) where.organizationId = params.organizationId;
  if (params?.status) where.status = params.status;

  const [items, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.subscription.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function createSubscription(data: {
  organizationId: string;
  planId: string;
  status: string;
  startedAt: Date;
  expiresAt?: Date;
  paymentMethod?: string;
  paymentStatus?: string;
  amount?: number;
}) {
  return prisma.subscription.create({
    data: data as any,
    include: { organization: true, plan: true },
  });
}

// ─────────── Analytics ───────────

export async function getGlobalStats() {
  const [
    totalOrgs,
    activeOrgs,
    trialOrgs,
    suspendedOrgs,
    totalUsers,
    totalSessions,
    activeSessions,
    totalCampaigns,
    runningCampaigns,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { status: 'active' } }),
    prisma.organization.count({ where: { status: 'trial' } }),
    prisma.organization.count({ where: { status: 'suspended' } }),
    prisma.user.count(),
    prisma.session.count(),
    prisma.session.count({ where: { status: 'connected' } }),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: 'running' } }),
  ]);

  // Receita mensal (soma dos planos ativos)
  const orgsWithPlans = await prisma.organization.findMany({
    where: { status: 'active' },
    include: { plan: true },
  });
  const mrr = orgsWithPlans.reduce((sum, org) => sum + Number(org.plan.price), 0);

  // Crescimento (últimos 30 dias)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newOrgsLast30Days = await prisma.organization.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  return {
    totalOrgs,
    activeOrgs,
    trialOrgs,
    suspendedOrgs,
    totalUsers,
    totalSessions,
    activeSessions,
    totalCampaigns,
    runningCampaigns,
    mrr,
    newOrgsLast30Days,
  };
}

export async function getUsageStats(params?: { days?: number }) {
  const days = params?.days ?? 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const usageLogs = await prisma.usageLog.findMany({
    where: { date: { gte: startDate } },
    orderBy: { date: 'asc' },
  });

  // Agrupar por data
  const byDate = usageLogs.reduce((acc, log) => {
    const dateKey = log.date.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: dateKey,
        messagesSent: 0,
        campaignsFired: 0,
        sessionsActive: 0,
        apiCalls: 0,
      };
    }
    acc[dateKey].messagesSent += log.messagesSent;
    acc[dateKey].campaignsFired += log.campaignsFired;
    acc[dateKey].sessionsActive += log.sessionsActive;
    acc[dateKey].apiCalls += log.apiCalls;
    return acc;
  }, {} as Record<string, any>);

  return Object.values(byDate);
}

export async function getActivityLogs(params?: {
  organizationId?: string;
  userId?: string;
  action?: string;
  module?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = Math.min(params?.pageSize ?? 100, 500);
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params?.organizationId) where.organizationId = params.organizationId;
  if (params?.userId) where.userId = params.userId;
  if (params?.action) where.action = params.action;
  if (params?.module) where.module = params.module;

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        organization: { select: { name: true, slug: true } },
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

// ─────────── Sessions (Admin View) ───────────

export async function getAllSessions(params?: {
  organizationId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = Math.min(params?.pageSize ?? 50, 100);
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params?.organizationId) {
    where.user = { organizationId: params.organizationId };
  }
  if (params?.status) where.status = params.status;

  const [items, total] = await Promise.all([
    prisma.session.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            organization: { select: { id: true, name: true, slug: true } },
          },
        },
        groups: {
          select: {
            id: true,
            name: true,
            memberCount: true,
            isAdmin: true,
          },
        },
        _count: {
          select: {
            conversations: true,
            logs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.session.count({ where }),
  ]);

  return { items, total, page, pageSize };
}
