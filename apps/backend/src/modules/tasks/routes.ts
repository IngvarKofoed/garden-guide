import {
  CareTaskCreateRequestSchema,
  CareTaskUpdateRequestSchema,
  TaskCompleteRequestSchema,
} from '@garden-guide/shared';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../lib/auth-hooks.js';
import { parseBody } from '../../lib/validation.js';
import {
  completeTask,
  createTask,
  deleteTask,
  getTask,
  listCompletionsForTask,
  listTasksForPlant,
  updateTask,
} from './service.js';

export async function registerTaskRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/plants/:id/tasks', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    return listTasksForPlant(app.db, id);
  });

  app.post('/api/v1/plants/:id/tasks', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(CareTaskCreateRequestSchema, request.body);
    const task = await createTask(app.db, id, body);
    reply.code(201);
    return task;
  });

  app.get('/api/v1/tasks/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    return getTask(app.db, id);
  });

  app.patch('/api/v1/tasks/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const body = parseBody(CareTaskUpdateRequestSchema, request.body);
    return updateTask(app.db, id, body);
  });

  app.delete('/api/v1/tasks/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteTask(app.db, id);
    reply.code(204);
    return reply.send();
  });

  app.post('/api/v1/tasks/:id/complete', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(TaskCompleteRequestSchema, request.body ?? {});
    const completion = await completeTask(app.db, id, body.completedOn);
    reply.code(201);
    return completion;
  });

  app.get('/api/v1/tasks/:id/completions', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    return listCompletionsForTask(app.db, id);
  });
}
