import { and, asc, desc, eq, isNotNull, isNull, like, or } from 'drizzle-orm';
import type {
  Plant,
  PlantCreateRequest,
  PlantListQuery,
  PlantUpdateRequest,
} from '@garden-guide/shared';
import type { Db } from '../../db/client.js';
import { plants } from '../../db/schema.js';
import { NotFoundError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';

function toPlant(row: typeof plants.$inferSelect): Plant {
  return {
    id: row.id,
    name: row.name,
    species: row.species ?? null,
    zoneId: row.zoneId ?? null,
    description: row.description ?? null,
    notes: row.notes ?? null,
    iconPhotoId: row.iconPhotoId ?? null,
    iconDraftPhotoId: row.iconDraftPhotoId ?? null,
    archivedAt: row.archivedAt ?? null,
    createdAt: row.createdAt,
  };
}

export async function listPlants(db: Db, query: PlantListQuery): Promise<Plant[]> {
  const filters = [] as Parameters<typeof and>[number][];

  if (query.zoneId) filters.push(eq(plants.zoneId, query.zoneId));

  if (query.q) {
    const like_ = `%${query.q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    filters.push(or(like(plants.name, like_), like(plants.species, like_)) as never);
  }

  switch (query.archived) {
    case 'only':
      filters.push(isNotNull(plants.archivedAt));
      break;
    case 'true':
      // no filter — include archived and active
      break;
    case 'false':
    case null:
    case undefined:
    default:
      filters.push(isNull(plants.archivedAt));
      break;
  }

  const rows = await db
    .select()
    .from(plants)
    .where(filters.length ? (and(...filters) as never) : undefined)
    .orderBy(desc(plants.createdAt), asc(plants.name));
  return rows.map(toPlant);
}

export async function getPlant(db: Db, id: string): Promise<Plant> {
  const row = await db.select().from(plants).where(eq(plants.id, id)).limit(1);
  if (!row[0]) throw new NotFoundError('Plant not found');
  return toPlant(row[0]);
}

export async function createPlant(db: Db, input: PlantCreateRequest): Promise<Plant> {
  const id = newId();
  const createdAt = new Date().toISOString();
  await db.insert(plants).values({
    id,
    name: input.name,
    species: input.species ?? null,
    zoneId: input.zoneId ?? null,
    description: input.description ?? null,
    notes: input.notes ?? null,
    archivedAt: null,
    createdAt,
  });
  return getPlant(db, id);
}

export async function updatePlant(
  db: Db,
  id: string,
  input: PlantUpdateRequest,
): Promise<Plant> {
  const patch: Partial<typeof plants.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.species !== undefined) patch.species = input.species ?? null;
  if (input.zoneId !== undefined) patch.zoneId = input.zoneId ?? null;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.notes !== undefined) patch.notes = input.notes ?? null;

  if (Object.keys(patch).length > 0) {
    const result = await db.update(plants).set(patch).where(eq(plants.id, id));
    if (result.changes === 0) throw new NotFoundError('Plant not found');
  }
  return getPlant(db, id);
}

export async function archivePlant(db: Db, id: string): Promise<void> {
  const archivedAt = new Date().toISOString();
  const result = await db
    .update(plants)
    .set({ archivedAt })
    .where(and(eq(plants.id, id), isNull(plants.archivedAt)));
  if (result.changes === 0) {
    // Either not found or already archived — verify which.
    const exists = await db.select({ id: plants.id }).from(plants).where(eq(plants.id, id)).limit(1);
    if (exists.length === 0) throw new NotFoundError('Plant not found');
  }
}
