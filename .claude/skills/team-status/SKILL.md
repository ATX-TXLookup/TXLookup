---
name: team-status
description: Use when you (human or AI agent) need a quick read of the team's current state — what's in flight, what's blocked, what's stalled, what's done today. Trigger phrases — "team status", "what's the state", "where are we", "what's blocked", "standup", "give me a status", any time someone joins the session and asks "what's the team up to right now".
---

# team-status

Quick read of the team's current state, ready to paste into a chat or the pinned tracking issue.

## When to use

- Joining a work session ("where are we?")
- Anyone says "standup", "status", "where are we"
- Before deciding what to pick up next (so you know what's covered)
- Before merging a contentious PR (check nobody else is mid-flight on the same area)

## What to gather

Run these in parallel:

```bash
REPO=ATX-TXLookup/TXLookup

# In flight
gh issue list --repo $REPO --label claimed --json number,title,assignees,labels,updatedAt --limit 30

# Blocked
gh issue list --repo $REPO --label blocked --json number,title,assignees,labels,updatedAt --limit 30

# Ready (pickup pool)
gh issue list --repo $REPO --label ready --json number,title,labels --limit 30

# Recent merges (last 24h)
gh pr list --repo $REPO --state merged --search "merged:>$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)" --json number,title,mergedAt --limit 30

# Open PRs awaiting review
gh pr list --repo $REPO --state open --json number,title,author,reviewDecision --limit 30
```

## What to look for (and flag)

### Stalled — `claimed` but no activity > 4 hours
The issue's `updatedAt` is the last event. If it's stale and there's no PR open, the assignee is either heads-down (likely) or stuck (also likely). Surface it:

> ⚠️ #N (assignee) — claimed 5h ago, no PR, no progress comment. Check in?

### Blocker pile-up
If 3+ issues are `blocked` waiting on the same thing, that thing is the team's #1 problem. Call it out by name.

### Pickup pool too small
If `ready` count drops below 3, the team will run out of work soon. Flag — someone needs to spec the next batch.

### Open PRs aging
If a PR is open > 2 hours without a review, surface it. Hackathon merge cadence should be tight.

## Output format

Format the read as a markdown blob suitable for pasting into the pinned tracking issue or a chat:

```
## Status — <YYYY-MM-DD HH:MM CT>

### In flight (N)
- #12 (alice) — discover() tool [area:mcp]
- #15 (bob)   — Sarah persona view [area:frontend]
- ...

### Blocked (N)
- #18 (carol) — Miro write path — waiting on MIRO_API_TOKEN

### Ready to pick up (N)
- #21 — implement summarize() [area:mcp, p0]
- #23 — citation block component [area:frontend, p1]
- ...

### Merged today (N)
- ✅ #11 — Socrata client skeleton (PR #14)
- ...

### PRs awaiting review (N)
- #17 — feat: data catalog loader (alice → needs review)

### ⚠️ Attention
- #15 claimed 5h ago, no progress — check on bob
- 3 issues blocked on missing API tokens — resolve credentials
```

## Cadence

Drop a fresh status into the pinned tracking issue at:
- Start of each work session (morning, after lunch, evening kickoff)
- Before any team sync
- When something material changes (big merge, blocker resolved, scope decision)

Don't post status comments more than ~4x/day in the tracking issue — too noisy.

## For AI agents

Run this skill when:
- A user asks about "the team" or "where are we"
- You finish your own task (pickup-next will run anyway, but a status check first helps you pick well)
- You're about to spawn parallel sub-agents (so you don't dispatch into a blocker)

Identify yourself in any posted status: `[claude-code]` or `[codex]`.

## Anti-patterns

- Don't post status without action — every status should call out at least one thing that needs human attention, or say "all green"
- Don't generate status from stale local context — always re-fetch from `gh`
- Don't paste raw JSON — humanize it
