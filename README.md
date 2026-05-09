# TXLookup — Voice-Driven Autonomous Task Agent

**AITX Community x Codex Hackathon | May 8-10, 2026 | Antler VC, Austin TX**

**Track:** Agents Track (Reason, Plan, Tool Use, Complete)
**Bounty:** Miro MCP Integration ($500)

## What It Does

TXLookup is a voice-driven autonomous agent that takes a spoken goal, breaks it into steps, interacts with web services and APIs, and completes real tasks — not just answers questions.

You speak. It plans. It acts. It delivers.

### Example Flows
- "Research the top 5 AI startups in Austin and put them on a Miro board"
- "Fill out this job application using my resume"
- "Find open permits in my neighborhood and summarize the trends"
- "Plan my errands for Saturday, check store hours, and map the route"

## Architecture

```
┌─────────────────────────────────────────┐
│                  UI                      │
│         (Next.js + Voice Input)          │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│              Context Layer               │
│    (Goal → Break → Plan → Execute)       │
└─────────┬──────────┬────────────────────┘
          │          │
┌─────────▼──┐ ┌────▼─────┐ ┌───────────┐
│   Agents   │ │   APIs   │ │    MCP    │
│            │ │          │ │  Servers  │
│ - Planner  │ │ - Web    │ │ - Miro    │
│ - Browser  │ │ - Search │ │ - Data    │
│ - Writer   │ │ - LLM    │ │ - Tools   │
└─────────┬──┘ └────┬─────┘ └─────┬─────┘
          │          │             │
┌─────────▼──────────▼─────────────▼──────┐
│                  DB                      │
│     (Task state, results, context)       │
└─────────────────────────────────────────┘
```

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Voice:** Web Speech API / Gemini Live API
- **Agent Engine:** OpenAI Codex + GPT-4o for reasoning
- **Browser Automation:** Playwright (headless web interaction)
- **MCP Servers:** Miro MCP, custom tool servers via FastMCP
- **Database:** Supabase for task state
- **Deployment:** Vercel (frontend) + local agent runtime

## Quick Start

```bash
# Clone
git clone https://github.com/ATX-TXLookup/TXLookup.git
cd TXLookup

# Frontend
npm install
cp .env.example .env  # Add your API keys
npm run dev

# Agent runtime (separate terminal)
pip install -r requirements.txt
python agent/main.py

# MCP server (separate terminal)
python mcp/server.py
```

## Judging Criteria

| Criteria | How We Hit It |
|----------|--------------|
| **Reason** | LLM parses goal, extracts intent and constraints |
| **Plan** | Decomposes into ordered steps with fallbacks |
| **Tool Use** | Playwright browser, Miro MCP, web search APIs |
| **Complete** | Delivers organized Miro board + text summary |

## Contributing

We welcome both human and AI agent contributors. See:
- [`AGENTS.md`](AGENTS.md) — Instructions for AI agents (Codex, Claude Code, Cursor)
- [`CLAUDE.md`](CLAUDE.md) — Claude Code specific context
- [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) — PR template
- [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) — Issue templates

### For Humans
1. Open an issue describing what you want to build
2. Label it `human` or `agent-task` depending on who should do it
3. Submit a PR using the template

### For AI Agents
1. Read `AGENTS.md` first
2. Pick an issue labeled `agent-task` or `good-first-issue`
3. Create a branch, implement, open a PR

## Miro Integration

The agent creates and populates Miro boards as visual output:
- Research results organized with frames and color-coded stickies
- Task progress boards (To Do / In Progress / Done)
- Data visualizations with cards and connectors

## Team

- **Ravinder Jilkapally** — Principal Consultant, AISOFT LLC
  - 6 hackathons, 1st place DGX Spark (Undervolt), Runner-up GTC (Studio Copilot)
  - Built: RefereAI, Sideline, CoachClaw, StudyPal, Applly, HD Research Hub

## License

MIT
