import { z } from 'zod';
import { IsoTimestampSchema, UlidSchema } from './dates.js';

export const PlantSchema = z.object({
  id: UlidSchema,
  name: z.string().min(1).max(120),
  species: z.string().max(160).nullable(),
  zoneId: UlidSchema.nullable(),
  notes: z.string().nullable(),
  hardinessZone: z.string().max(16).nullable(),
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
