import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

function signAccessToken(payload: any) {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(payload, secret, { expiresIn: '15m' });
}

async function diagnose() {
  console.log('🔍 Diagnóstico de Autenticação\n');

  // 1. Verificar usuário admin
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@kscsm.com' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      status: true,
    },
  });

  if (!admin) {
    console.log('❌ Usuário admin não encontrado!');
    return;
  }

  console.log('✅ Usuário encontrado:');
  console.log(JSON.stringify(admin, null, 2));
  console.log();

  // 2. Gerar token de teste
  const payload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    organizationId: admin.organizationId ?? undefined,
  };

  console.log('📝 Payload do token:');
  console.log(JSON.stringify(payload, null, 2));
  console.log();

  const token = signAccessToken(payload);
  console.log('🔑 Token gerado:');
  console.log(token);
  console.log();

  // 3. Decodificar token
  const decoded = jwt.decode(token);
  console.log('🔓 Token decodificado:');
  console.log(JSON.stringify(decoded, null, 2));
  console.log();

  // 4. Verificar role
  if (admin.role === 'super_admin') {
    console.log('✅ Role correto: super_admin');
  } else {
    console.log(`❌ Role incorreto: ${admin.role} (esperado: super_admin)`);
  }

  await prisma.$disconnect();
}

diagnose().catch(console.error);
