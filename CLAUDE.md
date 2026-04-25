# Garden Guide

Self-hosted, single-instance web app: a private gardening guide with plants, zones, recurring/one-off care tasks, journal, calendar views, and scoped LLM assistance. One shared garden per instance, multiple users, invite-only registration.

> **Read first:** [docs/CONCEPT.md](docs/CONCEPT.md) for product scope. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for tech stack, data model, API, deployment.
>
> **Status:** docs + folder layout in place; no code scaffolded yet.

## Repo layout

```
apps/
  backend/        # Fastify + Drizzle + better-sqlite3
  frontend/       # Vite + React SPA
packages/
  shared/         # Zod schemas + inferred types
e2e/              # Playwright against a Dockerized instance
docs/             # CONCEPT.md, ARCHITECTURE.md
data/             # runtime: SQLite + photos (gitignored)
```

Each top-level folder above has its own `CLAUDE.md` — read it when working in that folder:

- [apps/backend/CLAUDE.md](apps/backend/CLAUDE.md)
- [apps/frontend/CLAUDE.md](apps/frontend/CLAUDE.md)
- [packages/shared/CLAUDE.md](packages/shared/CLAUDE.md)
- [e2e/CLAUDE.md](e2e/CLAUDE.md)

## Stack at a glance

Node.js + TypeScript everywhere · pnpm workspaces · Fastify · Drizzle ORM · SQLite (`better-sqlite3`) · React + Vite · Tailwind · TanStack Query · React Router (data router) · Zod · Anthropic SDK · Web Push (VAPID) · Playwright · Vitest.

## Workspace commands

Run from the repo root:

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Backend + frontend dev servers in parallel |
| `pnpm build` | Build backend, frontend, shared |
| `pnpm test` | Vitest across all packages |
| `pnpm lint` | ESLint + Prettier across the monorepo |
| `pnpm typecheck` | `tsc --noEmit` across all packages |
| `pnpm e2e` | Playwright suite (boots Dockerized instance) |
| `pnpm db:migrate` | Apply backend SQL migrations |

Per-package commands use `pnpm --filter <name>` — see the relevant sub-`CLAUDE.md`.

## Cross-cutting conventions

- **One language, one source of truth for shapes.** All cross-network types are Zod schemas in `@garden-guide/shared`. Backend validates incoming requests with them; frontend validates forms with them.
- **No audit columns.** Database tables don't track `created_by`/`updated_by`/edits. The single exception is `journal_entries.created_by` (user-facing attribution).
- **Recurring care tasks store `MM-DD`**, not full dates. The server expands them into the requested calendar window on read.
- **Tests use real SQLite**, never mocks of our own database or backend.
- **Self-hosted operator backs up `data/`.** No in-app backup wizard; export endpoint streams JSON + photos for portability.

## When to invoke skills

| Skill | When |
|-------|------|
| `claude-api` | Editing code under `apps/backend/src/modules/ai/**` (Anthropic SDK calls). |
| `frontend-design` | Building or restyling UI in `apps/frontend/`. |
| `security-review` | Before merging changes to auth, sessions, invites, password handling. |
| `simplify` | After a non-trivial implementation, to catch over-abstraction. |
| `review` | When asked to review a PR. |

## Gotchas

- The repo uses a **local git config** (`user.name = Martin Ingvar Kofoed Jensen`, `user.email = ingvar@netaben.dk`) that differs from global. Don't run `git config --global` here.
- The `data/` directory is the source of truth at runtime — SQLite file + photo archive. Back it up as a unit. Never commit `data/` to git.
- Bootstrap admin: on first start with an empty `users` table, the backend prints a one-time token to stdout. Capture it from the container logs.
- Action types are an enum tracked in **three** places — `@garden-guide/shared`, the backend `CHECK` constraint, and frontend selects. Adding a value means updating all three.
