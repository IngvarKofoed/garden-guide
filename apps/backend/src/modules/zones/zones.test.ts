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

describe('zones', () => {
  let t: TestApp;
  let cookie: string;

  beforeEach(async () => {
    t = await buildTestApp();
    cookie = await authenticatedCookie(t);
  });

  afterEach(async () => {
    await t.close();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/v1/zones' });
    expect(res.statusCode).toBe(401);
  });

  it('CRUD round-trip', async () => {
    const create = await t.app.inject({
      method: 'POST',
      url: '/api/v1/zones',
      headers: { cookie },
      payload: { name: 'Front bed' },
    });
    expect(create.statusCode).toBe(201);
    const zone = create.json() as { id: string; name: string };
    expect(zone.name).toBe('Front bed');

    const list = await t.app.inject({
      method: 'GET',
      url: '/api/v1/zones',
      headers: { cookie },
    });
    expect(list.json()).toHaveLength(1);

    const update = await t.app.inject({
      method: 'PATCH',
      url: `/api/v1/zones/${zone.id}`,
      headers: { cookie },
      payload: { description: 'Sun all day' },
    });
    expect(update.json()).toMatchObject({ description: 'Sun all day' });

    const del = await t.app.inject({
      method: 'DELETE',
      url: `/api/v1/zones/${zone.id}`,
      headers: { cookie },
    });
    expect(del.statusCode).toBe(204);

    const get = await t.app.inject({
      method: 'GET',
      url: `/api/v1/zones/${zone.id}`,
      headers: { cookie },
    });
    expect(get.statusCode).toBe(404);
  });
});
