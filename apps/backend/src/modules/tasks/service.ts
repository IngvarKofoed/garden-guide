import { and, asc, eq, isNull } from 'drizzle-orm';
import type {
  CareTask,
  CareTaskCreateRequest,
  CareTaskUpdateRequest,
  TaskCompletion,
} from '@garden-guide/shared';
import type { Db } from '../../db/client.js';
import { careTasks, plants, taskCompletions } from '../../db/schema.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';

function toCareTask(row: typeof careTasks.$inferSelect): CareTask {
  const base = {
    id: row.id,
    plantId: row.plantId,
    actionType: row.actionType as CareTask['actionType'],
    customLabel: row.customLabel ?? null,
    notes: row.notes ?? null,
    notify: row.notify,
    source: row.source as CareTask['source'],
    aiRationale: row.aiRationale ?? null,
    createdAt: row.createdAt,
  };
  if (row.kind === 'recurring') {
    if (!row.recurStartSlot || !row.recurEndSlot) {
      throw new Error(`Invalid recurring task ${row.id}: missing recur fields`);
    }
    return {
      ...base,
      kind: 'recurring',
      recurStartSlot: row.recurStartSlot,
      recurEndSlot: row.recurEndSlot,
      dueSlot: null,
    };
  }
  if (!row.dueSlot) {
    throw new Error(`Invalid one-off task ${row.id}: missing due_slot`);
  }
  return {
    ...base,
    kind: 'one_off',
    recurStartSlot: null,
    recurEndSlot: null,
    dueSlot: row.dueSlot,
  };
}

async function plantMustExistAndBeActive(db: Db, plantId: string): Promise<void> {
  const row = await db
    .select({ id: plants.id, archivedAt: plants.archivedAt })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  if (!row[0]) throw new NotFoundError('Plant not found');
  if (row[0].archivedAt) {
    throw new ValidationError('Cannot manage tasks on an archived plant');
  }
}

export async function listTasksForPlant(db: Db, plantId: string): Promise<CareTask[]> {
  const rows = await db
    .select()
    .from(careTasks)
    .where(eq(careTasks.plantId, plantId))
    .orderBy(asc(careTasks.kind), asc(careTasks.createdAt));
  return rows.map(toCareTask);
}

export async function createTask(
  db: Db,
  plantId: string,
  input: CareTaskCreateRequest,
): Promise<CareTask> {
  await plantMustExistAndBeActive(db, plantId);
  const id = newId();
  const createdAt = new Date().toISOString();

  if (input.kind === 'recurring') {
    await db.insert(careTasks).values({
      id,
      plantId,
      actionType: input.actionType,
      customLabel: input.customLabel ?? null,
      kind: 'recurring',
      recurStartSlot: input.recurStartSlot,
      recurEndSlot: input.recurEndSlot,
      dueSlot: null,
      notes: input.notes ?? null,
      notify: input.notify,
      source: 'manual',
      aiRationale: null,
      createdAt,
    });
  } else {
    await db.insert(careTasks).values({
      id,
      plantId,
      actionType: input.actionType,
      customLabel: input.customLabel ?? null,
      kind: 'one_off',
      recurStartSlot: null,
      recurEndSlot: null,
      dueSlot: input.dueSlot,
      notes: input.notes ?? null,
      notify: input.notify,
      source: 'manual',
      aiRationale: null,
      createdAt,
    });
  }

  return getTask(db, id);
}

export async function getTask(db: Db, id: string): Promise<CareTask> {
  const row = await db.select().from(careTasks).where(eq(careTasks.id, id)).limit(1);
  if (!row[0]) throw new NotFoundError('Task not found');
  return toCareTask(row[0]);
}

export async function updateTask(
  db: Db,
  id: string,
  input: CareTaskUpdateRequest,
): Promise<CareTask> {
  const existing = await getTask(db, id);

  const patch: Partial<typeof careTasks.$inferInsert> = {};
  if (input.actionType !== undefined) patch.actionType = input.actionType;
  if (input.customLabel !== undefined) patch.customLabel = input.customLabel ?? null;
  if (input.notes !== undefined) patch.notes = input.notes ?? null;
  if (input.notify !== undefined) patch.notify = input.notify;

  if (existing.kind === 'recurring') {
    if (input.recurStartSlot !== undefined) patch.recurStartSlot = input.recurStartSlot;
    if (input.recurEndSlot !== undefined) patch.recurEndSlot = input.recurEndSlot;
    if (input.dueSlot !== undefined) {
      throw new ValidationError('Cannot set due_slot on a recurring task');
    }
  } else {
    if (input.dueSlot !== undefined) patch.dueSlot = input.dueSlot;
    if (input.recurStartSlot !== undefined || input.recurEndSlot !== undefined) {
      throw new ValidationError('Cannot set recur fields on a one-off task');
    }
  }

  if (Object.keys(patch).length > 0) {
    await db.update(careTasks).set(patch).where(eq(careTasks.id, id));
  }
  return getTask(db, id);
}

export async function deleteTask(db: Db, id: string): Promise<void> {
  const result = await db.delete(careTasks).where(eq(careTasks.id, id));
  if (result.changes === 0) throw new NotFoundError('Task not found');
}

export async function completeTask(
  db: Db,
  id: string,
  completedOn?: string,
): Promise<TaskCompletion> {
  const task = await getTask(db, id);
  const onDate = completedOn ?? new Date().toISOString().slice(0, 10);

  if (task.kind === 'one_off') {
    const beforeOrEqual = onDate; // any date is fine for one-off completion
    void beforeOrEqual;
  }

  const completionId = newId();
  const createdAt = new Date().toISOString();
  await db.insert(taskCompletions).values({
    id: completionId,
    careTaskId: id,
    completedOn: onDate,
    createdAt,
  });
  return {
    id: completionId,
    careTaskId: id,
    completedOn: onDate,
    createdAt,
  };
}

export async function listCompletionsForTask(
  db: Db,
  taskId: string,
): Promise<TaskCompletion[]> {
  const rows = await db
    .select()
    .from(taskCompletions)
    .where(eq(taskCompletions.careTaskId, taskId))
    .orderBy(asc(taskCompletions.completedOn));
  return rows.map((r) => ({
    id: r.id,
    careTaskId: r.careTaskId,
    completedOn: r.completedOn,
    createdAt: r.createdAt,
  }));
}

// Re-exports useful for the calendar module without re-querying.
export { plants as plantsTable, careTasks as careTasksTable, taskCompletions as taskCompletionsTable };
export { and, asc, eq, isNull };
