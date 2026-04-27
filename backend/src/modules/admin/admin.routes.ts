import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { ForbiddenError } from '../../lib/errors.js';
import * as service from './admin.service.js';

/**
 * Middleware que garante que apenas super_admin pode acessar.
 */
async function requireSuperAdmin(req: any) {
  if (req.user?.role !== 'super_admin') {
    throw new ForbiddenError('Acesso negado. Apenas super administradores.');
  }
}

// ─── Schemas de validação ───

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
});

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['super_admin', 'admin', 'user', 'viewer']).optional(),
  status: z.enum(['active', 'suspended', 'invited']).optional(),
  planId: z.string().optional(),
  subscriptionExpiresAt: z.string().optional().transform((val) => {
    if (!val) return undefined;
    // Aceita tanto formato de data (YYYY-MM-DD) quanto datetime (ISO)
    return val.includes('T') ? val : `${val}T23:59:59.999Z`;
  }),
});

const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['super_admin', 'admin', 'user', 'viewer']).optional(),
  status: z.enum(['active', 'suspended', 'invited']).optional(),
  password: z.string().min(6).optional(),
  permissions: z.record(z.boolean()).optional(),
});

const planCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  price: z.number().min(0),
  currency: z.string().default('BRL'),
  interval: z.enum(['monthly', 'yearly', 'lifetime']).default('monthly'),
  maxSessions: z.number().int().min(1),
  maxCampaigns: z.number().int().min(1),
  maxContacts: z.number().int().min(1),
  maxMessagesDay: z.number().int().min(1),
  maxGroupsPerSession: z.number().int().min(1).default(50),
  features: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
});

const planUpdateSchema = planCreateSchema.partial();

const subscriptionCreateSchema = z.object({
  userId: z.string(),
  planId: z.string(),
  status: z.enum(['active', 'cancelled', 'expired', 'pending', 'trial']),
  startedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  amount: z.number().optional(),
});

const subscriptionUpdateSchema = z.object({
  planId: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'expired', 'pending', 'trial']).optional(),
  expiresAt: z.string().datetime().optional(),
  cancelledAt: z.string().datetime().optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  amount: z.number().optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  // Todos os endpoints requerem autenticação + super_admin
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSuperAdmin);

  // ─────────── Users ───────────

  app.get('/api/admin/users', async (req) => {
    const query = z
      .object({
        search: z.string().optional(),
        role: z.string().optional(),
        status: z.string().optional(),
        ...paginationSchema.shape,
      })
      .parse(req.query);

    return service.listAllUsers(query);
  });

  // ─────────── Trial Users (deve vir ANTES de rotas com :id) ───────────

  app.post('/api/admin/users/trial', async (req) => {
    const body = z.object({
      name: z.string().min(3),
      email: z.string().email(),
      phone: z.string().optional(),
      password: z.string().min(6),
      duration: z.number().min(1),
      maxSessions: z.number().min(1),
      maxCampaigns: z.number().min(1),
      maxContacts: z.number().min(1),
      maxMessagesDay: z.number().min(1),
      expiresAt: z.string().datetime(),
    }).parse(req.body);

    return service.createTrialUser(body);
  });

  app.get('/api/admin/users/:id', async (req) => {
    const { id } = req.params as { id: string };
    return service.getUserDetails(id);
  });

  app.post('/api/admin/users', async (req) => {
    const body = userCreateSchema.parse(req.body);
    return service.createUser({
      ...body,
      subscriptionExpiresAt: body.subscriptionExpiresAt ? new Date(body.subscriptionExpiresAt) : undefined,
    });
  });

  app.put('/api/admin/users/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = userUpdateSchema.parse(req.body);
    return service.updateUser(id, body);
  });

  app.delete('/api/admin/users/:id', async (req) => {
    const { id } = req.params as { id: string };
    return service.deleteUser(id);
  });

  app.post('/api/admin/users/:id/suspend', async (req) => {
    const { id } = req.params as { id: string };
    return service.suspendUser(id);
  });

  // ─────────── Plans ───────────

  app.get('/api/admin/plans', async () => {
    return service.listPlans();
  });

  app.get('/api/admin/plans/:id', async (req) => {
    const { id } = req.params as { id: string };
    return service.getPlanDetails(id);
  });

  app.post('/api/admin/plans', async (req) => {
    const body = planCreateSchema.parse(req.body);
    return service.createPlan(body);
  });

  app.put('/api/admin/plans/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = planUpdateSchema.parse(req.body);
    return service.updatePlan(id, body);
  });

  app.delete('/api/admin/plans/:id', async (req) => {
    const { id } = req.params as { id: string };
    return service.deletePlan(id);
  });

  // ─────────── Subscriptions ───────────

  app.get('/api/admin/subscriptions', async (req) => {
    const query = z
      .object({
        userId: z.string().optional(),
        status: z.string().optional(),
        ...paginationSchema.shape,
      })
      .parse(req.query);

    return service.listSubscriptions(query);
  });

  app.post('/api/admin/subscriptions', async (req) => {
    const body = subscriptionCreateSchema.parse(req.body);
    return service.createSubscription({
      ...body,
      startedAt: new Date(body.startedAt),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  });

  app.put('/api/admin/subscriptions/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = subscriptionUpdateSchema.parse(req.body);
    return service.updateSubscription(id, {
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      cancelledAt: body.cancelledAt ? new Date(body.cancelledAt) : undefined,
    } as any);
  });

  // ─────────── Analytics ───────────

  app.get('/api/admin/stats', async () => {
    return service.getGlobalStats();
  });

  app.get('/api/admin/usage', async (req) => {
    const query = z
      .object({
        days: z.coerce.number().min(1).max(365).default(30),
      })
      .parse(req.query);

    return service.getUsageStats(query);
  });

  app.get('/api/admin/activity', async (req) => {
    const query = z
      .object({
        userId: z.string().optional(),
        action: z.string().optional(),
        module: z.string().optional(),
        ...paginationSchema.shape,
      })
      .parse(req.query);

    return service.getActivityLogs(query);
  });

  // ─────────── Sessions ───────────

  app.get('/api/admin/sessions', async (req) => {
    const query = z
      .object({
        userId: z.string().optional(),
        status: z.string().optional(),
        ...paginationSchema.shape,
      })
      .parse(req.query);

    return service.getAllSessions(query);
  });
}
