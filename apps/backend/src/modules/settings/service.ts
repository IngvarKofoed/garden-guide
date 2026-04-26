import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { settings } from '../../db/schema.js';

const GARDEN_CONTEXT_KEY = 'garden_context';

export async function getGardenContext(db: Db): Promise<string> {
  const row = await db
    .select()
    .from(settings)
    .where(eq(settings.key, GARDEN_CONTEXT_KEY))
    .limit(1);
  return row[0]?.value ?? '';
}

export async function setGardenContext(db: Db, value: string): Promise<string> {
  const updatedAt = new Date().toISOString();
  const trimmed = value.trim();
  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.key, GARDEN_CONTEXT_KEY))
    .limit(1);
  if (existing[0]) {
    await db
      .update(settings)
      .set({ value: trimmed, updatedAt })
      .where(eq(settings.key, GARDEN_CONTEXT_KEY));
  } else {
    await db.insert(settings).values({
      key: GARDEN_CONTEXT_KEY,
      value: trimmed,
      updatedAt,
    });
  }
  return trimmed;
}
