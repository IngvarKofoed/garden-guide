import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { runMigrations } from './db/run-migrations.js';
import { runBootstrap } from './modules/auth/bootstrap.js';
import { buildServer } from './server.js';

async function main() {
  const config = loadConfig();

  mkdirSync(dirname(config.DATABASE_PATH), { recursive: true });
  mkdirSync(config.PHOTO_DIR, { recursive: true });

  const db = createDb(config.DATABASE_PATH);
  runMigrations(db);
  await runBootstrap(db, config.PUBLIC_URL);

  const app = await buildServer({ config, db });

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info({ port: config.PORT }, 'garden-guide server listening');
  } catch (err) {
    app.log.error({ err }, 'failed to start server');
    process.exit(1);
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, async () => {
      app.log.info({ signal }, 'shutting down');
      await app.close();
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
