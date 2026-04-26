import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, sessionCookieFromResponse, type TestApp } from '../../test-utils.js';
import { ensureBootstrapInvite } from '../auth/service.js';

async function registerAdmin(t: TestApp): Promise<string> {
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

describe('invites', () => {
  let t: TestApp;
  let adminCookie: string;

  beforeEach(async () => {
    t = await buildTestApp();
    adminCookie = await registerAdmin(t);
  });

  afterEach(async () => {
    await t.close();
  });

  it('admin creates an invite, then a member registers with it', async () => {
    const create = await t.app.inject({
      method: 'POST',
      url: '/api/v1/invites',
      headers: { cookie: adminCookie },
      payload: { email: 'member@example.com' },
    });
    expect(create.statusCode).toBe(201);
    const created = create.json() as { token: string; url: string; expiresAt: string };
    expect(created.url).toContain(`?invite=${created.token}`);

    const register = await t.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        inviteToken: created.token,
        email: 'member@example.com',
        displayName: 'Member',
        password: 'password1234',
      },
    });
    expect(register.statusCode).toBe(201);
    expect(register.json()).toMatchObject({ isAdmin: false });
  });

  it('non-admins cannot create invites', async () => {
    const create = await t.app.inject({
      method: 'POST',
      url: '/api/v1/invites',
      headers: { cookie: adminCookie },
      payload: {},
    });
    const memberToken = (create.json() as { token: string }).token;
    await t.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        inviteToken: memberToken,
        email: 'm@example.com',
        displayName: 'M',
        password: 'password1234',
      },
    });
    const memberLogin = await t.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'm@example.com', password: 'password1234' },
    });
    const memberCookie = sessionCookieFromResponse(memberLogin.headers)!;

    const forbidden = await t.app.inject({
      method: 'POST',
      url: '/api/v1/invites',
      headers: { cookie: memberCookie },
      payload: {},
    });
    expect(forbidden.statusCode).toBe(403);
  });

  it('admin can list and delete invites', async () => {
    await t.app.inject({
      method: 'POST',
      url: '/api/v1/invites',
      headers: { cookie: adminCookie },
      payload: {},
    });
    const list1 = await t.app.inject({
      method: 'GET',
      url: '/api/v1/invites',
      headers: { cookie: adminCookie },
    });
    expect(list1.statusCode).toBe(200);
    const items = list1.json() as Array<{ token: string }>;
    expect(items.length).toBeGreaterThan(0);

    const del = await t.app.inject({
      method: 'DELETE',
      url: `/api/v1/invites/${items[0]!.token}`,
      headers: { cookie: adminCookie },
    });
    expect(del.statusCode).toBe(204);
  });
});
