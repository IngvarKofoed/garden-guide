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

export const JournalEntryWithPhotosSchema = JournalEntrySchema.extend({
  photos: z.array(JournalPhotoSchema),
});
export type JournalEntryWithPhotos = z.infer<typeof JournalEntryWithPhotosSchema>;

export const JournalEntryCreateRequestSchema = z
  .object({
    plantId: UlidSchema.nullish(),
    occurredOn: IsoDateSchema,
    actionType: ActionTypeSchema,
    customLabel: z.string().min(1).max(120).nullish(),
    notes: z.string().max(10_000).nullish(),
  })
  .superRefine((val, ctx) => {
    if (val.actionType === 'custom' && !val.customLabel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customLabel'],
        message: 'customLabel is required when actionType is "custom"',
      });
    }
  });
export type JournalEntryCreateRequest = z.infer<typeof JournalEntryCreateRequestSchema>;

export const JournalEntryUpdateRequestSchema = z.object({
  plantId: UlidSchema.nullish(),
  occurredOn: IsoDateSchema.optional(),
  actionType: ActionTypeSchema.optional(),
  customLabel: z.string().min(1).max(120).nullish(),
  notes: z.string().max(10_000).nullish(),
});
export type JournalEntryUpdateRequest = z.infer<typeof JournalEntryUpdateRequestSchema>;

export const JournalListQuerySchema = z.object({
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
  plantId: UlidSchema.optional(),
  actionType: ActionTypeSchema.optional(),
});
export type JournalListQuery = z.infer<typeof JournalListQuerySchema>;
