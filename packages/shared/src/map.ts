import { z } from 'zod';
import { IsoTimestampSchema, UlidSchema } from './dates.js';

export const MAP_DEFAULT_WIDTH = 100;
export const MAP_DEFAULT_HEIGHT = 100;
export const MAP_MIN_DIMENSION = 10;
export const MAP_MAX_DIMENSION = 400;

const DimensionSchema = z
  .number()
  .int()
  .min(MAP_MIN_DIMENSION)
  .max(MAP_MAX_DIMENSION);

// `cells` is a base64-encoded little-endian Uint16Array of length width*height.
// Each entry: 0 = empty cell; k > 0 = zoneIndex[k - 1].
export const GardenMapSchema = z.object({
  width: DimensionSchema,
  height: DimensionSchema,
  cells: z.string(),
  zoneIndex: z.array(UlidSchema),
  updatedAt: IsoTimestampSchema,
});
export type GardenMap = z.infer<typeof GardenMapSchema>;

export const GardenMapPutRequestSchema = GardenMapSchema.omit({ updatedAt: true });
export type GardenMapPutRequest = z.infer<typeof GardenMapPutRequestSchema>;

export const MapAnchorSchema = z.enum([
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
]);
export type MapAnchor = z.infer<typeof MapAnchorSchema>;

export const GardenMapCanvasPatchRequestSchema = z
  .object({
    width: DimensionSchema.optional(),
    height: DimensionSchema.optional(),
    anchor: MapAnchorSchema.default('center'),
  })
  .refine((v) => v.width !== undefined || v.height !== undefined, {
    message: 'At least one of width or height is required',
  });
export type GardenMapCanvasPatchRequest = z.infer<typeof GardenMapCanvasPatchRequestSchema>;
