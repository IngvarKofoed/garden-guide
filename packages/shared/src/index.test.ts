import { describe, expect, it } from 'vitest';
import {
  ActionTypeSchema,
  CareTaskSchema,
  IsoDateSchema,
  MonthSlotSchema,
  parseSlot,
  parseYearSlot,
  slotIndex,
  slotLabel,
  YearSlotSchema,
  yearSlotLabel,
  yearSlotToDayRange,
} from './index.js';

describe('shared schemas', () => {
  it('accepts known action types', () => {
    expect(ActionTypeSchema.parse('prune')).toBe('prune');
    expect(ActionTypeSchema.parse('custom')).toBe('custom');
  });

  it('rejects unknown action types', () => {
    expect(() => ActionTypeSchema.parse('explode')).toThrow();
  });

  it('parses MM-S slot strings', () => {
    expect(MonthSlotSchema.parse('03-2')).toBe('03-2');
    expect(() => MonthSlotSchema.parse('03-15')).toThrow();
    expect(() => MonthSlotSchema.parse('13-1')).toThrow();
    expect(() => MonthSlotSchema.parse('03-4')).toThrow();
  });

  it('parses YYYY-MM-DD strings', () => {
    expect(IsoDateSchema.parse('2026-04-25')).toBe('2026-04-25');
    expect(() => IsoDateSchema.parse('04-25')).toThrow();
  });

  it('decodes slots into month and position', () => {
    expect(parseSlot('07-3')).toEqual({ month: 7, position: 3 });
    expect(slotLabel('07-3')).toBe('late July');
    expect(slotIndex('01-1')).toBe(0);
    expect(slotIndex('12-3')).toBe(35);
  });

  it('discriminates recurring vs one-off care tasks', () => {
    const recurring = {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      plantId: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
      kind: 'recurring' as const,
      actionType: 'prune' as const,
      customLabel: null,
      recurStartSlot: '02-3',
      recurEndSlot: '03-2',
      dueSlot: null,
      notes: null,
      notify: true,
      source: 'ai' as const,
      aiRationale: 'Late winter pruning encourages new growth.',
      createdAt: '2026-04-25T10:00:00.000Z',
    };
    const parsed = CareTaskSchema.parse(recurring);
    expect(parsed.kind).toBe('recurring');
  });

  it('parses YYYY-MM-S year-slot strings', () => {
    expect(YearSlotSchema.parse('2027-03-1')).toBe('2027-03-1');
    expect(() => YearSlotSchema.parse('2027-3-1')).toThrow();
    expect(() => YearSlotSchema.parse('2027-13-1')).toThrow();
    expect(() => YearSlotSchema.parse('2027-03-4')).toThrow();
    expect(() => YearSlotSchema.parse('03-1')).toThrow();
  });

  it('decodes year-slots into year, month, position', () => {
    expect(parseYearSlot('2027-07-3')).toEqual({
      year: 2027,
      month: 7,
      position: 3,
    });
    expect(yearSlotLabel('2027-07-3')).toBe('late July 2027');
  });

  it('expands year-slot to day range (year-aware end of February)', () => {
    expect(yearSlotToDayRange('2026-02-3')).toEqual({
      year: 2026,
      month: 2,
      startDay: 21,
      endDay: 28,
    });
    expect(yearSlotToDayRange('2028-02-3')).toEqual({
      year: 2028,
      month: 2,
      startDay: 21,
      endDay: 29,
    });
    expect(yearSlotToDayRange('2027-04-1')).toEqual({
      year: 2027,
      month: 4,
      startDay: 1,
      endDay: 10,
    });
  });
});
