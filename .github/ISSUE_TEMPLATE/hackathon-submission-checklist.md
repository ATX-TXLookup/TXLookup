---
name: Hackathon submission checklist
about: Open this issue 2 hours before any hackathon submission. Don't merge / submit until every box is ticked.
title: "Hackathon submission checklist · <event name> · <freeze datetime>"
labels: ["submission", "p0"]
---

## Event

- **Hackathon:** <name>
- **Freeze:** <YYYY-MM-DD HH:MM TZ>
- **Tracks:** <list>
- **Sponsors / bounties pursued:** <list>

## T-2h · Pre-submission Codex audit

Run [`scripts/pre-submission-review.md`](../../scripts/pre-submission-review.md) in a fresh agent session.

- [ ] Audit completed (30 min)
- [ ] BLOCKER findings: ___ (paste table or link)
- [ ] WEAK findings: ___
- [ ] BLOCKER findings fixed or accepted as known limitations
- [ ] Submission doc updated to match reality (no aspirational claims)

## T-2h · Internet scout

Run [`scripts/scout-the-room.md`](../../scripts/scout-the-room.md) one final time.

- [ ] Top-3 competitor threats reviewed
- [ ] Sponsor bounty pages re-read (sometimes update mid-hackathon)
- [ ] Submission doc updated to address any sponsor-specific requirements
- [ ] Judge social activity scanned (last 30 days)
- [ ] One thing deprioritized in the pitch (table-stakes vs differentiator)

## T-1h · Demo readiness

- [ ] Backup demo video recorded + uploaded as unlisted (YouTube/Loom)
- [ ] Live URL loads in <3s · all routes 200
- [ ] Marquee question fires end-to-end against the live deploy
- [ ] Demo board / artifact (Miro / screenshot) reachable
- [ ] Pre-warm: fire one marquee `curl` 30s before the demo
- [ ] 4 tabs open: live URL, Miro/artifact, fixture replay (`?demo=1`), `/api/cache-stats` or equivalent resilience proof

## T-1h · Release discipline

- [ ] `git tag -a v1.0.0 <freeze-commit-sha>` with annotated release notes
- [ ] `git push origin v1.0.0`
- [ ] GitHub release created with notes (`gh release create v1.0.0`)
- [ ] `CHANGELOG.md` updated

## T-30m · Submission package

- [ ] `docs/hackathon-form-copy.md` fields filled in for every required form field
- [ ] Team list: full name, email, GitHub handle, LinkedIn for every member
- [ ] Repo is PUBLIC
- [ ] LICENSE file present
- [ ] README is open-source quality (status badges, quick start, license)
- [ ] No leaked secrets in tracked files (grep for `sk-`, `Bearer eyJ`, API key patterns)
- [ ] Patent / bounty submissions filed (DeepInvent, Miroverse template, etc.)

## T-0 · Submit

- [ ] Hackathon form submitted
- [ ] Patent / bounty submission portals clicked
- [ ] Demo video URL pasted into form
- [ ] Repo URL pasted into form
- [ ] Live URL pasted into form
- [ ] Team emails pasted into form (paste from `docs/team-contacts.local.md` if team emails aren't in the public form copy)

## Post-submit

- [ ] Capture screenshot of confirmation page
- [ ] Open GitHub issue: "v1.0.1 follow-ups" with anything we deferred during the audit
- [ ] Update `docs/hackathon-retrospective.md` within 7 days with what worked / what didn't
- [ ] Sleep.
