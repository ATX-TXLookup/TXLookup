# Setup — first 30 minutes

Goal: clone the repo, boot the agent + MCP server + frontend locally, run a smoke test against a real dataset, and pick your first issue. Should take 20-30 minutes.

## 0. Prerequisites

- macOS or Linux (Windows works via WSL)
- **Python 3.11+** (`python3 --version`)
- **Node.js 20+** (`node --version`)
- **git** + **gh** CLI (`gh --version` — if not installed, `brew install gh`)
- **Claude Code** OR **Codex CLI** (you'll use one of them as your coding agent)

## 1. Clone + branch off main

```bash
git clone git@github.com:ATX-TXLookup/TXLookup.git
cd TXLookup
git checkout main
git pull
```

If your `git@github.com` SSH isn't set up, use HTTPS: `git clone https://github.com/ATX-TXLookup/TXLookup.git`.

## 2. Create a worktree per issue (REQUIRED for AI agents)

If you're a human, you can skip this and work in the main checkout. If you're an AI agent (Claude Code, Codex, Cursor) running on a teammate's machine, you **must** work in a dedicated worktree per issue — see `AGENTS.md` "Working in isolation."

```bash
ISSUE=42                         # the issue you'll claim
SLUG=discover-tool               # short, hyphenated
git worktree add ../TXLookup-issue-${ISSUE}-${SLUG} -b feat/issue-${ISSUE}-${SLUG} origin/main
cd ../TXLookup-issue-${ISSUE}-${SLUG}
```

## 3. Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
```

Smoke-test the MCP server boots:
```bash
python mcp/server.py
# Should start a stdio MCP server. Ctrl-C to stop.
```

If you see `ModuleNotFoundError: fastmcp`, run `pip install fastmcp` and retry.

## 4. Node environment (frontend)

```bash
npm install
npm run dev
# Should boot Next.js on http://localhost:3000
```

## 5. Environment variables

```bash
cp .env.example .env
```

Fill in what applies to your work area. Not every key is needed for every issue:

| Key | When you need it | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | Anything that calls the planner / LLM | Event kickoff — $50 credit code emailed to attendees |
| `MIRO_API_TOKEN` | Miro board operations (mostly via MCP, not REST) | Miro Sandbox dashboard after accepting team invite |
| `MIRO_BOARD_ID` | If we pre-create a board for the demo | Miro UI — board URL contains the ID |
| `SOCRATA_KEY_ID` + `SOCRATA_KEY_SECRET` | Higher rate limits on open data calls (preferred — HTTP Basic auth, used by `app/lib/socrata.ts`) | Sign up at https://evergreen.data.socrata.com/signup, then **Profile → Edit Profile → Developer Settings** → generate API key. Free. Cross-portal. |
| `SOCRATA_APP_TOKEN` | Same as above, legacy `X-App-Token` header path | Same place, "App Tokens" section. Use only if Basic auth isn't an option. |
| `FEATHERLESS_API_KEY` | Cheap iteration on prompts | Setup PDF distributed at the event |
| `SUPABASE_URL` / `SUPABASE_KEY` | Only if your issue touches caching/storage | We'll provision if needed (not v1) |
| `FAL_API_KEY` | Only if your issue touches image/video gen | Not in scope for v1 |

**Never commit `.env`.** It's gitignored already.

## 6. Smoke test against real data

Confirm Socrata works and we can read Austin's permit data:

```bash
curl -s 'https://data.austintexas.gov/resource/3syk-w9eu.json?$limit=1' | head -50
```

You should see a JSON array with one permit record. If you get rate-limited, request a Socrata app token (key 4 above).

## 7. Set up your coding agent

### If you're using Claude Code

```bash
claude
```

In the session:
1. `/mcp` — see the list of MCP servers. `miro` should be listed but `! Needs authentication`.
2. `/mcp auth` — pick `miro`, follow the OAuth flow, select the **AITX Community Hackathon** Miro team.
3. After auth, the `mcp__miro__*` tools become available to you.

The repo also auto-loads three coordination skills (`.claude/skills/{pickup-next, update-issue, team-status}`). Just say "what should I work on" or "update the issue" and Claude Code will use them.

### If you're using Codex CLI

Follow the event setup:
1. Install Miro MCP for Codex: https://miro.com/marketplace/miro-mcp-for-openai-codex
2. Select the **AITX Community Hackathon** Miro team
3. Restart Codex / open a new session

Pro tip: use the same email for Miro Sandbox + Codex.

## 8. Read the docs (in this order)

| File | What you'll learn |
|---|---|
| [`README.md`](../README.md) | What we're building, one screen |
| [`docs/event.md`](event.md) | Tracks, deadlines, agenda, bounties |
| [`docs/plan.md`](plan.md) | Step 0 = Austin permits as the breadth validator |
| [`docs/personas.md`](personas.md) | Sarah, Marcus, Jordan and their hero queries |
| [`docs/architecture.md`](architecture.md) | Layers — Models / Ingest / Agents / APIs / MCP / UI |
| [`AGENTS.md`](../AGENTS.md) | Coding standards + worktree + log.md convention |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Issue-pickup workflow + one-pusher rule |
| [`DESIGN.md`](../DESIGN.md) | Brand tokens, components, persona-driven design |
| [`skills/txlookup/SKILL.md`](../skills/txlookup/SKILL.md) | The shipped agent skill — required deliverable |

## 9. Pick your first issue

```bash
gh issue list --repo ATX-TXLookup/TXLookup --label ready --label priority:p0
```

Filter by your area too:
```bash
gh issue list --repo ATX-TXLookup/TXLookup \
  --label ready --label priority:p0 --label area:agent
```

Pick the highest-priority `ready` issue in your area, then follow the `pickup-next` skill (or do it manually):
```bash
ISSUE=12
gh issue comment $ISSUE --repo ATX-TXLookup/TXLookup --body "claiming — <your-handle>"
gh issue edit $ISSUE --repo ATX-TXLookup/TXLookup --add-label claimed --remove-label ready
gh issue edit $ISSUE --repo ATX-TXLookup/TXLookup --add-assignee @me
```

## 10. Update the team

Join the **WhatsApp** chat: https://chat.whatsapp.com/EcDliphWA7XA4QImK2drhy

Drop a quick "I'm in, working on #N" so the team knows who's covering what.

---

## Troubleshooting

**`fastmcp` won't install** → `pip install --upgrade pip` then retry. fastmcp needs Python 3.11+.

**`npm install` fails on `tailwindcss`** → make sure node is 20+. `nvm use 20`.

**Socrata returns 403 / 429** → sign up at https://evergreen.data.socrata.com/signup, go to **Profile → Edit Profile → Developer Settings**, generate an API key, and set `SOCRATA_KEY_ID` + `SOCRATA_KEY_SECRET` (Basic-auth pair, preferred). Legacy `SOCRATA_APP_TOKEN` still works as a fallback. Docs: https://dev.socrata.com/docs/app-tokens.html.

**Miro `/mcp auth` opens browser but nothing happens** → check you're a member of the AITX Community Hackathon Miro team (separate email invite). If not, ping in WhatsApp.

**Can't push branches** → confirm you have write access to `ATX-TXLookup/TXLookup`. Ping the org admin (Ravinder) with your GitHub handle.

**Issue not visible / can't claim** → confirm you're logged into `gh` as the right account: `gh auth status`. Re-login if needed.

## What "done" looks like for first 30 min

- [ ] Repo cloned, branch off `main`
- [ ] `python mcp/server.py` boots without error
- [ ] `npm run dev` opens localhost:3000
- [ ] `.env` filled in (at minimum `OPENAI_API_KEY`)
- [ ] Socrata smoke-test curl returns a JSON record
- [ ] Coding agent (Claude Code or Codex) running with Miro MCP authed
- [ ] WhatsApp joined
- [ ] First issue claimed, branch created, log.md started

You're ready. Build.
