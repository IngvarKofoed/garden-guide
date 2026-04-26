import { ZoneCreateRequestSchema, ZoneUpdateRequestSchema } from '@garden-guide/shared';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../lib/auth-hooks.js';
import { parseBody } from '../../lib/validation.js';
import { createZone, deleteZone, getZone, listZones, updateZone } from './service.js';

export async function registerZoneRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/zones', { preHandler: requireAuth }, async () => {
    return listZones(app.db);
  });

  app.get('/api/v1/zones/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    return getZone(app.db, id);
  });

  app.post('/api/v1/zones', { preHandler: requireAuth }, async (request, reply) => {
    const body = parseBody(ZoneCreateRequestSchema, request.body);
    const zone = await createZone(app.db, body);
    reply.code(201);
    return zone;
  });

  app.patch('/api/v1/zones/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const body = parseBody(ZoneUpdateRequestSchema, request.body);
    return updateZone(app.db, id, body);
  });

  app.delete('/api/v1/zones/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteZone(app.db, id);
    reply.code(204);
    return reply.send();
  });
}
