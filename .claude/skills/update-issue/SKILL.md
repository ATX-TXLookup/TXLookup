---
name: update-issue
description: Use when you (human or AI agent) make material progress on a claimed issue, get blocked, or finish the work. Keeps the team's view of "what's in flight" honest — every claimed issue should reflect reality within an hour. Trigger phrases — "update the issue", "i'm blocked", "i'm done with this", "report progress", whenever you finish a meaningful chunk of work, whenever an agent finishes a tool call sequence, whenever you push a commit on an issue branch.
---

# update-issue

Keep the GitHub issue current as work happens. Both humans and AI agents follow this.

## When to update

You owe the team an issue update when:
- You **start** the work (claim — see `pickup-next` skill)
- You **make material progress** (~30 min in, or a real subtask done)
- You **get blocked** by something (waiting on data, waiting on a decision, an API is down)
- You **unblock** something (the wait is over)
- You **push a commit** on the issue branch
- You **open the PR**
- You **merge the PR** and close the issue

Rule of thumb: if a teammate looked at this issue in the last hour, would they have an accurate picture? If no, update.

## How to update — by event

### Material progress
```bash
gh issue comment $ISSUE --repo ATX-TXLookup/TXLookup --body "progress: <one sentence on what's done, one on what's next>"
```

Example:
> progress: discover() returns ranked candidates from the YAML catalog, tested against permits + 311. Next: wire describe() to live Socrata.

### Blocked
```bash
gh issue edit $ISSUE --repo ATX-TXLookup/TXLookup --add-label "blocked"
gh issue comment $ISSUE --repo ATX-TXLookup/TXLookup --body "blocked: <what you're waiting on, who can unblock>"
```

Example:
> blocked: need MIRO_API_TOKEN to test write path. @ravinder can you drop it in our 1Password vault?

### Unblocked
```bash
gh issue edit $ISSUE --repo ATX-TXLookup/TXLookup --remove-label "blocked"
gh issue comment $ISSUE --repo ATX-TXLookup/TXLookup --body "unblocked: <what cleared>. resuming."
```

### Pushed a commit
The PR auto-links commits, but if there's no PR yet, drop a one-liner:
```bash
gh issue comment $ISSUE --repo ATX-TXLookup/TXLookup --body "pushed: <commit-sha-short> — <commit subject>"
```

### Opened PR
Don't comment manually — `Closes #N` in the PR body links it automatically and shows up in the issue timeline. Just confirm the link in the issue.

### Done (PR merged, issue auto-closed)
After merge:
```bash
# Update the pinned tracking issue
gh issue list --repo ATX-TXLookup/TXLookup --label "tracking" --json number --limit 1
gh issue comment <tracking-issue-number> --repo ATX-TXLookup/TXLookup --body "✅ #$ISSUE — <one-line summary> (PR #<n>)"
```

## For AI agents specifically

When you (Claude / Codex / Cursor) are doing the work:
- Identify yourself in comments: `[claude-code]`, `[codex]`, `[cursor]`
- Drop a progress comment after every meaningful tool sequence (don't spam — one per ~10-min unit of work)
- If you hit a doom-loop guard or context-window limit, treat it as `blocked` and surface the issue to a human
- Never close an issue you didn't fully complete — comment with what's left and unclaim instead

### How to unclaim (if you can't finish)
```bash
gh issue edit $ISSUE --repo ATX-TXLookup/TXLookup --add-label "ready" --remove-label "claimed"
gh issue edit $ISSUE --repo ATX-TXLookup/TXLookup --remove-assignee <your-handle>
gh issue comment $ISSUE --repo ATX-TXLookup/TXLookup --body "unclaiming — <reason, what's done, what's left>"
```

## Anti-patterns

- Silent commits on a claimed issue (no progress comment for hours)
- Closing an issue without verifying the Definition of Done checklist
- Adding `blocked` without saying who/what unblocks it
- Updating one issue while leaving 3 stale ones — sweep them all
- Letting an issue sit `claimed` overnight without progress (treat as auto-unclaimed — comment + remove the label)

## Why this matters

The team works in a mix of in-person and remote, with both humans and AI agents picking up issues. The GitHub issue IS the source of truth. If it lies, two people work on the same thing, or nobody works on something critical because they assumed someone else was on it.
