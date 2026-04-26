import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Config } from './config.js';
import { createDb, type Db } from './db/client.js';
import { runMigrations } from './db/run-migrations.js';
import type { LLMProvider } from './modules/ai/provider.js';
import { buildServer, type AppServer } from './server.js';

export interface TestApp {
  app: AppServer;
  db: Db;
  config: Config;
  llm: LLMProvider;
  close: () => Promise<void>;
}

export interface BuildTestAppOptions {
  llm?: LLMProvider;
}

export async function buildTestApp(opts: BuildTestAppOptions = {}): Promise<TestApp> {
  const photoDir = mkdtempSync(join(tmpdir(), 'gg-test-photos-'));
  const config: Config = {
    NODE_ENV: 'test',
    PORT: 0,
    LOG_LEVEL: 'fatal',
    DATABASE_PATH: ':memory:',
    PHOTO_DIR: photoDir,
    SESSION_SECRET: 'test-secret-test-secret-test-secret-1234',
    PUBLIC_URL: 'http://localhost:3000',
    LLM_PROVIDER: 'openai',
    LLM_MODEL: undefined,
    OPENAI_API_KEY: 'sk-test',
    ANTHROPIC_API_KEY: undefined,
    VAPID_PUBLIC_KEY: 'vapid-public',
    VAPID_PRIVATE_KEY: 'vapid-private',
  };
  const db = createDb(':memory:');
  runMigrations(db);
  const llm = opts.llm ?? createThrowingLLM();
  const app = await buildServer({ config, db, llm });
  await app.ready();
  return {
    app,
    db,
    config,
    llm,
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

function createThrowingLLM(): LLMProvider {
  const fail = () => {
    throw new Error(
      'Test LLM provider was called without an override. Pass `llm` to buildTestApp.',
    );
  };
  return {
    info: { name: 'openai', model: 'test-fake' },
    identifyPlant: fail,
    generateCarePlan: fail,
    refineCarePlan: fail,
    describePlant: fail,
    generatePlantIcon: fail,
  };
}
