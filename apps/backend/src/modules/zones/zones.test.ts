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

  it('defaults a new zone to kind="area" and picks an unused area color', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/zones',
      headers: { cookie },
      payload: { name: 'Front bed' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ kind: 'area', colorToken: 'moss' });
  });

  it('cycles through area palette tokens for successive zones', async () => {
    const tokens: string[] = [];
    for (const name of ['A', 'B', 'C']) {
      const res = await t.app.inject({
        method: 'POST',
        url: '/api/v1/zones',
        headers: { cookie },
        payload: { name },
      });
      tokens.push((res.json() as { colorToken: string }).colorToken);
    }
    expect(tokens).toEqual(['moss', 'fern', 'olive']);
  });

  it('keeps area and structure palettes independent', async () => {
    const a = await t.app.inject({
      method: 'POST',
      url: '/api/v1/zones',
      headers: { cookie },
      payload: { name: 'Bed', kind: 'area' },
    });
    const s = await t.app.inject({
      method: 'POST',
      url: '/api/v1/zones',
      headers: { cookie },
      payload: { name: 'Shed', kind: 'structure' },
    });
    expect(a.json()).toMatchObject({ kind: 'area', colorToken: 'moss' });
    expect(s.json()).toMatchObject({ kind: 'structure', colorToken: 'slate' });
  });

  it('honors an explicit colorToken on create and update', async () => {
    const created = await t.app.inject({
      method: 'POST',
      url: '/api/v1/zones',
      headers: { cookie },
      payload: { name: 'Bed', colorToken: 'lavender' },
    });
    const zone = created.json() as { id: string; colorToken: string };
    expect(zone.colorToken).toBe('lavender');

    const updated = await t.app.inject({
      method: 'PATCH',
      url: `/api/v1/zones/${zone.id}`,
      headers: { cookie },
      payload: { colorToken: 'pine' },
    });
    expect(updated.json()).toMatchObject({ colorToken: 'pine' });
  });

  it('rejects an invalid colorToken with 400', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/zones',
      headers: { cookie },
      payload: { name: 'Bed', colorToken: 'mauve' },
    });
    expect(res.statusCode).toBe(400);
  });
});
