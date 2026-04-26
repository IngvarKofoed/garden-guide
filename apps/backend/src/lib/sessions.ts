import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { sessions, users } from '../db/schema.js';
import type { Db } from '../db/client.js';
import { newId } from './ids.js';

export const SESSION_COOKIE = 'gg_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export async function createSession(db: Db, userId: string): Promise<string> {
  const id = newId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.insert(sessions).values({
    id,
    userId,
    expiresAt,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function loadSessionUser(db: Db, sessionId: string): Promise<SessionUser | null> {
  const row = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      isAdmin: users.isAdmin,
      sessionId: sessions.id,
      sessionExpiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sessionId))
    .limit(1);
  const found = row[0];
  if (!found) return null;
  if (new Date(found.sessionExpiresAt).getTime() < Date.now()) return null;
  return {
    id: found.id,
    email: found.email,
    displayName: found.displayName,
    isAdmin: found.isAdmin,
  };
}

export async function renewSession(db: Db, sessionId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, sessionId));
}

export async function deleteSession(db: Db, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export interface SessionCookieOptions {
  publicUrl: string;
}

export function setSessionCookie(
  reply: FastifyReply,
  sessionId: string,
  opts: SessionCookieOptions,
): void {
  const isHttps = opts.publicUrl.startsWith('https://');
  reply.setCookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function readSessionCookie(request: FastifyRequest): string | null {
  return request.cookies[SESSION_COOKIE] ?? null;
}
