import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MAP_DEFAULT_HEIGHT,
  MAP_DEFAULT_WIDTH,
  type GardenMap,
} from '@garden-guide/shared';
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

async function createZone(
  t: TestApp,
  cookie: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const res = await t.app.inject({
    method: 'POST',
    url: '/api/v1/zones',
    headers: { cookie },
    payload,
  });
  return (res.json() as { id: string }).id;
}

function encodeCells(values: number[]): string {
  const buf = Buffer.alloc(values.length * 2);
  for (let i = 0; i < values.length; i++) buf.writeUInt16LE(values[i]!, i * 2);
  return buf.toString('base64');
}

function decodeCells(b64: string): number[] {
  const buf = Buffer.from(b64, 'base64');
  const out: number[] = [];
  for (let i = 0; i < buf.length; i += 2) out.push(buf.readUInt16LE(i));
  return out;
}

describe('map', () => {
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
    const res = await t.app.inject({ method: 'GET', url: '/api/v1/map' });
    expect(res.statusCode).toBe(401);
  });

  it('lazy-initializes a default empty map on first GET', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: '/api/v1/map',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const map = res.json() as GardenMap;
    expect(map.width).toBe(MAP_DEFAULT_WIDTH);
    expect(map.height).toBe(MAP_DEFAULT_HEIGHT);
    expect(map.zoneIndex).toEqual([]);
    const cells = decodeCells(map.cells);
    expect(cells).toHaveLength(MAP_DEFAULT_WIDTH * MAP_DEFAULT_HEIGHT);
    expect(cells.every((v) => v === 0)).toBe(true);
  });

  it('round-trips cells and zoneIndex via PUT then GET', async () => {
    const zoneId = await createZone(t, cookie, { name: 'Front bed' });
    const cells = new Array(10 * 10).fill(0);
    cells[0] = 1;
    cells[1] = 1;
    cells[10] = 1;
    const put = await t.app.inject({
      method: 'PUT',
      url: '/api/v1/map',
      headers: { cookie },
      payload: {
        width: 10,
        height: 10,
        cells: encodeCells(cells),
        zoneIndex: [zoneId],
      },
    });
    expect(put.statusCode).toBe(200);

    const get = await t.app.inject({
      method: 'GET',
      url: '/api/v1/map',
      headers: { cookie },
    });
    const map = get.json() as GardenMap;
    expect(map.width).toBe(10);
    expect(map.height).toBe(10);
    expect(map.zoneIndex).toEqual([zoneId]);
    expect(decodeCells(map.cells)).toEqual(cells);
  });

  it('rejects PUT when cells size does not match dimensions', async () => {
    const res = await t.app.inject({
      method: 'PUT',
      url: '/api/v1/map',
      headers: { cookie },
      payload: {
        width: 10,
        height: 10,
        cells: encodeCells([1, 2, 3]),
        zoneIndex: [],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects PUT with cell values exceeding zoneIndex length', async () => {
    const cells = new Array(10 * 10).fill(0);
    cells[0] = 5;
    const res = await t.app.inject({
      method: 'PUT',
      url: '/api/v1/map',
      headers: { cookie },
      payload: {
        width: 10,
        height: 10,
        cells: encodeCells(cells),
        zoneIndex: [],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects PUT referencing unknown zones', async () => {
    const cells = new Array(10 * 10).fill(0);
    cells[0] = 1;
    const res = await t.app.inject({
      method: 'PUT',
      url: '/api/v1/map',
      headers: { cookie },
      payload: {
        width: 10,
        height: 10,
        cells: encodeCells(cells),
        zoneIndex: ['01HYZZZZZZZZZZZZZZZZZZZZZZ'],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('extends the canvas with anchor=left, preserving existing cells on the left', async () => {
    const zoneId = await createZone(t, cookie, { name: 'Front bed' });
    // 10x10 canvas, fully painted with zone 1
    const filled = new Array(10 * 10).fill(1);
    await t.app.inject({
      method: 'PUT',
      url: '/api/v1/map',
      headers: { cookie },
      payload: {
        width: 10,
        height: 10,
        cells: encodeCells(filled),
        zoneIndex: [zoneId],
      },
    });

    const patch = await t.app.inject({
      method: 'PATCH',
      url: '/api/v1/map/canvas',
      headers: { cookie },
      payload: { width: 14, anchor: 'left' },
    });
    expect(patch.statusCode).toBe(200);
    const map = patch.json() as GardenMap;
    expect(map.width).toBe(14);
    expect(map.height).toBe(10);
    // each row: 10 ones (existing) + 4 zeros (new empty space on the right)
    const cells = decodeCells(map.cells);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 14; x++) {
        const expected = x < 10 ? 1 : 0;
        expect(cells[y * 14 + x]).toBe(expected);
      }
    }
  });

  it('trims the canvas, dropping cells that fall outside the new bounds', async () => {
    const zoneId = await createZone(t, cookie, { name: 'Front bed' });
    const filled = new Array(15 * 10).fill(1);
    await t.app.inject({
      method: 'PUT',
      url: '/api/v1/map',
      headers: { cookie },
      payload: {
        width: 15,
        height: 10,
        cells: encodeCells(filled),
        zoneIndex: [zoneId],
      },
    });

    const patch = await t.app.inject({
      method: 'PATCH',
      url: '/api/v1/map/canvas',
      headers: { cookie },
      payload: { width: 10, anchor: 'left' },
    });
    expect(patch.statusCode).toBe(200);
    const map = patch.json() as GardenMap;
    expect(map.width).toBe(10);
    expect(decodeCells(map.cells)).toEqual(new Array(10 * 10).fill(1));
  });

  it('rejects PATCH /map/canvas with neither width nor height', async () => {
    const res = await t.app.inject({
      method: 'PATCH',
      url: '/api/v1/map/canvas',
      headers: { cookie },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});
