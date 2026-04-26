# Backend — Garden Guide

Fastify + Drizzle + better-sqlite3 server. Hosts the REST API at `/api/v1`, serves the frontend bundle, runs the notification scheduler.

> Full design: [/docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md). Domain concepts: [/docs/CONCEPT.md](../../docs/CONCEPT.md). This file documents the *target* setup — scaffolding hasn't run yet.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install workspace deps (run at repo root) |
| `pnpm --filter @garden-guide/backend dev` | Watch mode via `tsx` |
| `pnpm --filter @garden-guide/backend build` | TypeScript build to `dist/` |
| `pnpm --filter @garden-guide/backend test` | Vitest (unit + integration) |
| `pnpm --filter @garden-guide/backend db:generate` | Drizzle: emit migration from schema diff |
| `pnpm --filter @garden-guide/backend db:migrate` | Apply pending migrations |

## Architecture

```
src/
  index.ts            # entrypoint
  server.ts           # Fastify setup + plugins
  config.ts           # env parsing (Zod) — fails fast on invalid env
  db/
    schema.ts         # Drizzle table defs (source of truth for SQL)
    client.ts         # better-sqlite3 + drizzle handle
    migrations/       # generated SQL migrations — commit these
  modules/<domain>/   # one folder per domain: routes + service + tests
  scheduler/          # in-process node-cron, single runner
  lib/                # logger (pino), errors, ids (ulid)
```

Domains: `auth`, `users`, `invites`, `zones`, `plants`, `photos`, `tasks`, `journal`, `notifications`, `ai`.

## Key conventions

- **Zod schemas live in `@garden-guide/shared`**, not here. Import them; don't redeclare.
- **No audit columns** anywhere — no `created_by`, no `updated_by`, no edit history. The single exception is `journal_entries.created_by`, kept for user-facing attribution per CONCEPT.md.
- **Recurring tasks use `MM-S` month slots** (`recur_start_slot`, `recur_end_slot`) where S = 1 early / 2 mid / 3 late — year-agnostic. The calendar service expands them to concrete day ranges per year. Don't materialize per-year rows.
- **AI suggestion endpoints don't write to the DB.** They generate; the user accepts; the *create* routes persist them.
- **LLM provider is pluggable.** Routes and services depend on the `LLMProvider` interface in `src/modules/ai/provider.ts`, never on a vendor SDK directly. New providers go in `src/modules/ai/providers/`. Selection via `LLM_PROVIDER` env (default `openai`).
- **Tests use a real SQLite** (`:memory:` or temp file), never mocks. Migrations run before each suite.
- **No job queue.** Single in-process `node-cron`. Idempotency for recurring notifications via `notification_log` keyed by `(care_task_id, year)`.
- **Photos served behind auth** through Fastify routes — never expose `data/photos/` as a static mount.

## Environment

Validated by `config.ts` at boot — server refuses to start if any are missing or malformed:

- `DATABASE_PATH`, `PHOTO_DIR`
- `SESSION_SECRET`
- `PUBLIC_URL`
- `LLM_PROVIDER` (default `openai`), `LLM_MODEL` (optional)
- `OPENAI_API_KEY` (required when `LLM_PROVIDER=openai`)
- `ANTHROPIC_API_KEY` (required when `LLM_PROVIDER=anthropic`)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- `LOG_LEVEL` (default `info`), `PORT` (default `3000`)

## Gotchas

- SQLite stores timestamps as ISO-8601 `TEXT`, not `INTEGER`. Parse with `date-fns`.
- IDs are ULIDs (`text PRIMARY KEY`), generated server-side, never autoincrement.
- `action_type` is a `TEXT CHECK` enum: `prune | fertilize | water | plant | transplant | harvest | sow | mulch | treat | inspect | custom`. Adding a value requires a migration *and* a `@garden-guide/shared` update.
- First run: bootstrap admin token is printed to stdout when `users` is empty. Capture it from logs.
- Cookie sessions use `SameSite=Lax` + double-submit CSRF token on state-changing requests. Don't switch to `SameSite=None` without re-thinking CSRF.

## When to invoke skills

- **`claude-api`** — only when implementing or editing the Anthropic provider (`src/modules/ai/providers/anthropic.ts`). The default provider is OpenAI; the skill auto-skips OpenAI files.
- **`security-review`** — before merging changes to auth, sessions, password handling, or invite flow.
- **`simplify`** — after a non-trivial implementation, to catch over-abstraction and dead helpers.
