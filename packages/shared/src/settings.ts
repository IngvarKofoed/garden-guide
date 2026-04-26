import { z } from 'zod';

export const GARDEN_CONTEXT_MAX_LENGTH = 4_000;

export const GardenContextSchema = z.object({
  context: z.string(),
});
export type GardenContext = z.infer<typeof GardenContextSchema>;

export const GardenContextUpdateRequestSchema = z.object({
  context: z.string().max(GARDEN_CONTEXT_MAX_LENGTH),
});
export type GardenContextUpdateRequest = z.infer<typeof GardenContextUpdateRequestSchema>;
