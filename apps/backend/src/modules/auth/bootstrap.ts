import type { Db } from '../../db/client.js';
import { ensureBootstrapInvite } from './service.js';

const BOOTSTRAP_TTL_HOURS = 24;

export async function runBootstrap(db: Db, publicUrl: string): Promise<void> {
  const result = await ensureBootstrapInvite(db, BOOTSTRAP_TTL_HOURS);
  if (!result) return;
  const url = `${publicUrl.replace(/\/$/, '')}/register?invite=${result.token}`;
  // eslint-disable-next-line no-console
  console.log(
    [
      '',
      '====================================================================',
      '  Garden Guide bootstrap',
      '  No users exist yet. Register the first admin with this token:',
      '',
      `  BOOTSTRAP_TOKEN=${result.token}`,
      `  Register at: ${url}`,
      `  Expires at:  ${result.expiresAt}`,
      '====================================================================',
      '',
    ].join('\n'),
  );
}
