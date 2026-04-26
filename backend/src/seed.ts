import bcrypt from 'bcryptjs';
import { prisma } from './db/client.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

async function run() {
  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10);

  // Criar plano padrão se não existir
  const defaultPlan = await prisma.plan.upsert({
    where: { slug: 'free' },
    update: {},
    create: {
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

  // Criar organização padrão se não existir
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'main' },
    update: {},
    create: {
      id: 'org_default',
      name: 'Organização Principal',
      slug: 'main',
      planId: defaultPlan.id,
      billingEmail: env.SEED_ADMIN_EMAIL,
      status: 'active',
      maxUsers: 5,
      maxSessions: 3,
      maxCampaigns: 50,
      maxContacts: 5000,
      maxMessagesDay: 500,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: env.SEED_ADMIN_EMAIL },
    update: {
      name: env.SEED_ADMIN_NAME,
      passwordHash,
      role: 'super_admin',
    },
    create: {
      email: env.SEED_ADMIN_EMAIL,
      name: env.SEED_ADMIN_NAME,
      passwordHash,
      role: 'super_admin',
      organizationId: defaultOrg.id,
    },
  });

  logger.info({ email: user.email, id: user.id }, 'Seed concluído: admin pronto');
}

run()
  .catch((err) => {
    logger.error({ err }, 'Falha no seed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
