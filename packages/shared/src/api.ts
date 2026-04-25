import { z } from 'zod';

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
});
export type Health = z.infer<typeof HealthSchema>;
