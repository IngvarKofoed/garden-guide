import { InviteCreateRequestSchema, type InviteCreateResponse } from '@garden-guide/shared';
import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../lib/auth-hooks.js';
import { parseBody } from '../../lib/validation.js';
import { createInvite, deleteInvite, listInvites } from './service.js';

export async function registerInviteRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/invites', { preHandler: requireAdmin }, async (request, reply) => {
    const body = parseBody(InviteCreateRequestSchema, request.body ?? {});
    const invite = await createInvite(app.db, {
      email: body.email,
      expiresInHours: body.expiresInHours,
    });
    const url = `${app.config.PUBLIC_URL.replace(/\/$/, '')}/register?invite=${invite.token}`;
    reply.code(201);
    const response: InviteCreateResponse = {
      token: invite.token,
      url,
      expiresAt: invite.expiresAt,
    };
    return response;
  });

  app.get('/api/v1/invites', { preHandler: requireAdmin }, async () => {
    return listInvites(app.db);
  });

  app.delete('/api/v1/invites/:token', { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { token: string };
    await deleteInvite(app.db, params.token);
    reply.code(204);
    return reply.send();
  });
}
