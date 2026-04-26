import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, sessionCookieFromResponse, type TestApp } from '../../test-utils.js';
import { ensureBootstrapInvite } from '../auth/service.js';

async function authenticatedCookie(t: TestApp): Promise<string> {
  const bootstrap = await ensureBootstrapInvite(t.db, 24);
  const res = await t.app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      inviteToken: bootstrap!.token,
      email: 'admin@example.com',
      displayName: 'Admin',
      password: 'password1234',
    },
  });
  return sessionCookieFromResponse(res.headers)!;
}

describe('plants', () => {
  let t: TestApp;
  let cookie: string;

  beforeEach(async () => {
    t = await buildTestApp();
    cookie = await authenticatedCookie(t);
  });

  afterEach(async () => {
    await t.close();
  });

  it('creates, lists, updates, archives a plant', async () => {
    const create = await t.app.inject({
      method: 'POST',
      url: '/api/v1/plants',
      headers: { cookie },
      payload: { name: 'Apple tree', species: 'Malus domestica' },
    });
    expect(create.statusCode).toBe(201);
    const plant = create.json() as { id: string; name: string };

    const list = await t.app.inject({
      method: 'GET',
      url: '/api/v1/plants',
      headers: { cookie },
    });
    expect(list.json()).toHaveLength(1);

    const patch = await t.app.inject({
      method: 'PATCH',
      url: `/api/v1/plants/${plant.id}`,
      headers: { cookie },
      payload: { notes: 'Pruned 2026-02-21' },
    });
    expect(patch.json()).toMatchObject({ notes: 'Pruned 2026-02-21' });

    const archive = await t.app.inject({
      method: 'DELETE',
      url: `/api/v1/plants/${plant.id}`,
      headers: { cookie },
    });
    expect(archive.statusCode).toBe(204);

    const listActive = await t.app.inject({
      method: 'GET',
      url: '/api/v1/plants',
      headers: { cookie },
    });
    expect(listActive.json()).toHaveLength(0);

    const listArchived = await t.app.inject({
      method: 'GET',
      url: '/api/v1/plants?archived=only',
      headers: { cookie },
    });
    expect(listArchived.json()).toHaveLength(1);

    const get = await t.app.inject({
      method: 'GET',
      url: `/api/v1/plants/${plant.id}`,
      headers: { cookie },
    });
    expect(get.statusCode).toBe(200);
    expect(get.json()).toMatchObject({ archivedAt: expect.any(String) });
  });

  it('filters by zone and search query', async () => {
    const zoneRes = await t.app.inject({
      method: 'POST',
      url: '/api/v1/zones',
      headers: { cookie },
      payload: { name: 'Greenhouse' },
    });
    const zoneId = (zoneRes.json() as { id: string }).id;

    await t.app.inject({
      method: 'POST',
      url: '/api/v1/plants',
      headers: { cookie },
      payload: { name: 'Tomato', zoneId },
    });
    await t.app.inject({
      method: 'POST',
      url: '/api/v1/plants',
      headers: { cookie },
      payload: { name: 'Apple tree' },
    });

    const inZone = await t.app.inject({
      method: 'GET',
      url: `/api/v1/plants?zoneId=${zoneId}`,
      headers: { cookie },
    });
    expect(inZone.json()).toHaveLength(1);

    const search = await t.app.inject({
      method: 'GET',
      url: '/api/v1/plants?q=apple',
      headers: { cookie },
    });
    expect(search.json()).toHaveLength(1);
  });
});
