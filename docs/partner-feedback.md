# Partner feedback

> Honest feedback for the four partner products that did the heavy lifting
> in TXLookup over 48 hours. Filed Sun May 10, 2026, post-build, pre-freeze.
>
> Audience: Anthropic / OpenAI / Miro / Socrata teams. Constructive, no
> diplomacy. We use these every day going forward and want them better.

## Anthropic — Claude + Model Context Protocol

**Worked well**
- **MCP tool contract is clean.** A small, stable surface (`name`, `description`, `input_schema`) gave us a publishable artifact in hours, not days. The same `mcp/manifest.json` got us into Claude Code, Cursor, and Codex installs with one command each.
- **Skill doc as cross-runtime policy.** The single biggest win. We wrote one `skills/txlookup/SKILL.md` and it teaches every runtime when to call which tool, what the bounds are, and what to never do. Cross-platform behavior consistency without per-platform branching.
- **Claude Code's subagent dispatch** carried this entire build. We ran 5 parallel agents during page-audit work; each got a tight brief, edited files in scope, returned structured reports. Without that, this is a 5-day build, not 48 hours.

**Hurt**
- **MCP transport is stdio-only in practice.** Serverless deploys want HTTP. We had to ship the agent as a Vercel API route + a separate stdio MCP server, doubling our deploy story. An official HTTP transport spec — not just "it's allowed" — would let us ship a single binary that satisfies both Claude Desktop and Vercel.
- **The MCP registry landscape shifted under us.** `modelcontextprotocol/servers` retired in favor of `modelcontextprotocol/registry` two days ago. Three of our docs and one Smithery flow pointed at the wrong place; we lost ~30 minutes correcting it. A redirect or clear deprecation banner on the old repo would have helped.
- **Tool vs Resource is fuzzy.** We have things that read state (cache stats, last refresh) which the spec calls "Resources" but every runtime treats them as tools. Concrete guidance — when do I emit `resources` vs `tools`? — would unblock a lot of MCP authors.
- **Sub-agent failures are silent.** When a Claude Code subagent stalls (we hit one stream watchdog timeout at 600s), there's no signal until we re-check the file state. A "your subagent failed mid-edit" event would prevent us from acting on stale assumptions.

**Wish**
- Official HTTP transport spec.
- Better failure-mode propagation for Claude Code subagents.
- Make the skill-doc primitive a first-class spec — it's the single most reusable thing we wrote.

---

## OpenAI — Codex / GPT-4o

**Worked well**
- **Structured outputs with `response_format: json_schema` parsed on the first call, every call.** Our planner emits a `Plan { intent, steps[] }` envelope; we never wrote a parse-retry path because we never needed one. That's huge for agent-loop reliability.
- **Multi-role usage (planner / analyst / reporter / critic) gave us a mental model for separating concerns.** Same model, different system prompts and different output schemas — clean and scalable.
- **The critic role's verdicts are consistently calibrated.** `approve: bool, score: 0-1, issues: string[]` produced verdicts a human reviewer would agree with ~85% of the time. Useful enough to gate a corrective revision in the agent loop.

**Hurt**
- **429s with no per-route visibility.** During the demo-prep window we hit rate limits and had no way to know which model / tier / project was throttled. The error gives us "rate_limit_exceeded" but not "you have N tokens left in this minute." Pre-demo, that's frightening.
- **Structured outputs add ~40% latency vs free-form.** Acceptable for a planner that runs once per request, painful for the analyst that may run 3-4 times in a 9-second loop. A "fast structured" mode that trades schema strictness for speed would be useful.
- **The `tools` parameter name collides with the user's mental model of "tools" their MCP server exposes.** We had to rename internal variables to avoid confusion (`agent_tools` vs `openai_tools`). Worth flagging in the API docs.

**Wish**
- Headers like `X-OpenAI-Quota-Remaining-RPM` so an agent loop can throttle itself before hitting 429.
- A documented latency-tier API: "structured but fast" for hot-path roles.
- Per-organization rate-limit dashboards that actually update in real-time (the current ones lag 10+ minutes — unusable for incident response).

---

## Miro — REST API

**Worked well**
- **Dev OAuth token in 60 seconds.** We had a token in hand 90 seconds after creating the app, with `boards:read + boards:write`. The fastest "from zero to first API call" of any partner.
- **Boards API is straightforward.** `POST /v2/boards` returns `viewLink` immediately; no async polling. Stickies + cards + connectors covered every layout we needed for the multi-agent demo board.
- **Python httpx client is trivial.** Our `agent/tools/miro.py` is 230 lines and handles board creation + 4 item types + frame layout. No SDK dependency.

**Hurt**
- **Free-tier rate limits hit fast.** Rendering a single demo board (30 items + 5 connectors) hit ~5 req/s and we got throttled. The error returns a plain HTTP 429 but no `Retry-After` header. We had to manually space requests with `await asyncio.sleep(0.2)` in production code.
- **No batch-items endpoint.** Creating 30 stickies = 30 round-trips. For an agent rendering a "summary board" with 50 elements, that's 50 round-trips, easily 8-10s of wall time.
- **Insufficient-scope errors are cryptic.** `403 Forbidden` with no body explaining which scope is missing. Painful to debug.
- **OAuth scopes don't compose for "render only" use cases.** We don't need `identity:read` to write to a board, but the app-creation flow surfaces it as a checkbox that looks load-bearing. Caused a 10-min digression.

**Wish**
- A `POST /v2/boards/{id}/items:batch` endpoint that takes 100+ items in one call.
- Specific scope-error messages: "scope `boards:write` is missing on this token."
- `Retry-After` header on 429s so clients can space themselves intelligently.

---

## Socrata — SODA + Catalog APIs

**Worked well**
- **SoQL is learnable in an hour.** The query syntax is SQL-shaped, the docs are good, and the `?$query=` shortcut covers most needs. Citizens-data devs who know SQL can be productive on day one.
- **HTTP Basic auth with `KEY_ID` / `KEY_SECRET` pair = trivial.** No OAuth flow, no token refresh, no rotation drama. For a hackathon, that's the right choice.
- **The undocumented `/api/catalog/v1?search_context={portal}` endpoint** unlocked our entire discovery layer. We indexed 4,415 datasets across 4 portals in 90 seconds with paginated calls.

**Hurt**
- **Schema drift across datasets is real.** Austin's 311 feed moved hosts (`data.austintexas.gov` → `datahub.austintexas.gov`) AND renamed columns (`sr_council_district` was removed mid-build). We hit a HTTP 400 in production and lost ~45 minutes diagnosing it. There's no "schema changed" event; we just noticed broken queries.
- **Date functions inconsistent across datasets.** `date_extract_y(col)` works on permits but errors on inspections (the column there is text, not timestamp). The error doesn't tell you the column type — you have to read the dataset metadata yourself.
- **Pagination caps at 1000 rows by default, but the cap is a soft hint.** Some datasets enforce 5000, some let you specify `$limit=10000` — and silent truncation makes it look like the data ended.
- **CKAN portals (San Antonio, Houston) have a totally different metadata format** despite being adjacent in the open-data ecosystem. We had to write a parallel ingest path.

**Wish**
- A `last_schema_change` field on `/api/views/{id}.json` so agents can detect drift before queries fail.
- Standardize date column types across datasets (or at least flag when a date-shaped column is stored as text).
- Convergence with CKAN's metadata schema. The two ecosystems cover most US cities; harmonized metadata would 10x the surface area for tools like ours.
- Make `/api/catalog/v1` a first-class documented API. We used it as the foundation of our universe-discovery layer; it deserves the docs.

---

## Note for the partners

Every line above came from an actual incident during a 48-hour build. We're shipping this as open source (`github.com/ATX-TXLookup/TXLookup`, MIT) — feel free to reference any of it in roadmap discussions.

Filed by Ravinder Jilkapally, Kunal Vyas, Godwyn James, Raj Akula
AITX × Codex Hackathon · May 2026
