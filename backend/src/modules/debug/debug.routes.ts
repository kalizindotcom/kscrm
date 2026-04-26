import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client.js';
import jwt from 'jsonwebtoken';

export async function debugRoutes(app: FastifyInstance) {
  // Endpoint temporário para debug - REMOVER EM PRODUÇÃO
  app.get('/api/debug/check-admin', async (req, reply) => {
    try {
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
        return { error: 'Admin não encontrado' };
      }

      // Gerar token de teste
      const payload = {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
        organizationId: admin.organizationId ?? undefined,
      };

      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const token = jwt.sign(payload, secret, { expiresIn: '15m' });
      const decoded = jwt.decode(token);

      return {
        user: admin,
        tokenPayload: payload,
        decodedToken: decoded,
        roleCheck: {
          isSuperAdmin: admin.role === 'super_admin',
          currentRole: admin.role,
        },
      };
    } catch (error: any) {
      return { error: error.message };
    }
  });

  // Verificar token atual
  app.get('/api/debug/verify-token', async (req, reply) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return { error: 'Token não fornecido' };
    }

    const token = header.slice(7);
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret);
      return {
        valid: true,
        decoded,
        roleCheck: {
          isSuperAdmin: (decoded as any).role === 'super_admin',
          currentRole: (decoded as any).role,
        },
      };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  });
}
