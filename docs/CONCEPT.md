# Garden Guide

> Your private guide for your garden.

## Vision

Garden Guide is a self-hosted web app that helps you keep track of every plant and tree in your garden, learn when to care for them, and remember what you've done. It combines a structured plant catalog, an AI-assisted care calendar, and a journal — all tailored to *your* garden, not a generic gardening database.

## Problem

Gardening knowledge is scattered: tags on seed packets, half-remembered advice, blog posts, YouTube videos. By the time you need to prune the apple tree or fertilize the roses, the right moment has often passed. Generic gardening apps either drown you in irrelevant species data or force you into rigid templates that don't fit a real, mixed garden.

Garden Guide solves this by being a personal record of *your* plants and *your* care routines, with an LLM acting as the gardening expert you'd otherwise have to be.

## Target user

A hobbyist gardener who:

- Has a real garden with a mix of trees, shrubs, perennials, and annuals.
- Wants a single place to keep track of what's planted and what needs doing.
- Is comfortable self-hosting (or has someone who can).
- Will share the garden with family/household members — multiple users, **one shared garden** per instance, no public/social features.

## Core concepts

### Garden
The single shared garden hosted by the instance. All users of the instance see and edit the same plants, zones, tasks, and journal. Each entry records *who* added or did it.

### Zone
A user-named area of the garden — e.g. "front bed", "greenhouse", "vegetable patch by the shed". Plants belong to a zone (optional). Zones are created by users; the app ships with no presets.

### Plant
An individual plant or tree in the garden. Has:
- Common name and (optionally) species/cultivar.
- Optional photo(s).
- Optional zone and free-form notes.
- A set of **care tasks**.
- A stream of **journal entries**.

### Care task
An activity tied to a plant. Two flavors:
- **Recurring** — happens every year within a date range, e.g. "Prune: late February – mid March". This is what drives the seasonal calendar.
- **One-off** — a single dated to-do, e.g. "replace stake by 2026-05-10".

Either flavor can be created manually or suggested by the LLM based on the plant's species and the garden's climate.

Predefined action types: **prune, fertilize, water, plant, transplant, harvest, sow, mulch, treat (pest/disease), inspect**, plus free-form.

### Journal entry
A dated record of something that happened or was done — typically tied to a plant, but free-floating entries are allowed too. Uses the same action types as care tasks, plus free text and optional photos.

### Calendar
The unified view across all plants and tasks. Three zoom levels:
- **Year** — overview of the whole season at a glance.
- **3-month** — current planning horizon.
- **Month** — day-level detail.

### Notifications
Reminders triggered when a care task's date range starts (and optionally as it ends). Delivered via web push and/or email.

## Key features

1. **Add a plant** — quick capture: photo + name. AI offers identification suggestions from the photo or from a partial name.
2. **AI care plan** — given a plant and the user's climate/region, the LLM proposes a starter set of care tasks with sensible date ranges, which the user can edit or accept.
3. **Manual override everywhere** — every AI suggestion is editable; nothing is locked in.
4. **Journal-as-you-go** — fast entry from the plant's page or the calendar. Action type + date + optional notes/photo.
5. **Calendar views** — year / quarter / month, with care tasks and journal entries layered on the same timeline.
6. **Notifications** — opt-in per task or per category, delivered per user.
7. **Shared garden, multiple users** — everyone in the household sees and edits the same garden; journal entries are attributed to the user who wrote them.
8. **Zones** — user-created garden areas; plants can be filtered and viewed per zone.
9. **Export & backup** — full export of the garden's data (plants, tasks, journal, zones) as JSON plus a photo archive, downloadable from the UI.

## AI capabilities

The LLM is used in three well-scoped places, not as a freeform chatbot:

- **Plant identification** — from photo and/or partial name, return ranked candidates.
- **Care plan generation** — from a confirmed plant + the gardener's free-form notes (climate, soil, microclimate quirks), propose care tasks with date ranges and short rationale.
- **Care plan refinement** — answer "why this date range?" and adjust based on user feedback ("my prunus blooms two weeks earlier than yours says").

All AI output is treated as a *suggestion*. The source of truth is what the user accepts into their garden.

## Design principles

- **Personal, not generic** — the app describes the user's specific garden, not a global plant encyclopedia.
- **Manual is first-class** — users who don't want AI can use the app fully without it.
- **Calendar is the home screen** — gardening is time-driven; the UI should reflect that.
- **Desktop-first, mobile-supported** — primary use is on a desktop or laptop. The web app is fully responsive so it also works on a phone in the garden, but desktop is where the experience is tuned.
- **Beautiful and calm** — plants, photos, and seasons; not dashboards and KPIs.
- **Self-hostable** — runs on a single small server; data stays with the user.

## Non-goals

- Public sharing, social feeds, comments, or a community plant database.
- Marketplace, e-commerce, or affiliate features.
- IoT/sensor integration (soil moisture probes, smart sprinklers) — not in v1.
- Being a botanical reference work. Plant data is whatever the user (or the LLM) writes down.

## Open questions

Decisions still to make:

- **Photo timeline.** Allow multiple photos per plant over time, shown as a chronological strip — small but delightful. Worth doing in v1?
- **Weather integration.** "Don't water today, it rained 12mm." Powerful but adds an external dependency and an API key. Probably v2.

## Out of scope for this document

Tech stack, data model, API shape, deployment topology, and UI mockups all live in their own documents.
