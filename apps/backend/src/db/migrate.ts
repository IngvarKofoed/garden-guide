import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const databasePath = process.env.DATABASE_PATH ?? './data/garden-guide.db';
mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite);
migrate(db, { migrationsFolder: './src/db/migrations' });

console.log(`Migrations applied to ${databasePath}`);
sqlite.close();
