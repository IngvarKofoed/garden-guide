import Fastify from 'fastify';
import type { FastifyServerOptions } from 'fastify';
import type { Config } from './config.js';
import type { Db } from './db/client.js';

export interface AppDeps {
  config: Config;
  db: Db;
}

function buildLoggerOptions(config: Config): FastifyServerOptions['logger'] {
  if (config.NODE_ENV === 'production') {
    return { level: config.LOG_LEVEL };
  }
  return {
    level: config.LOG_LEVEL,
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
    },
  };
}

export async function buildServer(deps: AppDeps) {
  const app = Fastify({
    logger: buildLoggerOptions(deps.config),
    disableRequestLogging: false,
    trustProxy: true,
  });

  app.decorate('config', deps.config);
  app.decorate('db', deps.db);

  app.get('/healthz', async () => ({
    status: 'ok' as const,
    version: process.env.npm_package_version ?? '0.0.0',
  }));

  app.get('/api/v1/ping', async () => ({ pong: true }));

  return app;
}

export type AppServer = Awaited<ReturnType<typeof buildServer>>;

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    db: Db;
  }
}
