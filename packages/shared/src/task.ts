import { z } from 'zod';
import { IsoDateSchema, IsoTimestampSchema, UlidSchema } from './dates.js';
import { MonthSlotSchema, YearSlotSchema } from './slots.js';

export const ActionTypeSchema = z.enum([
  'prune',
  'fertilize',
  'water',
  'plant',
  'transplant',
  'harvest',
  'sow',
  'mulch',
  'treat',
  'inspect',
  'custom',
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const TaskKindSchema = z.enum(['recurring', 'one_off']);
export type TaskKind = z.infer<typeof TaskKindSchema>;

export const TaskSourceSchema = z.enum(['manual', 'ai']);
export type TaskSource = z.infer<typeof TaskSourceSchema>;

const BaseCareTaskSchema = z.object({
  id: UlidSchema,
  plantId: UlidSchema,
  actionType: ActionTypeSchema,
  customLabel: z.string().min(1).max(120).nullable(),
  notes: z.string().nullable(),
  notify: z.boolean(),
  source: TaskSourceSchema,
  aiRationale: z.string().nullable(),
  createdAt: IsoTimestampSchema,
});

export const RecurringCareTaskSchema = BaseCareTaskSchema.extend({
  kind: z.literal('recurring'),
  recurStartSlot: MonthSlotSchema,
  recurEndSlot: MonthSlotSchema,
  dueSlot: z.null(),
});

export const OneOffCareTaskSchema = BaseCareTaskSchema.extend({
  kind: z.literal('one_off'),
  recurStartSlot: z.null(),
  recurEndSlot: z.null(),
  dueSlot: YearSlotSchema,
});

export const CareTaskSchema = z.discriminatedUnion('kind', [
  RecurringCareTaskSchema,
  OneOffCareTaskSchema,
]);
export type CareTask = z.infer<typeof CareTaskSchema>;

export const TaskCompletionSchema = z.object({
  id: UlidSchema,
  careTaskId: UlidSchema,
  completedOn: IsoDateSchema,
  createdAt: IsoTimestampSchema,
});
export type TaskCompletion = z.infer<typeof TaskCompletionSchema>;

const RecurringCreateBase = z.object({
  kind: z.literal('recurring'),
  actionType: ActionTypeSchema,
  customLabel: z.string().min(1).max(120).nullish(),
  recurStartSlot: MonthSlotSchema,
  recurEndSlot: MonthSlotSchema,
  notes: z.string().max(10_000).nullish(),
  notify: z.boolean().default(true),
});

const OneOffCreateBase = z.object({
  kind: z.literal('one_off'),
  actionType: ActionTypeSchema,
  customLabel: z.string().min(1).max(120).nullish(),
  dueSlot: YearSlotSchema,
  notes: z.string().max(10_000).nullish(),
  notify: z.boolean().default(true),
});

export const CareTaskCreateRequestSchema = z.discriminatedUnion('kind', [
  RecurringCreateBase,
  OneOffCreateBase,
]);
export type CareTaskCreateRequest = z.infer<typeof CareTaskCreateRequestSchema>;

export const CareTaskUpdateRequestSchema = z.object({
  actionType: ActionTypeSchema.optional(),
  customLabel: z.string().min(1).max(120).nullish(),
  recurStartSlot: MonthSlotSchema.optional(),
  recurEndSlot: MonthSlotSchema.optional(),
  dueSlot: YearSlotSchema.optional(),
  notes: z.string().max(10_000).nullish(),
  notify: z.boolean().optional(),
});
export type CareTaskUpdateRequest = z.infer<typeof CareTaskUpdateRequestSchema>;

export const TaskCompleteRequestSchema = z.object({
  completedOn: IsoDateSchema.optional(),
});
export type TaskCompleteRequest = z.infer<typeof TaskCompleteRequestSchema>;

export const CalendarQuerySchema = z.object({
  from: IsoDateSchema,
  to: IsoDateSchema,
});
export type CalendarQuery = z.infer<typeof CalendarQuerySchema>;

const CalendarOccurrenceBase = z.object({
  taskId: UlidSchema,
  plantId: UlidSchema,
  plantName: z.string(),
  plantSpecies: z.string().nullable(),
  zoneId: UlidSchema.nullable(),
  actionType: ActionTypeSchema,
  customLabel: z.string().nullable(),
  notes: z.string().nullable(),
  completedOn: IsoDateSchema.nullable(),
});

export const RecurringOccurrenceSchema = CalendarOccurrenceBase.extend({
  kind: z.literal('recurring'),
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
  year: z.number().int(),
});

export const OneOffOccurrenceSchema = CalendarOccurrenceBase.extend({
  kind: z.literal('one_off'),
  dueSlot: YearSlotSchema,
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
});

export const CalendarOccurrenceSchema = z.discriminatedUnion('kind', [
  RecurringOccurrenceSchema,
  OneOffOccurrenceSchema,
]);
export type CalendarOccurrence = z.infer<typeof CalendarOccurrenceSchema>;
