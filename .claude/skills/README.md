# Repo skills

These are **build-time skills** for agents (Claude Code, Codex) and humans working in this repo. They are auto-loaded by Claude Code when running in this directory.

| Skill | Use when |
|---|---|
| [`pickup-next`](pickup-next/SKILL.md) | Starting a work session, need a task |
| [`update-issue`](update-issue/SKILL.md) | Made progress, got blocked, finished work — keep the issue honest |
| [`team-status`](team-status/SKILL.md) | "Where are we?" — quick read of in-flight / blocked / ready / merged |

All three are designed so a human can run the same `gh` commands manually if they prefer. The skills exist so agents and humans coordinate through the same conventions, in the same place (GitHub issues), with the same vocabulary.

## Not to be confused with

The **deliverable skill** at [`skills/txlookup/SKILL.md`](../../skills/txlookup/SKILL.md) is the artifact we ship to the hackathon — it tells *external* agents how to use TXLookup. That's required by the Open Data track.

These `.claude/skills/` skills are for *us*, building TXLookup, and don't ship.
