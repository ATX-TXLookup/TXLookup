# TXLookup — Brand Guidelines

> One-stop reference for all UI, copy, and design decisions. Claude Code: read this before generating any component, page, or copy.

---

## 1. What We Are

**TXLookup** is an agentic intelligence layer over Texas public datasets. Users ask natural-language questions and get real answers — no SQL, no spreadsheets. Each dataset also ships with pre-harvested insights and suggested questions.

**Category:** Civic AI / Open Data Intelligence  
**Audience:** Civic builders, journalists, policy researchers, curious Texans  
**Differentiator:** Agentic query layer + pre-harvested per-dataset insights  

---

## 2. Logo — Lone Star Intelligence

**Concept:** A lone star outline in gold, with data nodes branching below it, and the wordmark in two visually distinct weights/colors.

### Wordmark Treatment
```
TX        — Gold (#D48B10), heavy weight, wider tracking
Lookup    — White/Cream (#FAF7F2), lighter weight, normal tracking
```

The **TX** and **Lookup** must always render as two distinct visual tokens:
- `TX` = the Texas identity marker → **Gold**
- `Lookup` = the product action → **White** (on dark) or **Navy** (on light)

### Logo Mark
- Lone star outline, stroke only (no fill), in Gold `#D48B10`
- Three data-node dots below the star connected by thin lines in Sky Blue `#3A7FBE`
- Center dot inside the star in Gold
- Background: Navy `#0D2340`

### Clear Space
Maintain padding equal to the height of the "X" character on all sides of the logo.

### Don't
- Don't render TX and Lookup in the same color
- Don't put the logo on busy backgrounds without a dark overlay
- Don't stretch or recolor the star mark

---

## 3. Color System

| Token        | Hex       | Usage                              |
|--------------|-----------|------------------------------------|
| `navy`       | `#0D2340` | Primary background, hero sections  |
| `rust`       | `#C4420A` | CTAs, action buttons, alerts       |
| `gold`       | `#D48B10` | **TX** wordmark, star mark, accents |
| `sky`        | `#3A7FBE` | Data nodes, links, info states     |
| `sage`       | `#3B6D3B` | Success states, positive data      |
| `cream`      | `#FAF7F2` | Page background, light surfaces    |
| `ink`        | `#1A1510` | Body text on light backgrounds     |
| `muted`      | `#6B6660` | Secondary text, labels, captions   |
| `border`     | `rgba(26,21,16,0.10)` | Dividers, card borders   |

### Usage Rules
- **Primary UI pairing:** Navy background + Cream text + Gold accent
- **Light UI pairing:** Cream background + Navy text + Rust CTA
- **Data visualizations:** Use Sky Blue as the primary data color; Gold for highlights
- **Never** use purple, generic blue (#0000FF), or pure black (#000000)

### CSS Variables (copy into your root)
```css
:root {
  --tx-navy:       #0D2340;
  --tx-rust:       #C4420A;
  --tx-rust-light: #F5E8DF;
  --tx-gold:       #D48B10;
  --tx-gold-light: #FDF3DC;
  --tx-sky:        #3A7FBE;
  --tx-sky-light:  #DFF0FA;
  --tx-sage:       #3B6D3B;
  --tx-cream:      #FAF7F2;
  --tx-ink:        #1A1510;
  --tx-muted:      #6B6660;
  --tx-border:     rgba(26,21,16,0.10);
}
```

### Tailwind Config (if using Tailwind)
```js
// tailwind.config.js — extend colors
colors: {
  'tx-navy':  '#0D2340',
  'tx-rust':  '#C4420A',
  'tx-gold':  '#D48B10',
  'tx-sky':   '#3A7FBE',
  'tx-sage':  '#3B6D3B',
  'tx-cream': '#FAF7F2',
  'tx-ink':   '#1A1510',
  'tx-muted': '#6B6660',
}
```

---

## 4. Typography

| Role          | Font               | Weight    | Notes                          |
|---------------|--------------------|-----------|--------------------------------|
| Display / H1  | DM Serif Display   | Regular   | Italic for emphasis            |
| UI / Headings | Syne               | 700–800   | Wide tracking on caps labels   |
| Body          | Syne               | 400       | 16px, line-height 1.7          |
| Queries/Code  | IBM Plex Mono      | 400 / 600 | All query strings, dataset IDs |

### Google Fonts Import
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;600&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">
```

### Scale
```
H1  — DM Serif Display, 40–48px, navy or white
H2  — DM Serif Display, 28–32px
H3  — Syne 700, 20px, uppercase + letter-spacing: 0.04em
Body — Syne 400, 16px, line-height 1.7, color: ink or muted
Label — Syne 700 or IBM Plex Mono 600, 11px, uppercase, letter-spacing: 0.12em
Query — IBM Plex Mono 600, 13–14px, color: rust or sky
```

### Example Heading Hierarchy
```
Ask Texas anything.           ← DM Serif Display, 48px, white on navy
Public data. Real answers.    ← Syne 700, 18px, gold
$ tx.query("top counties…")  ← IBM Plex Mono, 13px, sky
```

---

## 5. Voice & Tone

**Plain-spoken authority.** Think knowledgeable local, not enterprise vendor.

| Do                                      | Don't                               |
|-----------------------------------------|-------------------------------------|
| "42 datasets answered your question."   | "Leveraging AI-powered synergies…"  |
| "Top 5 counties by population growth."  | "Insights generated successfully."  |
| "Texas has 130+ public datasets."       | "Robust data infrastructure."       |
| Short, declarative sentences            | Passive voice, jargon, buzzwords    |

### Voice Attributes
- **Authoritative** — cites real data, no hedging
- **Plain-spoken** — no corporate jargon
- **Civic-minded** — built for the public good
- **Texas-proud** — locality matters, lean into it
- **Non-corporate** — human, direct, a little grit

---

## 6. Taglines

| Tagline                                      | Use Case                        |
|----------------------------------------------|---------------------------------|
| **"Ask Texas anything."**                    | Primary — demo opener, hero H1  |
| "Every dataset. Any question. One answer."   | Pitch decks, feature headers    |
| "Texas data, finally fluent."                | Social, short-form              |
| "The AI layer Texas public data never had."  | Problem framing, judge pitches  |

---

## 7. UI Component Patterns

### Cards
```css
background: var(--tx-cream);
border: 0.5px solid var(--tx-border);
border-radius: 10px;
padding: 16px 20px;
```

### Primary Button (CTA)
```css
background: var(--tx-rust);
color: white;
font-family: 'Syne', sans-serif;
font-weight: 700;
font-size: 14px;
border-radius: 8px;
padding: 10px 20px;
border: none;
```

### Query Input
```css
font-family: 'IBM Plex Mono', monospace;
font-size: 14px;
background: var(--tx-navy);
color: var(--tx-cream);
border: 0.5px solid rgba(58,127,190,0.4);
border-radius: 8px;
padding: 12px 16px;
caret-color: var(--tx-gold);
```

### Dataset Insight Badge
```css
background: var(--tx-gold-light);
color: var(--tx-gold);
font-family: 'IBM Plex Mono', monospace;
font-size: 11px;
font-weight: 600;
letter-spacing: 0.08em;
padding: 4px 12px;
border-radius: 100px;
border: 0.5px solid rgba(212,139,16,0.3);
```

### Dark Hero Section
```css
background: var(--tx-navy);
/* Optional subtle radial glow */
background-image:
  radial-gradient(circle at 80% 30%, rgba(58,127,190,0.18) 0%, transparent 55%),
  radial-gradient(circle at 10% 80%, rgba(196,66,10,0.12) 0%, transparent 50%);
```

---

## 8. Logo SVG (Inline, Dark Background)

```svg
<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
  <!-- Star mark -->
  <polygon
    points="20,6 22.5,13 30,13 24,17.5 26.5,25 20,20.5 13.5,25 16,17.5 10,13 17.5,13"
    fill="none" stroke="#D48B10" stroke-width="1.2" stroke-linejoin="round"/>
  <circle cx="20" cy="15.5" r="1.5" fill="#D48B10"/>
  <!-- Data nodes -->
  <line x1="20" y1="25" x2="20" y2="33" stroke="rgba(58,127,190,0.5)" stroke-width="0.5"/>
  <line x1="20" y1="29" x2="13" y2="35" stroke="rgba(58,127,190,0.4)" stroke-width="0.5"/>
  <line x1="20" y1="29" x2="27" y2="35" stroke="rgba(58,127,190,0.4)" stroke-width="0.5"/>
  <circle cx="20" cy="34" r="1.5" fill="#3A7FBE"/>
  <circle cx="12.5" cy="36" r="1.5" fill="#3A7FBE"/>
  <circle cx="27.5" cy="36" r="1.5" fill="#3A7FBE"/>
  <!-- Wordmark: TX in gold, Lookup in white -->
  <text x="38" y="26"
    font-family="'Syne',sans-serif" font-size="22" font-weight="800"
    fill="#D48B10" letter-spacing="1">TX</text>
  <text x="68" y="26"
    font-family="'Syne',sans-serif" font-size="22" font-weight="400"
    fill="#FAF7F2" letter-spacing="0.5">Lookup</text>
  <!-- Tagline -->
  <text x="38" y="38"
    font-family="'IBM Plex Mono',monospace" font-size="7" font-weight="400"
    fill="rgba(255,255,255,0.35)" letter-spacing="1.5">TEXAS PUBLIC INTELLIGENCE</text>
</svg>
```

---

## 9. Judge Pitch Cheatsheet

Use this order when demoing or pitching:

1. **Problem** — "Texas has 130+ public datasets. None of them are queryable in plain English."
2. **Demo hook** — *"Ask Texas anything."* → type a real question live
3. **Differentiator** — "We pre-harvest insights per dataset — so even before you ask, the system already knows what's interesting."
4. **Agentic angle** — "This isn't just RAG. It plans, queries, and synthesizes across multiple datasets in one shot."
5. **Close** — "TXLookup is the AI layer Texas public data never had."

---

## 10. File & Asset Naming

```
logo-dark.svg          — Star mark + wordmark on navy
logo-light.svg         — Star mark + wordmark on cream
logo-mark.svg          — Star + nodes only (no wordmark)
favicon.svg            — Star mark, 32×32
og-image.png           — 1200×630, navy bg, centered logo + tagline
```

---

*Last updated: May 2026 · TXLookup Hackathon Edition*
