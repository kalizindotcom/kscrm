import bcrypt from 'bcryptjs';
import { prisma } from '../src/db/client.js';

async function resetAdminPassword() {
  const email = 'admin@kscsm.com';
  const newPassword = 'admin123'; // Senha padrão - MUDE APÓS O LOGIN!

  try {
    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ Usuário ${email} não encontrado no banco de dados`);
      process.exit(1);
    }

    // Gerar novo hash de senha
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    console.log(`✅ Senha do usuário ${email} resetada com sucesso!`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha temporária: ${newPassword}`);
    console.log(`⚠️  IMPORTANTE: Altere esta senha após fazer login!`);
  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
