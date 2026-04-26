import { prisma } from '../../db/client.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import bcrypt from 'bcryptjs';

// ─────────── Users (Admin) ───────────

export async function listAllUsers(params?: {
  search?: string;
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
  if (params?.role) where.role = params.role;
  if (params?.status) where.status = params.status;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        subscription: {
          include: {
            plan: { select: { id: true, name: true, slug: true } },
          },
        },
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
      subscription: { include: { plan: true } },
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
  email: string;
  password: string;
  name: string;
  role?: string;
  status?: string;
  planId?: string;
  subscriptionExpiresAt?: Date;
}) {
  // Verificar se email já existe
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ForbiddenError('Email already in use');

  // Hash da senha
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Criar usuário
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role ?? 'user',
      status: data.status ?? 'active',
    },
  });

  // Criar assinatura se planId foi fornecido
  if (data.planId) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: data.planId,
        status: 'active',
        startedAt: new Date(),
        expiresAt: data.subscriptionExpiresAt,
      },
    });
  }

  return prisma.user.findUnique({
    where: { id: user.id },
    include: { subscription: { include: { plan: true } } },
  });
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
    include: { subscription: { include: { plan: true } } },
  });
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User not found');

  await prisma.user.delete({ where: { id } });
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
        select: { subscriptions: true },
      },
    },
    orderBy: { price: 'asc' },
  });
}

export async function getPlanDetails(id: string) {
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      subscriptions: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      _count: { select: { subscriptions: true } },
    },
  });

  if (!plan) throw new NotFoundError('Plan not found');
  return plan;
}

export async function createPlan(data: {
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency?: string;
  interval?: string;
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
    include: { _count: { select: { subscriptions: true } } },
  });

  if (!plan) throw new NotFoundError('Plan not found');
  if (plan._count.subscriptions > 0) {
    throw new ForbiddenError('Cannot delete plan with active subscriptions');
  }

  await prisma.plan.delete({ where: { id } });
  return { ok: true };
}

// ─────────── Subscriptions ───────────

export async function listSubscriptions(params?: {
  userId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = Math.min(params?.pageSize ?? 50, 100);
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params?.userId) where.userId = params.userId;
  if (params?.status) where.status = params.status;

  const [items, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
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
  userId: string;
  planId: string;
  status: string;
  startedAt: Date;
  expiresAt?: Date;
  paymentMethod?: string;
  paymentStatus?: string;
  amount?: number;
}) {
  // Verificar se usuário já tem assinatura
  const existing = await prisma.subscription.findUnique({
    where: { userId: data.userId },
  });
  if (existing) throw new ForbiddenError('User already has a subscription');

  return prisma.subscription.create({
    data: data as any,
    include: { user: true, plan: true },
  });
}

export async function updateSubscription(
  id: string,
  data: Partial<{
    planId: string;
    status: string;
    expiresAt: Date;
    cancelledAt: Date;
    paymentMethod: string;
    paymentStatus: string;
    amount: number;
  }>
) {
  return prisma.subscription.update({
    where: { id },
    data: data as any,
    include: { user: true, plan: true },
  });
}

// ─────────── Analytics ───────────

export async function getGlobalStats() {
  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalSessions,
    activeSessions,
    totalCampaigns,
    runningCampaigns,
    activeSubscriptions,
    expiredSubscriptions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'active' } }),
    prisma.user.count({ where: { status: 'suspended' } }),
    prisma.session.count(),
    prisma.session.count({ where: { status: 'connected' } }),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: 'running' } }),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.subscription.count({ where: { status: 'expired' } }),
  ]);

  // Receita mensal (soma dos planos ativos)
  const subscriptions = await prisma.subscription.findMany({
    where: { status: 'active' },
    include: { plan: true },
  });
  const mrr = subscriptions.reduce((sum, sub) => sum + Number(sub.plan.price), 0);

  // Crescimento (últimos 30 dias)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newUsersLast30Days = await prisma.user.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  return {
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalSessions,
    activeSessions,
    totalCampaigns,
    runningCampaigns,
    mrr,
    newUsersLast30Days,
    activeSubscriptions,
    expiredSubscriptions,
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
  if (params?.userId) where.userId = params.userId;
  if (params?.action) where.action = params.action;
  if (params?.module) where.module = params.module;

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
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
  userId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = Math.min(params?.pageSize ?? 50, 100);
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params?.userId) where.userId = params.userId;
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
            subscription: {
              include: {
                plan: { select: { id: true, name: true, slug: true } },
              },
            },
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
