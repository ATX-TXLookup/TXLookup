# AGENTS.md — Instructions for AI Coding Agents

> This file is read by OpenAI Codex, Claude Code, Cursor, and other AI agents.
> It defines how agents should work in this repo alongside human contributors.

## Project: TXLookup

TXLookup is a voice-driven autonomous task agent built at the AITX Community x Codex Hackathon (May 8-10, 2026). It takes spoken goals, breaks them into steps, executes them using tools (browser automation, APIs, MCP servers), and delivers results — including visual outputs on Miro boards.

**Track:** Agents Track (Reason, Plan, Tool Use, Complete)  
**Bounty:** Miro MCP Integration ($500)

## Architecture

```
Voice Input → Goal Parser → Task Planner → Step Executor → Output Synthesizer
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                         Browser Tool    Miro MCP Tool    Search Tool
                         (Playwright)    (FastMCP)        (Web APIs)
```

### Core Loop: Goal → Break → Interact → Complete

1. **Reason** — Parse the user's goal, extract intent and constraints
2. **Plan** — Decompose into ordered, executable steps with fallbacks
3. **Execute** — Run each step using the appropriate tool
4. **Complete** — Synthesize results and deliver (text, Miro board, file)

## Directory Structure

```
TXLookup/
├── AGENTS.md              # THIS FILE — agent instructions
├── CLAUDE.md              # Claude Code specific context
├── README.md              # Human-readable project overview
├── HACKATHON.md           # Hackathon battle plan & demo script
├── app/                   # Next.js 14 frontend (App Router)
│   ├── page.tsx           # Main voice interface
│   ├── layout.tsx         # App layout with metadata
│   └── api/               # API routes
│       └── agent/route.ts # POST endpoint for goal submission
├── agent/                 # Python agent runtime
│   ├── main.py            # Orchestrator — the Goal→Break→Interact loop
│   ├── planner.py         # LLM-powered task decomposition
│   ├── executor.py        # Step execution with tool dispatch
│   ├── tools/             # Tool implementations
│   │   ├── __init__.py
│   │   ├── browser.py     # Playwright web automation
│   │   ├── search.py      # Web search via APIs
│   │   ├── writer.py      # Content generation
│   │   └── miro.py        # Miro board operations
│   └── memory.py          # Task state, context, history
├── mcp/                   # MCP server (FastMCP)
│   ├── server.py          # MCP tool definitions
│   └── tools.py           # Shared tool logic
├── prompts/               # System prompts for each agent role
│   ├── planner.md         # Planning agent prompt
│   ├── executor.md        # Execution agent prompt
│   ├── browser.md         # Browser automation prompt
│   └── miro.md            # Miro layout agent prompt
├── config/
│   └── models.yaml        # Model routing configuration
├── docs/                  # Additional documentation
│   └── miro-integration.md
├── .github/               # GitHub collaboration templates
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
├── package.json
├── requirements.txt
├── .env.example
└── .gitignore
```

## Coding Standards

### Python (agent/, mcp/)
- Python 3.11+
- Async/await everywhere — the agent is concurrent
- Type hints on all function signatures
- Pydantic models for structured data
- Every tool function must return a dict with `status`, `result`, and optional `artifacts`
- Error handling: try/except with structured error returns, never crash the loop

### TypeScript (app/)
- Next.js 14 App Router conventions
- React Server Components where possible
- Tailwind CSS for styling
- No `localStorage` — use React state

### General
- Commit messages: `feat:`, `fix:`, `docs:`, `refactor:` prefixes
- One feature per PR, linked to an issue
- All TODOs are marked with `# TODO: Codex —` or `// TODO: Codex —`
- Never commit `.env` files or API keys

## How to Contribute (for agents)

1. **Read this file first** — understand the architecture before writing code
2. **Check existing issues** — pick one labeled `good-first-issue` or `codex`
3. **Create a branch** — `feat/tool-name` or `fix/description`
4. **Implement with tests** — at minimum, the happy path should work
5. **Open a PR** — use the PR template, reference the issue
6. **Keep changes focused** — don't refactor unrelated code in the same PR

## How to Contribute (for humans)

1. Open an issue describing what you want to build or fix
2. Label it: `agent-task` if Codex should do it, `human` if you'll do it
3. Assign yourself or leave unassigned for anyone to pick up
4. Use the PR template when submitting
5. Review agent-generated PRs before merging

## Tool Implementation Pattern

```python
from typing import Dict, Any

async def tool_name(param1: str, param2: int = 0) -> Dict[str, Any]:
    """
    Clear description of what this tool does.
    
    Args:
        param1: What this parameter controls
        param2: Optional parameter with default
    
    Returns:
        Dict with status, result, and optional artifacts
    """
    try:
        # Implementation here
        result = await do_the_thing(param1, param2)
        return {
            "status": "completed",
            "result": result,
            "artifacts": []  # URLs, file paths, board IDs
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e),
            "result": None
        }
```

## Reference Repos

These sibling repos have working code to reference:
- `../studypal/` — Gemini Live voice, WebSocket, Playwright browser automation
- `../homenest/mcp_server.py` — FastMCP server (working example)
- `../job_copilot/` — LiteLLM multi-model routing, agentic job search
- `../ml-intern/` — Agentic loop with doom loop detection
- `../hd-research-agent/` — Multi-agent autonomous research system

## Priority Build Order

1. Scaffold Next.js frontend with voice input (mic button, transcript, task cards)
2. Python agent orchestrator with planner + executor loop
3. Browser tool (Playwright) for web automation
4. Miro MCP integration — create boards, add items, organize outputs
5. FastMCP server exposing agent capabilities
6. End-to-end demo flow: voice → plan → execute → Miro board
