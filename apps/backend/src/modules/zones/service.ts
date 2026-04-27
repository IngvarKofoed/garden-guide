import { asc, eq } from 'drizzle-orm';
import {
  ZONE_AREA_TOKENS,
  ZONE_STRUCTURE_TOKENS,
  type Zone,
  type ZoneColorToken,
  type ZoneCreateRequest,
  type ZoneKind,
  type ZoneUpdateRequest,
} from '@garden-guide/shared';
import type { Db } from '../../db/client.js';
import { zones } from '../../db/schema.js';
import { NotFoundError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';

function toZone(row: typeof zones.$inferSelect): Zone {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    kind: row.kind,
    colorToken: row.colorToken as ZoneColorToken,
    createdAt: row.createdAt,
  };
}

function paletteFor(kind: ZoneKind): readonly ZoneColorToken[] {
  return kind === 'structure' ? ZONE_STRUCTURE_TOKENS : ZONE_AREA_TOKENS;
}

async function pickNextColor(db: Db, kind: ZoneKind): Promise<ZoneColorToken> {
  const palette = paletteFor(kind);
  const rows = await db
    .select({ colorToken: zones.colorToken, kind: zones.kind })
    .from(zones)
    .where(eq(zones.kind, kind));
  const used = new Set(rows.map((r) => r.colorToken));
  for (const token of palette) {
    if (!used.has(token)) return token;
  }
  return palette[rows.length % palette.length]!;
}

export async function listZones(db: Db): Promise<Zone[]> {
  const rows = await db.select().from(zones).orderBy(asc(zones.name));
  return rows.map(toZone);
}

export async function getZone(db: Db, id: string): Promise<Zone> {
  const row = await db.select().from(zones).where(eq(zones.id, id)).limit(1);
  if (!row[0]) throw new NotFoundError('Zone not found');
  return toZone(row[0]);
}

export async function createZone(db: Db, input: ZoneCreateRequest): Promise<Zone> {
  const id = newId();
  const createdAt = new Date().toISOString();
  const kind: ZoneKind = input.kind ?? 'area';
  const colorToken = input.colorToken ?? (await pickNextColor(db, kind));
  await db.insert(zones).values({
    id,
    name: input.name,
    description: input.description ?? null,
    kind,
    colorToken,
    createdAt,
  });
  return {
    id,
    name: input.name,
    description: input.description ?? null,
    kind,
    colorToken,
    createdAt,
  };
}

export async function updateZone(
  db: Db,
  id: string,
  input: ZoneUpdateRequest,
): Promise<Zone> {
  const patch: Partial<typeof zones.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.kind !== undefined) patch.kind = input.kind;
  if (input.colorToken !== undefined) patch.colorToken = input.colorToken;

  if (Object.keys(patch).length > 0) {
    const result = await db.update(zones).set(patch).where(eq(zones.id, id));
    if (result.changes === 0) throw new NotFoundError('Zone not found');
  }
  return getZone(db, id);
}

export async function deleteZone(db: Db, id: string): Promise<void> {
  const result = await db.delete(zones).where(eq(zones.id, id));
  if (result.changes === 0) throw new NotFoundError('Zone not found');
}
