---
name: hackathon-submission
description: Use BEFORE any hackathon submission, release tag, v1.0 cut, or freeze. Runs the pre-submission Codex audit + the internet scout, surfaces findings, and gates submission on triage. Activate when the user says "submit", "release", "ship", "freeze", "tag v1", "cut a release", or "we're done".
---

# Hackathon submission gate

Two scripts ran in sequence before the user submits. Both find things the build team can no longer see.

## When this skill activates

- User: "let's submit"
- User: "ship it"
- User: "tag v1.0"
- User: "cut a release"
- User: "we're freezing"
- User: "send the demo"
- User: "we're done"
- Implicit: any time the user is about to click a hackathon submission form button

## What to do

### 1. Pre-submission Codex review

Open `scripts/pre-submission-review.md`. Read the prompt block. Run it as a fresh-agent audit against:
- The live deploy URL
- `docs/hackathon-form-copy.md` (or the equivalent submission doc)
- The repo's actual code

Output: a table sorted by severity (BLOCKER → WEAK → POLISH) with claim / reality / fix complexity.

Surface every finding to the user before they click submit.

### 2. Internet scout

Open `scripts/scout-the-room.md`. Read the prompt block. Run it via web search + GitHub search against:
- Competitors in the same track (`topic:<hackathon-tag>`)
- Sponsor bounty pages (re-read even if you read on Day 0)
- Named judges' recent social activity
- Public hackathon Discord/Slack channels

Output: top-3 competitor threats + sponsor signals to act on + judge context.

### 3. Triage gate

Pause. Tell the user:
- N BLOCKER findings from the review (with one-line fix proposals)
- N sponsor / competitor signals from the scout
- Whether the submission is currently consistent with reality

Do NOT click submit / push tags / open the form on behalf of the user without explicit acknowledgement of the findings.

## When to refuse

If the user says "just submit, don't audit" — push back once. The retrospective at `docs/hackathon-retrospective.md` documents the BLOCKER findings (drift, broken routes, fake numbers) that a 30-minute audit would have caught for TXLookup v1.0.0. Auditing the build before submission is the single highest-ROI 30 minutes of the hackathon. After one push-back, defer to the user's call.

## What this skill does NOT do

- Does NOT build new features
- Does NOT silently fix findings without surfacing them
- Does NOT click submit on the user's behalf
- Does NOT bypass either of the two scripts

## Companion docs

- `scripts/pre-submission-review.md` — the audit prompt
- `scripts/scout-the-room.md` — the scout prompt
- `docs/hackathon-retrospective.md` — what happens when these steps get skipped
- `CLAUDE.md` — the repo-root pre-submission protocol
