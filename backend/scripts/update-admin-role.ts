import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Atualizando role do admin para super_admin...');

  const result = await prisma.user.updateMany({
    where: {
      email: 'admin@kscsm.com',
    },
    data: {
      role: 'super_admin',
    },
  });

  console.log(`✅ ${result.count} usuário(s) atualizado(s)`);

  // Verificar
  const user = await prisma.user.findUnique({
    where: { email: 'admin@kscsm.com' },
    select: { email: true, name: true, role: true },
  });

  console.log('👤 Usuário atual:', user);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
