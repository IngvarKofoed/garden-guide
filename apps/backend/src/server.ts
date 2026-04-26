import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import type { FastifyError, FastifyServerOptions } from 'fastify';
import type { Config } from './config.js';
import type { Db } from './db/client.js';
import { attachSession } from './lib/auth-hooks.js';
import { HttpError } from './lib/errors.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { registerInviteRoutes } from './modules/invites/routes.js';
import { registerPlantRoutes } from './modules/plants/routes.js';
import { registerZoneRoutes } from './modules/zones/routes.js';

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

  await app.register(cookie, {
    secret: deps.config.SESSION_SECRET,
    parseOptions: {},
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

  return app;
}

export type AppServer = Awaited<ReturnType<typeof buildServer>>;

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    db: Db;
  }
}
