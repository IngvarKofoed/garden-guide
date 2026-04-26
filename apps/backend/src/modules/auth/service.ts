import { and, count, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { invites, users } from '../../db/schema.js';
import { ConflictError, InviteInvalidError, LoginFailedError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';
import { hashPassword, verifyPassword } from '../../lib/passwords.js';
import { generateOpaqueToken } from '../../lib/sessions.js';

export interface RegisterInput {
  inviteToken: string;
  email: string;
  displayName: string;
  password: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

export async function register(db: Db, input: RegisterInput): Promise<RegisteredUser> {
  const now = new Date();
  const nowIso = now.toISOString();

  // Check invite validity up front (cheap fail).
  const inviteRow = await db
    .select()
    .from(invites)
    .where(eq(invites.token, input.inviteToken))
    .limit(1);
  const invite = inviteRow[0];
  if (!invite) throw new InviteInvalidError();
  if (invite.consumedAt !== null) throw new InviteInvalidError();
  if (new Date(invite.expiresAt).getTime() < now.getTime()) throw new InviteInvalidError();

  const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing.length > 0) throw new ConflictError('Email already registered');

  const userCount = await db.select({ c: count() }).from(users);
  const isFirstUser = (userCount[0]?.c ?? 0) === 0;

  const passwordHash = await hashPassword(input.password);
  const userId = newId();

  // Atomically consume the invite — the WHERE clause ensures we win the race
  // if two requests redeem the same invite simultaneously.
  const consume = await db
    .update(invites)
    .set({ consumedAt: nowIso })
    .where(and(eq(invites.token, input.inviteToken), isNull(invites.consumedAt)));
  if (consume.changes === 0) throw new InviteInvalidError();

  await db.insert(users).values({
    id: userId,
    email: input.email,
    displayName: input.displayName,
    passwordHash,
    isAdmin: isFirstUser,
    createdAt: nowIso,
  });

  return {
    id: userId,
    email: input.email,
    displayName: input.displayName,
    isAdmin: isFirstUser,
  };
}

export async function authenticate(
  db: Db,
  email: string,
  password: string,
): Promise<RegisteredUser> {
  const row = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = row[0];
  if (!user) {
    // Run a dummy verify to keep timing roughly equal between found/not-found.
    await verifyPassword(
      '$argon2id$v=19$m=65536,t=3,p=4$ZHVtbXl2YWx1ZWR1bW15$aWdub3JlbWVjb21wbGV0ZWx5aWdub3JlbWVj',
      password,
    );
    throw new LoginFailedError();
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) throw new LoginFailedError();
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isAdmin: user.isAdmin,
  };
}

export async function ensureBootstrapInvite(
  db: Db,
  ttlHours: number,
): Promise<{ token: string; expiresAt: string } | null> {
  const userCount = await db.select({ c: count() }).from(users);
  if ((userCount[0]?.c ?? 0) > 0) return null;

  const now = new Date();
  // Drop any stale unconsumed invites — only one bootstrap token at a time.
  await db.delete(invites).where(sql`${invites.consumedAt} IS NULL`);

  const token = generateOpaqueToken(32);
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString();
  await db.insert(invites).values({
    token,
    email: null,
    expiresAt,
    consumedAt: null,
  });
  return { token, expiresAt };
}
