import bcrypt from 'bcryptjs';
import { prisma } from './db/client.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

async function run() {
  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: env.SEED_ADMIN_EMAIL },
    update: {
      name: env.SEED_ADMIN_NAME,
      passwordHash,
      role: 'admin',
    },
    create: {
      email: env.SEED_ADMIN_EMAIL,
      name: env.SEED_ADMIN_NAME,
      passwordHash,
      role: 'admin',
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
