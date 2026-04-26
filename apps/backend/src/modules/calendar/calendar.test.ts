import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, sessionCookieFromResponse, type TestApp } from '../../test-utils.js';
import { ensureBootstrapInvite } from '../auth/service.js';
import { expandRecurringWindow } from './service.js';

async function setup(t: TestApp): Promise<{ cookie: string; plantId: string }> {
  const bootstrap = await ensureBootstrapInvite(t.db, 24);
  const reg = await t.app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      inviteToken: bootstrap!.token,
      email: 'admin@example.com',
      displayName: 'Admin',
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

describe('expandRecurringWindow', () => {
  it('returns a single occurrence inside the requested year', () => {
    const out = expandRecurringWindow('02-20', '03-15', '2026-01-01', '2026-12-31');
    expect(out).toEqual([{ year: 2026, startDate: '2026-02-20', endDate: '2026-03-15' }]);
  });

  it('skips years that do not intersect the window', () => {
    const out = expandRecurringWindow('02-20', '03-15', '2026-04-01', '2026-12-31');
    expect(out).toEqual([]);
  });

  it('expands across multiple years', () => {
    const out = expandRecurringWindow('07-01', '07-15', '2025-06-01', '2027-08-31');
    expect(out.map((o) => o.year)).toEqual([2025, 2026, 2027]);
  });

  it('handles cross-year wrap (Nov–Feb)', () => {
    const out = expandRecurringWindow('11-15', '02-28', '2026-01-01', '2026-12-31');
    // The 2025 occurrence (Nov 15 2025 – Feb 28 2026) intersects the window,
    // and the 2026 occurrence (Nov 15 2026 – Feb 28 2027) also starts inside it.
    expect(out).toEqual([
      { year: 2025, startDate: '2025-11-15', endDate: '2026-02-28' },
      { year: 2026, startDate: '2026-11-15', endDate: '2027-02-28' },
    ]);
  });
});

describe('GET /api/v1/calendar', () => {
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

  it('returns expanded recurring + one-off occurrences in window', async () => {
    await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/tasks`,
      headers: { cookie },
      payload: {
        kind: 'recurring',
        actionType: 'prune',
        recurStartMd: '02-20',
        recurEndMd: '03-15',
        notify: true,
      },
    });
    await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/tasks`,
      headers: { cookie },
      payload: {
        kind: 'one_off',
        actionType: 'plant',
        dueDate: '2026-05-10',
        notify: true,
      },
    });

    const res = await t.app.inject({
      method: 'GET',
      url: '/api/v1/calendar?from=2026-01-01&to=2026-12-31',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const occs = res.json() as Array<{ kind: string; plantName: string }>;
    expect(occs).toHaveLength(2);
    expect(occs.every((o) => o.plantName === 'Apple tree')).toBe(true);
    expect(occs.map((o) => o.kind).sort()).toEqual(['one_off', 'recurring']);
  });

  it('excludes tasks on archived plants', async () => {
    await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/tasks`,
      headers: { cookie },
      payload: {
        kind: 'recurring',
        actionType: 'prune',
        recurStartMd: '02-20',
        recurEndMd: '03-15',
        notify: true,
      },
    });
    await t.app.inject({
      method: 'DELETE',
      url: `/api/v1/plants/${plantId}`,
      headers: { cookie },
    });
    const res = await t.app.inject({
      method: 'GET',
      url: '/api/v1/calendar?from=2026-01-01&to=2026-12-31',
      headers: { cookie },
    });
    expect(res.json()).toHaveLength(0);
  });

  it('attaches completion dates inside an occurrence window', async () => {
    const taskRes = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/tasks`,
      headers: { cookie },
      payload: {
        kind: 'recurring',
        actionType: 'fertilize',
        recurStartMd: '04-01',
        recurEndMd: '04-30',
        notify: true,
      },
    });
    const taskId = (taskRes.json() as { id: string }).id;
    await t.app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${taskId}/complete`,
      headers: { cookie },
      payload: { completedOn: '2026-04-12' },
    });
    const res = await t.app.inject({
      method: 'GET',
      url: '/api/v1/calendar?from=2026-01-01&to=2026-12-31',
      headers: { cookie },
    });
    const occs = res.json() as Array<{ completedOn: string | null }>;
    expect(occs).toHaveLength(1);
    expect(occs[0]!.completedOn).toBe('2026-04-12');
  });

  it('rejects from > to', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: '/api/v1/calendar?from=2026-12-31&to=2026-01-01',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(400);
  });
});
