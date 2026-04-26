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

const organizationCreateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  planId: z.string(),
  billingEmail: z.string().email(),
  status: z.enum(['active', 'trial', 'suspended', 'cancelled']).optional(),
  trialEndsAt: z.string().datetime().optional(),
});

const organizationUpdateSchema = organizationCreateSchema.partial();

const userCreateSchema = z.object({
  organizationId: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['super_admin', 'admin', 'user', 'viewer']).optional(),
  status: z.enum(['active', 'suspended', 'invited']).optional(),
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
  maxUsers: z.number().int().min(1),
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
  organizationId: z.string(),
  planId: z.string(),
  status: z.enum(['active', 'cancelled', 'expired', 'pending']),
  startedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  amount: z.number().optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  // Todos os endpoints requerem autenticação + super_admin
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSuperAdmin);

  // ─────────── Organizations ───────────

  app.get('/api/admin/organizations', async (req) => {
    const query = z
      .object({
        search: z.string().optional(),
        status: z.string().optional(),
        planId: z.string().optional(),
        ...paginationSchema.shape,
      })
      .parse(req.query);

    return service.listOrganizations(query);
  });

  app.get('/api/admin/organizations/:id', async (req) => {
    const { id } = req.params as { id: string };
    return service.getOrganization(id);
  });

  app.post('/api/admin/organizations', async (req) => {
    const body = organizationCreateSchema.parse(req.body);
    return service.createOrganization({
      ...body,
      trialEndsAt: body.trialEndsAt ? new Date(body.trialEndsAt) : undefined,
    });
  });

  app.put('/api/admin/organizations/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = organizationUpdateSchema.parse(req.body);
    return service.updateOrganization(id, {
      ...body,
      trialEndsAt: body.trialEndsAt ? new Date(body.trialEndsAt) : undefined,
    } as any);
  });

  app.delete('/api/admin/organizations/:id', async (req) => {
    const { id } = req.params as { id: string };
    return service.deleteOrganization(id);
  });

  app.post('/api/admin/organizations/:id/suspend', async (req) => {
    const { id } = req.params as { id: string };
    return service.suspendOrganization(id);
  });

  app.post('/api/admin/organizations/:id/activate', async (req) => {
    const { id } = req.params as { id: string };
    return service.activateOrganization(id);
  });

  // ─────────── Users ───────────

  app.get('/api/admin/users', async (req) => {
    const query = z
      .object({
        search: z.string().optional(),
        organizationId: z.string().optional(),
        role: z.string().optional(),
        status: z.string().optional(),
        ...paginationSchema.shape,
      })
      .parse(req.query);

    return service.listAllUsers(query);
  });

  app.get('/api/admin/users/:id', async (req) => {
    const { id } = req.params as { id: string };
    return service.getUserDetails(id);
  });

  app.post('/api/admin/users', async (req) => {
    const body = userCreateSchema.parse(req.body);
    return service.createUser(body);
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

  app.get('/api/admin/users/:id/activity', async (req) => {
    const { id } = req.params as { id: string };
    const query = paginationSchema.parse(req.query);
    return service.getActivityLogs({ userId: id, ...query });
  });

  // ─────────── Plans ───────────

  app.get('/api/admin/plans', async () => {
    return service.listPlans();
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
        organizationId: z.string().optional(),
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

  // ─────────── Analytics ───────────

  app.get('/api/admin/stats', async () => {
    return service.getGlobalStats();
  });

  app.get('/api/admin/usage', async (req) => {
    const query = z.object({ days: z.coerce.number().min(1).max(365).default(30) }).parse(req.query);
    return service.getUsageStats(query);
  });

  app.get('/api/admin/activity', async (req) => {
    const query = z
      .object({
        organizationId: z.string().optional(),
        userId: z.string().optional(),
        action: z.string().optional(),
        module: z.string().optional(),
        ...paginationSchema.shape,
      })
      .parse(req.query);

    return service.getActivityLogs(query);
  });

  // ─────────── Sessions (Admin View) ───────────

  app.get('/api/admin/sessions', async (req) => {
    const query = z
      .object({
        organizationId: z.string().optional(),
        status: z.string().optional(),
        ...paginationSchema.shape,
      })
      .parse(req.query);

    return service.getAllSessions(query);
  });
}
