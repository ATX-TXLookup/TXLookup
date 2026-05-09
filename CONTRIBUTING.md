# Contributing — TXLookup

Welcome. We're a 4-person team (some in-person at Antler, some remote) building an autonomous Texas open-data agent for the AITX Community x Codex Hackathon (May 8-10, 2026). This file is how we work together so nothing falls through the cracks.

**Read this once before picking up your first issue.**

## TL;DR

1. Open the [repo issues](https://github.com/ATX-TXLookup/TXLookup/issues), filter by `ready` + your `area:*` label
2. Comment `claiming` on the issue → add the `claimed` label → assign yourself
3. Branch off `main`: `feat/<short-slug>` or `fix/<short-slug>`
4. Build it. Keep the PR small (one issue = one PR).
5. Open a PR, link the issue with `Closes #N`, request review
6. Merge after one approval. Update the [pinned tracking issue](https://github.com/ATX-TXLookup/TXLookup/issues) with what shipped.

## Team + ownership

| Area | Label | Files |
|---|---|---|
| Frontend (Next.js, UI, NLI search, persona views) | `area:frontend` | `app/` |
| Agent (orchestrator, planner, executor, doom-loop) | `area:agent` | `agent/` |
| Data (catalog, Socrata, schemas) | `area:data` | `agent/tools/data.py`, `config/datasets.yaml` |
| MCP server (tools, skill doc) | `area:mcp` | `mcp/`, `skills/` |
| Infra (deploy, CI, secrets) | `area:infra` | `.github/`, `.env.example`, deploy configs |
| Docs (README, plan, personas) | `area:docs` | `README.md`, `docs/`, `HACKATHON.md` |

Areas are *primary ownership*, not exclusive. Anyone can pick up anything — but the area owner is the default reviewer.

## Picking up work

1. **Browse issues** filtered by your area: `is:open is:issue label:ready label:area:agent`
2. **Pick `priority:p0` first.** P0 blocks the demo — everything else waits.
3. **Comment to claim.** A simple `claiming` is enough. This stops two people from grabbing the same issue.
4. **Add the `claimed` label and assign yourself.** Removes it from the `ready` filter for everyone else.
5. **Set yourself a 2-hour budget.** If it's bigger than that, the issue is mis-scoped — comment, break it down, ping the team in chat.
6. **If you get blocked**, add the `blocked` label and comment with what you're waiting on.

## Branches and commits

- Branch from `main`, named `feat/<slug>`, `fix/<slug>`, `docs/<slug>`
- Commit messages: `feat: short summary` / `fix: ...` / `docs: ...` / `refactor: ...` / `test: ...`
- One issue = one PR. Don't refactor unrelated code in the same PR.
- **Never** `git push origin main` directly. Branch protection should block it; if it doesn't, *don't try to find a way around it.*

## Pull requests

- Open a PR using the template (`.github/PULL_REQUEST_TEMPLATE.md`)
- Title: same as the commit (`feat: short summary`)
- Description: link the issue with `Closes #N`. State what changed and how to test.
- **Request review** from the area owner (or anyone if the owner is heads-down)
- Merge requires **one approval**. The author hits the merge button. Squash-merge by default — keeps `main` history clean.
- After merge, update the [pinned tracking issue](https://github.com/ATX-TXLookup/TXLookup/issues) with one bullet: "✅ #N — short summary"

## The one-pusher rule (lessons from prior hackathons)

When two agents (or two humans) push to the same branch within seconds of each other, you get nasty merge conflicts at 11pm Saturday. To avoid this:
- **Each PR has one author** (don't both push to the same feature branch)
- **Keep `main` linear** — squash on merge
- If you must collaborate live on a branch, agree explicitly and `git pull --rebase` before every push

## Daily rhythm

We use a **pinned tracking issue** (`📌 Demo Tracker — Sun May 10`) as the standup channel. Drop in:
- **What you finished** since last update (link merged PRs)
- **What you're on** now (link the issue you've claimed)
- **What's blocking you**

Try to update it twice a day: morning and end-of-session.

## Issue labels (what they mean)

| Label | Meaning |
|---|---|
| `ready` | Spec'd and ready to pick up. Filter for this. |
| `claimed` | Someone's actively working on it. Don't claim. |
| `blocked` | Waiting on something. Read the comments before starting. |
| `priority:p0` | Blocks the demo. First priority. |
| `priority:p1` | Important, not blocking |
| `priority:p2` | Nice to have. Last priority. |
| `area:*` | Primary owner area |
| `agent-task` | Designed for AI coding agents (Codex, Cursor) to pick up |
| `human` | Needs human judgment — design, naming, dataset selection |
| `good first issue` | Small + isolated. Pick one as your warmup. |

## Coding standards

See `AGENTS.md` for the full coding standards. The 30-second version:

- **Python:** async/await, type hints, Pydantic for structured data, every tool returns `{"status": ..., "result": ..., "artifacts": [...]}`, no inline imports
- **TypeScript:** Next.js 14 App Router, RSC where possible, Tailwind, no `localStorage`
- **Both:** no API keys in commits, no `.env` in commits, run the linter before opening PR

## Demo polish (every PR)

Before requesting review, ask:
- Does the user-facing output show **citations** (source portal + dataset + freshness)?
- Did I strip any model internals (`<think>` tags, raw JSON dumps)?
- Does it work on a slow connection?
- Did I update the relevant doc if behavior changed?

## When in doubt

- **Architecture question:** read `docs/architecture.md` and `AGENTS.md`
- **What to build next:** check `docs/plan.md`
- **Who is the user:** check `docs/personas.md`
- **What lessons we already learned:** check `docs/lessons.md` — append new ones live
- **Strategy question:** check `HACKATHON.md`

## Help

If you're stuck for more than 15 minutes, ping the team chat. Don't burn an hour solo. We're racing the clock.
