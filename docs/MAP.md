# Map

Companion to [CONCEPT.md](./CONCEPT.md), [ARCHITECTURE.md](./ARCHITECTURE.md), and [STYLE.md](./STYLE.md). Defines the **Map** feature: a painted, top-down layout of the property where zones become spatial regions.

## Vision

Garden Guide already has zones as named areas — "front bed", "greenhouse", "vegetable patch by the shed". The map gives those zones a *shape*: where they sit, how they relate to each other, what's built versus what's planted. The painting interaction borrows the feel of city-management games (paint zones with a brush) but renders with smooth curves so the result reads as a calm garden plan, not a pixel grid.

The map reinforces a core product principle: this is *your* garden, not a generic database.

## Scope (v1)

In:
- A single, shared canvas — one map per instance, like the rest of the app.
- Painting and erasing zones with a brush.
- Two zone kinds — **area** (planted) and **structure** (built).
- Smooth-curve rendering of painted zones.
- Desktop-tuned editing.

Out (deferred):
- Aerial photo backdrops.
- Plants as pins on the map.
- Touch-tuned editing (viewing on touch is fine).
- Real-world scale or measurement.
- Overlapping zones — a cell belongs to one zone or none.

## Where it lives

The home of the map is the **Zones** page. When the canvas has any painted cells, that page opens to the map; an empty canvas opens to a list with "Start painting" / "View as list" affordances. The list view remains as a toggle.

## The interaction

### Tools

A small toolbar (left rail on desktop):

- **Pan/zoom** — default; drag to pan, wheel to zoom.
- **Paint** — paints with the active zone.
- **Erase** — paints with "no zone".
- **Brush size** — slider, also `[` / `]` (1–10 cells).
- **Undo / Redo** — `⌘Z` / `⌘⇧Z`. One stroke = one history step.

### Zones rail

Right rail lists every zone with its color swatch. Clicking a swatch *is* selecting the brush — there is no separate "tool + color" dialog; the swatch is the tool. Clicking a name renames; the `⋯` menu deletes the zone (see "Deleting a zone" below). `+ New Zone` asks for **name** and **kind** (area / structure), auto-cycles to the next unused color in that kind's palette, which the user can override.

### Painting

- Circular brush, radius 1–10 cells.
- A soft cursor-following ring shows the brush in the active zone's color at ~30% opacity.
- Click-drag paints a continuous swept stroke (interpolated between pointer samples).
- Painting *replaces* whatever zone occupied a cell — there's no overlap, no z-order to manage.

### Saving

The whole canvas is saved as one blob on the server. Strokes are not individually persisted — undo/redo is client-side until the next save. Auto-save fires on a short debounce after the last stroke. With multiple users, the rule is **last save wins**; stroke-level merging is a v2 concern if concurrent painting becomes a real workflow.

### Deleting a zone

The `⋯` menu deletes the zone and clears any cells it occupied — those cells become empty ground, not reassigned to a fallback. Painted area is the user's, not load-bearing for any other feature, so empty is the safe default.

## Visual model

### Empty ground

Ivory subtle (`#E8E5DA`) — one shade darker than the surrounding card surface (cream `#F2EFE6`). This mirrors STYLE.md's "grouped section" pattern (cart totals on a cream card), so the map reads as a recessed area against the toolbar and zones rail without needing a stroke. Painted zones still feel additive — they sit a step warmer than the empty ground.

### Zone palettes

Two harmonized palettes. Area zones cycle through the area palette; structure zones cycle through the structure palette. Both use the same render treatment (solid fill, soft outline) — the calm-map look. Greys read as built without needing hatch or other chrome. Exact tokens and hex values are defined in [STYLE.md](./STYLE.md#map-palette).

| Kind | Tokens |
|---|---|
| area | `moss`, `fern`, `olive`, `pine`, `terracotta`, `sand`, `dusty-rose`, `lavender` |
| structure | `slate`, `charcoal`, `stone` |

Adding a token requires updating STYLE.md, the frontend palette config, and any zone migrations — but no schema changes (zones store the slug).

### Render pipeline

The grid is the source of truth, but the user never sees grid cells. Every render:

1. For each zone, build a binary mask of its cells.
2. Trace the mask with **marching squares** to produce smooth contours.
3. Apply a small corner-rounding pass so 90° kinks become curves and 45° diagonals become diagonals.
4. Stroke each contour with a 1–2px outline one step darker than the fill.

The brush still feels grid-snappy because painting samples cell-by-cell; only the rendered output is smoothed.

## Canvas

A new garden defaults to **100 × 100 cells**. The user can resize by dragging extension handles on any of the four canvas edges — extending grows the canvas, dragging inward trims it (with a confirmation when the trim would clip painted cells). Drag-handles match the calm vibe better than a width/height dialog. Cell display size scales with viewport zoom; cells have no real-world dimension.

## Data model

See [ARCHITECTURE.md](./ARCHITECTURE.md#tables) for the schema delta. Summary:

- New `garden_map` singleton table — width, height, cells (packed binary), zone index.
- Two new columns on `zones` — `kind` (`area` | `structure`) and `color_token` (palette slug).

The cells blob is a packed `Uint16Array`: each entry is an index into `zone_index` (0 reserved for empty). At default size that's 100×100 × 2 bytes = ~20 KB — ships in a single API call.

## API

```
GET    /api/v1/map                # { width, height, cells (base64), zoneIndex }
PUT    /api/v1/map                # full replace — body matches the GET shape
PATCH  /api/v1/map/canvas         # { width?, height?, anchor? } — resize / extend
```

Zone CRUD already exists; `PATCH /api/v1/zones/:id` accepts the new `kind` and `color_token` fields.

## Mobile

Editing is desktop-tuned in v1. The codebase uses the Pointer Events API throughout, so single-finger painting *works* on touch but the experience isn't tuned (finger occludes the brush, no preview ring, tools cramped). Viewing the map on touch is fine — pinch zooms, drag pans.

Touch-tuned editing — pinch-zoom coordination with paint, larger touch targets, possibly tap-to-fill — is a v2 concern.

## Non-goals (v1)

- No aerial photo / map tile backdrop.
- No plants as pins. Plants belong to a zone, that's enough spatial info for v1.
- No overlapping zones; no z-order.
- No real-world scale, distances, or areas. The canvas is conceptual.
- No multi-floor / 3D / elevation.

