import { z } from 'zod';

// `MM-S` where MM is 01-12 and S is 1 (early), 2 (mid), or 3 (late).
// Year-agnostic; one of three coarse positions per month.
export const MonthSlotSchema = z
  .string()
  .regex(/^(0[1-9]|1[0-2])-[1-3]$/, 'expected MM-S where S is 1, 2, or 3');
export type MonthSlot = z.infer<typeof MonthSlotSchema>;

export const SLOT_POSITIONS = ['early', 'mid', 'late'] as const;
export type SlotPosition = (typeof SLOT_POSITIONS)[number];

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

export function parseSlot(slot: MonthSlot): {
  month: number;
  position: 1 | 2 | 3;
} {
  return {
    month: Number(slot.slice(0, 2)),
    position: Number(slot.slice(3, 4)) as 1 | 2 | 3,
  };
}

export function formatSlot(month: number, position: 1 | 2 | 3): MonthSlot {
  const mm = month.toString().padStart(2, '0');
  return `${mm}-${position}` as MonthSlot;
}

export function slotPosition(slot: MonthSlot): SlotPosition {
  return SLOT_POSITIONS[parseSlot(slot).position - 1]!;
}

export function slotMonthName(slot: MonthSlot): string {
  return MONTH_NAMES[parseSlot(slot).month - 1]!;
}

// "early March", "mid July", "late November"
export function slotLabel(slot: MonthSlot): string {
  return `${slotPosition(slot)} ${slotMonthName(slot)}`;
}

// 0..35 — useful for ordering and detecting cross-year wrap.
export function slotIndex(slot: MonthSlot): number {
  const { month, position } = parseSlot(slot);
  return (month - 1) * 3 + (position - 1);
}

const lastDayOfMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

// Concrete day range for a slot in a given year.
// early = days 1–10, mid = 11–20, late = 21..end-of-month (year-aware for Feb).
export function slotToDayRange(
  slot: MonthSlot,
  year: number,
): { month: number; startDay: number; endDay: number } {
  const { month, position } = parseSlot(slot);
  if (position === 1) return { month, startDay: 1, endDay: 10 };
  if (position === 2) return { month, startDay: 11, endDay: 20 };
  return { month, startDay: 21, endDay: lastDayOfMonth(year, month) };
}

// `YYYY-MM-S` — a slot anchored to a specific year. Used for one-off care tasks.
export const YearSlotSchema = z
  .string()
  .regex(
    /^\d{4}-(0[1-9]|1[0-2])-[1-3]$/,
    'expected YYYY-MM-S where S is 1, 2, or 3',
  );
export type YearSlot = z.infer<typeof YearSlotSchema>;

export function parseYearSlot(yearSlot: YearSlot): {
  year: number;
  month: number;
  position: 1 | 2 | 3;
} {
  return {
    year: Number(yearSlot.slice(0, 4)),
    month: Number(yearSlot.slice(5, 7)),
    position: Number(yearSlot.slice(8, 9)) as 1 | 2 | 3,
  };
}

export function formatYearSlot(
  year: number,
  month: number,
  position: 1 | 2 | 3,
): YearSlot {
  const mm = month.toString().padStart(2, '0');
  return `${year}-${mm}-${position}` as YearSlot;
}

export function yearSlotMonthSlot(yearSlot: YearSlot): MonthSlot {
  const { month, position } = parseYearSlot(yearSlot);
  return formatSlot(month, position);
}

// "early March 2027"
export function yearSlotLabel(yearSlot: YearSlot): string {
  const { year } = parseYearSlot(yearSlot);
  return `${slotLabel(yearSlotMonthSlot(yearSlot))} ${year}`;
}

// Concrete day range for a year-anchored slot.
export function yearSlotToDayRange(yearSlot: YearSlot): {
  year: number;
  month: number;
  startDay: number;
  endDay: number;
} {
  const { year, month, position } = parseYearSlot(yearSlot);
  if (position === 1) return { year, month, startDay: 1, endDay: 10 };
  if (position === 2) return { year, month, startDay: 11, endDay: 20 };
  return { year, month, startDay: 21, endDay: lastDayOfMonth(year, month) };
}
