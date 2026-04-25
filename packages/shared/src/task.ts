import { z } from 'zod';
import { IsoDateSchema, IsoTimestampSchema, MonthDaySchema, UlidSchema } from './dates.js';

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
  recurStartMd: MonthDaySchema,
  recurEndMd: MonthDaySchema,
  dueDate: z.null(),
});

export const OneOffCareTaskSchema = BaseCareTaskSchema.extend({
  kind: z.literal('one_off'),
  recurStartMd: z.null(),
  recurEndMd: z.null(),
  dueDate: IsoDateSchema,
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
