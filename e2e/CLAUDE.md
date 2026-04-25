# E2E Tests — Garden Guide

Playwright tests run against a built, Dockerized Garden Guide instance — **no in-process mocks**. Catches real wiring between frontend, backend, SQLite, and the scheduler.

> Full design: [/docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md). This file documents the *target* setup — scaffolding hasn't run yet.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm e2e` | Boot the test container + run all specs headless |
| `pnpm e2e --headed` | Same, with browser visible |
| `pnpm e2e --ui` | Playwright's interactive UI runner |
| `pnpm e2e -g "<title>"` | Run a single spec by title |
| `pnpm e2e:codegen` | `playwright codegen` against the running test instance |

## Architecture

```
e2e/
  tests/              # *.spec.ts — one file per golden flow
  fixtures/           # page-object helpers, seeded factories
    images/           # tiny photo fixtures, committed
  playwright.config.ts
```

## Golden flows to cover

From [/docs/ARCHITECTURE.md#testing](../docs/ARCHITECTURE.md#testing):

1. Bootstrap admin via console token → log in
2. Admin issues invite → second user registers via invite link
3. Add plant (with photo) → AI care plan suggestion → user accepts a subset
4. Calendar shows recurring + one-off tasks for the requested window
5. Journal entry creation, with attribution to the logged-in user
6. Web Push subscription roundtrip (delivery mocked at the network layer)

## Key conventions

- **Each spec gets a fresh database.** A fixture wipes `data/` and re-runs migrations before the test. Don't rely on test ordering.
- **No mocks of our own backend.** This suite exists to catch real wiring. If you need to mock, write it as an integration test in `apps/backend/test` instead.
- **Page-object helpers in `fixtures/`** wrap UI flows (`login`, `addPlant`, …). Specs read like prose; selectors live in fixtures.
- **`data-testid` is the only stable selector.** Don't match by text or role except in deliberate accessibility specs.
- **Anthropic calls are stubbed** at the network layer (`page.route(...)`). We test the UI's handling of structured responses, not the model itself.
- **Web Push delivery is stubbed** at the network layer too — VAPID push to `*.googleapis.com`/`*.mozilla.com` is intercepted and asserted on, never actually sent.

## Gotchas

- Web Push needs Chromium flags and per-context permission grants in `playwright.config.ts`. They're set there — don't strip them.
- Photo upload uses a small fixture image from `fixtures/images/` rather than generating one — keeps tests fast and reproducible. Re-encoding via `sharp` runs server-side, so the fixture only needs to be a valid JPEG.
- The Docker test container exposes the app on a random port. Read it from the `BASE_URL` env that `playwright.config.ts` injects — don't hardcode `localhost:3000`.
- Tests assume the bootstrap admin token is the first line of stdout matching `BOOTSTRAP_TOKEN=`. The fixture parses container logs; if the backend log format changes, update the fixture.

## When to invoke skills

- **`simplify`** — after writing a new page-object helper, to keep `fixtures/` lean and free of duplicated selectors.
