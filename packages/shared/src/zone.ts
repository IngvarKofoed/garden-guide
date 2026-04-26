import { z } from 'zod';
import { IsoTimestampSchema, UlidSchema } from './dates.js';

export const ZoneSchema = z.object({
  id: UlidSchema,
  name: z.string().min(1).max(80),
  description: z.string().nullable(),
  createdAt: IsoTimestampSchema,
});
export type Zone = z.infer<typeof ZoneSchema>;

export const ZoneCreateRequestSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(2000).nullish(),
});
export type ZoneCreateRequest = z.infer<typeof ZoneCreateRequestSchema>;

export const ZoneUpdateRequestSchema = ZoneCreateRequestSchema.partial();
export type ZoneUpdateRequest = z.infer<typeof ZoneUpdateRequestSchema>;
