import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, sessionCookieFromResponse, type TestApp } from '../../test-utils.js';
import { ensureBootstrapInvite } from './service.js';

describe('auth flow', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await buildTestApp();
  });

  afterEach(async () => {
    await t.close();
  });

  it('registers the first user as admin via bootstrap invite', async () => {
    const bootstrap = await ensureBootstrapInvite(t.db, 24);
    expect(bootstrap).not.toBeNull();

    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        inviteToken: bootstrap!.token,
        email: 'admin@example.com',
        displayName: 'Admin',
        password: 'correcthorsebattery',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { isAdmin: boolean; email: string };
    expect(body.isAdmin).toBe(true);
    expect(body.email).toBe('admin@example.com');
    expect(sessionCookieFromResponse(res.headers)).not.toBeNull();
  });

  it('rejects registration with a consumed invite', async () => {
    const bootstrap = await ensureBootstrapInvite(t.db, 24);
    const first = await t.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        inviteToken: bootstrap!.token,
        email: 'a@example.com',
        displayName: 'A',
        password: 'password1234',
      },
    });
    expect(first.statusCode).toBe(201);

    const second = await t.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        inviteToken: bootstrap!.token,
        email: 'b@example.com',
        displayName: 'B',
        password: 'password1234',
      },
    });
    expect(second.statusCode).toBe(400);
    expect(second.json()).toMatchObject({ error: { code: 'INVITE_INVALID' } });
  });

  it('login + me + logout', async () => {
    const bootstrap = await ensureBootstrapInvite(t.db, 24);
    await t.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        inviteToken: bootstrap!.token,
        email: 'a@example.com',
        displayName: 'A',
        password: 'password1234',
      },
    });

    const login = await t.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'a@example.com', password: 'password1234' },
    });
    expect(login.statusCode).toBe(200);
    const cookie = sessionCookieFromResponse(login.headers);
    expect(cookie).not.toBeNull();

    const me = await t.app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: cookie! },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ email: 'a@example.com', isAdmin: true });

    const logout = await t.app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie: cookie! },
    });
    expect(logout.statusCode).toBe(204);

    const meAfter = await t.app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: cookie! },
    });
    expect(meAfter.statusCode).toBe(401);
  });

  it('rejects login for unknown user without leaking which field is wrong', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@example.com', password: 'whatever1234' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: { code: 'LOGIN_FAILED' } });
  });
});
