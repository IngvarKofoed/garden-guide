import {
  GardenMapCanvasPatchRequestSchema,
  GardenMapPutRequestSchema,
} from '@garden-guide/shared';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../lib/auth-hooks.js';
import { parseBody } from '../../lib/validation.js';
import { getMap, patchCanvas, putMap } from './service.js';

export async function registerMapRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/map', { preHandler: requireAuth }, async () => {
    return getMap(app.db);
  });

  app.put('/api/v1/map', { preHandler: requireAuth }, async (request) => {
    const body = parseBody(GardenMapPutRequestSchema, request.body);
    return putMap(app.db, body);
  });

  app.patch('/api/v1/map/canvas', { preHandler: requireAuth }, async (request) => {
    const body = parseBody(GardenMapCanvasPatchRequestSchema, request.body);
    return patchCanvas(app.db, body);
  });
}
