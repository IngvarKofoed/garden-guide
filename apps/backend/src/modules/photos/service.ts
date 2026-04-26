import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import type { Plant } from '@garden-guide/shared';
import type { Config } from '../../config.js';
import type { Db } from '../../db/client.js';
import { plantPhotos, plants } from '../../db/schema.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';
import type { LLMProvider } from '../ai/provider.js';

export interface PhotoDeps {
  db: Db;
  config: Pick<Config, 'PHOTO_DIR'>;
}

export interface PhotoLLMDeps extends PhotoDeps {
  llm: LLMProvider;
}

const ALLOWED_INPUT_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const ICON_DIM = 256; // square px — plenty for cards at 64–128 high-DPI
const ICON_OUTPUT_MIME = 'image/png';
const ICON_OUTPUT_EXT = 'png';

function resolvePhotoPath(config: PhotoDeps['config'], relPath: string): string {
  return isAbsolute(relPath) ? relPath : join(config.PHOTO_DIR, relPath);
}

async function plantMustExistAndBeActive(db: Db, plantId: string): Promise<void> {
  const row = await db
    .select({ id: plants.id, archivedAt: plants.archivedAt })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  if (!row[0]) throw new NotFoundError('Plant not found');
  if (row[0].archivedAt) {
    throw new ValidationError('Cannot change icon on an archived plant');
  }
}

/**
 * Replace a plant's icon with the supplied bytes. Re-encodes via sharp
 * (square 256×256 PNG, EXIF stripped). The previous icon photo, if any,
 * is fully removed from disk and the database.
 */
export async function setPlantIcon(
  deps: PhotoDeps,
  plantId: string,
  input: { bytes: Buffer; mimeType: string },
): Promise<Plant> {
  await plantMustExistAndBeActive(deps.db, plantId);
  if (!ALLOWED_INPUT_MIME.has(input.mimeType)) {
    throw new ValidationError(`Unsupported image type: ${input.mimeType}`);
  }

  let processed: Buffer;
  try {
    processed = await sharp(input.bytes)
      .rotate()
      .resize(ICON_DIM, ICON_DIM, { fit: 'cover' })
      .png()
      .toBuffer();
  } catch (err) {
    throw new ValidationError(
      `Could not decode image: ${(err as Error).message}`,
    );
  }

  // Persist to disk under data/photos/<plantId>/<photoId>.png.
  const photoId = newId();
  const relPath = join(plantId, `${photoId}.${ICON_OUTPUT_EXT}`);
  const fullPath = resolvePhotoPath(deps.config, relPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, processed);

  const createdAt = new Date().toISOString();
  await deps.db.insert(plantPhotos).values({
    id: photoId,
    plantId,
    filePath: relPath,
    takenAt: null,
    caption: null,
    createdAt,
  });

  // Replace any prior icon photo and clear any pending draft so the table
  // doesn't accumulate orphans. A direct upload supersedes a pending AI draft.
  const before = await deps.db
    .select({
      iconPhotoId: plants.iconPhotoId,
      iconDraftPhotoId: plants.iconDraftPhotoId,
    })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  const previousIconPhotoId = before[0]?.iconPhotoId ?? null;
  const previousDraftPhotoId = before[0]?.iconDraftPhotoId ?? null;

  await deps.db
    .update(plants)
    .set({ iconPhotoId: photoId, iconDraftPhotoId: null })
    .where(eq(plants.id, plantId));

  if (previousIconPhotoId) {
    await deletePhotoRowAndFile(deps, previousIconPhotoId);
  }
  if (previousDraftPhotoId) {
    await deletePhotoRowAndFile(deps, previousDraftPhotoId);
  }

  return loadPlant(deps.db, plantId);
}

/**
 * Generate an icon via the LLM and save it as a draft on the plant. Replaces
 * any previous draft. The icon column is untouched until the user accepts.
 */
export async function generatePlantIconDraft(
  deps: PhotoLLMDeps,
  plantId: string,
): Promise<Plant> {
  await plantMustExistAndBeActive(deps.db, plantId);
  const plantRow = await deps.db
    .select({ name: plants.name, species: plants.species })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  if (!plantRow[0]) throw new NotFoundError('Plant not found');

  const { imageBase64, mimeType } = await deps.llm.generatePlantIcon({
    commonName: plantRow[0].name,
    species: plantRow[0].species ?? null,
  });
  const bytes = Buffer.from(imageBase64, 'base64');

  let processed: Buffer;
  try {
    processed = await sharp(bytes)
      .rotate()
      .resize(ICON_DIM, ICON_DIM, { fit: 'cover' })
      .png()
      .toBuffer();
  } catch (err) {
    throw new ValidationError(
      `LLM returned an undecodable ${mimeType} image: ${(err as Error).message}`,
    );
  }

  const photoId = newId();
  const relPath = join(plantId, `${photoId}.${ICON_OUTPUT_EXT}`);
  const fullPath = resolvePhotoPath(deps.config, relPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, processed);

  const createdAt = new Date().toISOString();
  await deps.db.insert(plantPhotos).values({
    id: photoId,
    plantId,
    filePath: relPath,
    takenAt: null,
    caption: null,
    createdAt,
  });

  const before = await deps.db
    .select({ iconDraftPhotoId: plants.iconDraftPhotoId })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  const previousDraftPhotoId = before[0]?.iconDraftPhotoId ?? null;

  await deps.db
    .update(plants)
    .set({ iconDraftPhotoId: photoId })
    .where(eq(plants.id, plantId));

  if (previousDraftPhotoId) {
    await deletePhotoRowAndFile(deps, previousDraftPhotoId);
  }

  return loadPlant(deps.db, plantId);
}

/**
 * Promote the pending draft to be the plant's icon. Removes the previous
 * icon photo (file + DB row) so we don't accumulate orphans.
 */
export async function acceptPlantIconDraft(
  deps: PhotoDeps,
  plantId: string,
): Promise<Plant> {
  await plantMustExistAndBeActive(deps.db, plantId);
  const before = await deps.db
    .select({
      iconPhotoId: plants.iconPhotoId,
      iconDraftPhotoId: plants.iconDraftPhotoId,
    })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  const draftId = before[0]?.iconDraftPhotoId ?? null;
  if (!draftId) {
    throw new ValidationError('No icon draft to accept');
  }
  const previousIconPhotoId = before[0]?.iconPhotoId ?? null;

  await deps.db
    .update(plants)
    .set({ iconPhotoId: draftId, iconDraftPhotoId: null })
    .where(eq(plants.id, plantId));

  if (previousIconPhotoId && previousIconPhotoId !== draftId) {
    await deletePhotoRowAndFile(deps, previousIconPhotoId);
  }

  return loadPlant(deps.db, plantId);
}

export async function clearPlantIconDraft(
  deps: PhotoDeps,
  plantId: string,
): Promise<Plant> {
  await plantMustExistAndBeActive(deps.db, plantId);
  const before = await deps.db
    .select({ iconDraftPhotoId: plants.iconDraftPhotoId })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  const draftId = before[0]?.iconDraftPhotoId ?? null;
  if (draftId) {
    await deps.db
      .update(plants)
      .set({ iconDraftPhotoId: null })
      .where(eq(plants.id, plantId));
    await deletePhotoRowAndFile(deps, draftId);
  }
  return loadPlant(deps.db, plantId);
}

export async function getPlantIconDraftBytes(
  deps: PhotoDeps,
  plantId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const row = await deps.db
    .select({ iconDraftPhotoId: plants.iconDraftPhotoId })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  if (!row[0]) throw new NotFoundError('Plant not found');
  const draftId = row[0].iconDraftPhotoId;
  if (!draftId) return null;
  const photo = await deps.db
    .select()
    .from(plantPhotos)
    .where(eq(plantPhotos.id, draftId))
    .limit(1);
  if (!photo[0]) return null;
  const buffer = await readFile(resolvePhotoPath(deps.config, photo[0].filePath));
  return { buffer, mimeType: ICON_OUTPUT_MIME };
}

export async function clearPlantIcon(
  deps: PhotoDeps,
  plantId: string,
): Promise<Plant> {
  await plantMustExistAndBeActive(deps.db, plantId);
  const before = await deps.db
    .select({ iconPhotoId: plants.iconPhotoId })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  const previousIconPhotoId = before[0]?.iconPhotoId ?? null;
  if (previousIconPhotoId) {
    await deps.db
      .update(plants)
      .set({ iconPhotoId: null })
      .where(eq(plants.id, plantId));
    await deletePhotoRowAndFile(deps, previousIconPhotoId);
  }
  return loadPlant(deps.db, plantId);
}

export async function getPlantIconBytes(
  deps: PhotoDeps,
  plantId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const row = await deps.db
    .select({
      iconPhotoId: plants.iconPhotoId,
    })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  if (!row[0]) throw new NotFoundError('Plant not found');
  const iconPhotoId = row[0].iconPhotoId;
  if (!iconPhotoId) return null;

  const photo = await deps.db
    .select()
    .from(plantPhotos)
    .where(eq(plantPhotos.id, iconPhotoId))
    .limit(1);
  if (!photo[0]) return null;
  const buffer = await readFile(resolvePhotoPath(deps.config, photo[0].filePath));
  return { buffer, mimeType: ICON_OUTPUT_MIME };
}

async function deletePhotoRowAndFile(
  deps: PhotoDeps,
  photoId: string,
): Promise<void> {
  const row = await deps.db
    .select()
    .from(plantPhotos)
    .where(eq(plantPhotos.id, photoId))
    .limit(1);
  if (!row[0]) return;
  await deps.db.delete(plantPhotos).where(eq(plantPhotos.id, photoId));
  try {
    await rm(resolvePhotoPath(deps.config, row[0].filePath), { force: true });
  } catch {
    // best-effort: file already gone or permission issue — DB row is gone, fine.
  }
}

async function loadPlant(db: Db, plantId: string): Promise<Plant> {
  const row = await db.select().from(plants).where(eq(plants.id, plantId)).limit(1);
  if (!row[0]) throw new NotFoundError('Plant not found');
  return {
    id: row[0].id,
    name: row[0].name,
    species: row[0].species ?? null,
    zoneId: row[0].zoneId ?? null,
    description: row[0].description ?? null,
    notes: row[0].notes ?? null,
    iconPhotoId: row[0].iconPhotoId ?? null,
    iconDraftPhotoId: row[0].iconDraftPhotoId ?? null,
    archivedAt: row[0].archivedAt ?? null,
    createdAt: row[0].createdAt,
  };
}
