# Miro board template — what the agent generates

> Ships the **$500 Miro bounty** + the demo wow moment. Read before implementing issue #16.

The agent generates one Miro board per persona query during the demo. The board is the visual answer — judges see it materialize in real time as the Reason → Plan → Tool → Complete loop runs.

This doc specifies the board layout so issue #16 (`agent/tools/miro.py`) and the synthesizer (the "Complete" step) can implement it deterministically.

## Two boards, two purposes

| Board | When generated | Audience |
|---|---|---|
| **Result Board** | Live, during a persona demo | Judges, end users |
| **Brainstorm Board** | Once, on team kickoff | Team coordination |

The Result Board is the bounty deliverable. The Brainstorm Board is internal — same toolkit, used differently.

---

## Result Board — Marcus's permits-by-zone (the demo flow)

User question: *"What permits were issued for food trucks in 78702 in the last 6 months?"*

The agent generates a board with **6 frames in a 2-column grid**, plus a header band. Total board canvas ~3000×2000.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ HEADER FRAME                                                              │
│ "Food truck permits in 78702 — Nov 5 2025 → May 5 2026"                  │
│ Sub: "47 permits issued · 3 categories · 22% above 6-mo avg"             │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐  ┌──────────────────────────────────────┐
│ FRAME 1 — Mobile Food Vendor   │  │ FRAME 2 — Food Truck Parking         │
│ (24 stickies, signal-pass green)│  │ (15 stickies, signal-pass green)    │
│ each: "BP-2026-04812           │  │ each: "BP-2026-04501                │
│        1845 E 6th St"          │  │        1502 E 7th St"               │
└─────────────────────────────────┘  └──────────────────────────────────────┘

┌─────────────────────────────────┐  ┌──────────────────────────────────────┐
│ FRAME 3 — Temporary Event Food │  │ FRAME 4 — Expiring Soon (next 30d)  │
│ (8 stickies, signal-pass)      │  │ (3 stickies, signal-warn amber)     │
└─────────────────────────────────┘  └──────────────────────────────────────┘

┌─────────────────────────────────┐  ┌──────────────────────────────────────┐
│ FRAME 5 — Timeline strip       │  │ FRAME 6 — Summary card               │
│ horizontal Gantt, bluebonnet    │  │ "What this means" — 3 bullets +     │
│ bars per permit by issue_date   │  │ filters used + citation block       │
└─────────────────────────────────┘  └──────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ FOOTER — Citation block                                                   │
│ Source: City of Austin · Issued Construction Permits (3syk-w9eu)         │
│ Last refreshed: 2026-05-08 14:00 CT · Open dataset →                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Frames spec

| # | Title | Type | Color rule | Position (x, y, w, h) |
|---|---|---|---|---|
| 0 | Header band | rectangle + text | inverse-surface bg, light text | `(0, 0, 3000, 200)` |
| 1 | Mobile Food Vendor | frame | header in primary-fixed peach | `(50, 250, 1450, 700)` |
| 2 | Food Truck Parking | frame | header in primary-fixed peach | `(1500, 250, 1450, 700)` |
| 3 | Temporary Event Food | frame | header in primary-fixed peach | `(50, 970, 1450, 500)` |
| 4 | Expiring Soon | frame | header in signal-warn-fixed amber | `(1500, 970, 1450, 500)` |
| 5 | Timeline | frame | header in secondary-fixed bluebonnet | `(50, 1490, 1450, 400)` |
| 6 | What this means | frame | header in surface-container stone | `(1500, 1490, 1450, 400)` |
| 7 | Citation footer | rectangle + text | surface-container bg, mono text | `(0, 1910, 3000, 90)` |

### Sticky note rules

Each permit becomes one sticky. Color depends on permit status:

| Status | Sticky color (Miro palette) | Hex |
|---|---|---|
| `Issued` | `green` | `#1E7A47` |
| `Expiring soon` | `yellow` | `#A06200` |
| `Revoked` / `Failed` | `red` | `#A0231C` |

Sticky content (concise — Miro stickies are small):
```
BP-2026-04812
1845 E 6th St
Issued 2026-03-15
```

Permit ID in mono-feeling first line. Address bold. Issue date small.

### Synthesizer prompt addition

When generating the board, the synthesizer (Complete step) emits a JSON layout instead of free-form text. The MCP `agent/tools/miro.py` consumes that JSON. Schema:

```json
{
  "board": {
    "name": "Food truck permits in 78702 — Nov 5 → May 5",
    "description": "47 permits across 3 categories",
    "frames": [
      {
        "title": "Mobile Food Vendor",
        "x": 50, "y": 250, "width": 1450, "height": 700,
        "header_color": "primary-fixed",
        "stickies": [
          {
            "content": "BP-2026-04812\n1845 E 6th St\nIssued 2026-03-15",
            "color": "green",
            "x": 100, "y": 350
          }
        ]
      }
    ],
    "citation": {
      "portal": "City of Austin",
      "dataset_name": "Issued Construction Permits",
      "dataset_id": "3syk-w9eu",
      "url": "https://data.austintexas.gov/Building-and-Development/Issued-Construction-Permits/3syk-w9eu",
      "last_refreshed": "2026-05-08T14:00:00Z"
    }
  }
}
```

### What the user sees

1. Demo starts on the Next.js result page (left half of screen)
2. Codex returns the plan → MCP tools fetch records from Socrata
3. As records come back, the synthesizer streams the layout JSON
4. **Live in the right half: the Miro board fills frame by frame**
   - Header lands first
   - Frames materialize empty
   - Stickies pop in one by one as the executor pages through records
   - Timeline bars draw last
   - Citation footer lands
5. Judge can pan/zoom the board after the demo finishes

The pop-in cadence is deliberate — judges should *feel* the agent generating, not watch a static board appear.

---

## Brainstorm Board — team coordination (Brainstorm)

Same Miro toolkit, different use. Generated once on kickoff. Mirrors the kickoff whiteboard but live-updatable.

### Frames

| # | Title | Content |
|---|---|---|
| 1 | Architecture | Layered diagram from `docs/architecture.md` rendered as boxes + arrows |
| 2 | Personas | Sarah / Marcus / Jordan with their hero queries (3 stickies each, color = persona) |
| 3 | Path to demo | Working-backward timeline from `docs/plan.md` — Sat 7pm checkpoint, Sun 11am freeze |
| 4 | How we work | Pickup → claim → branch → PR → merge flow (per `CONTRIBUTING.md`) |
| 5 | Open questions | Anything from `docs/plan.md` "Open questions" — sticky per question |

This board is the live whiteboard. Anyone can edit it during the build. Decisions made on the board get codified back into `docs/`.

---

## Implementation hand-off (issue #16)

`agent/tools/miro.py` should expose:

```python
async def create_board(name: str, description: str = "") -> dict:
    """Returns {board_id, view_link}."""

async def add_frame(board_id: str, title: str, x: int, y: int,
                    width: int, height: int, header_color: str = "stone") -> dict:
    """Returns {frame_id}."""

async def add_sticky(board_id: str, content: str, color: str,
                     x: int, y: int, frame_id: str | None = None) -> dict:
    """Returns {sticky_id}."""

async def add_card(board_id: str, title: str, description: str,
                   x: int, y: int, frame_id: str | None = None) -> dict:
    """Returns {card_id}."""

async def render_board_from_layout(board_id: str, layout: dict) -> dict:
    """Apply a complete layout JSON (the synthesizer's output) to a board.
    Returns {board_id, view_link, items_created}.
    """
```

All four primitives wrap the corresponding Miro MCP tools (`mcp__miro__*`). The fifth (`render_board_from_layout`) is the high-level call the synthesizer uses — it iterates frames + stickies + cards in the layout JSON and dispatches the primitives.

### Auth precondition

The Miro MCP at `.mcp.json` must be authenticated (`/mcp auth`) by whoever runs the agent. The agent itself does NOT carry a Miro API token — it relies on the MCP layer's OAuth.

### Color name → Miro palette mapping

| Token name | Miro `color` value |
|---|---|
| `green` | `green` |
| `yellow` | `yellow` |
| `red` | `red` |
| `primary-fixed` (peach) | `light_yellow` |
| `secondary-fixed` (soft blue) | `light_blue` |
| `stone` (default) | `gray` |

Miro's sticky palette is: `gray`, `light_yellow`, `yellow`, `orange`, `light_green`, `green`, `dark_green`, `cyan`, `light_blue`, `blue`, `dark_blue`, `violet`, `light_pink`, `pink`, `red`, `light_yellow`, `black`. Use `light_*` variants for soft signal-fixed backgrounds, full saturation for active signal states.

---

## Test plan for #16 (when built)

- [ ] `create_board("Test")` returns a board_id + working URL
- [ ] `add_frame(...)` lands a frame visible in the Miro UI
- [ ] `add_sticky(...)` lands a sticky in the right color + position
- [ ] `render_board_from_layout(...)` with a sample 2-frame, 4-sticky layout completes in < 5 seconds
- [ ] Manual: dry-run Marcus's full flow → board renders end-to-end
- [ ] Screenshot of the rendered Marcus board committed to `tests/screenshots/issue-16-marcus-board.png`

---

## Open questions

1. Stickies pop in one at a time vs. batch? Batch is faster but less dramatic on demo. Recommend batch with a 200ms artificial pause between frames for visual rhythm.
2. Pre-render a "loading" board with empty frames before the agent starts, or build from empty? Latter is more impressive; former is more reliable.
3. Persistent Miro board per demo run, or fresh board each time? Fresh is cleaner for judges; persistent is easier to recover if the demo crashes.

Decide before Saturday.

---

## See also

- [`docs/architecture.md`](architecture.md) — how the synthesizer fits in the loop
- [`docs/agents-strategy.md`](agents-strategy.md) — Codex generates the layout JSON
- [`skills/txlookup/SKILL.md`](../skills/txlookup/SKILL.md) — citation rules apply to the board too
- [`docs/event.md`](event.md) — Miro $500 bounty details + Miro MCP install
