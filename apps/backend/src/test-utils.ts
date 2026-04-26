import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Config } from './config.js';
import { createDb, type Db } from './db/client.js';
import { runMigrations } from './db/run-migrations.js';
import { buildServer, type AppServer } from './server.js';

export interface TestApp {
  app: AppServer;
  db: Db;
  config: Config;
  close: () => Promise<void>;
}

export async function buildTestApp(): Promise<TestApp> {
  const photoDir = mkdtempSync(join(tmpdir(), 'gg-test-photos-'));
  const config: Config = {
    NODE_ENV: 'test',
    PORT: 0,
    LOG_LEVEL: 'fatal',
    DATABASE_PATH: ':memory:',
    PHOTO_DIR: photoDir,
    SESSION_SECRET: 'test-secret-test-secret-test-secret-1234',
    PUBLIC_URL: 'http://localhost:3000',
    ANTHROPIC_API_KEY: 'sk-test',
    VAPID_PUBLIC_KEY: 'vapid-public',
    VAPID_PRIVATE_KEY: 'vapid-private',
  };
  const db = createDb(':memory:');
  runMigrations(db);
  const app = await buildServer({ config, db });
  await app.ready();
  return {
    app,
    db,
    config,
    close: async () => {
      await app.close();
    },
  };
}

export function sessionCookieFromResponse(headers: Record<string, unknown>): string | null {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of cookies) {
    const [pair] = String(c).split(';');
    if (pair?.startsWith('gg_session=')) return pair;
  }
  return null;
}
