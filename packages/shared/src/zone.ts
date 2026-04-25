import { z } from 'zod';
import { IsoTimestampSchema, UlidSchema } from './dates.js';

export const ZoneSchema = z.object({
  id: UlidSchema,
  name: z.string().min(1).max(80),
  description: z.string().nullable(),
  createdAt: IsoTimestampSchema,
});
export type Zone = z.infer<typeof ZoneSchema>;
