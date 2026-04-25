import { z } from 'zod';
import { IsoDateSchema, IsoTimestampSchema, UlidSchema } from './dates.js';
import { ActionTypeSchema } from './task.js';

export const JournalEntrySchema = z.object({
  id: UlidSchema,
  plantId: UlidSchema.nullable(),
  occurredOn: IsoDateSchema,
  actionType: ActionTypeSchema,
  customLabel: z.string().min(1).max(120).nullable(),
  notes: z.string().nullable(),
  createdAt: IsoTimestampSchema,
  createdBy: UlidSchema,
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const JournalPhotoSchema = z.object({
  id: UlidSchema,
  journalId: UlidSchema,
  filePath: z.string().min(1),
  createdAt: IsoTimestampSchema,
});
export type JournalPhoto = z.infer<typeof JournalPhotoSchema>;
