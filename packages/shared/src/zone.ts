import { z } from 'zod';
import { IsoTimestampSchema, UlidSchema } from './dates.js';

export const ZoneKindSchema = z.enum(['area', 'structure']);
export type ZoneKind = z.infer<typeof ZoneKindSchema>;

export const ZoneColorTokenSchema = z.enum([
  'moss',
  'fern',
  'olive',
  'pine',
  'terracotta',
  'sand',
  'dusty-rose',
  'lavender',
  'slate',
  'charcoal',
  'stone',
]);
export type ZoneColorToken = z.infer<typeof ZoneColorTokenSchema>;

export const ZONE_AREA_TOKENS = [
  'moss',
  'fern',
  'olive',
  'pine',
  'terracotta',
  'sand',
  'dusty-rose',
  'lavender',
] as const satisfies readonly ZoneColorToken[];

export const ZONE_STRUCTURE_TOKENS = [
  'slate',
  'charcoal',
  'stone',
] as const satisfies readonly ZoneColorToken[];

export const ZoneSchema = z.object({
  id: UlidSchema,
  name: z.string().min(1).max(80),
  description: z.string().nullable(),
  kind: ZoneKindSchema,
  colorToken: ZoneColorTokenSchema,
  createdAt: IsoTimestampSchema,
});
export type Zone = z.infer<typeof ZoneSchema>;

export const ZoneCreateRequestSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(2000).nullish(),
  kind: ZoneKindSchema.optional(),
  colorToken: ZoneColorTokenSchema.optional(),
});
export type ZoneCreateRequest = z.infer<typeof ZoneCreateRequestSchema>;

export const ZoneUpdateRequestSchema = ZoneCreateRequestSchema.partial();
export type ZoneUpdateRequest = z.infer<typeof ZoneUpdateRequestSchema>;
