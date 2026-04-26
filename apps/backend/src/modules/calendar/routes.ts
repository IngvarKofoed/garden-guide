import { CalendarQuerySchema } from '@garden-guide/shared';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../lib/auth-hooks.js';
import { parseQuery } from '../../lib/validation.js';
import { getCalendar } from './service.js';

export async function registerCalendarRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/calendar', { preHandler: requireAuth }, async (request) => {
    const query = parseQuery(CalendarQuerySchema, request.query);
    return getCalendar(app.db, query.from, query.to);
  });
}
