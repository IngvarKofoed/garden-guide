import { z } from 'zod';

// Treat empty strings as "unset" — shells (and our dev script) often export
// `FOO=""` which would otherwise fail min(1) before .optional() short-circuits.
const optionalNonEmptyString = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().min(1).optional(),
);

const ConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DATABASE_PATH: z.string().min(1),
    PHOTO_DIR: z.string().min(1),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    PUBLIC_URL: z.string().url(),
    LLM_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
    LLM_MODEL: optionalNonEmptyString,
    OPENAI_API_KEY: optionalNonEmptyString,
    ANTHROPIC_API_KEY: optionalNonEmptyString,
    VAPID_PUBLIC_KEY: z.string().min(1),
    VAPID_PRIVATE_KEY: z.string().min(1),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.LLM_PROVIDER === 'openai' && !cfg.OPENAI_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        message: 'OPENAI_API_KEY is required when LLM_PROVIDER=openai',
        path: ['OPENAI_API_KEY'],
      });
    }
    if (cfg.LLM_PROVIDER === 'anthropic' && !cfg.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        message: 'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic',
        path: ['ANTHROPIC_API_KEY'],
      });
    }
  });

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
