# Test coverage — mapped to the 4 judging axes

> One source of truth for "do we have evidence for each judging axis?" Updated as tests land. Refs issue #44.

The hackathon scores 100 points across 4 axes. We run a test suite that **maps each axis to at least one piece of executable evidence**. A judge skeptical of any axis can run the named test (or read the fixture) and see proof.

---

## Axis 1 — Technical Execution & Completeness (25 pts)

> *"Did you actually build a working, complex system?"*

| Test | What it proves | Status |
|---|---|---|
| `tests/test_mcp_boot.py` | MCP server starts cleanly + lists all 8 tools | ✅ 3/3 PASS |
| `tests/test_doom_loop.py` | Doom-loop guard detects 3+ identical AND `[A,B,A,B]` cycles + reset behavior | ✅ 11/11 PASS |
| `tests/doom_loop_ts_smoke.mjs` | TS port of the doom-loop guard mirrors the Python algorithm | ✅ PASS |
| `tests/test_miro.py` | Miro REST wrappers return correct envelope shape, fail cleanly without auth | ✅ 5/5 PASS |
| `tests/test_planner.py` | Planner OpenAI invocation parses structured output; replan path preserves shape | ✅ 2/2 PASS + 1 gated live |
| `tests/test_catalog_integrity.py` | Every registered dataset is reachable; every declared key column exists on live Socrata; `/resource` endpoint serves at least 1 row | ✅ 18/18 PASS (live) |
| `tests/e2e_agent_smoke.mjs` | LIVE `/api/agent` against deployed URL: reasoning + planning + executing + done events fire; final answer and citation populated | ✅ 3/3 PASS (live) |
| Workflow `.github/workflows/deploy.yml` | Auto-deploy + post-verify (HTTP 200/401 + robots reachable) | ✅ green |

---

## Axis 2 — Partner Ecosystem & Utility (25 pts)

> *"Did you leverage the unique tools and software provided?"*

| Partner | What we use it for | Test / evidence |
|---|---|---|
| **Codex (OpenAI)** | Reasoning + planning + replanning + synthesis (4 distinct LLM roles) | `tests/test_planner.py` mocks the planner; live e2e exercises all 4 roles |
| **Miro MCP** | Brainstorm board (live), result-board generator (`render_to_miro` tool) | Brainstorm board live at https://miro.com/app/board/uXjVHWYFIqE=/; `render_to_miro` step type wired into `/api/agent` |
| **MCP** (transport) | TXLookup ships AS an MCP server installable in Claude Code, Codex, Cursor | `tests/test_mcp_boot.py` validates server boot; issue #37 (Raj) is the external-client validation |
| **Featherless** | Cheap local-first iteration on the planner (fallback path) | Documented in `docs/agents-strategy.md`; not yet auto-tested |
| **Socrata SODA** | All data; bounded queries; Basic-auth creds wired | `tests/test_catalog_integrity.py` validates 6 live endpoints; `tests/run_claude_harness.py` runs 90 baseline queries |

---

## Axis 3 — Value & Impact (25 pts)

> *"Is the solution actually useful and valuable in the real world?"*

| Test | What it proves | Status |
|---|---|---|
| `tests/run_claude_harness.py` (Kunal #38) | 90-question harness covering 9 datasets × 10 personas. Pure-Python, no LLM, hits Socrata directly. Establishes baseline shape | ✅ runs; baseline fixtures in `tests/fixtures/` |
| `tests/test_user_story_questions.py` | Validates the 30 user-story questions return parseable Socrata responses for the documented column shape | ✅ in repo |
| Persona docs | `docs/personas.md` defines Sarah / Marcus / Jordan with hero queries; `docs/demo-script.md` ties the demo flow to those queries | ✅ in repo |
| Citation enforcement | Every answer carries portal + dataset_id + url; tested by `tests/e2e_agent_smoke.mjs` `assert lastDone.citation.dataset_id` | ✅ |

---

## Axis 4 — Innovation & Execution (25 pts)

> *"Did you push the boundaries of what's capable with the technology?"*

| Test | What it proves | Status |
|---|---|---|
| `tests/test_doom_loop.py` | Pattern-based loop detection (not time-based retry). Detects identical-3x AND `[A,B,A,B]` cycles. Tested against 11 cases | ✅ 11/11 PASS |
| Replan-on-failure path in `app/api/agent/route.ts` | Live agent re-prompts the LLM with the original intent + failure detail and emits a new plan with a one-sentence diagnosis. Visible in the UI as "Agent adjusted course" panel | ✅ exercised live; manual: ask a question whose first attempt fails, observe replan |
| `app/lib/demo-fixtures.ts` + `replayFixture()` in route.ts | `?demo=1` switches to pre-recorded SSE flow with realistic timings. Insurance for stage demo without disabling the live path | ✅ live; `tests/e2e_agent_smoke.mjs` with `E2E_DEMO_MODE=1` exercises the fixture path |
| A2A handoff (`render_to_miro`) | Agent makes outbound REST call to Miro mid-loop, returns view link as artifact | ✅ wired in route.ts; manual demo: trigger via "show me a board" question |
| Skill document as cross-runtime policy | `skills/txlookup/SKILL.md` is loadable by Claude Code, Codex, custom orchestrators with equivalent bounded behavior | ✅ in repo; issue #37 (Raj) validates externally |
| Per-step duration_ms + token usage | Every `step_done` event carries `duration_ms`; every Codex call's token usage is summed and emitted in the final `done` event | ✅ wired (Godwyn #47) |

---

## How to run all tests locally

```bash
# Python tests (mocked + live; live needs SOCRATA_APP_TOKEN or KEY_ID/SECRET in env)
pytest tests/test_mcp_boot.py tests/test_doom_loop.py tests/test_miro.py tests/test_planner.py tests/test_catalog_integrity.py -v

# TS smoke (doom-loop port)
npx tsx tests/doom_loop_ts_smoke.mjs

# E2E against live deploy (set TXLOOKUP_BASIC_AUTH if gated)
node tests/e2e_agent_smoke.mjs

# Demo-mode E2E (no Codex spend; exercises fixture path)
E2E_DEMO_MODE=1 node tests/e2e_agent_smoke.mjs

# Kunal's 90-query baseline harness
python tests/run_claude_harness.py
```

## CI

`.github/workflows/ci.yml` runs `ruff` (Python) + `tsc` (TypeScript) on every PR.
`.github/workflows/deploy.yml` deploys to Vercel on every push to main + verifies.

Add an `e2e.yml` workflow that runs the e2e suite nightly + on PRs touching `app/api/`. (TODO — refs #44.)

---

## What's intentionally NOT tested

- Browser visuals (not the bottleneck; manual review covers it)
- LLM output quality (synthesizer is a human-judged surface; we test it returns *something* non-empty with citation)
- Miro board rendering (would require a Miro test team — covered by manual demo)
