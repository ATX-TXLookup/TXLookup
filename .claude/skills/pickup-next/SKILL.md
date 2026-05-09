---
name: pickup-next
description: Use when you (human or AI agent) are ready to start work and need to find the next issue to claim. Picks the highest-priority `ready` issue in your area, claims it, and sets up the branch. Trigger phrases — "what should I work on", "pick up next", "give me a task", "what's next", "claim an issue", any time a teammate joins the build session and asks for a task.
---

# pickup-next

Find the next issue to claim, claim it cleanly, and start the branch.

## When to use

- You (human or AI) are starting a work session and need a task
- A teammate finishes a PR and asks "what's next"
- You want to be sure you're not duplicating someone else's work

## What to do

### 1. Find the candidate issue

```bash
# Highest-priority ready issues, optionally filtered by area
gh issue list --repo ATX-TXLookup/TXLookup \
  --label "ready" \
  --search "no:assignee -label:claimed -label:blocked" \
  --json number,title,labels,milestone \
  --limit 20
```

Pick the first one matching this priority order:
1. `priority:p0` in your area (frontend / agent / data / mcp / infra / docs)
2. `priority:p0` in any area
3. `priority:p1` in your area
4. `priority:p1` in any area
5. `priority:p2` only if nothing P0/P1 is open

If you're an AI agent, prefer issues labeled `agent-task`. Skip ones labeled `human` (require human judgment).

### 2. Claim it

```bash
ISSUE=<number>
USER=<your-gh-handle>           # human: your handle. AI: claude-code or codex
gh issue comment $ISSUE --repo ATX-TXLookup/TXLookup --body "claiming — $USER"
gh issue edit $ISSUE --repo ATX-TXLookup/TXLookup --add-label "claimed" --remove-label "ready"
gh issue edit $ISSUE --repo ATX-TXLookup/TXLookup --add-assignee $USER
```

### 3. Branch off main

```bash
git fetch origin
git checkout -b feat/issue-${ISSUE}-<short-slug> origin/main
```

Slug = 2-3 hyphenated words from the issue title (e.g., `feat/issue-12-discover-tool`).

### 4. Confirm scope

Read the issue body and the linked Definition-of-Done checklist. If the issue is bigger than ~2 hours of work, **stop** — comment, propose breaking it down, ping the team in chat.

### 5. Build

Follow the patterns in `AGENTS.md`. When you're done, see the `update-issue` skill for how to wrap up.

## Anti-patterns (do not)

- Don't claim more than one P0 issue at a time
- Don't pick a P2 if P0/P1 are open
- Don't start work without claiming first — duplicate work is the #1 hackathon time-waster
- Don't claim an issue labeled `blocked` without resolving the blocker first
- Don't skip the claim step "because it's quick" — visibility is the point

## Status check (am I picking the right thing?)

```bash
# What's everyone working on right now?
gh issue list --repo ATX-TXLookup/TXLookup --label "claimed" \
  --json number,title,assignees,labels --limit 20
```

If someone else has 3 claimed and you have 0, your area is well-covered — pick from a different area.
