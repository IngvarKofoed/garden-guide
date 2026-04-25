import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './server.js';
import { createDb } from './db/client.js';
import type { Config } from './config.js';

describe('server', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const config: Config = {
      NODE_ENV: 'test',
      PORT: 0,
      LOG_LEVEL: 'fatal',
      DATABASE_PATH: ':memory:',
      PHOTO_DIR: '/tmp/garden-guide-test-photos',
      SESSION_SECRET: 'test-secret-test-secret-test-secret-1234',
      PUBLIC_URL: 'http://localhost:3000',
      ANTHROPIC_API_KEY: 'sk-test',
      VAPID_PUBLIC_KEY: 'vapid-public',
      VAPID_PRIVATE_KEY: 'vapid-private',
    };
    const db = createDb(':memory:');
    app = await buildServer({ config, db });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /healthz returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  it('GET /api/v1/ping returns pong', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/ping' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ pong: true });
  });
});
