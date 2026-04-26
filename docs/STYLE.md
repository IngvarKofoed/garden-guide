# Visual Style Guide

Extracted from a reference design (sage-green plant-app concept). This document captures the intended look-and-feel for Garden Guide. Not yet implemented in the frontend.

## Mood

Calm, organic, modern. Premium consumer-app feel rather than utilitarian dashboard. The interface should feel like a printed botanical catalog crossed with a fitness app: confident typography, generous whitespace, soft natural greens, and crisp black for action moments.

## Color palette

### Primary

| Role | Hex (approx) | Notes |
|---|---|---|
| Sage background | `#A9B89E` | The page-level "outside" color. Muted, dusty green — never saturated. |
| Cream surface | `#F2EFE6` | Card/screen background. Warm off-white with a faint green undertone. |
| Ivory subtle | `#E8E5DA` | Slightly darker cream for grouped sections (e.g. cart totals block). |
| Ink | `#0F0F0F` | Primary CTAs, body text, bottom nav. Near-black, not pure black. |

### Accents

| Role | Hex (approx) | Notes |
|---|---|---|
| Forest green | `#2F5233` | Featured banner ("Plant of the Month" wave shape). Deep, saturated. |
| Leaf green | `#6FA86B` | Secondary accent — "Free" delivery pill, hover/active highlights. |
| Mint tint | `#D9E8CF` | Tag/chip backgrounds (Shade-Lover, Pet-Friendly, Air Purifier). |
| Glass green | `rgba(110,150,100,0.55)` | Frosted floating info badges over imagery. |

### Neutrals

| Role | Hex (approx) | Notes |
|---|---|---|
| Hairline | `#D8D4C7` | Dividers between list items. Very low contrast. |
| Muted text | `#6B6B66` | Secondary labels ("Low-maintenance plant", "4 items"). |

Avoid: pure white surfaces, pure black, saturated traffic-light reds/yellows. Status colors should be desaturated if introduced later.

## Typography

- **Family:** modern geometric sans-serif. Suggested: `Inter`, `General Sans`, or `Manrope`. One family throughout.
- **Headlines** (e.g. "Curated Plants for Your Space"): weight 700, tight tracking (`-0.02em`), line-height ~1.05, sizes 28–36px on mobile.
- **Section titles** (e.g. "Cart", "Fiddle Leaf Fig"): weight 600, ~20–22px.
- **Body / item names** (e.g. "Monstera Deliciosa"): weight 500–600, 16–18px.
- **Prices**: weight 600, tabular numerics so columns align. Currency symbol same size as the digits.
- **Captions / meta** (e.g. "Low-maintenance plant", "Small/Medium/Large" pills): weight 400–500, 12–13px, muted color.

Use sentence case everywhere. No ALL CAPS labels.

## Shape & elevation

- **Corner radii:**
  - Screens/cards: `28–32px` (very generous).
  - Buttons & pills: fully rounded (`9999px`).
  - Small chips and tags: `9999px`.
  - Image thumbnails in lists: `16–20px`.
- **Shadows:** very soft, low-opacity, large blur. Elevation comes from radius and color contrast, not heavy drop-shadows.
  - Card: `0 8px 24px rgba(40,60,40,0.06)`.
  - Floating badge / phone mock: `0 24px 60px rgba(40,60,40,0.18)`.
- **Borders:** mostly avoided. Use color steps between surfaces instead of strokes. A 1px hairline (`#D8D4C7`) is acceptable for list dividers.

## Components

### Primary CTA button
- Full-width or near-full-width pill, height ~56px.
- Background: ink (`#0F0F0F`), text: cream, weight 500–600.
- No icon by default; centered label.
- Active/pressed: 4–6% lighter overlay, no scale change.

### Secondary / icon button
- Circular, ~44px, cream background, ink icon. Used for back arrow, favorite (heart), share (arrow-up-right), search.
- Sits on top of imagery — confirm 3:1 contrast against the underlying photo.

### Filter chip (active)
- Ink background, cream text, leading filter icon. Pill, height ~36px.

### Filter chip (inactive)
- Transparent background, hairline 1px border in muted neutral, ink text, trailing `×` for removal when applied.

### Tag / attribute pill (e.g. "Pet-Friendly", "Air Purifier")
- Mint tint (`#D9E8CF`) background, ink text, weight 500, height ~28px, horizontal padding ~14px.

### Featured banner ("Plant of the Month")
- Forest green wavy/blob shape extending from the top of a card. Suggests organic, hand-drawn rather than rectangular.
- Small inset pill ("Plant of the Month") with a sprout icon, mint tint background, sits inside the green region.

### Floating info badge (over plant photography)
- Vertical glass-effect oval, frosted green (`backdrop-filter: blur(12px)`, glass green fill).
- Thin lime-green outline (`1.5px solid #B5D78F`).
- Stacks an icon (top) over a two-line label ("Moisture Level", "Light Absorption", "Growth Stage").
- Use sparingly — only on hero/feature views.

### Quantity stepper
- Two circular cream buttons (~32px) with `+` / `−`, separated by the number in ink. No outer container.

### Bottom navigation
- Pill-shaped ink bar floating above the safe area, ~64px tall, ~24px from screen edges.
- Icons in cream. Active item: cream pill background with ink icon **and label** (label only shown on the active item).

### List row (e.g. cart item)
- Square thumbnail (radius 16–20px) on the left, two-line title block in the middle (name + size pill), price + stepper on the right.
- Hairline divider below, full-width inside the card padding.

### Summary block (e.g. cart totals)
- Ivory subtle (`#E8E5DA`) rounded section inside the cream card. Right-aligned numbers. "Free" rendered as a leaf-green pill with cream text.

## Imagery

- **Plants:** realistic photographic, color-corrected toward warm/neutral, isolated on cream or transparent backgrounds. No hard square crops — let foliage breathe.
- **Pots:** prefer matte stone, terracotta, or muted glazed ceramics. Avoid glossy plastic.
- **No stock illustrations**, no flat vector plants. Photography or none.

## Iconography

- Linear/stroked icons, ~1.5px stroke, rounded line caps.
- 24px grid for nav, 16–20px for inline.
- Icon set suggestion: Phosphor (Regular weight) or Lucide. Pick one and stick with it.

## Spacing & layout

- 8px base unit. Card inner padding: 24px. Screen edge padding on mobile: 20–24px.
- Vertical rhythm between sections: 24–32px.
- Cards fill width with consistent edge padding; never edge-to-edge except for full-bleed hero photography.

## Motion (intent)

- Easing: `cubic-bezier(0.22, 0.61, 0.36, 1)` (gentle out).
- Durations: 180ms for taps/hovers, 280ms for transitions.
- No bounce. Movement should feel like a leaf settling, not a notification badge.

## What this style is NOT

- Not a dashboard — avoid dense tables, grid lines, and tight rows.
- Not "earthy rustic" — no wood textures, no handwritten fonts, no paper grain.
- **No dark mode.** Light-only. Don't author dark variants or `prefers-color-scheme` rules.
- Not a desktop port of a phone screen. See "Responsive behavior" below.

## Responsive behavior

- **Mobile (< 768px):** matches the reference — single-column cards, floating pill bottom nav, full-width primary CTAs.
- **Desktop (≥ 768px):** **persistent left sidebar** for primary navigation instead of the bottom pill. Sidebar uses the cream surface with the active item rendered as the same dark pill (ink background, cream icon + label) used on mobile's bottom nav. Main content keeps the same card style, padding, and radii — desktop gets more whitespace, not denser layouts.
- Tablet sits closer to desktop; switch to the sidebar at the same breakpoint.

## Tokens

Tokens (colors, radii, spacing) live in the Tailwind theme config (`tailwind.config.js` → `theme.extend`). No CSS variables, no runtime theme switching — it's a single light theme.

## Known follow-ups

- Calendar and journal views aren't represented in the reference. Both are data-dense and will need an extension of this system (likely tighter row heights and a quieter accent for date grids) without losing the calm feel. Resolve when those screens are designed.
