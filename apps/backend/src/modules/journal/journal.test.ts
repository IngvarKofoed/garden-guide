import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { buildTestApp, sessionCookieFromResponse, type TestApp } from '../../test-utils.js';
import { ensureBootstrapInvite } from '../auth/service.js';

interface SetupContext {
  cookie: string;
  userId: string;
  plantId: string;
}

async function setup(t: TestApp): Promise<SetupContext> {
  const bootstrap = await ensureBootstrapInvite(t.db, 24);
  const reg = await t.app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      inviteToken: bootstrap!.token,
      email: 'gardener@example.com',
      displayName: 'Gardener',
      password: 'password1234',
    },
  });
  const cookie = sessionCookieFromResponse(reg.headers)!;
  const me = await t.app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: { cookie },
  });
  const userId = (me.json() as { id: string }).id;
  const plant = await t.app.inject({
    method: 'POST',
    url: '/api/v1/plants',
    headers: { cookie },
    payload: { name: 'Apple tree', species: 'Malus domestica' },
  });
  const plantId = (plant.json() as { id: string }).id;
  return { cookie, userId, plantId };
}

async function tinyPng(): Promise<Buffer> {
  return sharp({
    create: { width: 16, height: 16, channels: 3, background: { r: 50, g: 130, b: 80 } },
  })
    .png()
    .toBuffer();
}

function multipartBody(
  filename: string,
  mimeType: string,
  bytes: Buffer,
): { body: Buffer; headers: Record<string, string> } {
  const boundary = '----gg' + Math.random().toString(36).slice(2);
  const head =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="photo"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(head, 'utf8'), bytes, Buffer.from(tail, 'utf8')]);
  return {
    body,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': String(body.length),
    },
  };
}

describe('journal entries', () => {
  let t: TestApp;
  let ctx: SetupContext;

  beforeEach(async () => {
    t = await buildTestApp();
    ctx = await setup(t);
  });

  afterEach(async () => {
    await t.close();
  });

  it('creates an entry tied to a plant and attributes it to the session user', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: {
        plantId: ctx.plantId,
        occurredOn: '2026-04-25',
        actionType: 'prune',
        notes: 'Removed crossing branches.',
      },
    });
    expect(res.statusCode).toBe(201);
    const entry = res.json() as {
      id: string;
      plantId: string | null;
      createdBy: string;
      photos: unknown[];
    };
    expect(entry.plantId).toBe(ctx.plantId);
    expect(entry.createdBy).toBe(ctx.userId);
    expect(entry.photos).toEqual([]);
  });

  it('allows free-floating entries (no plant)', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: {
        occurredOn: '2026-04-25',
        actionType: 'inspect',
        notes: 'Checked irrigation hoses.',
      },
    });
    expect(res.statusCode).toBe(201);
    expect((res.json() as { plantId: string | null }).plantId).toBeNull();
  });

  it('refuses an entry referencing a missing plant', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: {
        plantId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        occurredOn: '2026-04-25',
        actionType: 'prune',
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it('still allows journal entries on archived plants', async () => {
    await t.app.inject({
      method: 'DELETE',
      url: `/api/v1/plants/${ctx.plantId}`,
      headers: { cookie: ctx.cookie },
    });
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: {
        plantId: ctx.plantId,
        occurredOn: '2026-04-26',
        actionType: 'harvest',
        notes: 'Final apples before pulling the tree.',
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('lists entries newest-first and filters by plant, action, and date range', async () => {
    const otherPlant = await t.app.inject({
      method: 'POST',
      url: '/api/v1/plants',
      headers: { cookie: ctx.cookie },
      payload: { name: 'Rose' },
    });
    const otherPlantId = (otherPlant.json() as { id: string }).id;

    await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: { plantId: ctx.plantId, occurredOn: '2026-04-01', actionType: 'prune' },
    });
    await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: { plantId: ctx.plantId, occurredOn: '2026-05-10', actionType: 'fertilize' },
    });
    await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: { plantId: otherPlantId, occurredOn: '2026-04-15', actionType: 'prune' },
    });

    const all = await t.app.inject({
      method: 'GET',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
    });
    const allList = all.json() as Array<{ occurredOn: string }>;
    expect(allList).toHaveLength(3);
    expect(allList[0]!.occurredOn).toBe('2026-05-10');
    expect(allList[2]!.occurredOn).toBe('2026-04-01');

    const byPlant = await t.app.inject({
      method: 'GET',
      url: `/api/v1/journal?plantId=${ctx.plantId}`,
      headers: { cookie: ctx.cookie },
    });
    expect((byPlant.json() as unknown[]).length).toBe(2);

    const byAction = await t.app.inject({
      method: 'GET',
      url: '/api/v1/journal?actionType=prune',
      headers: { cookie: ctx.cookie },
    });
    expect((byAction.json() as unknown[]).length).toBe(2);

    const byRange = await t.app.inject({
      method: 'GET',
      url: '/api/v1/journal?from=2026-04-10&to=2026-04-30',
      headers: { cookie: ctx.cookie },
    });
    expect((byRange.json() as unknown[]).length).toBe(1);
  });

  it('updates and deletes an entry', async () => {
    const created = await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: { plantId: ctx.plantId, occurredOn: '2026-04-25', actionType: 'prune' },
    });
    const id = (created.json() as { id: string }).id;

    const patched = await t.app.inject({
      method: 'PATCH',
      url: `/api/v1/journal/${id}`,
      headers: { cookie: ctx.cookie },
      payload: { notes: 'Edited.', actionType: 'fertilize' },
    });
    expect(patched.statusCode).toBe(200);
    const after = patched.json() as { notes: string; actionType: string };
    expect(after.notes).toBe('Edited.');
    expect(after.actionType).toBe('fertilize');

    const del = await t.app.inject({
      method: 'DELETE',
      url: `/api/v1/journal/${id}`,
      headers: { cookie: ctx.cookie },
    });
    expect(del.statusCode).toBe(204);

    const gone = await t.app.inject({
      method: 'GET',
      url: `/api/v1/journal/${id}`,
      headers: { cookie: ctx.cookie },
    });
    expect(gone.statusCode).toBe(404);
  });

  it('clears plantId when a referenced plant is hard-deleted (FK SET NULL)', async () => {
    const created = await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: { plantId: ctx.plantId, occurredOn: '2026-04-25', actionType: 'prune' },
    });
    const entryId = (created.json() as { id: string }).id;

    // Hard-delete via raw drizzle, since the plants route only soft-deletes.
    const { plants } = await import('../../db/schema.js');
    const { eq } = await import('drizzle-orm');
    await t.db.delete(plants).where(eq(plants.id, ctx.plantId));

    const fetched = await t.app.inject({
      method: 'GET',
      url: `/api/v1/journal/${entryId}`,
      headers: { cookie: ctx.cookie },
    });
    expect(fetched.statusCode).toBe(200);
    expect((fetched.json() as { plantId: string | null }).plantId).toBeNull();
  });

  it('rejects custom actionType without a customLabel', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: { occurredOn: '2026-04-25', actionType: 'custom' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('uploads, serves, and deletes a photo', async () => {
    const created = await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: { plantId: ctx.plantId, occurredOn: '2026-04-25', actionType: 'prune' },
    });
    const journalId = (created.json() as { id: string }).id;

    const png = await tinyPng();
    const { body, headers } = multipartBody('seed.png', 'image/png', png);
    const upload = await t.app.inject({
      method: 'POST',
      url: `/api/v1/journal/${journalId}/photos`,
      headers: { cookie: ctx.cookie, ...headers },
      payload: body,
    });
    expect(upload.statusCode).toBe(201);
    const photo = upload.json() as { id: string; journalId: string };
    expect(photo.journalId).toBe(journalId);

    const refetched = await t.app.inject({
      method: 'GET',
      url: `/api/v1/journal/${journalId}`,
      headers: { cookie: ctx.cookie },
    });
    expect((refetched.json() as { photos: unknown[] }).photos).toHaveLength(1);

    const bytes = await t.app.inject({
      method: 'GET',
      url: `/api/v1/journal/${journalId}/photos/${photo.id}`,
      headers: { cookie: ctx.cookie },
    });
    expect(bytes.statusCode).toBe(200);
    expect(bytes.headers['content-type']).toBe('image/jpeg');
    // JPEG SOI marker
    expect(bytes.rawPayload.slice(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));

    const del = await t.app.inject({
      method: 'DELETE',
      url: `/api/v1/journal/${journalId}/photos/${photo.id}`,
      headers: { cookie: ctx.cookie },
    });
    expect(del.statusCode).toBe(204);

    const after = await t.app.inject({
      method: 'GET',
      url: `/api/v1/journal/${journalId}`,
      headers: { cookie: ctx.cookie },
    });
    expect((after.json() as { photos: unknown[] }).photos).toHaveLength(0);
  });

  it('rejects non-image uploads', async () => {
    const created = await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: { plantId: ctx.plantId, occurredOn: '2026-04-25', actionType: 'prune' },
    });
    const journalId = (created.json() as { id: string }).id;
    const { body, headers } = multipartBody('note.txt', 'text/plain', Buffer.from('hello'));
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/v1/journal/${journalId}/photos`,
      headers: { cookie: ctx.cookie, ...headers },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
  });

  it('deleting an entry cascades photos out of the DB', async () => {
    const created = await t.app.inject({
      method: 'POST',
      url: '/api/v1/journal',
      headers: { cookie: ctx.cookie },
      payload: { plantId: ctx.plantId, occurredOn: '2026-04-25', actionType: 'prune' },
    });
    const journalId = (created.json() as { id: string }).id;
    const png = await tinyPng();
    const { body, headers } = multipartBody('seed.png', 'image/png', png);
    await t.app.inject({
      method: 'POST',
      url: `/api/v1/journal/${journalId}/photos`,
      headers: { cookie: ctx.cookie, ...headers },
      payload: body,
    });

    await t.app.inject({
      method: 'DELETE',
      url: `/api/v1/journal/${journalId}`,
      headers: { cookie: ctx.cookie },
    });

    const { journalPhotos } = await import('../../db/schema.js');
    const remaining = await t.db.select().from(journalPhotos);
    expect(remaining).toHaveLength(0);
  });

  it('endpoints require authentication', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/v1/journal' });
    expect(res.statusCode).toBe(401);
  });
});
