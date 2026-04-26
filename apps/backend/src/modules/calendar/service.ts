import { and, between, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import {
  MonthSlotSchema,
  slotIndex,
  slotToDayRange,
  YearSlotSchema,
  yearSlotToDayRange,
  type CalendarOccurrence,
  type MonthSlot,
} from '@garden-guide/shared';
import type { Db } from '../../db/client.js';
import { careTasks, plants, taskCompletions } from '../../db/schema.js';
import { ValidationError } from '../../lib/errors.js';

interface PlantCols {
  id: string;
  name: string;
  species: string | null;
  zoneId: string | null;
}

interface TaskRow {
  id: string;
  plantId: string;
  actionType: string;
  customLabel: string | null;
  kind: string;
  recurStartSlot: string | null;
  recurEndSlot: string | null;
  dueSlot: string | null;
  notes: string | null;
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseYmd(s: string): Date {
  // Treat as a UTC date so we don't get tz-offset surprises.
  return new Date(`${s}T00:00:00.000Z`);
}

/**
 * For a recurring task with start/end MM-S slots and a [from, to] window,
 * return every dated occurrence whose [start, end] intersects the window.
 * Wraps across the year boundary when the end slot is earlier in the year
 * than the start slot (e.g. mulch late-Nov → late-Feb).
 */
export function expandRecurringWindow(
  recurStartSlot: string,
  recurEndSlot: string,
  fromYmd: string,
  toYmd: string,
): Array<{ year: number; startDate: string; endDate: string }> {
  const startSlot: MonthSlot = MonthSlotSchema.parse(recurStartSlot);
  const endSlot: MonthSlot = MonthSlotSchema.parse(recurEndSlot);
  const from = parseYmd(fromYmd);
  const to = parseYmd(toYmd);
  if (to.getTime() < from.getTime()) {
    throw new ValidationError('`to` must be on or after `from`');
  }
  const wraps = slotIndex(endSlot) < slotIndex(startSlot);

  const out: Array<{ year: number; startDate: string; endDate: string }> = [];

  // We may need the year before `from` as well, because a window starting in
  // Y-1 (e.g. late November) and ending in Y (e.g. late February) could
  // intersect [from, to].
  const startYear = from.getUTCFullYear() - 1;
  const endYear = to.getUTCFullYear() + 1;

  for (let year = startYear; year <= endYear; year++) {
    const sRange = slotToDayRange(startSlot, year);
    const occStart = new Date(Date.UTC(year, sRange.month - 1, sRange.startDay));
    const endYearForSlot = wraps ? year + 1 : year;
    const eRange = slotToDayRange(endSlot, endYearForSlot);
    const occEnd = new Date(
      Date.UTC(endYearForSlot, eRange.month - 1, eRange.endDay),
    );

    // Intersect [occStart, occEnd] with [from, to].
    if (occEnd.getTime() < from.getTime()) continue;
    if (occStart.getTime() > to.getTime()) continue;
    out.push({ year, startDate: ymd(occStart), endDate: ymd(occEnd) });
  }
  return out;
}

export async function getCalendar(
  db: Db,
  fromYmd: string,
  toYmd: string,
): Promise<CalendarOccurrence[]> {
  const from = parseYmd(fromYmd);
  const to = parseYmd(toYmd);
  if (to.getTime() < from.getTime()) {
    throw new ValidationError('`to` must be on or after `from`');
  }

  // Pull every task that belongs to a non-archived plant, plus the parent
  // plant fields we want denormalized into the response.
  const rows = await db
    .select({
      id: careTasks.id,
      plantId: careTasks.plantId,
      actionType: careTasks.actionType,
      customLabel: careTasks.customLabel,
      kind: careTasks.kind,
      recurStartSlot: careTasks.recurStartSlot,
      recurEndSlot: careTasks.recurEndSlot,
      dueSlot: careTasks.dueSlot,
      notes: careTasks.notes,
      plantName: plants.name,
      plantSpecies: plants.species,
      plantIconPhotoId: plants.iconPhotoId,
      zoneId: plants.zoneId,
    })
    .from(careTasks)
    .innerJoin(plants, and(eq(careTasks.plantId, plants.id), isNull(plants.archivedAt)));

  // Fetch all completions for these tasks within the requested window.
  const taskIds = rows.map((r) => r.id);
  const completions =
    taskIds.length === 0
      ? []
      : await db
          .select({
            id: taskCompletions.id,
            careTaskId: taskCompletions.careTaskId,
            completedOn: taskCompletions.completedOn,
          })
          .from(taskCompletions)
          .where(
            and(
              inArray(taskCompletions.careTaskId, taskIds),
              gte(taskCompletions.completedOn, fromYmd),
              lte(taskCompletions.completedOn, toYmd),
            ),
          );
  const completionsByTask = new Map<string, Array<{ completedOn: string }>>();
  for (const c of completions) {
    const list = completionsByTask.get(c.careTaskId) ?? [];
    list.push({ completedOn: c.completedOn });
    completionsByTask.set(c.careTaskId, list);
  }

  const occurrences: CalendarOccurrence[] = [];

  for (const r of rows) {
    if (r.kind === 'recurring' && r.recurStartSlot && r.recurEndSlot) {
      for (const win of expandRecurringWindow(
        r.recurStartSlot,
        r.recurEndSlot,
        fromYmd,
        toYmd,
      )) {
        const completed = findCompletionInRange(
          completionsByTask.get(r.id) ?? [],
          win.startDate,
          win.endDate,
        );
        occurrences.push({
          kind: 'recurring',
          taskId: r.id,
          plantId: r.plantId,
          plantName: r.plantName,
          plantSpecies: r.plantSpecies ?? null,
          plantIconPhotoId: r.plantIconPhotoId ?? null,
          zoneId: r.zoneId ?? null,
          actionType: r.actionType as CalendarOccurrence['actionType'],
          customLabel: r.customLabel ?? null,
          notes: r.notes ?? null,
          startDate: win.startDate,
          endDate: win.endDate,
          year: win.year,
          completedOn: completed,
        });
      }
    } else if (r.kind === 'one_off' && r.dueSlot) {
      const dueSlot = YearSlotSchema.parse(r.dueSlot);
      const range = yearSlotToDayRange(dueSlot);
      const startDate = ymd(
        new Date(Date.UTC(range.year, range.month - 1, range.startDay)),
      );
      const endDate = ymd(
        new Date(Date.UTC(range.year, range.month - 1, range.endDay)),
      );
      if (endDate < fromYmd || startDate > toYmd) continue;
      const completed = findCompletionInRange(
        completionsByTask.get(r.id) ?? [],
        startDate,
        endDate,
      );
      occurrences.push({
        kind: 'one_off',
        taskId: r.id,
        plantId: r.plantId,
        plantName: r.plantName,
        plantSpecies: r.plantSpecies ?? null,
        plantIconPhotoId: r.plantIconPhotoId ?? null,
        zoneId: r.zoneId ?? null,
        actionType: r.actionType as CalendarOccurrence['actionType'],
        customLabel: r.customLabel ?? null,
        notes: r.notes ?? null,
        dueSlot,
        startDate,
        endDate,
        completedOn: completed,
      });
    }
  }

  occurrences.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return occurrences;
}

function findCompletionInRange(
  list: Array<{ completedOn: string }>,
  startDate: string,
  endDate: string,
): string | null {
  for (const c of list) {
    if (c.completedOn >= startDate && c.completedOn <= endDate) return c.completedOn;
  }
  return null;
}

// Imports kept here for type compatibility but unused by callers.
void between;
void plants;
void careTasks;
void taskCompletions;
