import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import type { PlantIconResponse } from '@garden-guide/shared';
import { buildTestApp, sessionCookieFromResponse, type TestApp } from '../../test-utils.js';
import { ensureBootstrapInvite } from '../auth/service.js';
import type { LLMProvider } from '../ai/provider.js';

async function setup(t: TestApp): Promise<{ cookie: string; plantId: string }> {
  const bootstrap = await ensureBootstrapInvite(t.db, 24);
  const reg = await t.app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      inviteToken: bootstrap!.token,
      email: 'g@example.com',
      displayName: 'Gardener',
      password: 'password1234',
    },
  });
  const cookie = sessionCookieFromResponse(reg.headers)!;
  const plantRes = await t.app.inject({
    method: 'POST',
    url: '/api/v1/plants',
    headers: { cookie },
    payload: { name: 'Apple tree' },
  });
  const plantId = (plantRes.json() as { id: string }).id;
  return { cookie, plantId };
}

async function tinyPng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 0, g: 200, b: 0 },
    },
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
    `Content-Disposition: form-data; name="icon"; filename="${filename}"\r\n` +
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

describe('plant icon', () => {
  let t: TestApp;
  let cookie: string;
  let plantId: string;

  beforeEach(async () => {
    t = await buildTestApp();
    const s = await setup(t);
    cookie = s.cookie;
    plantId = s.plantId;
  });

  afterEach(async () => {
    await t.close();
  });

  it('uploads, serves, and deletes a plant icon', async () => {
    const png = await tinyPng();
    const { body, headers } = multipartBody('seed.png', 'image/png', png);

    const upload = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon`,
      headers: { cookie, ...headers },
      payload: body,
    });
    expect(upload.statusCode).toBe(201);
    const plant = upload.json() as { iconPhotoId: string | null };
    expect(plant.iconPhotoId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);

    const fetched = await t.app.inject({
      method: 'GET',
      url: `/api/v1/plants/${plantId}/icon`,
      headers: { cookie },
    });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.headers['content-type']).toBe('image/png');
    // sharp re-encodes to PNG; verify the bytes start with the PNG magic.
    expect(fetched.rawPayload.slice(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );

    const cleared = await t.app.inject({
      method: 'DELETE',
      url: `/api/v1/plants/${plantId}/icon`,
      headers: { cookie },
    });
    expect(cleared.statusCode).toBe(200);
    expect((cleared.json() as { iconPhotoId: string | null }).iconPhotoId).toBeNull();

    const after = await t.app.inject({
      method: 'GET',
      url: `/api/v1/plants/${plantId}/icon`,
      headers: { cookie },
    });
    expect(after.statusCode).toBe(404);
  });

  it('replacing an icon removes the previous photo row', async () => {
    const png = await tinyPng();

    const a = multipartBody('a.png', 'image/png', png);
    const upA = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon`,
      headers: { cookie, ...a.headers },
      payload: a.body,
    });
    const firstId = (upA.json() as { iconPhotoId: string | null }).iconPhotoId;

    const b = multipartBody('b.png', 'image/png', png);
    const upB = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon`,
      headers: { cookie, ...b.headers },
      payload: b.body,
    });
    const secondId = (upB.json() as { iconPhotoId: string | null }).iconPhotoId;

    expect(firstId).not.toBe(secondId);
    const { plantPhotos } = await import('../../db/schema.js');
    const remaining = await t.db.select().from(plantPhotos);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(secondId);
  });

  it('rejects non-image uploads', async () => {
    const { body, headers } = multipartBody(
      'note.txt',
      'text/plain',
      Buffer.from('hello'),
    );
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon`,
      headers: { cookie, ...headers },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('icon endpoints require auth', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: `/api/v1/plants/${plantId}/icon`,
    });
    expect(res.statusCode).toBe(401);
  });
});

async function fakeIconProvider(): Promise<{ provider: LLMProvider; canned: PlantIconResponse }> {
  // Generate a real PNG so sharp can decode and resize it.
  const png = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 50, g: 130, b: 80 } },
  })
    .png()
    .toBuffer();
  const canned: PlantIconResponse = {
    imageBase64: png.toString('base64'),
    mimeType: 'image/png',
  };
  const fail = () => {
    throw new Error('not used in this test');
  };
  return {
    canned,
    provider: {
      info: { name: 'openai', model: 'fake' },
      identifyPlant: fail,
      generateCarePlan: fail,
      refineCarePlan: fail,
      describePlant: fail,
      generatePlantIcon: async () => canned,
    },
  };
}

describe('plant icon draft', () => {
  let t: TestApp;
  let cookie: string;
  let plantId: string;

  beforeEach(async () => {
    const { provider } = await fakeIconProvider();
    t = await buildTestApp({ llm: provider });
    const s = await setup(t);
    cookie = s.cookie;
    plantId = s.plantId;
  });

  afterEach(async () => {
    await t.close();
  });

  it('generate-ai saves a draft on the plant without setting the icon', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon/draft/generate-ai`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(201);
    const plant = res.json() as {
      iconPhotoId: string | null;
      iconDraftPhotoId: string | null;
    };
    expect(plant.iconPhotoId).toBeNull();
    expect(plant.iconDraftPhotoId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);

    const draftBytes = await t.app.inject({
      method: 'GET',
      url: `/api/v1/plants/${plantId}/icon-draft`,
      headers: { cookie },
    });
    expect(draftBytes.statusCode).toBe(200);
    expect(draftBytes.headers['content-type']).toBe('image/png');
  });

  it('generating again replaces the previous draft photo', async () => {
    const a = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon/draft/generate-ai`,
      headers: { cookie },
    });
    const firstDraftId = (a.json() as { iconDraftPhotoId: string | null }).iconDraftPhotoId;

    const b = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon/draft/generate-ai`,
      headers: { cookie },
    });
    const secondDraftId = (b.json() as { iconDraftPhotoId: string | null }).iconDraftPhotoId;

    expect(firstDraftId).not.toBe(secondDraftId);
    const { plantPhotos } = await import('../../db/schema.js');
    const remaining = await t.db.select().from(plantPhotos);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(secondDraftId);
  });

  it('accept-draft promotes the draft to the icon and clears the draft', async () => {
    const gen = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon/draft/generate-ai`,
      headers: { cookie },
    });
    const draftId = (gen.json() as { iconDraftPhotoId: string | null }).iconDraftPhotoId;

    const accept = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon/draft/accept`,
      headers: { cookie },
    });
    expect(accept.statusCode).toBe(200);
    const plant = accept.json() as {
      iconPhotoId: string | null;
      iconDraftPhotoId: string | null;
    };
    expect(plant.iconPhotoId).toBe(draftId);
    expect(plant.iconDraftPhotoId).toBeNull();

    const iconBytes = await t.app.inject({
      method: 'GET',
      url: `/api/v1/plants/${plantId}/icon`,
      headers: { cookie },
    });
    expect(iconBytes.statusCode).toBe(200);
  });

  it('accepting with no pending draft is a 400', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon/draft/accept`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(400);
  });

  it('delete-draft removes the photo and clears the column', async () => {
    await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon/draft/generate-ai`,
      headers: { cookie },
    });
    const cleared = await t.app.inject({
      method: 'DELETE',
      url: `/api/v1/plants/${plantId}/icon/draft`,
      headers: { cookie },
    });
    expect(cleared.statusCode).toBe(200);
    expect((cleared.json() as { iconDraftPhotoId: string | null }).iconDraftPhotoId).toBeNull();

    const { plantPhotos } = await import('../../db/schema.js');
    const remaining = await t.db.select().from(plantPhotos);
    expect(remaining).toHaveLength(0);
  });

  it('a direct upload supersedes any pending draft', async () => {
    await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon/draft/generate-ai`,
      headers: { cookie },
    });
    const png = await tinyPng();
    const { body, headers } = multipartBody('seed.png', 'image/png', png);
    const upload = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/icon`,
      headers: { cookie, ...headers },
      payload: body,
    });
    const plant = upload.json() as {
      iconPhotoId: string | null;
      iconDraftPhotoId: string | null;
    };
    expect(plant.iconPhotoId).not.toBeNull();
    expect(plant.iconDraftPhotoId).toBeNull();
    const { plantPhotos } = await import('../../db/schema.js');
    const remaining = await t.db.select().from(plantPhotos);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(plant.iconPhotoId);
  });
});
