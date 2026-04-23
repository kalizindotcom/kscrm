import bcrypt from 'bcryptjs';
import { prisma } from '../../db/client.js';
import { signAccessToken, signRefreshToken, verifyRefresh } from '../../lib/jwt.js';
import { UnauthorizedError } from '../../lib/errors.js';

export async function login(email: string, password: string) {
  const identifier = email.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { name: { equals: identifier, mode: 'insensitive' } }],
    },
  });
  if (!user) throw new UnauthorizedError('Credenciais inválidas');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new UnauthorizedError('Credenciais inválidas');

  const payload = { sub: user.id, email: user.email, role: user.role };
  const token = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    token,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
  };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    throw new UnauthorizedError('Refresh token inválido');
  }
  const record = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!record || record.revokedAt || record.expiresAt < new Date()) throw new UnauthorizedError('Refresh token revogado');

  const newToken = signAccessToken({ sub: payload.sub, email: payload.email, role: payload.role });
  return { token: newToken };
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError('Usuário não encontrado');
  return { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar };
}

