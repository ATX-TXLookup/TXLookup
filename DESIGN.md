---
version: alpha
name: TXLookup
description: Civic-data design system for TXLookup — Texas open-data agent. Warm stone surfaces with an ember accent for action, civic-blue for maps and data, and a signal trio (pass/warn/fail) for inspection / permit / violation states. Manrope display + Inter body. Light primary, dark variant available for power-user views.
colors:
  primary: "#9E3D00"
  primary-container: "#C64F00"
  primary-fixed: "#FFDBCD"
  primary-fixed-dim: "#FFB595"
  on-primary: "#FFFFFF"
  on-primary-fixed: "#351000"
  secondary: "#3D5AAB"
  secondary-container: "#5673BD"
  secondary-fixed: "#DCE3FA"
  on-secondary: "#FFFFFF"
  on-secondary-fixed: "#0E1F4D"
  surface: "#FCF9F8"
  surface-low: "#F6F3F2"
  surface-container: "#F0EDEC"
  surface-high: "#EBE7E7"
  surface-highest: "#E5E2E1"
  surface-lowest: "#FFFFFF"
  surface-dim: "#DCD9D9"
  on-surface: "#1C1B1B"
  on-secondary-container: "#656464"
  on-surface-variant: "#594238"
  outline: "#8C7166"
  outline-variant: "#E0C0B2"
  inverse-surface: "#111110"
  inverse-on-surface: "#F3F0EF"
  signal-pass: "#1E7A47"
  signal-pass-fixed: "#D5F0DF"
  signal-warn: "#A06200"
  signal-warn-fixed: "#FFE7B5"
  signal-fail: "#A0231C"
  signal-fail-fixed: "#FBD5D2"
  district-1: "#3D5AAB"
  district-2: "#1E7A47"
  district-3: "#A06200"
  district-4: "#7A2E8E"
  district-5: "#0E7C8C"
  district-6: "#A0231C"
  district-7: "#5A4E2A"
  district-8: "#2E5070"
  district-9: "#883C5A"
  district-10: "#3E6B2E"
typography:
  display:
    fontFamily: Manrope
    fontSize: 4.5rem
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  h1:
    fontFamily: Manrope
    fontSize: 3rem
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  h2:
    fontFamily: Manrope
    fontSize: 2.25rem
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h3:
    fontFamily: Manrope
    fontSize: 1.375rem
    fontWeight: 700
    lineHeight: 1.2
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.55
  label-caps:
    fontFamily: Manrope
    fontSize: 0.6875rem
    fontWeight: 700
    letterSpacing: "0.14em"
  mono:
    fontFamily: JetBrains Mono
    fontSize: 0.85rem
    fontWeight: 400
rounded:
  sm: 6px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 48px
  "3xl": 64px
  "4xl": 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 14px 28px
    typography: "{typography.body-md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-container}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.full}"
    padding: 14px 28px
    typography: "{typography.body-md}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 14px 28px
  button-dark:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 14px 28px
  nav-cta:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 10px 22px
    typography: "{typography.label-caps}"
  card:
    backgroundColor: "{colors.surface-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 32px
  chip:
    backgroundColor: "{colors.surface-highest}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.full}"
    padding: 4px 12px
    typography: "{typography.body-sm}"
  chip-primary:
    backgroundColor: "{colors.primary-fixed}"
    textColor: "{colors.on-primary-fixed}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  chip-secondary:
    backgroundColor: "{colors.secondary-fixed}"
    textColor: "{colors.on-secondary-fixed}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  chip-pass:
    backgroundColor: "{colors.signal-pass-fixed}"
    textColor: "{colors.signal-pass}"
    rounded: "{rounded.full}"
    padding: 4px 12px
    typography: "{typography.label-caps}"
  chip-warn:
    backgroundColor: "{colors.signal-warn-fixed}"
    textColor: "{colors.signal-warn}"
    rounded: "{rounded.full}"
    padding: 4px 12px
    typography: "{typography.label-caps}"
  chip-fail:
    backgroundColor: "{colors.signal-fail-fixed}"
    textColor: "{colors.signal-fail}"
    rounded: "{rounded.full}"
    padding: 4px 12px
    typography: "{typography.label-caps}"
  eyebrow:
    backgroundColor: "{colors.surface-highest}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.full}"
    padding: 8px 16px
    typography: "{typography.label-caps}"
  announce-bar:
    backgroundColor: "{colors.inverse-surface}"
    textColor: "{colors.inverse-on-surface}"
    padding: 10px 32px
    typography: "{typography.body-sm}"
  input:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 14px 16px
  search-input:
    backgroundColor: "{colors.surface-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    padding: 18px 24px
    typography: "{typography.body-lg}"
  agent-step:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.md}"
    padding: 12px 16px
    typography: "{typography.body-sm}"
  agent-step-active:
    backgroundColor: "{colors.primary-fixed}"
    textColor: "{colors.on-primary-fixed}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  citation:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.md}"
    padding: 12px 16px
    typography: "{typography.body-sm}"
  data-card:
    backgroundColor: "{colors.surface-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 24px
  district-pill:
    backgroundColor: "{colors.surface-highest}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.full}"
    padding: 4px 10px
    typography: "{typography.label-caps}"
---

## Overview

**Civic-data, accessible, agent-forward.** TXLookup helps Texans explore public data without becoming part-time analysts. The brand pairs warm stone surfaces with a single ember accent for action — calm enough for a parent on a phone, dense enough for a journalist at a desk. On top of that baseline we add what this product specifically needs:

- A **civic blue** secondary (`#3D5AAB`, "bluebonnet") for districts, maps, and data viz
- **Signal colors** for the three states civic data lives in: pass (green), warn (amber), fail (red)
- A **10-color district palette** so council districts and zip groupings stay legible across charts
- Components for the agent surface: NLI search box, step-trace chips, citation block, dataset card

Voice: plain-spoken, citation-honest, never preachy. *"Last inspected March 2026. Score 78. Source: City of Austin."* Not *"Discover the power of open data!"*

The product spans personas from Sarah (parent on her phone in pickup line) to Jordan (journalist on a desktop with charts). Default theme is light + warm. A dark variant exists for power-user views (table-heavy explorer, journalist's chart workbench) — same tokens, inverted surfaces.

## Personas in the design

Each component is built with a primary persona in mind. See `docs/personas.md` for full sketches.

- **Sarah (parent, mobile, 78704)** — needs map + plain-language summary + clear safety signal
- **Marcus (food-truck owner)** — needs filtered table + saved queries + permit timeline
- **Jordan (journalist)** — needs district comparison + chart with citation + CSV export

If a component doesn't serve at least one persona, it doesn't ship.

## Colors

### Primary (ember)
`#9E3D00`. The single most important call-to-action on any view. Never decorative.

- **Primary (`#9E3D00`).** "Ask" button, claim CTA, active nav state, agent-step-active.
- **Primary Container (`#C64F00`).** Hover state for primary buttons.
- **Primary Fixed (`#FFDBCD`).** Peach tint for the agent's currently-active step chip.

### Secondary (civic blue / bluebonnet)
New in TXLookup. `#3D5AAB`. The map-and-data accent.

- **Secondary (`#3D5AAB`).** Default map marker, data-viz primary line, district-1 fill, secondary CTA.
- **Secondary Container (`#5673BD`).** Hover for secondary buttons.
- **Secondary Fixed (`#DCE3FA`).** Soft blue for inactive map regions, dataset chips.

Use secondary anywhere we're showing geographic or quantitative data. Use primary anywhere we're asking the user to act.

### Signal trio
Three semantic states. Used in chips, table cells, and map markers.

- **Pass (`#1E7A47`).** Inspection passed, permit issued, no violations. Green is muted-civic, not lime.
- **Warn (`#A06200`).** Open complaint, expiring permit, score 70-79. Amber, not yellow.
- **Fail (`#A0231C`).** Failed inspection, active code violation, score < 70. Red is brick, not Coca-Cola.

Each comes with a `*-fixed` token for soft chip backgrounds.

### District palette (10 colors)
Hand-tuned for Austin's 10 council districts but reusable for any 10-way categorical comparison (zip clusters, neighborhood groupings, county pairs).

`district-1` through `district-10` are visually distinguishable in colorblind-safe pairs and balanced in luminance. **Use the full palette only when comparing all 10**; for fewer than 10 categories, prefer secondary + signal-pass + signal-warn + signal-fail.

### Surfaces
A five-step warm-stone scale. `surface` (`#FCF9F8`) for body, `surface-low` for alternating sections, `surface-lowest` for cards, `inverse-surface` for the announcement bar and footer. Cream, never pure white.

## Typography

Two families, strict hierarchy. **Manrope 700/800** for display + headings + nav + label-caps. **Inter 400/500/600** for all body and UI text. **JetBrains Mono** only for permit IDs, dataset IDs, SHA citations, and code blocks. Never decorative.

Display headlines use a fluid `clamp(2.5rem, 6vw, 4.5rem)`. The agent's step name (Reason / Plan / Tool / Complete) uses `label-caps` to read as a state badge, not a noun.

## Layout

- **Max content width:** 1280px (container), 960px (container-narrow for results pages with one map and a column of summaries).
- **Horizontal padding:** 32px desktop, 24px tablet, 20px mobile.
- **Section vertical padding:** 96px desktop, 64px mobile.
- **Search-first layout:** Hero is the search box, full-width, centered, max 720px. Below it, three persona suggestion chips ("Try: 'restaurant inspections in 78704'"). No marketing copy above the fold.
- **Result layout:** 1.6fr / 1fr asymmetric grid on desktop. Left = map / chart / table. Right = agent step trace + citation block + summary card.
- **Mobile-first for Sarah's flow.** Map is full-width on mobile with a sticky bottom card for the selected marker.

## Elevation & Depth

Warm-light shadows — long, low-opacity, suggesting morning light on limestone.

- **Card rest:** `0 1px 0 rgba(140,113,102,0.12)` (hairline only).
- **Card hover:** `0 20px 50px -15px rgba(158,61,0,0.08)`.
- **Search input focus:** `0 0 0 4px rgba(158,61,0,0.12)` ring.
- **Map marker:** No shadow — markers are SVG with a 1px stroke.

No drop-shadows on text. No hard black shadows. No glassmorphism — this is a civic tool, not a SaaS landing page.

## Shapes

- **Buttons, chips, district pills, search input, agent step:** pill or 12px radius
- **Cards, data cards, citation:** `rounded.lg` (16px)
- **Map container, hero panel:** `rounded.xl` (24px)
- **Table cells:** sharp corners — only the table container is rounded

## Components

### Search Input (the hero)
The primary entry point for every persona. Full-width pill-rounded input, `surface-lowest` background, focus ring in primary. Placeholder rotates through three persona prompts on a 4-second timer. Submit on Enter or via the trailing arrow button (primary fill). Min height 56px (mobile), 64px (desktop).

### Agent Step Trace
A horizontal row of four chips: **REASON · PLAN · TOOL · COMPLETE**. The current step is `agent-step-active` (peach background, deep-orange text). Past steps fade to `surface-low`. Future steps are `surface-container` with 50% opacity. A thin progress bar runs underneath at `secondary` color.

### Citation Block
Always shown beneath any data result. Light stone background, mono dataset ID + portal link + last-updated stamp. Three lines max:

```
Source: City of Austin · Issued Construction Permits (3syk-w9eu)
Last refreshed: 2026-05-08 14:00 CT
Open dataset →
```

The "Open dataset →" link is `secondary` color. Required by the Open Data track rules — every user-facing answer must carry attribution.

### Data Card
Tighter than a regular Card (24px padding instead of 32). Used in result grids: one record per card on mobile, 2-3 columns on desktop. Has a `signal-*` chip in the top-right corner if the record carries a pass/warn/fail state (food inspection score, permit status, code violation status).

### District Pill
Small label-caps pill with the district number prefixed by a 6px square swatch in the matching district color. Used in tables and map legends to identify council districts consistently across the product.

### Map Marker
SVG circle, 16px diameter, 2px stroke. Fill = `secondary` for default, `signal-*` if the record carries a signal state. Hover scales to 24px and reveals a tooltip with the record's headline. Selected state pulses (12s duration, scale 1.0 → 1.1) at 30% opacity ring.

### Persona Suggestion Chips
Three chips below the search input. Each shows an example query rotating per persona:

- "Restaurant inspection scores near 78704" (Sarah, signal-warn chip)
- "Food truck permits issued in East Austin this year" (Marcus, secondary chip)
- "311 response times by council district" (Jordan, district-1 chip)

Tapping a chip pre-fills the search and submits.

### Standard Components
- **Button Primary** — Ember CTA, full-pill, white text. The "Ask" button.
- **Button Secondary** — Bluebonnet, full-pill, for "Compare" / "Show map" / "Export" actions.
- **Button Ghost** — Transparent + hairline border, primary text. Used for "Clear filters", "Try another question".
- **Button Dark** — `on-surface` fill, white text. Reserved for finalizing a saved query.
- **Card** — `surface-lowest`, hairline border, 32px padding, lift on hover.
- **Chip** — Neutral (stone) for tech tags. Add `chip-primary` / `chip-secondary` / `chip-pass` / `chip-warn` / `chip-fail` for emphasis.
- **Eyebrow** — Label-caps tag above section headings. Always uppercase Manrope 700.
- **Announce Bar** — Fixed top, inverse surface. Used to flag the dataset's freshness ("Permits data updated 4 hours ago").

## Map and chart conventions

Maps use **Mapbox GL** or **MapLibre** (open source). Style: monochrome stone basemap (cream → light grey at higher zooms), no labels above zoom 14 except street names, district boundaries in `secondary` at 30% stroke. Markers ALL get a click affordance — no decorative-only points.

Charts use **Recharts** for React simplicity. Single-series charts use `secondary` line + `secondary-fixed` area fill. Multi-district comparison charts use the `district-1` through `district-10` palette in order. Axes in `on-surface-variant`. Always include the dataset citation below the chart in the standard Citation Block.

## Dark variant

For Jordan's chart workbench and Marcus's saved-table view (long sessions, lots of data), a dark theme inverts the stone scale:

- `surface` → `#1C1B1B`
- `surface-lowest` → `#2A2825`
- `on-surface` → `#F3F0EF`
- All accents stay the same (ember, bluebonnet, signal trio, districts)

Trigger: user-toggleable in the nav. Persisted in localStorage. Default = light. The dark variant is **not** the marketing/landing-page theme — that always opens in light mode.

## Do's and Don'ts

**Do**
- Show citation under every data result. Required by track rules. No exceptions.
- Use one accent per view: ember for action, secondary for data. Pick one for emphasis.
- Use signal colors for inspection / permit / violation states — never decoratively.
- Use the district palette only when comparing 10 districts; fewer = use secondary + signal trio.
- Use mono for dataset IDs, permit IDs, SHA citations. Real technical artifacts only.
- Default to light theme. Dark is opt-in for power-user surfaces.
- Run `npx --yes @google/design.md lint DESIGN.md` in CI and fail on errors.
- Pair every CTA band with two actions: primary (act) and ghost (cancel/back).
- Keep line length ≤ 65ch for body, ≤ 22ch for display headlines.

**Don't**
- Don't use red for anything that isn't a `signal-fail`. Red carries semantic meaning here.
- Don't decorate with monospace or accent colors. Both carry meaning.
- Don't introduce a third accent color. If a status needs green, use `signal-pass`. If you need purple, you don't.
- Don't use drop shadows darker than `rgba(28,27,27,0.12)`. Never pure black.
- Don't omit the citation under any data result, ever.
- Don't use generic AI eyebrows ("AI-Powered Civic Intelligence"). Use real status: "Updated 4h ago".
- Don't use emoji in body, headlines, or labels. Icons are `lucide-react` only.
- Don't ship a section without at least one persona it serves.
- Don't ship a chart without axis labels, scale, source, and freshness.
- Don't use map markers with no click affordance — every marker should reveal data on tap.
