# Lessons — captured live

Capture lessons as we hit them, not at the end. A 3am post-mortem is too late.

## Format

```
### YYYY-MM-DD HH:MM — short title
**What happened:** one paragraph
**What we did:** one paragraph
**Lesson:** one line, actionable for next time
```

---

## Pre-event lessons (synthesized from prior project work)

### Coordination
- Real civic data at scale wins. Volume + locality = authenticity judges can smell.
- Pre-cache demo results. Live API uptime is not your friend during a demo.
- Find the submission form on day 0, not 4:45pm Sunday.
- One person owns the merge button. Parallel agent commits = merge conflicts at the worst time.
- Strip model internals from UI (no `<think>` tags, no raw JSON).

### Infra
- Lazy-init clients (Supabase, Miro) at request time, not module load. Vercel cold starts will burn you.
- Secrets in env vars from commit #1. Don't pay it back later.
- Tight PR hygiene wins. Aim for short-lived branches and same-day merges.
- Vercel auto-deploy from `main`, configured day 1.

### Agent loop
- **Doom-loop detection:** flag 3+ identical tool calls (name + args hash); flag repeating `[A,B,A,B]` sequences. Inject corrective system prompt: *"STOP this cycle, try a fundamentally different approach."*
- **Context compaction** at ~150k tokens. Trim middle, preserve first 5 messages.
- **Exponential backoff** on transient errors (5s/15s/30s). Don't retry context-window errors — they're fatal.
- **Validate tool args before execution** — LLMs sometimes pass strings where dicts are expected.
- **Queue-based event loop**, not blocking calls.
- **Per-step timeouts.** Every tool call gets a deadline.

### Cloud APIs
- Validate cloud-API invoke path day 0, not just the `list models` endpoint. "Discoverable ≠ inferable."
- Have a quantized / local fallback staged before the event.
- Persistent session state file (e.g. `log.md` per worktree) beats issue-tracker for AI/human handoff.
- Encrypt session secrets at boot, persist to disk — don't regenerate per deploy.

### Stack
- FastMCP + Pydantic models is the production-grade MCP stack.
- Config in `~/.txlookup/`, not in the repo.
- Tailwind via CDN for the prototype UI — no build step pain.
- Background pollers spawned on `@app.on_event("startup")`.

---

## In-event lessons

<!-- Append new entries below. Newest first. -->
