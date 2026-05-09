# Personas — who TXLookup is built for

The Brainforge / Vicinity Open Data track scores on four axes (per the kickoff whiteboard): **Approachable**, **Visual Interface**, **NLI**, and **Persona Driven**. This doc nails down the personas so every UI decision, prompt, and demo flow has a real human on the other end.

We pick three. Each persona has a one-line identity, three hero queries the agent must nail, and a "what good looks like" success picture.

---

## 1. Sarah — Parent in 78704

> "I want to make decisions about my family without becoming a part-time data analyst."

**Context:** Mom of two, lives in South Austin, picks restaurants and parks weekly, considers school zones when looking at houses. Uses her phone, not a laptop, in the school-pickup line.

### Hero queries
1. *"Which restaurants near me failed their last inspection?"*
2. *"Show me 311 complaints in my neighborhood this month."*
3. *"What's the crime trend on streets within half a mile of my house?"*

### Success picture
- Map with color-coded markers, zoomed to her zip
- Tap a marker → plain-English summary, no jargon
- Source link visible but not in her face
- Loads in under 3 seconds on mobile

---

## 2. Marcus — Food-truck owner

> "I need to know what the city's actually doing in the zones I operate in, before it costs me money."

**Context:** Operates two trucks, applies for permits often, wants to know about competing applications, code-enforcement hot spots, and license renewal windows.

### Hero queries
1. *"What permits were issued for food trucks in 78702 in the last 6 months?"*
2. *"Are there any open code violations on the addresses where I park?"*
3. *"When does my mobile food vendor license expire and what's the renewal pattern?"*

### Success picture
- Table view with filters he can save
- Email/SMS digest of new permits in his zones
- One-click export to CSV for his accountant
- Permit timeline shown as a gantt-style strip

---

## 3. Jordan — Local journalist

> "I'm looking for the story in the data — patterns, outliers, comparisons across districts."

**Context:** Works at a community paper, beat covers city services and growth. Needs defensible numbers, dataset citations, and the ability to compare council districts.

### Hero queries
1. *"Compare 311 response times across all 10 council districts this year."*
2. *"Where are permit volumes growing fastest — by zip and quarter?"*
3. *"Which intersections had the most traffic fatalities over the last 5 years?"*

### Success picture
- Charts with axis labels, clear scales, downloadable as PNG/SVG
- Methodology + source URL in every export
- Citation block ready to paste into a story
- Easy "show me the underlying rows" toggle

---

## How personas drive the build

| Decision | Driven by |
|---|---|
| Mobile-first layout for map queries | Sarah |
| Saved-filter + digest functionality | Marcus |
| Export with citation block | Jordan |
| Plain-language summaries (no JSON in UI) | Sarah |
| District-level comparison primitives | Jordan |
| Address-list watchlists | Marcus |

## Demo script anchors

Sunday's demo opens with one of Sarah's queries (most relatable to a non-technical audience), shows Marcus's saved-filter flow (proves the agent persists context), and closes with Jordan's cross-district comparison (proves the depth — visualization on Miro board).

## Anti-personas (out of scope)

- **Researchers wanting raw bulk dumps** — use the city portal directly
- **Real-estate scrapers** — track rules forbid PII-heavy use
- **Anyone wanting realtime emergency data** — this is a reporting tool
