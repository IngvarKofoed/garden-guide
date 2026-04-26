import { z } from 'zod';
import { IsoTimestampSchema, UlidSchema } from './dates.js';

export const PlantSchema = z.object({
  id: UlidSchema,
  name: z.string().min(1).max(120),
  species: z.string().max(160).nullable(),
  zoneId: UlidSchema.nullable(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  iconPhotoId: UlidSchema.nullable(),
  iconDraftPhotoId: UlidSchema.nullable(),
  archivedAt: IsoTimestampSchema.nullable(),
  createdAt: IsoTimestampSchema,
});
export type Plant = z.infer<typeof PlantSchema>;

export const PlantPhotoSchema = z.object({
  id: UlidSchema,
  plantId: UlidSchema,
  filePath: z.string().min(1),
  takenAt: IsoTimestampSchema.nullable(),
  caption: z.string().nullable(),
  createdAt: IsoTimestampSchema,
});
export type PlantPhoto = z.infer<typeof PlantPhotoSchema>;

export const PlantCreateRequestSchema = z.object({
  name: z.string().min(1).max(120),
  species: z.string().max(160).nullish(),
  zoneId: UlidSchema.nullish(),
  description: z.string().max(4_000).nullish(),
  notes: z.string().max(10_000).nullish(),
});
export type PlantCreateRequest = z.infer<typeof PlantCreateRequestSchema>;

export const PlantUpdateRequestSchema = PlantCreateRequestSchema.partial();
export type PlantUpdateRequest = z.infer<typeof PlantUpdateRequestSchema>;

export const PlantListQuerySchema = z.object({
  zoneId: UlidSchema.nullish(),
  q: z.string().max(120).nullish(),
  archived: z
    .union([z.literal('true'), z.literal('false'), z.literal('only')])
    .nullish(),
});
export type PlantListQuery = z.infer<typeof PlantListQuerySchema>;
