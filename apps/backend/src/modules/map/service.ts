import { eq, inArray } from 'drizzle-orm';
import {
  MAP_DEFAULT_HEIGHT,
  MAP_DEFAULT_WIDTH,
  type GardenMap,
  type GardenMapCanvasPatchRequest,
  type GardenMapPutRequest,
  type MapAnchor,
} from '@garden-guide/shared';
import type { Db } from '../../db/client.js';
import { gardenMap, zones } from '../../db/schema.js';
import { ValidationError } from '../../lib/errors.js';

const SINGLETON_ID = 'main';

interface MapRow {
  width: number;
  height: number;
  cells: Buffer;
  zoneIndex: string[];
  updatedAt: string;
}

export async function getMap(db: Db): Promise<GardenMap> {
  return rowToWire(await loadOrInit(db));
}

export async function putMap(db: Db, input: GardenMapPutRequest): Promise<GardenMap> {
  const cellsBuf = Buffer.from(input.cells, 'base64');
  const expected = input.width * input.height * 2;
  if (cellsBuf.length !== expected) {
    throw new ValidationError(
      `cells must be ${expected} bytes for ${input.width}x${input.height}, got ${cellsBuf.length}`,
    );
  }
  if (new Set(input.zoneIndex).size !== input.zoneIndex.length) {
    throw new ValidationError('zoneIndex must not contain duplicates');
  }
  await assertZonesExist(db, input.zoneIndex);
  assertCellRefsInRange(cellsBuf, input.zoneIndex.length);

  const updatedAt = new Date().toISOString();
  const existing = await db
    .select({ id: gardenMap.id })
    .from(gardenMap)
    .where(eq(gardenMap.id, SINGLETON_ID))
    .limit(1);

  if (existing[0]) {
    await db
      .update(gardenMap)
      .set({
        width: input.width,
        height: input.height,
        cells: cellsBuf,
        zoneIndex: JSON.stringify(input.zoneIndex),
        updatedAt,
      })
      .where(eq(gardenMap.id, SINGLETON_ID));
  } else {
    await db.insert(gardenMap).values({
      id: SINGLETON_ID,
      width: input.width,
      height: input.height,
      cells: cellsBuf,
      zoneIndex: JSON.stringify(input.zoneIndex),
      updatedAt,
    });
  }

  return rowToWire({
    width: input.width,
    height: input.height,
    cells: cellsBuf,
    zoneIndex: input.zoneIndex,
    updatedAt,
  });
}

export async function patchCanvas(
  db: Db,
  patch: GardenMapCanvasPatchRequest,
): Promise<GardenMap> {
  const row = await loadOrInit(db);
  const newW = patch.width ?? row.width;
  const newH = patch.height ?? row.height;

  if (newW === row.width && newH === row.height) return rowToWire(row);

  const { dx, dy } = anchorOffset(patch.anchor, row.width, row.height, newW, newH);
  const newCells = remapCells(row.cells, row.width, row.height, newW, newH, dx, dy);
  const updatedAt = new Date().toISOString();

  await db
    .update(gardenMap)
    .set({ width: newW, height: newH, cells: newCells, updatedAt })
    .where(eq(gardenMap.id, SINGLETON_ID));

  return rowToWire({
    width: newW,
    height: newH,
    cells: newCells,
    zoneIndex: row.zoneIndex,
    updatedAt,
  });
}

async function loadOrInit(db: Db): Promise<MapRow> {
  const rows = await db
    .select()
    .from(gardenMap)
    .where(eq(gardenMap.id, SINGLETON_ID))
    .limit(1);
  if (rows[0]) {
    return {
      width: rows[0].width,
      height: rows[0].height,
      cells: rows[0].cells,
      zoneIndex: parseZoneIndex(rows[0].zoneIndex),
      updatedAt: rows[0].updatedAt,
    };
  }
  const width = MAP_DEFAULT_WIDTH;
  const height = MAP_DEFAULT_HEIGHT;
  const cells = Buffer.alloc(width * height * 2);
  const updatedAt = new Date().toISOString();
  await db.insert(gardenMap).values({
    id: SINGLETON_ID,
    width,
    height,
    cells,
    zoneIndex: JSON.stringify([]),
    updatedAt,
  });
  return { width, height, cells, zoneIndex: [], updatedAt };
}

function rowToWire(row: MapRow): GardenMap {
  return {
    width: row.width,
    height: row.height,
    cells: row.cells.toString('base64'),
    zoneIndex: row.zoneIndex,
    updatedAt: row.updatedAt,
  };
}

function parseZoneIndex(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return [];
}

async function assertZonesExist(db: Db, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const rows = await db
    .select({ id: zones.id })
    .from(zones)
    .where(inArray(zones.id, [...ids]));
  if (rows.length !== ids.length) {
    const found = new Set(rows.map((r) => r.id));
    const missing = ids.filter((id) => !found.has(id));
    throw new ValidationError(
      `zoneIndex references unknown zones: ${missing.join(', ')}`,
    );
  }
}

function assertCellRefsInRange(cells: Buffer, zoneCount: number): void {
  for (let i = 0; i < cells.length; i += 2) {
    const v = cells.readUInt16LE(i);
    if (v > zoneCount) {
      throw new ValidationError(
        `cell value ${v} exceeds zoneIndex length ${zoneCount}`,
      );
    }
  }
}

function anchorOffset(
  anchor: MapAnchor,
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
): { dx: number; dy: number } {
  const dxCenter = Math.floor((newW - oldW) / 2);
  const dyCenter = Math.floor((newH - oldH) / 2);
  const dxRight = newW - oldW;
  const dyBottom = newH - oldH;
  switch (anchor) {
    case 'top-left':
      return { dx: 0, dy: 0 };
    case 'top':
      return { dx: dxCenter, dy: 0 };
    case 'top-right':
      return { dx: dxRight, dy: 0 };
    case 'left':
      return { dx: 0, dy: dyCenter };
    case 'center':
      return { dx: dxCenter, dy: dyCenter };
    case 'right':
      return { dx: dxRight, dy: dyCenter };
    case 'bottom-left':
      return { dx: 0, dy: dyBottom };
    case 'bottom':
      return { dx: dxCenter, dy: dyBottom };
    case 'bottom-right':
      return { dx: dxRight, dy: dyBottom };
  }
}

function remapCells(
  oldCells: Buffer,
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
  dx: number,
  dy: number,
): Buffer {
  const next = Buffer.alloc(newW * newH * 2);
  for (let y = 0; y < oldH; y++) {
    const newY = y + dy;
    if (newY < 0 || newY >= newH) continue;
    for (let x = 0; x < oldW; x++) {
      const newX = x + dx;
      if (newX < 0 || newX >= newW) continue;
      const v = oldCells.readUInt16LE((y * oldW + x) * 2);
      if (v !== 0) next.writeUInt16LE(v, (newY * newW + newX) * 2);
    }
  }
  return next;
}
