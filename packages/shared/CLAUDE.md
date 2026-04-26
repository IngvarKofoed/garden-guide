# @garden-guide/shared

Zod schemas and inferred TypeScript types shared between backend and frontend. **No runtime logic.**

> Full design: [/docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md). This file documents the *target* setup — scaffolding hasn't run yet.

## Purpose

Single source of truth for data shapes that cross the network boundary: API request/response bodies, domain entities, and the `ActionType` enum.

## Files

```
src/
  plant.ts        # Plant, PlantPhoto schemas
  zone.ts         # Zone schema
  task.ts         # CareTask, TaskCompletion, ActionType
  journal.ts      # JournalEntry, JournalPhoto schemas
  user.ts         # User, Session, Invite schemas
  api.ts          # request/response envelopes, error shape, pagination cursors
  index.ts        # barrel
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm --filter @garden-guide/shared build` | tsc emit `dist/` (only needed for publishing — workspaces import from `src/` directly via `tsconfig` paths) |
| `pnpm --filter @garden-guide/shared test` | Vitest schema tests (round-trip parse/safeParse) |

## Key conventions

- **Zod schemas first**, types via `z.infer<typeof Schema>`. Don't hand-write parallel interfaces.
- **Naming**: `XSchema` for the value, `X` for the inferred type — `export const PlantSchema = …; export type Plant = z.infer<typeof PlantSchema>;`.
- **One canonical `ActionType`** in `task.ts`. The backend (DB `CHECK` constraint) and frontend (form selects) both reference it.
- **Zero runtime deps** other than `zod`. No imports from `apps/backend`, `apps/frontend`, or any framework.
- **No business logic.** No async functions, no `.transform()` with side effects, no validators that hit the network. Schemas only.

## Gotchas

- Schemas are imported as **types AND runtime values** (`Schema.parse(...)`). Use `export const` / `export type`, never `export type` for the schema itself.
- When adding an `ActionType` member, update **three** places in lockstep: this package, the backend `CHECK` constraint (via a migration), and any seeded help text in the frontend. They are not auto-synced.
- Date string formats are distinct schemas:
  - `MM-S` → year-agnostic month slot for recurring care tasks (`recur_start_slot`, `recur_end_slot`); S = 1 early / 2 mid / 3 late
  - `YYYY-MM-DD` → absolute calendar day (`due_date`, `occurred_on`)
  - ISO-8601 → timestamps
  Don't merge their regexes.
- Schemas are imported across the workspace via TS path mapping. If you publish to npm later, switch to a `dist/` build and update consumer imports.
