import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { Db } from './client.js';

const here = dirname(fileURLToPath(import.meta.url));

export function runMigrations(db: Db): void {
  migrate(db, { migrationsFolder: resolve(here, 'migrations') });
}
