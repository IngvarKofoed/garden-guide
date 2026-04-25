import { z } from 'zod';
import { IsoTimestampSchema, UlidSchema } from './dates.js';

export const UserSchema = z.object({
  id: UlidSchema,
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
  isAdmin: z.boolean(),
  createdAt: IsoTimestampSchema,
});
export type User = z.infer<typeof UserSchema>;

export const InviteSchema = z.object({
  token: z.string().min(16),
  email: z.string().email().nullable(),
  expiresAt: IsoTimestampSchema,
  consumedAt: IsoTimestampSchema.nullable(),
});
export type Invite = z.infer<typeof InviteSchema>;

export const RegisterRequestSchema = z.object({
  inviteToken: z.string().min(16),
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8).max(256),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
