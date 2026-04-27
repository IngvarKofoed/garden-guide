import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import type { FastifyError, FastifyServerOptions } from 'fastify';
import type { Config } from './config.js';
import type { Db } from './db/client.js';
import { attachSession } from './lib/auth-hooks.js';
import { HttpError } from './lib/errors.js';
import { registerAiRoutes } from './modules/ai/routes.js';
import type { LLMProvider } from './modules/ai/provider.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { registerCalendarRoutes } from './modules/calendar/routes.js';
import { registerInviteRoutes } from './modules/invites/routes.js';
import { registerJournalRoutes } from './modules/journal/routes.js';
import { registerPhotoRoutes } from './modules/photos/routes.js';
import { registerPlantRoutes } from './modules/plants/routes.js';
import { registerSettingsRoutes } from './modules/settings/routes.js';
import { registerTaskRoutes } from './modules/tasks/routes.js';
import { registerZoneRoutes } from './modules/zones/routes.js';

export interface AppDeps {
  config: Config;
  db: Db;
  llm: LLMProvider;
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
  app.decorate('llm', deps.llm);

  await app.register(cookie, {
    secret: deps.config.SESSION_SECRET,
    parseOptions: {},
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
      files: 1,
    },
  });

  app.addHook('preHandler', attachSession);

  app.setErrorHandler((err: FastifyError, request, reply) => {
    if (err instanceof HttpError) {
      reply.code(err.statusCode);
      return reply.send({
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    if (err.validation) {
      reply.code(400);
      return reply.send({
        error: { code: 'VALIDATION_ERROR', message: err.message, details: err.validation },
      });
    }
    request.log.error({ err }, 'unhandled error');
    reply.code(500);
    return reply.send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  app.get('/healthz', async () => ({
    status: 'ok' as const,
    version: process.env.npm_package_version ?? '0.0.0',
  }));

  app.get('/api/v1/ping', async () => ({ pong: true }));

  await registerAuthRoutes(app);
  await registerInviteRoutes(app);
  await registerZoneRoutes(app);
  await registerPlantRoutes(app);
  await registerTaskRoutes(app);
  await registerCalendarRoutes(app);
  await registerJournalRoutes(app);
  await registerPhotoRoutes(app);
  await registerSettingsRoutes(app);
  await registerAiRoutes(app);

  return app;
}

export type AppServer = Awaited<ReturnType<typeof buildServer>>;

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    db: Db;
    llm: LLMProvider;
  }
}
