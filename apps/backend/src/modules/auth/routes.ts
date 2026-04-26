import {
  LoginRequestSchema,
  RegisterRequestSchema,
  type User,
} from '@garden-guide/shared';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../lib/auth-hooks.js';
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  setSessionCookie,
} from '../../lib/sessions.js';
import { parseBody } from '../../lib/validation.js';
import { authenticate, register } from './service.js';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/auth/register', async (request, reply) => {
    const body = parseBody(RegisterRequestSchema, request.body);
    const user = await register(app.db, body);
    const sessionId = await createSession(app.db, user.id);
    setSessionCookie(reply, sessionId, { publicUrl: app.config.PUBLIC_URL });
    reply.code(201);
    return userResponse(user, request.user?.isAdmin);
  });

  app.post('/api/v1/auth/login', async (request, reply) => {
    const body = parseBody(LoginRequestSchema, request.body);
    const user = await authenticate(app.db, body.email, body.password);
    const sessionId = await createSession(app.db, user.id);
    setSessionCookie(reply, sessionId, { publicUrl: app.config.PUBLIC_URL });
    return userResponse(user);
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    if (request.sessionId) {
      await deleteSession(app.db, request.sessionId);
    }
    clearSessionCookie(reply);
    reply.code(204);
    return reply.send();
  });

  app.get('/api/v1/auth/me', { preHandler: requireAuth }, async (request) => {
    return userResponse(request.user!);
  });
}

function userResponse(
  u: { id: string; email: string; displayName: string; isAdmin: boolean },
  _ignore?: unknown,
): Pick<User, 'id' | 'email' | 'displayName' | 'isAdmin'> {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    isAdmin: u.isAdmin,
  };
}
