# Agents — how Codex makes TXLookup work

> The story we tell judges on the **Partner Ecosystem & Utility** axis (25 points).

## TL;DR

TXLookup is a Codex-powered agent that turns plain-English Texas-civic-data questions into cited, visual answers. **Codex is the brain.** The MCP server is the body (the tools Codex calls). The Next.js UI is the face. Any other Codex agent on the planet can install our MCP and get Texas open-data superpowers.

## The agent loop, in one paragraph

A user types or speaks a question (e.g. "What permits were issued for food trucks in 78702 in the last 6 months?"). The orchestrator hands it to **Codex** with the planner system prompt (`prompts/planner.md`). Codex returns a structured plan — `[discover, describe, summarize, cite]` — with concrete arguments (which dataset, which `$where`, which dimensions). The executor dispatches each step to the MCP server. The MCP tools call Socrata, get records, and return them. The synthesizer hands the records back to Codex with the writer prompt; Codex produces a plain-English summary with the dataset citation and (for the demo flow) writes a Miro board with frames, sticky notes, and a chart. The user sees REASON → PLAN → TOOL → COMPLETE chips light up live as Codex drives the loop.

## What exactly is "Codex" doing?

Five concrete responsibilities. Each is a real OpenAI API call (model: `gpt-4o` for v1, with `o1` for the planner if budget allows).

| Step | Prompt | Codex output |
|---|---|---|
| **Reason** | `prompts/planner.md` | Structured intent: `{intent, data_domain, geography, time_range, analysis_type}` |
| **Plan** | `prompts/planner.md` | Ordered list of `{tool, args}` steps |
| **Execute** | (no LLM — direct tool dispatch) | — |
| **Recover** | `prompts/planner.md` (replan mode) | New plan if a step failed |
| **Complete** | `prompts/writer.md` | Plain-English summary + Miro board layout JSON |

Structured-output mode (`response_format={"type": "json_schema"}`) is used everywhere — no string parsing, no `<think>` tags leaking into the UI.

## Why this scores on Partner Ecosystem

Judges ask: *"Did you leverage the unique tools and software provided?"* Our answer is concrete:

| Sponsor / Tool | How TXLookup uses it |
|---|---|
| **Codex** (OpenAI) | The agent's reasoning, planning, replanning, and synthesis. Five distinct LLM-driven roles. |
| **Featherless** | Fallback for prompt iteration during development — cheap inference for tuning the planner without burning OpenAI credits. |
| **Miro MCP** | Visual output for the demo — the agent writes a board with frames per zip, color-coded sticky permits, a summary card. (Miro $500 bounty.) |
| **Apify** | Used only if a Texas data source isn't on a Socrata portal — Apify Actors as the scraping fallback. (Avoid otherwise — Socrata covers it.) |

We don't *just* use Codex as a chat wrapper. We use it as the **routing brain of an agent that interacts with multiple external systems**. That's exactly the bar the Agents Track sets: *"systems that do work, not just answer questions."*

## Where the Codex calls live in the code

- **`agent/planner.py`** (issue #10) — Reason + Plan + Replan. Calls OpenAI with structured outputs.
- **`agent/executor.py`** (issue #11) — Dispatches plan steps to the MCP server. NOT an LLM call (deterministic).
- **`agent/synthesizer.py`** (issue tbd) — Complete. Calls OpenAI with the writer prompt.
- **`agent/main.py`** — The orchestrator. Manages the loop, tracks tool-call history, runs the doom-loop guard (#12), surfaces phase events to the UI.

Every Codex call is logged to the agent's `log.md` (per `AGENTS.md` "Logging convention") so we have an audit trail for the demo.

## How we use Codex *during the build* (also a story we tell)

- **Issues are Codex-pickup-able.** Each engineering issue (#4-#16) has a clear Definition of Done, files to touch, and acceptance criteria — designed so a Codex CLI session can claim it and ship a PR.
- **`AGENTS.md`** is the contributor doc Codex reads at the start of every session.
- **`CLAUDE.md`** does the same for Claude Code.
- **The skill document** at `skills/txlookup/SKILL.md` is the unified policy — both Codex and Claude follow the same trigger phrases and safety rules.
- **The 4 parallel build agents** we tried for issues #4 / #5 / #13 / #15 were a real test of using Codex/Claude to fan out work in worktrees. (#5 shipped; the others hit a sandbox wall and were finished in main session.)

## Demo moment for Codex

In the 3-minute demo, when the user types Sarah's question and hits Enter:

1. **REASON chip lights up (peach).** Live OpenAI API call shown briefly in the agent step trace.
2. **PLAN chip lights up.** Codex's structured plan rendered in the side pane (small, mono): `[discover, describe, summarize, cite]`.
3. **TOOL chip lights up four times** as the executor dispatches each step. Live SSE updates from `/api/agent`.
4. **COMPLETE chip lights up green.** Codex's plain-English answer renders in the result card with the citation block beneath.
5. **Miro board fills in** alongside — frames, color-coded stickies. Optional but high-impact.

The judge sees: *Codex reasoning, Codex planning, real tools running, real data, real citation, real visual output.* Not a chatbot.

## Open questions (decide before Saturday)

1. Use `gpt-4o` everywhere, or `o1` for the planner + `gpt-4o-mini` for the synthesizer to save credits?
2. Do we cache Codex responses for the demo flow (in case rate limits / network blip during demo)? Recommend: yes, pre-cache one persona per persona.
3. Show the actual Codex prompt + response somewhere in the UI for transparency, or hide it?

## See also

- [`docs/architecture.md`](architecture.md) — full layered diagram including the Models layer
- [`prompts/planner.md`](../prompts/planner.md) — the planner system prompt
- [`docs/event.md`](event.md) — judging criteria including Partner Ecosystem axis
- [`skills/txlookup/SKILL.md`](../skills/txlookup/SKILL.md) — the deliverable agent skill
