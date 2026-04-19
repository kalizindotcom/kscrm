import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccess, type TokenPayload } from '../lib/jwt.js';
import { UnauthorizedError } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing Bearer token');
  }
  const token = header.slice(7);
  try {
    req.user = verifyAccess(token);
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
