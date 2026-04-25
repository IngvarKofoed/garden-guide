import { describe, expect, it } from 'vitest';
import { ActionTypeSchema, MonthDaySchema, IsoDateSchema, CareTaskSchema } from './index.js';

describe('shared schemas', () => {
  it('accepts known action types', () => {
    expect(ActionTypeSchema.parse('prune')).toBe('prune');
    expect(ActionTypeSchema.parse('custom')).toBe('custom');
  });

  it('rejects unknown action types', () => {
    expect(() => ActionTypeSchema.parse('explode')).toThrow();
  });

  it('parses MM-DD strings', () => {
    expect(MonthDaySchema.parse('03-15')).toBe('03-15');
    expect(() => MonthDaySchema.parse('2024-03-15')).toThrow();
    expect(() => MonthDaySchema.parse('13-01')).toThrow();
  });

  it('parses YYYY-MM-DD strings', () => {
    expect(IsoDateSchema.parse('2026-04-25')).toBe('2026-04-25');
    expect(() => IsoDateSchema.parse('04-25')).toThrow();
  });

  it('discriminates recurring vs one-off care tasks', () => {
    const recurring = {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      plantId: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
      kind: 'recurring' as const,
      actionType: 'prune' as const,
      customLabel: null,
      recurStartMd: '02-20',
      recurEndMd: '03-15',
      dueDate: null,
      notes: null,
      notify: true,
      source: 'ai' as const,
      aiRationale: 'Late winter pruning encourages new growth.',
      createdAt: '2026-04-25T10:00:00.000Z',
    };
    const parsed = CareTaskSchema.parse(recurring);
    expect(parsed.kind).toBe('recurring');
  });
});
