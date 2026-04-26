import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  loadSessionUser,
  readSessionCookie,
  renewSession,
  type SessionUser,
} from './sessions.js';
import { ForbiddenError, UnauthorizedError } from './errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionUser;
    sessionId?: string;
  }
}

export async function attachSession(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const sessionId = readSessionCookie(request);
  if (!sessionId) return;
  const user = await loadSessionUser(request.server.db, sessionId);
  if (!user) return;
  request.user = user;
  request.sessionId = sessionId;
  // Renewal is fire-and-forget so we don't block the request on a write.
  void renewSession(request.server.db, sessionId).catch((err) => {
    request.log.warn({ err }, 'session renewal failed');
  });
}

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.user) throw new UnauthorizedError();
}

export async function requireAdmin(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.user) throw new UnauthorizedError();
  if (!request.user.isAdmin) throw new ForbiddenError('Admin only');
}
