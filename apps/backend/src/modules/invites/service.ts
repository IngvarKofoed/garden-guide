import { desc, eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { invites } from '../../db/schema.js';
import { NotFoundError } from '../../lib/errors.js';
import { generateOpaqueToken } from '../../lib/sessions.js';

export interface CreateInviteInput {
  email: string | null | undefined;
  expiresInHours: number;
}

export interface InviteRow {
  token: string;
  email: string | null;
  expiresAt: string;
  consumedAt: string | null;
}

export async function createInvite(db: Db, input: CreateInviteInput): Promise<InviteRow> {
  const token = generateOpaqueToken(32);
  const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000).toISOString();
  const row = {
    token,
    email: input.email ?? null,
    expiresAt,
    consumedAt: null,
  } as const;
  await db.insert(invites).values(row);
  return row;
}

export async function listInvites(db: Db): Promise<InviteRow[]> {
  return db.select().from(invites).orderBy(desc(invites.expiresAt));
}

export async function deleteInvite(db: Db, token: string): Promise<void> {
  const found = await db.select().from(invites).where(eq(invites.token, token)).limit(1);
  if (found.length === 0) throw new NotFoundError('Invite not found');
  await db.delete(invites).where(eq(invites.token, token));
}
