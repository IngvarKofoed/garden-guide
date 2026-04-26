import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, sessionCookieFromResponse, type TestApp } from '../../test-utils.js';
import { ensureBootstrapInvite } from '../auth/service.js';

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
    payload: { name: 'Apple tree', species: 'Malus domestica' },
  });
  const plantId = (plantRes.json() as { id: string }).id;
  return { cookie, plantId };
}

describe('care tasks', () => {
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

  it('creates and lists a recurring task', async () => {
    const create = await t.app.inject({
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
    expect(create.statusCode).toBe(201);
    const task = create.json() as { id: string; kind: string; recurStartMd: string };
    expect(task.kind).toBe('recurring');
    expect(task.recurStartMd).toBe('02-20');

    const list = await t.app.inject({
      method: 'GET',
      url: `/api/v1/plants/${plantId}/tasks`,
      headers: { cookie },
    });
    expect(list.json()).toHaveLength(1);
  });

  it('rejects mixing recurring and one-off fields on update', async () => {
    const create = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/tasks`,
      headers: { cookie },
      payload: {
        kind: 'one_off',
        actionType: 'plant',
        dueDate: '2026-05-10',
        notify: false,
      },
    });
    const taskId = (create.json() as { id: string }).id;
    const bad = await t.app.inject({
      method: 'PATCH',
      url: `/api/v1/tasks/${taskId}`,
      headers: { cookie },
      payload: { recurStartMd: '03-01' },
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('completes a task', async () => {
    const create = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/tasks`,
      headers: { cookie },
      payload: {
        kind: 'recurring',
        actionType: 'fertilize',
        recurStartMd: '04-01',
        recurEndMd: '04-15',
        notify: true,
      },
    });
    const taskId = (create.json() as { id: string }).id;

    const complete = await t.app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${taskId}/complete`,
      headers: { cookie },
      payload: { completedOn: '2026-04-05' },
    });
    expect(complete.statusCode).toBe(201);
    expect(complete.json()).toMatchObject({ completedOn: '2026-04-05' });

    const completions = await t.app.inject({
      method: 'GET',
      url: `/api/v1/tasks/${taskId}/completions`,
      headers: { cookie },
    });
    expect(completions.json()).toHaveLength(1);
  });

  it('rejects creating a task on an archived plant', async () => {
    await t.app.inject({
      method: 'DELETE',
      url: `/api/v1/plants/${plantId}`,
      headers: { cookie },
    });
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/v1/plants/${plantId}/tasks`,
      headers: { cookie },
      payload: {
        kind: 'one_off',
        actionType: 'water',
        dueDate: '2026-04-10',
        notify: true,
      },
    });
    expect(res.statusCode).toBe(400);
  });
});
