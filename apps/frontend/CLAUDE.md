# Frontend — Garden Guide

Vite + React + React Router SPA. Served by the backend at any non-`/api` path.

> Full design: [/docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md). Domain concepts: [/docs/CONCEPT.md](../../docs/CONCEPT.md). This file documents the *target* setup — scaffolding hasn't run yet.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm --filter @garden-guide/frontend dev` | Vite dev server, proxies `/api` to the backend |
| `pnpm --filter @garden-guide/frontend build` | Production bundle into `dist/` |
| `pnpm --filter @garden-guide/frontend test` | Vitest + React Testing Library |
| `pnpm --filter @garden-guide/frontend lint` | ESLint + Prettier |

## Architecture

```
src/
  main.tsx            # entry — router mount + QueryClient + theme
  routes/             # one module per route, with loaders/actions
  features/<domain>/  # plants, tasks, journal, calendar, zones — UI + hooks
  components/         # shared UI (Calendar, PhotoStrip, FormField, …)
  lib/                # api client, hooks, utils
  styles/             # Tailwind config + globals
```

## Key conventions

- **Server state in TanStack Query** (queries + mutations). Don't shadow with Zustand or local state.
- **Forms use React Hook Form + Zod** with schemas imported from `@garden-guide/shared` — same validation as the backend.
- **Calendar is custom**, built on `date-fns`. No `react-big-calendar`/`FullCalendar`. The three views (year, quarter, month) share one task-and-journal merging pipeline.
- **Routing via React Router data router.** Loaders fetch through the same `QueryClient` so navigations show cached data instantly.
- **No SSR, no Next.js.** SPA only; the backend serves `index.html` for any non-`/api` path.
- **Responsive — desktop primary, mobile supported.** Design for desktop first, then verify the layout collapses cleanly to a single-column phone view. Use Tailwind `sm`/`md`/`lg` breakpoints. Tap targets ≥ 44px on touch viewports. Smoke-check new screens at `iPhone 13` viewport before declaring done; mobile must work, but the experience is tuned for desktop.
- **Photo input** uses `<input type="file" accept="image/*" capture="environment">` so mobile users get the camera directly.
- **Theme**: light + dark, system-default. Calm palette, photo-forward layout (CONCEPT.md).

## Environment

Vite reads from `apps/frontend/.env`. Only `VITE_`-prefixed vars reach the browser. Most config (LLM keys, VAPID secrets) lives on the backend; the frontend retrieves what it needs through `/api/v1/auth/me` and a small `/api/v1/config` endpoint (VAPID public key, public URL).

## Gotchas

- The **service worker is registered only for Web Push** — no offline caching in v1. Don't add a Workbox runtime cache without discussing it.
- **Calendar zoom (year / quarter / month)** is a single component with three layouts, not three separate components — keeps the task-expansion logic in one place.
- **Don't import from `apps/backend`.** Cross-app imports are forbidden; share through `@garden-guide/shared`.
- Tailwind's `content` glob covers `src/**` only. If a class string ever needs to live in `@garden-guide/shared`, add the path explicitly — but prefer to keep shared schema-only.
- The `/api` proxy in `vite.config.ts` must forward cookies (`cookieDomainRewrite`/`changeOrigin: true`) so session auth works in dev.

## When to invoke skills

- **`frontend-design`** — when building new pages or components. Generates production-grade UI that avoids generic AI aesthetics; aligns with CONCEPT.md's "calm, photo-forward" principle.
- **`simplify`** — after a non-trivial component is built, to consolidate hooks and remove premature abstractions.
