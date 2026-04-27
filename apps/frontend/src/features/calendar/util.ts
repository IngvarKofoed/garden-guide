import {
  formatSlot,
  parseYearSlot,
  slotIndex,
  slotLabel,
  type CalendarOccurrence,
  type MonthSlot,
} from '@garden-guide/shared';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function parseYmd(s: string): Date {
  // Treat YYYY-MM-DD as a local date (matches the user's calendar grid).
  const [y, m, d] = s.split('-').map((p) => Number(p));
  return new Date(y!, m! - 1, d!);
}

function dayToPosition(day: number): 1 | 2 | 3 {
  if (day <= 10) return 1;
  if (day <= 20) return 2;
  return 3;
}

export function dateToSlot(date: Date): MonthSlot {
  return formatSlot(date.getMonth() + 1, dayToPosition(date.getDate()));
}

export function todaySlotIndex(today: Date): number {
  return slotIndex(dateToSlot(today));
}

/** Y-anchored slot index: month*3 + position-1, but clamped to the displayed year. */
export function occurrenceSpan(
  occ: CalendarOccurrence,
  year: number,
): { startIndex: number; endIndex: number } {
  const start = parseYmd(occ.startDate);
  const end = parseYmd(occ.endDate);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const clipStart = start < yearStart ? yearStart : start;
  const clipEnd = end > yearEnd ? yearEnd : end;
  return {
    startIndex: slotIndex(dateToSlot(clipStart)),
    endIndex: slotIndex(dateToSlot(clipEnd)),
  };
}

export function occurrenceIsInYear(occ: CalendarOccurrence, year: number): boolean {
  const start = parseYmd(occ.startDate);
  const end = parseYmd(occ.endDate);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);
  return end >= yearStart && start <= yearEnd;
}

/** Greedy lane packing: sort by start, place each item in the first lane whose tail ends before it. */
export function packLanes<T extends { startIndex: number; endIndex: number }>(
  items: T[],
): T[][] {
  const sorted = [...items].sort(
    (a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex,
  );
  const lanes: T[][] = [];
  for (const item of sorted) {
    const lane = lanes.find((l) => {
      const last = l[l.length - 1]!;
      return last.endIndex < item.startIndex;
    });
    if (lane) lane.push(item);
    else lanes.push([item]);
  }
  return lanes;
}

export function occurrenceKey(occ: CalendarOccurrence): string {
  if (occ.kind === 'recurring') {
    return `${occ.taskId}-${occ.year}-${occ.startDate}`;
  }
  if (occ.kind === 'one_off') {
    return `${occ.taskId}-${occ.dueSlot}`;
  }
  return `j-${occ.journalId}`;
}

export function occurrenceTitle(occ: CalendarOccurrence): string {
  return occ.customLabel ?? defaultActionLabel(occ.actionType);
}

function defaultActionLabel(action: CalendarOccurrence['actionType']): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

/**
 * "early March – late September" or "early March 2027" (one-off), or a
 * formatted long date for journal entries.
 */
export function occurrenceWindowLabel(occ: CalendarOccurrence): string {
  if (occ.kind === 'one_off') {
    const ys = parseYearSlot(occ.dueSlot);
    return `${slotLabel(formatSlot(ys.month, ys.position))} ${ys.year}`;
  }
  if (occ.kind === 'journal') {
    return formatLongDate(occ.occurredOn);
  }
  const start = parseYmd(occ.startDate);
  const end = parseYmd(occ.endDate);
  const startSlot = dateToSlot(start);
  const endSlot = dateToSlot(end);
  if (startSlot === endSlot) return slotLabel(startSlot);
  return `${slotLabel(startSlot)} – ${slotLabel(endSlot)}`;
}

function formatLongDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((p) => Number(p));
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function monthName(monthIdx: number): string {
  return MONTH_NAMES[monthIdx]!;
}

/** Inclusive day-range overlap test. */
export function dayInOccurrence(date: Date, occ: CalendarOccurrence): boolean {
  const t = startOfDay(date).getTime();
  return startOfDay(parseYmd(occ.startDate)).getTime() <= t && t <= startOfDay(parseYmd(occ.endDate)).getTime();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
