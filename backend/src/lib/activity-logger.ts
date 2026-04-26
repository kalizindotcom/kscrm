import type { FastifyRequest } from 'fastify';
import { prisma } from '../db/client.js';

interface LogActivityParams {
  req: FastifyRequest;
  action: string;
  module: string;
  resource?: string;
  details?: Record<string, unknown>;
}

/**
 * Registra uma atividade no log.
 * Captura automaticamente IP, user agent, organizationId e userId do request.
 */
export async function logActivity({
  req,
  action,
  module,
  resource,
  details,
}: LogActivityParams): Promise<void> {
  try {
    const user = req.user;
    const org = req.organization;

    // Se não tiver organização, tentar pegar do usuário
    let organizationId = org?.id;
    if (!organizationId && user?.organizationId) {
      organizationId = user.organizationId;
    }

    // Se ainda não tiver, não logar (pode ser endpoint público)
    if (!organizationId) return;

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId: user?.sub,
        action,
        module,
        resource,
        details: details as any,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    // Não falhar a request se o log falhar
    console.error('Failed to log activity:', err);
  }
}

/**
 * Helper para logar login
 */
export async function logLogin(req: FastifyRequest, userId: string, email: string) {
  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown';

  // Atualizar último login do usuário
  await prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    },
  });

  // Logar atividade
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });

  if (user?.organizationId) {
    await prisma.activityLog.create({
      data: {
        organizationId: user.organizationId,
        userId,
        action: 'login',
        module: 'auth',
        details: { email } as any,
        ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
      },
    });
  }
}

/**
 * Helper para logar logout
 */
export async function logLogout(req: FastifyRequest, userId: string) {
  await logActivity({
    req,
    action: 'logout',
    module: 'auth',
  });
}
