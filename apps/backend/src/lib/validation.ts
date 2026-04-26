import type { z } from 'zod';
import { ValidationError } from './errors.js';

export function parseBody<S extends z.ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid request body', result.error.issues);
  }
  return result.data;
}

export function parseQuery<S extends z.ZodTypeAny>(schema: S, query: unknown): z.infer<S> {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new ValidationError('Invalid query parameters', result.error.issues);
  }
  return result.data;
}
