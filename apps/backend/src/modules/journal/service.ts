import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import sharp from 'sharp';
import type {
  JournalEntryCreateRequest,
  JournalEntryUpdateRequest,
  JournalEntryWithPhotos,
  JournalListQuery,
  JournalPhoto,
} from '@garden-guide/shared';
import type { Config } from '../../config.js';
import type { Db } from '../../db/client.js';
import { journalEntries, journalPhotos, plants } from '../../db/schema.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';

export interface JournalDeps {
  db: Db;
  config: Pick<Config, 'PHOTO_DIR'>;
}

const ALLOWED_INPUT_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const PHOTO_MAX_DIM = 1600;
const PHOTO_OUTPUT_MIME = 'image/jpeg';
const PHOTO_OUTPUT_EXT = 'jpg';

function resolvePhotoPath(config: JournalDeps['config'], relPath: string): string {
  return isAbsolute(relPath) ? relPath : join(config.PHOTO_DIR, relPath);
}

async function plantMustExistIfProvided(db: Db, plantId: string | null): Promise<void> {
  if (plantId === null) return;
  const row = await db
    .select({ id: plants.id })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  if (!row[0]) throw new NotFoundError('Plant not found');
}

async function loadEntry(db: Db, id: string): Promise<JournalEntryWithPhotos> {
  const row = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, id))
    .limit(1);
  if (!row[0]) throw new NotFoundError('Journal entry not found');
  const e = row[0];
  const photos = await db
    .select()
    .from(journalPhotos)
    .where(eq(journalPhotos.journalId, id))
    .orderBy(asc(journalPhotos.createdAt));
  return {
    id: e.id,
    plantId: e.plantId ?? null,
    occurredOn: e.occurredOn,
    actionType: e.actionType as JournalEntryWithPhotos['actionType'],
    customLabel: e.customLabel ?? null,
    notes: e.notes ?? null,
    createdAt: e.createdAt,
    createdBy: e.createdBy,
    photos: photos.map(toPhoto),
  };
}

function toPhoto(row: typeof journalPhotos.$inferSelect): JournalPhoto {
  return {
    id: row.id,
    journalId: row.journalId,
    filePath: row.filePath,
    createdAt: row.createdAt,
  };
}

export async function listJournalEntries(
  db: Db,
  filters: JournalListQuery,
): Promise<JournalEntryWithPhotos[]> {
  const conditions = [];
  if (filters.from !== undefined) conditions.push(gte(journalEntries.occurredOn, filters.from));
  if (filters.to !== undefined) conditions.push(lte(journalEntries.occurredOn, filters.to));
  if (filters.plantId !== undefined) conditions.push(eq(journalEntries.plantId, filters.plantId));
  if (filters.actionType !== undefined) {
    conditions.push(eq(journalEntries.actionType, filters.actionType));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(journalEntries)
    .where(where)
    .orderBy(desc(journalEntries.occurredOn), desc(journalEntries.createdAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const photoRows = await db
    .select()
    .from(journalPhotos)
    .where(inArray(journalPhotos.journalId, ids))
    .orderBy(asc(journalPhotos.createdAt));
  const photosByEntry = new Map<string, JournalPhoto[]>();
  for (const p of photoRows) {
    const list = photosByEntry.get(p.journalId) ?? [];
    list.push(toPhoto(p));
    photosByEntry.set(p.journalId, list);
  }

  return rows.map((e) => ({
    id: e.id,
    plantId: e.plantId ?? null,
    occurredOn: e.occurredOn,
    actionType: e.actionType as JournalEntryWithPhotos['actionType'],
    customLabel: e.customLabel ?? null,
    notes: e.notes ?? null,
    createdAt: e.createdAt,
    createdBy: e.createdBy,
    photos: photosByEntry.get(e.id) ?? [],
  }));
}

export async function getJournalEntry(
  db: Db,
  id: string,
): Promise<JournalEntryWithPhotos> {
  return loadEntry(db, id);
}

export async function createJournalEntry(
  db: Db,
  createdBy: string,
  input: JournalEntryCreateRequest,
): Promise<JournalEntryWithPhotos> {
  const plantId = input.plantId ?? null;
  await plantMustExistIfProvided(db, plantId);
  const id = newId();
  const createdAt = new Date().toISOString();
  await db.insert(journalEntries).values({
    id,
    plantId,
    occurredOn: input.occurredOn,
    actionType: input.actionType,
    customLabel: input.customLabel ?? null,
    notes: input.notes ?? null,
    createdAt,
    createdBy,
  });
  return loadEntry(db, id);
}

export async function updateJournalEntry(
  db: Db,
  id: string,
  input: JournalEntryUpdateRequest,
): Promise<JournalEntryWithPhotos> {
  // Validate the entry exists; the response also reflects post-update state.
  await loadEntry(db, id);

  const patch: Partial<typeof journalEntries.$inferInsert> = {};
  if (input.plantId !== undefined) {
    const next = input.plantId ?? null;
    await plantMustExistIfProvided(db, next);
    patch.plantId = next;
  }
  if (input.occurredOn !== undefined) patch.occurredOn = input.occurredOn;
  if (input.actionType !== undefined) patch.actionType = input.actionType;
  if (input.customLabel !== undefined) patch.customLabel = input.customLabel ?? null;
  if (input.notes !== undefined) patch.notes = input.notes ?? null;

  if (Object.keys(patch).length > 0) {
    await db.update(journalEntries).set(patch).where(eq(journalEntries.id, id));
  }
  return loadEntry(db, id);
}

export async function deleteJournalEntry(
  deps: JournalDeps,
  id: string,
): Promise<void> {
  const photos = await deps.db
    .select()
    .from(journalPhotos)
    .where(eq(journalPhotos.journalId, id));
  const result = await deps.db.delete(journalEntries).where(eq(journalEntries.id, id));
  if (result.changes === 0) throw new NotFoundError('Journal entry not found');
  // FK cascade clears photo rows; we still need to remove the files.
  for (const p of photos) {
    try {
      await rm(resolvePhotoPath(deps.config, p.filePath), { force: true });
    } catch {
      // best-effort cleanup
    }
  }
}

export async function addJournalPhoto(
  deps: JournalDeps,
  journalId: string,
  input: { bytes: Buffer; mimeType: string },
): Promise<JournalPhoto> {
  await loadEntry(deps.db, journalId);
  if (!ALLOWED_INPUT_MIME.has(input.mimeType)) {
    throw new ValidationError(`Unsupported image type: ${input.mimeType}`);
  }
  let processed: Buffer;
  try {
    processed = await sharp(input.bytes)
      .rotate()
      .resize(PHOTO_MAX_DIM, PHOTO_MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (err) {
    throw new ValidationError(`Could not decode image: ${(err as Error).message}`);
  }

  const photoId = newId();
  const relPath = join(journalId, `${photoId}.${PHOTO_OUTPUT_EXT}`);
  const fullPath = resolvePhotoPath(deps.config, relPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, processed);

  const createdAt = new Date().toISOString();
  await deps.db.insert(journalPhotos).values({
    id: photoId,
    journalId,
    filePath: relPath,
    createdAt,
  });
  return { id: photoId, journalId, filePath: relPath, createdAt };
}

export async function deleteJournalPhoto(
  deps: JournalDeps,
  journalId: string,
  photoId: string,
): Promise<void> {
  const row = await deps.db
    .select()
    .from(journalPhotos)
    .where(and(eq(journalPhotos.id, photoId), eq(journalPhotos.journalId, journalId)))
    .limit(1);
  if (!row[0]) throw new NotFoundError('Photo not found');
  await deps.db.delete(journalPhotos).where(eq(journalPhotos.id, photoId));
  try {
    await rm(resolvePhotoPath(deps.config, row[0].filePath), { force: true });
  } catch {
    // best-effort
  }
}

export async function getJournalPhotoBytes(
  deps: JournalDeps,
  journalId: string,
  photoId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const row = await deps.db
    .select()
    .from(journalPhotos)
    .where(and(eq(journalPhotos.id, photoId), eq(journalPhotos.journalId, journalId)))
    .limit(1);
  if (!row[0]) return null;
  const buffer = await readFile(resolvePhotoPath(deps.config, row[0].filePath));
  return { buffer, mimeType: PHOTO_OUTPUT_MIME };
}
