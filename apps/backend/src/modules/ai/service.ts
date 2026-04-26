import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, join } from 'node:path';
import { eq } from 'drizzle-orm';
import type {
  CarePlanRequest,
  CarePlanResponse,
  IdentifyPlantRequest,
  IdentifyPlantResponse,
  PlantDescriptionRequest,
  PlantDescriptionResponse,
  RefineCarePlanRequest,
  RefineCarePlanResponse,
  SuggestedTask,
} from '@garden-guide/shared';
import type { Config } from '../../config.js';
import type { Db } from '../../db/client.js';
import { plantPhotos, plants } from '../../db/schema.js';
import { NotFoundError } from '../../lib/errors.js';
import { listTasksForPlant } from '../tasks/service.js';
import type { LLMProvider } from './provider.js';

export interface AiDeps {
  db: Db;
  llm: LLMProvider;
  config: Pick<Config, 'PHOTO_DIR'>;
}

export async function identifyPlant(
  deps: AiDeps,
  body: IdentifyPlantRequest,
): Promise<IdentifyPlantResponse> {
  const photo = body.photoId ? await loadPhoto(deps, body.photoId) : undefined;
  return deps.llm.identifyPlant({
    name: body.name ?? null,
    photo,
  });
}

export async function generateCarePlan(
  deps: AiDeps,
  body: CarePlanRequest,
): Promise<CarePlanResponse> {
  const plant = await loadPlant(deps.db, body.plantId);
  return deps.llm.generateCarePlan({
    commonName: plant.name,
    species: plant.species ?? null,
    notes: plant.notes ?? null,
  });
}

export async function describePlant(
  deps: AiDeps,
  body: PlantDescriptionRequest,
): Promise<PlantDescriptionResponse> {
  const plant = await loadPlant(deps.db, body.plantId);
  return deps.llm.describePlant({
    commonName: plant.name,
    species: plant.species ?? null,
    notes: plant.notes ?? null,
  });
}

export async function refineCarePlan(
  deps: AiDeps,
  body: RefineCarePlanRequest,
): Promise<RefineCarePlanResponse> {
  const plant = await loadPlant(deps.db, body.plantId);
  const existing = await listTasksForPlant(deps.db, body.plantId);
  const currentTasks: SuggestedTask[] = existing.map((t) =>
    t.kind === 'recurring'
      ? {
          kind: 'recurring',
          actionType: t.actionType,
          customLabel: t.customLabel,
          recurStartSlot: t.recurStartSlot,
          recurEndSlot: t.recurEndSlot,
          rationale: t.aiRationale ?? t.notes ?? '',
        }
      : {
          kind: 'one_off',
          actionType: t.actionType,
          customLabel: t.customLabel,
          dueSlot: t.dueSlot,
          rationale: t.aiRationale ?? t.notes ?? '',
        },
  );
  return deps.llm.refineCarePlan({
    commonName: plant.name,
    species: plant.species ?? null,
    notes: plant.notes ?? null,
    currentTasks,
    question: body.question,
  });
}

async function loadPlant(db: Db, plantId: string) {
  const row = await db.select().from(plants).where(eq(plants.id, plantId)).limit(1);
  if (!row[0]) throw new NotFoundError('Plant not found');
  return row[0];
}

async function loadPhoto(
  deps: AiDeps,
  photoId: string,
): Promise<{ bytes: Buffer; mimeType: string }> {
  const row = await db_select_photo(deps.db, photoId);
  if (!row) throw new NotFoundError('Photo not found');
  const fullPath = isAbsolute(row.filePath)
    ? row.filePath
    : join(deps.config.PHOTO_DIR, row.filePath);
  const bytes = await readFile(fullPath);
  return { bytes, mimeType: mimeFromPath(row.filePath) };
}

async function db_select_photo(db: Db, photoId: string) {
  const rows = await db
    .select()
    .from(plantPhotos)
    .where(eq(plantPhotos.id, photoId))
    .limit(1);
  return rows[0] ?? null;
}

function mimeFromPath(p: string): string {
  switch (extname(p).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}
