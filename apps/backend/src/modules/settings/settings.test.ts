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

describe('garden context settings', () => {
  let t: TestApp;
  let cookie: string;

  beforeEach(async () => {
    t = await buildTestApp();
    cookie = await authenticatedCookie(t);
  });

  afterEach(async () => {
    await t.close();
  });

  it('returns empty context by default', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: '/api/v1/settings/garden-context',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ context: '' });
  });

  it('persists and returns the garden context', async () => {
    const put = await t.app.inject({
      method: 'PUT',
      url: '/api/v1/settings/garden-context',
      headers: { cookie },
      payload: { context: 'Denmark, USDA zone 7, maritime climate.' },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json()).toEqual({
      context: 'Denmark, USDA zone 7, maritime climate.',
    });

    const get = await t.app.inject({
      method: 'GET',
      url: '/api/v1/settings/garden-context',
      headers: { cookie },
    });
    expect(get.json()).toEqual({
      context: 'Denmark, USDA zone 7, maritime climate.',
    });
  });

  it('overwrites a previous value', async () => {
    await t.app.inject({
      method: 'PUT',
      url: '/api/v1/settings/garden-context',
      headers: { cookie },
      payload: { context: 'first' },
    });
    const put2 = await t.app.inject({
      method: 'PUT',
      url: '/api/v1/settings/garden-context',
      headers: { cookie },
      payload: { context: 'second' },
    });
    expect(put2.json()).toEqual({ context: 'second' });
  });

  it('rejects unauthenticated requests', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: '/api/v1/settings/garden-context',
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects oversized context', async () => {
    const big = 'x'.repeat(5_000);
    const res = await t.app.inject({
      method: 'PUT',
      url: '/api/v1/settings/garden-context',
      headers: { cookie },
      payload: { context: big },
    });
    expect(res.statusCode).toBe(400);
  });
});
