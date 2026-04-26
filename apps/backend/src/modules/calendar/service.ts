import { and, between, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import type { CalendarOccurrence } from '@garden-guide/shared';
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
  recurStartMd: string | null;
  recurEndMd: string | null;
  dueDate: string | null;
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
 * For a recurring task with start/end MM-DD and a [from, to] window, return
 * every dated occurrence whose [start, end] intersects the window. Wraps
 * across the year boundary when end_md < start_md (e.g. mulch Nov–Feb).
 */
export function expandRecurringWindow(
  recurStartMd: string,
  recurEndMd: string,
  fromYmd: string,
  toYmd: string,
): Array<{ year: number; startDate: string; endDate: string }> {
  const from = parseYmd(fromYmd);
  const to = parseYmd(toYmd);
  if (to.getTime() < from.getTime()) {
    throw new ValidationError('`to` must be on or after `from`');
  }
  const startMonth = Number(recurStartMd.slice(0, 2));
  const startDay = Number(recurStartMd.slice(3, 5));
  const endMonth = Number(recurEndMd.slice(0, 2));
  const endDay = Number(recurEndMd.slice(3, 5));

  const out: Array<{ year: number; startDate: string; endDate: string }> = [];

  // We may need the year before `from` as well, because a window starting in
  // Y-1 (e.g. Nov 15) and ending in Y (e.g. Feb 28) could intersect [from, to].
  const startYear = from.getUTCFullYear() - 1;
  const endYear = to.getUTCFullYear() + 1;

  for (let year = startYear; year <= endYear; year++) {
    const occStart = new Date(Date.UTC(year, startMonth - 1, startDay));
    const wraps =
      endMonth < startMonth || (endMonth === startMonth && endDay < startDay);
    const occEnd = wraps
      ? new Date(Date.UTC(year + 1, endMonth - 1, endDay))
      : new Date(Date.UTC(year, endMonth - 1, endDay));

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
      recurStartMd: careTasks.recurStartMd,
      recurEndMd: careTasks.recurEndMd,
      dueDate: careTasks.dueDate,
      notes: careTasks.notes,
      plantName: plants.name,
      plantSpecies: plants.species,
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
    if (r.kind === 'recurring' && r.recurStartMd && r.recurEndMd) {
      for (const win of expandRecurringWindow(
        r.recurStartMd,
        r.recurEndMd,
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
    } else if (r.kind === 'one_off' && r.dueDate) {
      if (r.dueDate < fromYmd || r.dueDate > toYmd) continue;
      const completed =
        completionsByTask.get(r.id)?.[0]?.completedOn ?? null;
      occurrences.push({
        kind: 'one_off',
        taskId: r.id,
        plantId: r.plantId,
        plantName: r.plantName,
        plantSpecies: r.plantSpecies ?? null,
        zoneId: r.zoneId ?? null,
        actionType: r.actionType as CalendarOccurrence['actionType'],
        customLabel: r.customLabel ?? null,
        notes: r.notes ?? null,
        dueDate: r.dueDate,
        completedOn: completed,
      });
    }
  }

  occurrences.sort((a, b) => primaryDate(a).localeCompare(primaryDate(b)));
  return occurrences;
}

function primaryDate(o: CalendarOccurrence): string {
  return o.kind === 'recurring' ? o.startDate : o.dueDate;
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
