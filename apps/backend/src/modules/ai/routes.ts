import {
  CarePlanRequestSchema,
  IdentifyPlantRequestSchema,
  PlantDescriptionRequestSchema,
  RefineCarePlanRequestSchema,
} from '@garden-guide/shared';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../lib/auth-hooks.js';
import { parseBody } from '../../lib/validation.js';
import {
  describePlant,
  generateCarePlan,
  identifyPlant,
  refineCarePlan,
} from './service.js';

export async function registerAiRoutes(app: FastifyInstance): Promise<void> {
  const deps = () => ({ db: app.db, llm: app.llm, config: app.config });

  app.post('/api/v1/ai/identify-plant', { preHandler: requireAuth }, async (request) => {
    const body = parseBody(IdentifyPlantRequestSchema, request.body);
    return identifyPlant(deps(), body);
  });

  app.post('/api/v1/ai/care-plan', { preHandler: requireAuth }, async (request) => {
    const body = parseBody(CarePlanRequestSchema, request.body);
    return generateCarePlan(deps(), body);
  });

  app.post('/api/v1/ai/care-plan/refine', { preHandler: requireAuth }, async (request) => {
    const body = parseBody(RefineCarePlanRequestSchema, request.body);
    return refineCarePlan(deps(), body);
  });

  app.post('/api/v1/ai/plant-description', { preHandler: requireAuth }, async (request) => {
    const body = parseBody(PlantDescriptionRequestSchema, request.body);
    return describePlant(deps(), body);
  });
}
