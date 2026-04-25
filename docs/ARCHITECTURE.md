# Architecture

Companion to [CONCEPT.md](./CONCEPT.md). Defines the technical shape of Garden Guide: stack, data model, API, auth, deployment, and the cross-cutting concerns that don't belong in concept-level docs.

## Overview

Garden Guide is a self-hosted, single-instance web app. One process serves a JSON HTTP API and the static frontend bundle, talks to a local SQLite database, stores photos on the local filesystem, and calls out to an LLM provider for plant identification and care-plan suggestions.

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (responsive SPA)                                    │
│  ─ React + Vite + React Router                               │
│  ─ Tailwind, TanStack Query, date-fns                        │
└───────────────┬──────────────────────────────────────────────┘
                │ HTTPS, cookie session
┌───────────────▼──────────────────────────────────────────────┐
│  Garden Guide server (Node.js + TypeScript + Fastify)        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │ REST API   │  │ Static UI  │  │ Scheduler  │              │
│  └─────┬──────┘  └────────────┘  └─────┬──────┘              │
│        │                               │                     │
│  ┌─────▼───────────────────────────────▼──────┐              │
│  │  Service layer (plants, tasks, journal,    │              │
│  │  notifications, ai, auth)                  │              │
│  └─────┬─────────────────────┬────────────────┘              │
│        │                     │                               │
│  ┌─────▼──────┐    ┌─────────▼─────────┐    ┌────────────┐   │
│  │ SQLite     │    │ Local FS (photos) │    │ LLM client │   │
│  │ (Drizzle)  │    │                   │    │ (Anthropic)│   │
│  └────────────┘    └───────────────────┘    └─────┬──────┘   │
└────────────────────────────────────────────────────┼─────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │ Anthropic API       │
                                          └─────────────────────┘
```

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language (BE + FE) | TypeScript | Single language, shared types between server and client. |
| Backend runtime | Node.js (LTS) | Mature, boring, easy to self-host. |
| HTTP framework | Fastify | TS-first, fast, low-magic, schema-driven validation built in. |
| Database | SQLite (via `better-sqlite3`) | Right-sized for one shared garden. Single file, easy to back up. |
| ORM / query builder | Drizzle ORM | Typed schema, migrations, plain-SQL feel. |
| Frontend bundler | Vite | Fast, simple, no SSR machinery we don't need. |
| UI framework | React | Largest ecosystem, well-known. |
| Routing | React Router (data router) | Loaders/actions match the CRUD shape of this app. |
| Styling | Tailwind CSS | Calm, photo-first design without a heavy component library. |
| Server state | TanStack Query | Cache, optimistic updates, retries. |
| Forms | React Hook Form + Zod | Same Zod schemas validate on both sides. |
| Dates | date-fns | Tree-shakeable, no opinionated timezone dance. |
| LLM client | `@anthropic-ai/sdk` | Claude for plant identification (vision) and care-plan generation. |
| Notifications | Web Push (VAPID) | Browser-native, no third-party service needed. |
| Auth | Cookie sessions, Argon2id passwords | Boring, self-contained. Invite-only registration. |
| Validation | Zod | Shared between client and server via the `shared` package. |
| Testing | Vitest (unit/integration), Playwright (E2E) | Same runner everywhere. |
| Linting | ESLint + Prettier | Standard. |
| Container | Docker (single image) | One image runs API + serves UI. |

## Repository layout

A pnpm workspace monorepo. Frontend, backend, and shared types live together; they share the same TS toolchain and Zod schemas.

```
garden-guide/
├── apps/
│   ├── backend/              # Fastify server
│   │   ├── src/
│   │   │   ├── index.ts          # entrypoint
│   │   │   ├── server.ts         # Fastify setup, plugins
│   │   │   ├── config.ts         # env parsing (Zod)
│   │   │   ├── db/
│   │   │   │   ├── schema.ts     # Drizzle tables
│   │   │   │   ├── client.ts
│   │   │   │   └── migrations/
│   │   │   ├── modules/
│   │   │   │   ├── auth/         # routes + service + sessions
│   │   │   │   ├── users/
│   │   │   │   ├── invites/
│   │   │   │   ├── zones/
│   │   │   │   ├── plants/
│   │   │   │   ├── photos/
│   │   │   │   ├── tasks/        # care tasks (recurring + one-off)
│   │   │   │   ├── journal/
│   │   │   │   ├── notifications/
│   │   │   │   └── ai/           # plant id, care plan suggestions
│   │   │   ├── scheduler/        # in-process cron loop
│   │   │   └── lib/              # logger, errors, ids, etc.
│   │   └── test/
│   └── frontend/             # Vite + React SPA
│       └── src/
│           ├── main.tsx
│           ├── routes/
│           ├── features/         # one folder per domain (plants, tasks, …)
│           ├── components/       # shared UI (Calendar, PhotoStrip, …)
│           ├── lib/              # api client, hooks, utils
│           └── styles/
├── packages/
│   └── shared/               # Zod schemas + inferred TS types
│       └── src/
│           ├── plant.ts
│           ├── task.ts
│           ├── journal.ts
│           ├── zone.ts
│           ├── user.ts
│           └── api.ts        # request/response envelopes
├── e2e/                      # Playwright tests against a built instance
│   ├── tests/
│   ├── fixtures/
│   └── playwright.config.ts
├── docker/
│   └── Dockerfile
├── docs/
└── data/                     # runtime mount: sqlite db + photos (gitignored)
    ├── garden-guide.db
    └── photos/
```

## Data model

SQLite, one shared garden per instance, so there is no `garden` table — the instance *is* the garden. IDs are `TEXT` ULIDs (lexicographically sortable, generated server-side). Timestamps are stored as ISO-8601 strings; SQLite has no native timestamp type and ISO-8601 sorts correctly.

There is no audit trail: tables do not record who created or edited a row, and there is no edit history. The one exception is `journal_entries.created_by`, because CONCEPT.md mandates that journal entries are attributed to whoever wrote them — that's a product feature, not auditing.

### Action types

The same vocabulary is shared by `care_tasks.action_type` and `journal_entries.action_type`:

```ts
type ActionType =
  | 'prune'
  | 'fertilize'
  | 'water'
  | 'plant'
  | 'transplant'
  | 'harvest'
  | 'sow'
  | 'mulch'
  | 'treat'      // pest/disease
  | 'inspect'
  | 'custom'     // free-form; label is in custom_label
```

Stored as a plain `TEXT` column with a `CHECK` constraint enforcing the union. New values require a migration.

### Tables

```ts
// apps/backend/src/db/schema.ts (sketch — Drizzle SQLite syntax)

users (
  id              text pk,
  email           text unique not null,
  display_name    text not null,
  password_hash   text not null,
  is_admin        integer not null default 0,
  created_at      text not null
)

sessions (
  id              text pk,        // random opaque id, sent in cookie
  user_id         text fk -> users.id,
  expires_at      text not null,
  created_at      text not null
)

invites (
  token           text pk,        // random URL-safe token
  email           text,           // optional pre-fill
  expires_at      text not null,
  consumed_at     text            // null = still valid
)

zones (
  id              text pk,
  name            text not null,
  description     text,
  created_at      text not null
)

plants (
  id              text pk,
  name            text not null,           // common name as user uses it
  species         text,                    // optional species/cultivar
  zone_id         text fk -> zones.id,     // nullable
  notes           text,
  hardiness_zone  text,                    // microclimate override
  archived_at     text,                    // soft delete
  created_at      text not null
)

plant_photos (
  id              text pk,
  plant_id        text fk -> plants.id,
  file_path       text not null,           // relative to data/photos
  taken_at        text,                    // EXIF or user-supplied
  caption         text,
  created_at      text not null
)

care_tasks (
  id              text pk,
  plant_id        text fk -> plants.id,
  action_type     text not null,           // ActionType (see above)
  custom_label    text,                    // when action_type = 'custom'
  kind            text not null,           // 'recurring' | 'one_off'
  // recurring fields (month-day, year-agnostic)
  recur_start_md  text,                    // 'MM-DD'
  recur_end_md    text,                    // 'MM-DD'
  // one-off fields
  due_date        text,                    // 'YYYY-MM-DD'
  notes           text,
  notify          integer not null default 1,
  source          text not null,           // 'manual' | 'ai'
  ai_rationale    text,                    // shown when source = 'ai'
  created_at      text not null
)

task_completions (
  id              text pk,
  care_task_id    text fk -> care_tasks.id,
  completed_on    text not null,           // 'YYYY-MM-DD'
  // for recurring tasks: which year was completed; for one-off: completion of the task itself
  created_at      text not null
)

journal_entries (
  id              text pk,
  plant_id        text fk -> plants.id,    // nullable: free-floating entry
  occurred_on     text not null,           // 'YYYY-MM-DD'
  action_type     text not null,           // ActionType (see above)
  custom_label    text,
  notes           text,
  created_at      text not null,
  created_by      text fk -> users.id      // attribution — see CONCEPT.md
)

journal_photos (
  id              text pk,
  journal_id      text fk -> journal_entries.id,
  file_path       text not null,
  created_at      text not null
)

push_subscriptions (
  id              text pk,
  user_id         text fk -> users.id,
  endpoint        text unique not null,
  p256dh          text not null,
  auth            text not null,
  user_agent      text,
  created_at      text not null
)

notification_log (
  id              text pk,
  user_id         text fk -> users.id,
  care_task_id    text fk -> care_tasks.id,
  fired_for_year  integer,                 // recurring: which year's window
  fired_at        text not null
)

settings (
  key             text pk,                 // 'hardiness_zone', 'timezone', …
  value           text not null,
  updated_at      text not null
)
```

### Notes

- **Recurring tasks store month-day strings**, not full dates, so they apply to every year automatically. This avoids the "regenerate every January" trickery.
- **Journal action types share a vocabulary with care tasks** (the `ActionType` union above).
- **Soft delete on plants** (`archived_at`) instead of cascading delete; journal history stays meaningful.
- **`notification_log`** prevents firing the same recurring notification twice in one year (idempotency).
- **`settings`** is a simple key-value table for instance-wide config like the garden's hardiness zone and default timezone.

## API shape

REST under `/api/v1/`, JSON in and out. Routes are typed via Zod schemas from `packages/shared`, so the frontend imports the same types.

### Conventions

- Auth: cookie session (`HttpOnly`, `Secure`, `SameSite=Lax`) — no Authorization header.
- IDs: ULIDs in URL path.
- Timestamps: ISO-8601 strings.
- Pagination: cursor-based on creation order where it matters (`?cursor=…&limit=…`).
- Errors: `{ error: { code: string, message: string, details?: unknown } }` with HTTP status.
- Validation failures return `400` with `code: "VALIDATION_ERROR"` and Zod issues in `details`.

### Endpoints (selected)

```
# Auth
POST   /api/v1/auth/register           # only valid with ?invite=<token>
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

# Invites (admin only)
POST   /api/v1/invites
GET    /api/v1/invites
DELETE /api/v1/invites/:token

# Zones
GET    /api/v1/zones
POST   /api/v1/zones
PATCH  /api/v1/zones/:id
DELETE /api/v1/zones/:id

# Plants
GET    /api/v1/plants?zone=…&q=…&archived=…
POST   /api/v1/plants
GET    /api/v1/plants/:id
PATCH  /api/v1/plants/:id
DELETE /api/v1/plants/:id            # soft delete
POST   /api/v1/plants/:id/photos     # multipart upload
DELETE /api/v1/plants/:id/photos/:photoId

# Care tasks
GET    /api/v1/plants/:id/tasks
POST   /api/v1/plants/:id/tasks
PATCH  /api/v1/tasks/:id
DELETE /api/v1/tasks/:id
POST   /api/v1/tasks/:id/complete    # body: { date }

# Journal
GET    /api/v1/journal?from=…&to=…&plant=…&action=…
POST   /api/v1/journal
PATCH  /api/v1/journal/:id
DELETE /api/v1/journal/:id

# Calendar (denormalized read model)
GET    /api/v1/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
       # returns recurring tasks expanded into the requested window,
       # one-off tasks, and journal entries — already merged and
       # sorted, ready for the calendar UI.

# AI
POST   /api/v1/ai/identify-plant     # body: { name?, photoId? }  → { candidates: [...] }
POST   /api/v1/ai/care-plan          # body: { plantId }          → { tasks: [...] }

# Notifications
POST   /api/v1/push/subscribe
DELETE /api/v1/push/subscribe

# Export
GET    /api/v1/export                # streams a zip: garden.json + photos/
```

### Calendar endpoint design

The calendar view is the home screen, so it's the only endpoint with non-trivial server logic: it expands every recurring task into actual dated occurrences inside the requested window, merges in one-off tasks and journal entries, and returns one sorted list. The frontend never re-derives this — it just renders.

## Authentication & authorization

- **Invite-only registration.** First user is created via a one-time bootstrap token printed to the server log on a fresh database. That user becomes admin. Subsequent users register via admin-issued invite tokens (URL with `?invite=<token>`).
- **Passwords**: Argon2id (`argon2` package), reasonable defaults (memory ≥ 64MB, iterations ≥ 3).
- **Sessions**: opaque random IDs in `sessions` table, sent as `HttpOnly` cookie. 30-day rolling expiry; renewed on each request.
- **CSRF**: `SameSite=Lax` cookies + double-submit token on state-changing requests.
- **Authorization**: there are only two roles — admin and member. Admins can manage users and invites. Both can read and write everything in the garden (it's shared).

## File storage (photos)

- Stored on the local filesystem under `data/photos/<plant_or_journal_id>/<photo_ulid>.<ext>`.
- Server validates MIME type and re-encodes to JPEG via `sharp` to strip EXIF (except orientation + capture date) and produce two sizes: `original` and `thumb` (max 600px).
- Backups are file copies — a single `tar` of `data/` is a complete snapshot.
- Photos are served behind auth via the same Fastify process (no static-file shortcut).

## LLM integration

Claude (Anthropic API) handles three scoped tasks. Every call is pure: the model receives the inputs needed and returns structured JSON validated by Zod. No conversation history, no tools, no agent loop.

| Use case | Model input | Output |
|---|---|---|
| Plant identification | photo bytes (vision) and/or partial name + hardiness zone | ranked list of `{ commonName, species, confidence, notes }` |
| Care plan generation | confirmed species + hardiness zone | list of `{ actionType, kind, recurStartMd?, recurEndMd?, dueDate?, rationale }` |
| Care plan refinement | existing tasks + user's question | updated tasks + short explanation |

Implementation notes:

- Prompts live in `apps/backend/src/modules/ai/prompts/` as plain `.ts` files for diffability.
- Responses use Anthropic tool-use to force JSON-shaped output; the parsed object is then re-validated with Zod.
- API key in env (`ANTHROPIC_API_KEY`); never sent to the browser.
- All AI suggestions are persisted only after the user accepts them. The endpoint that *generates* the suggestion does not write to the database.

## Notifications

- **Transport**: Web Push with VAPID. Each user subscribes once per browser; the subscription is stored in `push_subscriptions`.
- **Trigger**: an in-process scheduler runs hourly. For each recurring care task whose `recur_start_md` falls within the next 24h *and* has no row in `notification_log` for the current year, fire a notification to every user with `notify = 1` on that task and at least one push subscription. One-off tasks fire 24h before `due_date`.
- **Idempotency**: `notification_log` rows are inserted in the same transaction as the send.
- **No email in v1.** Web Push covers the household case. Email can be added later as a second `push_subscriptions`-shaped channel.

## Background jobs / scheduling

A single in-process scheduler using `node-cron` (or a small custom interval loop). One instance, one job runner — there is no need for a job queue.

Jobs:

- `notify_due_tasks` — hourly. Walks tasks, fires Web Push, writes `notification_log`.
- `vacuum_sessions` — daily. Deletes expired sessions and consumed/expired invites.
- (later) `weather_pull` — when weather integration lands.

If the server is offline when a job should fire, the next run picks it up — `notification_log` ensures no duplicate fires within a year for recurring tasks.

## Frontend architecture

- **Single-page app.** Vite builds a static bundle; the backend serves it for any non-`/api` path.
- **Routing.** React Router data router, with one route module per top-level page. Loaders fetch via TanStack Query.
- **State.** Server state in TanStack Query; local UI state in component state or small Zustand stores where needed (e.g. calendar zoom).
- **Responsive — desktop primary, mobile supported.** Tailwind breakpoints (`sm`, `md`, `lg`). Layouts are designed for desktop first; smaller viewports collapse to single-column with ≥44px tap targets. Phone has to work, but it isn't where the experience is tuned. No separate mobile codebase.
- **Calendar component.** Custom — built on `date-fns`, no big calendar library. Three layouts share a common task/journal-entry pipeline; each adapts to viewport width:
  - Year: 12-cell grid (4×3 desktop, 2×6 phone), each cell a mini-month with task strips.
  - Quarter (3-month): horizontal strip on desktop, vertical stack on phone, primary planning view.
  - Month: full grid with day cells.
- **Photo capture.** `<input type="file" accept="image/*" capture="environment">` for mobile camera; drag-and-drop on desktop.
- **Offline.** Not required in v1. Service worker registered only for Web Push.
- **Theme.** Light + dark, system-default. Calm palette, photo-forward layout.

## Deployment

A single Docker image:

```
# multi-stage Dockerfile
# 1. install deps and build frontend + backend
# 2. runtime stage with node:20-alpine, copy build artifacts and run server
```

`docker-compose.yml` for a typical deployment:

```yaml
services:
  garden-guide:
    image: ghcr.io/<owner>/garden-guide:latest
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/garden-guide.db
      - PHOTO_DIR=/data/photos
      - SESSION_SECRET=...
      - ANTHROPIC_API_KEY=...
      - VAPID_PUBLIC_KEY=...
      - VAPID_PRIVATE_KEY=...
      - PUBLIC_URL=https://garden.example.com
    volumes:
      - ./data:/data
    ports:
      - "3000:3000"
```

A reverse proxy (Caddy/Traefik) terminates TLS and forwards to the container.

## Configuration

All config via environment variables, parsed and validated with Zod at startup. The server refuses to start if required vars are missing or malformed.

| Var | Purpose |
|---|---|
| `DATABASE_PATH` | SQLite file path. |
| `PHOTO_DIR` | Absolute path for photo storage. |
| `SESSION_SECRET` | HMAC secret for signed cookies. |
| `PUBLIC_URL` | External URL — used in Web Push, invite links, OG tags. |
| `ANTHROPIC_API_KEY` | LLM credential. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web Push. |
| `LOG_LEVEL` | `info` by default. |
| `PORT` | Default `3000`. |

## Observability

- **Logs**: Pino, JSON in production, pretty in development. Per-request log line with method, path, status, duration, user id.
- **Errors**: caught and logged with stack; sent to the client as `{ error: { code, message } }` only — no internals leak.
- **Health check**: `GET /healthz` returns `200` if DB pings and disk is writable.
- **Metrics**: not in v1. If needed later, expose `/metrics` for Prometheus.

## Testing

- **Unit**: pure logic in services (recurring-task expansion, calendar merge, prompt builders). Vitest.
- **Integration**: Fastify routes against an in-memory SQLite, exercising real Drizzle queries. Vitest.
- **E2E**: Playwright against a Dockerized instance, covering the golden flows: invite → register → add plant → AI care plan → calendar → journal.
- **Mobile viewport coverage.** All specs run on desktop Chrome. A subset — add plant + photo, journal entry, calendar navigation — also runs on a phone viewport (`iPhone 13`) to catch responsive regressions. Mobile is supported, not primary.
- **No mocked database in tests.** Use a real SQLite file (or `:memory:`) so migrations and queries are exercised.

