# Hackathon Battle Plan

## Event: AITX Community x Codex Hackathon
- **Dates:** May 8-10, 2026
- **Venue:** Antler VC, Austin TX
- **Tracks:** Agents + Open Data (combined)
- **Bounty:** Miro MCP ($500)

## Timeline
- Fri May 8, 5pm: Doors open, kickoff
- Fri May 8, 7:30pm: Hacking begins
- Sat May 9: Build day
- Sun May 10: Demos & judging

## Strategy: Two Tracks, One Agent

TXLookup hits both tracks simultaneously:
- **Agents Track** — the autonomous Reason→Plan→Execute→Complete loop
- **Open Data Track** — Texas/Austin public datasets as the data source

The agent IS the interface to open data. No manual querying, no dashboards to configure. Ask a question about Texas data, the agent figures out which datasets to pull, analyzes them, and delivers organized findings on a Miro board.

## Judging Criteria

### Agents Track
- **Reason** — Agent understands data questions and identifies relevant datasets
- **Plan** — Breaks analysis into fetch → transform → analyze → visualize steps
- **Tool Use** — Socrata API, Playwright scraping, pandas, Miro MCP
- **Complete** — Delivers finished Miro board with organized, color-coded findings

### Open Data Track
- Uses real Texas/Austin open data portals
- Demonstrates understanding of public dataset structures
- Shows practical value — answers questions people actually have about their city/state

## Demo Script (3 minutes)

### Act 1: The Problem (30s)
"Texas has thousands of public datasets — permits, inspections, 311 calls,
business filings — but they're scattered across portals and hard to query.
What if an agent could explore any dataset for you and show you what it finds?"

### Act 2: Live Demo (2min)
1. Open TXLookup UI
2. Type: "Show me all restaurant health inspection failures in downtown Austin
   in the last 6 months, organized by violation type"
3. Show the agent:
   - Reasoning: identifies data.austintexas.gov health inspection dataset
   - Planning: fetch → filter downtown zips → group by violation → sort
   - Executing: live Socrata API calls, data transformation
   - Completing: Miro board populating with frames, color-coded stickies
4. Show final Miro board — organized by violation type, color-coded by severity

### Act 3: The Tech (30s)
"Socrata SODA API for data ingestion, GPT-4o for reasoning, Playwright for
portals without APIs, Miro MCP for visual output. One agent, two tracks,
real Texas data, real results."

## Resources Available
- OpenAI Codex Pro (free at hackathon)
- Featherless — unlimited open-source model inference
- Miro MCP — early access + $500 bounty
- Fal.ai API key for image/video if needed

## Win Conditions
1. Live working demo — real data from a real Texas portal
2. Agent reasons about which dataset to use (not hardcoded)
3. Miro board created live during demo (bounty + wow factor)
4. Shows value of combining agent intelligence with open data access
5. Error recovery — agent hits a bad dataset, finds an alternative, completes
