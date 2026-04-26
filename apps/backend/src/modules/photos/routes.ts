import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../lib/auth-hooks.js';
import { ValidationError } from '../../lib/errors.js';
import {
  acceptPlantIconDraft,
  clearPlantIcon,
  clearPlantIconDraft,
  generatePlantIconDraft,
  getPlantIconBytes,
  getPlantIconDraftBytes,
  setPlantIcon,
} from './service.js';

export async function registerPhotoRoutes(app: FastifyInstance): Promise<void> {
  const deps = () => ({ db: app.db, config: app.config });
  const llmDeps = () => ({ db: app.db, config: app.config, llm: app.llm });

  app.post('/api/v1/plants/:id/icon', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!request.isMultipart()) {
      throw new ValidationError('Expected multipart/form-data with an image file');
    }
    const file = await request.file();
    if (!file) throw new ValidationError('No file received');
    const buffer = await file.toBuffer();
    const plant = await setPlantIcon(deps(), id, {
      bytes: buffer,
      mimeType: file.mimetype,
    });
    reply.code(201);
    return plant;
  });

  app.delete('/api/v1/plants/:id/icon', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    return clearPlantIcon(deps(), id);
  });

  app.get('/api/v1/plants/:id/icon', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getPlantIconBytes(deps(), id);
    if (!result) {
      reply.code(404);
      return reply.send({
        error: { code: 'NOT_FOUND', message: 'No icon set for this plant' },
      });
    }
    reply
      .header('Content-Type', result.mimeType)
      .header('Cache-Control', 'private, max-age=60');
    return reply.send(result.buffer);
  });

  app.post(
    '/api/v1/plants/:id/icon/draft/generate-ai',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const plant = await generatePlantIconDraft(llmDeps(), id);
      reply.code(201);
      return plant;
    },
  );

  app.post(
    '/api/v1/plants/:id/icon/draft/accept',
    { preHandler: requireAuth },
    async (request) => {
      const { id } = request.params as { id: string };
      return acceptPlantIconDraft(deps(), id);
    },
  );

  app.delete(
    '/api/v1/plants/:id/icon/draft',
    { preHandler: requireAuth },
    async (request) => {
      const { id } = request.params as { id: string };
      return clearPlantIconDraft(deps(), id);
    },
  );

  app.get(
    '/api/v1/plants/:id/icon-draft',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await getPlantIconDraftBytes(deps(), id);
      if (!result) {
        reply.code(404);
        return reply.send({
          error: { code: 'NOT_FOUND', message: 'No icon draft for this plant' },
        });
      }
      reply
        .header('Content-Type', result.mimeType)
        .header('Cache-Control', 'private, no-store');
      return reply.send(result.buffer);
    },
  );
}
