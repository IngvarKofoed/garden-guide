import {
  PlantCreateRequestSchema,
  PlantListQuerySchema,
  PlantUpdateRequestSchema,
} from '@garden-guide/shared';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../lib/auth-hooks.js';
import { parseBody, parseQuery } from '../../lib/validation.js';
import {
  archivePlant,
  createPlant,
  getPlant,
  listPlants,
  updatePlant,
} from './service.js';

export async function registerPlantRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/plants', { preHandler: requireAuth }, async (request) => {
    const query = parseQuery(PlantListQuerySchema, request.query);
    return listPlants(app.db, query);
  });

  app.get('/api/v1/plants/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    return getPlant(app.db, id);
  });

  app.post('/api/v1/plants', { preHandler: requireAuth }, async (request, reply) => {
    const body = parseBody(PlantCreateRequestSchema, request.body);
    const plant = await createPlant(app.db, body);
    reply.code(201);
    return plant;
  });

  app.patch('/api/v1/plants/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const body = parseBody(PlantUpdateRequestSchema, request.body);
    return updatePlant(app.db, id, body);
  });

  app.delete('/api/v1/plants/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await archivePlant(app.db, id);
    reply.code(204);
    return reply.send();
  });
}
