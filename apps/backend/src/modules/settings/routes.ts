import { GardenContextUpdateRequestSchema } from '@garden-guide/shared';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../lib/auth-hooks.js';
import { parseBody } from '../../lib/validation.js';
import { getGardenContext, setGardenContext } from './service.js';

export async function registerSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/v1/settings/garden-context',
    { preHandler: requireAuth },
    async () => {
      const context = await getGardenContext(app.db);
      return { context };
    },
  );

  app.put(
    '/api/v1/settings/garden-context',
    { preHandler: requireAuth },
    async (request) => {
      const body = parseBody(GardenContextUpdateRequestSchema, request.body);
      const context = await setGardenContext(app.db, body.context);
      return { context };
    },
  );
}
