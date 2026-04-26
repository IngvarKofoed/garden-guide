import { z } from 'zod';
import { UlidSchema } from './dates.js';
import { MonthSlotSchema, YearSlotSchema } from './slots.js';
import { ActionTypeSchema } from './task.js';

export const IdentifyPlantRequestSchema = z
  .object({
    name: z.string().min(1).max(120).nullish(),
    photoId: UlidSchema.nullish(),
  })
  .refine((v) => Boolean(v.name) || Boolean(v.photoId), {
    message: 'Provide name or photoId',
  });
export type IdentifyPlantRequest = z.infer<typeof IdentifyPlantRequestSchema>;

export const PlantCandidateSchema = z.object({
  commonName: z.string().min(1).max(120),
  species: z.string().max(160).nullable(),
  confidence: z.number().min(0).max(1),
  notes: z.string().max(2_000),
});
export type PlantCandidate = z.infer<typeof PlantCandidateSchema>;

export const IdentifyPlantResponseSchema = z.object({
  candidates: z.array(PlantCandidateSchema).min(1).max(10),
});
export type IdentifyPlantResponse = z.infer<typeof IdentifyPlantResponseSchema>;

const SuggestedRecurringSchema = z.object({
  kind: z.literal('recurring'),
  actionType: ActionTypeSchema,
  customLabel: z.string().min(1).max(120).nullish(),
  recurStartSlot: MonthSlotSchema,
  recurEndSlot: MonthSlotSchema,
  rationale: z.string().min(1).max(2_000),
});

const SuggestedOneOffSchema = z.object({
  kind: z.literal('one_off'),
  actionType: ActionTypeSchema,
  customLabel: z.string().min(1).max(120).nullish(),
  dueSlot: YearSlotSchema,
  rationale: z.string().min(1).max(2_000),
});

export const SuggestedTaskSchema = z.discriminatedUnion('kind', [
  SuggestedRecurringSchema,
  SuggestedOneOffSchema,
]);
export type SuggestedTask = z.infer<typeof SuggestedTaskSchema>;

export const CarePlanRequestSchema = z.object({ plantId: UlidSchema });
export type CarePlanRequest = z.infer<typeof CarePlanRequestSchema>;

export const CarePlanResponseSchema = z.object({
  tasks: z.array(SuggestedTaskSchema).max(50),
});
export type CarePlanResponse = z.infer<typeof CarePlanResponseSchema>;

export const RefineCarePlanRequestSchema = z.object({
  plantId: UlidSchema,
  question: z.string().min(1).max(2_000),
});
export type RefineCarePlanRequest = z.infer<typeof RefineCarePlanRequestSchema>;

export const RefineCarePlanResponseSchema = z.object({
  tasks: z.array(SuggestedTaskSchema).max(50),
  explanation: z.string().min(1).max(4_000),
});
export type RefineCarePlanResponse = z.infer<typeof RefineCarePlanResponseSchema>;

export const PlantDescriptionRequestSchema = z.object({
  plantId: UlidSchema,
});
export type PlantDescriptionRequest = z.infer<typeof PlantDescriptionRequestSchema>;

export const PlantDescriptionResponseSchema = z.object({
  description: z.string().min(1).max(4_000),
});
export type PlantDescriptionResponse = z.infer<typeof PlantDescriptionResponseSchema>;

// Internal LLM contract used by the photos service when it generates icon
// drafts. Not a wire shape — the frontend talks to /plants/:id/icon/draft/*
// and never sees the raw bytes.
export const PlantIconResponseSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
});
export type PlantIconResponse = z.infer<typeof PlantIconResponseSchema>;
