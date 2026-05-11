# TXLookup — Makefile
# Human-friendly entry points for common tasks. Agents read CLAUDE.md
# and the .claude/skills/ directory; humans run `make`.

.PHONY: help pre-submit scout dev deploy tag-release

help:
	@echo "TXLookup · common commands"
	@echo ""
	@echo "  make pre-submit    Run BOTH pre-submission gates (review + scout)"
	@echo "                     before any hackathon submission, release tag,"
	@echo "                     or freeze cut. ~60 min total."
	@echo ""
	@echo "  make scout         Run JUST the open-web scout (competitors,"
	@echo "                     sponsors, judges, community). ~30 min."
	@echo ""
	@echo "  make dev           Start Next.js dev server on :3000"
	@echo "  make deploy        Manual Vercel deploy via GitHub Actions"
	@echo "  make tag-release   Walk you through tagging v<N> + release"
	@echo ""

pre-submit:
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  PRE-SUBMISSION GATE"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Two passes, ~30 min each. Run BOTH before you click submit."
	@echo ""
	@echo "┌─────────────────────────────────────────────────────────────┐"
	@echo "│ PASS 1 · Pre-submission Codex audit                         │"
	@echo "│ → scripts/pre-submission-review.md                          │"
	@echo "└─────────────────────────────────────────────────────────────┘"
	@echo ""
	@echo "Open scripts/pre-submission-review.md. Copy the prompt block"
	@echo "(the 'paste this verbatim' section) into a fresh Codex or"
	@echo "Claude Code session. Let it audit. Surface findings here."
	@echo ""
	@echo "┌─────────────────────────────────────────────────────────────┐"
	@echo "│ PASS 2 · Open-web scout                                     │"
	@echo "│ → scripts/scout-the-room.md                                 │"
	@echo "└─────────────────────────────────────────────────────────────┘"
	@echo ""
	@echo "Open scripts/scout-the-room.md. Copy the prompt block into a"
	@echo "fresh agent session. Let it sweep competitors / sponsors /"
	@echo "judges / community. Output goes to a shared brief, not chat."
	@echo ""
	@echo "┌─────────────────────────────────────────────────────────────┐"
	@echo "│ THEN: triage findings before submitting                     │"
	@echo "└─────────────────────────────────────────────────────────────┘"
	@echo ""
	@echo "Update docs/hackathon-form-copy.md with anything that drifted."
	@echo "Fix BLOCKER findings or note them as known limitations."
	@echo "Address every sponsor signal the scout surfaced."
	@echo ""
	@echo "See docs/hackathon-retrospective.md for context on what this"
	@echo "catches and why it exists."

scout:
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  OPEN-WEB SCOUT (mid-hackathon · every 12h)"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Open scripts/scout-the-room.md. Copy the prompt block into a"
	@echo "fresh Codex or Claude Code session. Time-box at 30 min."
	@echo ""
	@echo "Run cadence:"
	@echo "  • Day 0 evening    — initial sweep, learn the field"
	@echo "  • Day 1 noon       — mid-hackathon competitors emerge"
	@echo "  • Day 1 evening    — late-day repo pushes, sponsor signals"
	@echo "  • Day 2 morning    — last-minute submission requirements"
	@echo ""

dev:
	npm run dev

deploy:
	gh workflow run deploy.yml
	@echo "Watch: gh run watch \$$(gh run list --workflow=deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')"

tag-release:
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  Tag a release"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "1. Run 'make pre-submit' FIRST. Don't skip it."
	@echo "2. Decide the version: v1.0.0 / v1.0.1 / v1.1.0 / v2.0.0 ?"
	@echo "3. Decide the commit: 'git log --oneline -10' and pick the SHA"
	@echo "4. Then:"
	@echo ""
	@echo "    git tag -a vX.Y.Z <sha> -m 'release notes here'"
	@echo "    git push origin vX.Y.Z"
	@echo "    gh release create vX.Y.Z --notes-from-tag"
	@echo ""
	@echo "5. Update CHANGELOG.md with what shipped."
