import {
  JournalEntryCreateRequestSchema,
  JournalEntryUpdateRequestSchema,
  JournalListQuerySchema,
} from '@garden-guide/shared';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../lib/auth-hooks.js';
import { UnauthorizedError, ValidationError } from '../../lib/errors.js';
import { parseBody, parseQuery } from '../../lib/validation.js';
import {
  addJournalPhoto,
  createJournalEntry,
  deleteJournalEntry,
  deleteJournalPhoto,
  getJournalEntry,
  getJournalPhotoBytes,
  listJournalEntries,
  updateJournalEntry,
} from './service.js';

export async function registerJournalRoutes(app: FastifyInstance): Promise<void> {
  const deps = () => ({ db: app.db, config: app.config });

  app.get('/api/v1/journal', { preHandler: requireAuth }, async (request) => {
    const query = parseQuery(JournalListQuerySchema, request.query ?? {});
    return listJournalEntries(app.db, query);
  });

  app.post('/api/v1/journal', { preHandler: requireAuth }, async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const body = parseBody(JournalEntryCreateRequestSchema, request.body);
    const entry = await createJournalEntry(app.db, request.user.id, body);
    reply.code(201);
    return entry;
  });

  app.get('/api/v1/journal/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    return getJournalEntry(app.db, id);
  });

  app.patch('/api/v1/journal/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const body = parseBody(JournalEntryUpdateRequestSchema, request.body);
    return updateJournalEntry(app.db, id, body);
  });

  app.delete('/api/v1/journal/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteJournalEntry(deps(), id);
    reply.code(204);
    return reply.send();
  });

  app.post(
    '/api/v1/journal/:id/photos',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!request.isMultipart()) {
        throw new ValidationError('Expected multipart/form-data with an image file');
      }
      const file = await request.file();
      if (!file) throw new ValidationError('No file received');
      const buffer = await file.toBuffer();
      const photo = await addJournalPhoto(deps(), id, {
        bytes: buffer,
        mimeType: file.mimetype,
      });
      reply.code(201);
      return photo;
    },
  );

  app.delete(
    '/api/v1/journal/:id/photos/:photoId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id, photoId } = request.params as { id: string; photoId: string };
      await deleteJournalPhoto(deps(), id, photoId);
      reply.code(204);
      return reply.send();
    },
  );

  app.get(
    '/api/v1/journal/:id/photos/:photoId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id, photoId } = request.params as { id: string; photoId: string };
      const result = await getJournalPhotoBytes(deps(), id, photoId);
      if (!result) {
        reply.code(404);
        return reply.send({
          error: { code: 'NOT_FOUND', message: 'Photo not found' },
        });
      }
      reply
        .header('Content-Type', result.mimeType)
        .header('Cache-Control', 'private, max-age=60');
      return reply.send(result.buffer);
    },
  );
}
