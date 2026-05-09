# CLAUDE.md — Claude Code Context

> This file is automatically read by Claude Code when working in this repo.

## Project: TXLookup

Voice-driven autonomous task agent. Speaks a goal, plans steps, executes with tools, delivers results on Miro boards.

**Hackathon:** AITX Community x Codex Hackathon (May 8-10, 2026)
**Track:** Agents Track — Reason, Plan, Tool Use, Complete
**Bounty:** Miro MCP Integration ($500)

## Quick Context

- Frontend: Next.js 14 App Router in `app/`
- Agent runtime: Python 3.11+ async in `agent/`
- MCP server: FastMCP in `mcp/`
- Prompts: Markdown system prompts in `prompts/`
- Config: Model routing in `config/`

## Core Loop

```
Goal → Reason → Plan → Execute (with tools) → Complete
```

If a step fails, the agent replans from the failure point. Max 3 retries per step, 10 steps per plan.

## Coding Conventions

### Python (`agent/`, `mcp/`)
- Always `async/await` — the agent is concurrent
- Type hints on every function signature
- Pydantic models for structured data (plans, results, task state)
- Every tool returns `{"status": "completed|failed", "result": ..., "artifacts": [...]}`
- Try/except with structured error returns — never crash the loop
- Imports at top, no inline imports except for optional deps

### TypeScript (`app/`)
- Next.js 14 App Router — use `app/` directory, not `pages/`
- React Server Components where possible
- Tailwind CSS, no CSS modules
- No `localStorage` — use React state or server state

### Both
- Commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- TODOs: `# TODO: Codex —` or `// TODO: Codex —`
- Never commit `.env` or API keys
- Keep the agent loop simple — complexity goes in tools, not the orchestrator

## Key Files

| File | Purpose |
|------|---------|
| `agent/main.py` | Orchestrator — the brain |
| `agent/planner.py` | LLM-powered task decomposition |
| `agent/executor.py` | Step execution with tool dispatch |
| `agent/tools/*.py` | Individual tool implementations |
| `mcp/server.py` | FastMCP server exposing agent as MCP tools |
| `prompts/*.md` | System prompts for each agent role |
| `app/page.tsx` | Main voice interface |
| `app/api/agent/route.ts` | POST endpoint for goal submission |

## Environment Variables

```
OPENAI_API_KEY     — Codex / GPT-4o
GEMINI_API_KEY     — Voice (Gemini Live API)
MIRO_API_TOKEN     — Miro board operations
MIRO_BOARD_ID      — Default board
SUPABASE_URL       — Task state storage
SUPABASE_KEY       — Supabase anon key
FEATHERLESS_API_KEY — Open-source model inference
FAL_API_KEY        — Image/video generation
```

## Running Locally

```bash
npm install && npm run dev          # Frontend on :3000
pip install -r requirements.txt     # Python deps
python agent/main.py                # Agent runtime
python mcp/server.py                # MCP server
```

## Reference Repos

These sibling repos have working code to pull from:
- `../studypal/` — Gemini Live voice, WebSocket, Playwright
- `../homenest/mcp_server.py` — FastMCP server (working example)
- `../job_copilot/` — LiteLLM multi-model routing
- `../ml-intern/` — Agentic loop with doom loop detection
- `../hd-research-agent/` — Multi-agent autonomous research

## What NOT to Do

- Don't add new top-level directories without updating AGENTS.md
- Don't use synchronous I/O in the agent runtime
- Don't hardcode API keys or board IDs
- Don't skip error handling on tool calls
- Don't make the orchestrator complex — push logic to tools
