# Changelog

All notable changes to TXLookup. Tags follow [SemVer](https://semver.org/).

## v1.3.x — Cached library as the public product (May 12, 2026)

### v1.3.1
- Detail view (`/q?q=<cached>`) renders the full AgentRunner — left answer column + right Status/DAG/Steps/Telemetry sidebar — identically to a live run. Cache is invisible.
- Returning-user primitive: star toggle on every lookup card (localStorage-backed).
- Hero rewritten for journalists / civic researchers / city staff.

### v1.3.0
- `/q` is now the single public surface. List view (no query), detail view with live replay (cached query), gate view (uncached query → BYOK or suggest).
- `/answers` and `/answers/[slug]` 307-redirect to `/q` for back-compat.
- Detail view applies post-mortem lessons: title + finding + evidence classes + watchlist + collapsible methodology.

## v1.2.x — One route, one mental model (May 12, 2026)

### v1.2.0
- Collapse `/answers` → `/q`; the editorial library lives at the same URL the agent runner used.

## v1.1.x — Public investigations library (May 12, 2026)

### v1.1.4
- `/q?q=<X>` is cache-only: matches return live replay at `/q?q=cached`; non-matches redirect to `/q` (no public fresh OpenAI calls).

### v1.1.3
- Corpus grew to 18 prebuilt investigations covering every sample question on the homepage and `/q`.

### v1.1.2
- Live replay on click: clicking a saved lookup re-streams the agent loop's SSE events through AgentRunner.

### v1.1.1
- Initial corpus of 10 prebuilt gpt-4o investigations on the freshly funded OpenAI balance.

### v1.1.0
- Public investigations library at `/answers`.
- BYOK gate (`/byok` → `/ask`): visitors paste their own OpenAI key, stored in HTTP-only cookie scoped to `/api/agent` via AsyncLocalStorage. No DB persistence.
- Suggest a question (`/suggest`): email + question captured to `data/suggestions/{ts}-{hash}.json` for admin review. Gitignored — emails are PII.
- All 5 agent roles + critic on `gpt-4o` (was a mix of `gpt-4o` and `gpt-4o-mini`).
- Three evidence classes per source: `authoritative` · `modeled` · `community`.
- Watchlist primitive (localStorage-backed) — the "returning user" primitive Atlas TX had via Android field verification and we didn't.

## v1.0.0 — Hackathon submission (May 10, 2026)

Frozen at commit `697033d` at 10:45 AM CT, the AITX × Codex Hackathon submission deadline.

- Multi-agent loop: planner / data analyst / reporter / support / critic / dataset scout / ingestor.
- 6,061 indexed Texas open-data datasets across 4 Socrata + 2 CKAN portals.
- MCP server installable in Claude Code / Cursor / Codex; cross-runtime SKILL.md.
- Cross-dataset Heat Index report (`/reports/austin-heat-index`).
- Cache-resilience layer: local JSON mirror, cache → live → stale → error fallback.
- Doom-loop guard with pattern detection + intent-preserving replan.
- Live agent observatory (`/q`) with DAG, Steps, Telemetry tabs.

---

## Retrospective (May 11, 2026) — what we shipped after the freeze

After v1.0.0 lost to Atlas TX (`sbauwow/atlas-tx`), the post-mortem identified five gaps. v1.1.x through v1.3.x systematically address them:

| Post-mortem lesson | Where addressed |
|---|---|
| Product, not tool — investigation as the unit of work | v1.1.0 `/answers`, v1.2.0 `/q` library |
| No returning primitive — watchlists, saved investigations | v1.1.0 WatchToggle, v1.3.1 WatchStar |
| Single citation, not three evidence classes | v1.1.0 authoritative / modeled / community tags |
| Targeted normal users; should target journalists / investigators | v1.3.1 hero rewrite |
| Picked too broad a vertical — "all civic data" | v1.3.1 narrowed to "Austin permits, inspections, 311" |
| Skipped pre-submission audit | `prompts/pre-submission-review.md` in playbook |
| Skipped competitor scouting | `prompts/scout-the-room.md` in playbook |
| `vercel.app` reads as hackathon | Outstanding — needs a real domain |
| No physical-world tie-in | Outstanding — would need a map / mobile / field-verification tier |
| No release discipline during the build | This CHANGELOG starting v1.1.0 |
