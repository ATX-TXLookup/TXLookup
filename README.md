# TXLookup

> **Texas civic data, accessible to anyone who can search Google.**
> A multi-agent system that turns plain-English questions into sourced answers
> across **6,061 Texas open-data datasets**. Free. Open source. MIT-licensed.

[![Live](https://img.shields.io/badge/live-txlookup.vercel.app-10B981)](https://txlookup.vercel.app)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![MCP](https://img.shields.io/badge/ships%20as-MCP%20server-A855F7)](https://modelcontextprotocol.io/)
[![Hackathon](https://img.shields.io/badge/built%20at-AITX%20%C3%97%20Codex%20%C2%B7%20May%202026-F59E0B)](https://txlookup.vercel.app/about)

---

## What it does

You type a question in plain English. A team of OpenAI-powered agents picks the right dataset, writes the SoQL query, runs it on the source-of-truth portal, and hands you a sourced answer — every claim citable back to the originating portal, every step replayable.

**Live:** [txlookup.vercel.app](https://txlookup.vercel.app) · **Try it:** [Restaurants near 78704 with failing inspections this year](https://txlookup.vercel.app/q?q=Restaurants%20near%2078704%20with%20failing%20inspections%20this%20year) · **Pitch:** [/pitch](https://txlookup.vercel.app/pitch)

```
$ "Where do construction permits cluster in Austin in the last 30 days?"

→ Planner picks 3syk-w9eu (Austin Construction Permits)
→ Analyst runs $select=original_zip,count(*) $where=issue_date>='2026-04-10' $group=original_zip
→ 412 rows, 870ms
→ Critic verifies grounding
→ Reporter composes answer
→ ~7 seconds end-to-end · cited to data.austintexas.gov · replayable SODA URL
```

## Why

Civic data is public. Reaching it isn't.

- **6 portals**, two API styles (Socrata + CKAN). Different IDs, different conventions.
- **Schema drift** — 180+ columns just for permits, with overlapping semantics (`permittype` vs `work_class` vs `permit_class_mapped`).
- **Brutal SoQL** — `$where`, `$group`, `date_extract_y`, double-quoting, escape rules. One typo and the query 400s.
- **Download + sift** — current path is "open the 200k-row CSV in a spreadsheet". Most people give up.

TXLookup is the layer between you and 6,061 datasets. If you can search Google, you can ask Texas civic data anything.

## Architecture

Seven specialist agents coordinate behind a single search box:

| Agent | Role |
|---|---|
| **Planner** | Picks the dataset, drafts a structured plan with bounded tool calls. |
| **Data analyst** | Writes SoQL, computes stats with quality flags (null rate, top concentration, sample factor). |
| **Reporter** | Composes plain-English answer, grounded in the analyst's findings. |
| **Critic** | Reviews plan + answer for groundedness and citation. Forces revision on reject. |
| **Support** | Handles meta-questions and disambiguation. No SoQL fired. |
| **Dataset scout** *(cron)* | Indexes new portal datasets every 6h. |
| **Ingestor** *(cron)* | Refreshes the local-mirror cache so pages stay fast and survive throttling. |

**The patentable bit:** a pattern-based **doom-loop guard** (identical-3x and `[A,B,A,B]` cycle predicates) plus an **intent-preserving replan path** that survives plan rewrites. See [`docs/deepinvent-submission.md`](docs/deepinvent-submission.md).

Full architecture: **[txlookup.vercel.app/architecture](https://txlookup.vercel.app/architecture)** · short doc: [`docs/architecture.md`](docs/architecture.md)

## Quick start

### Try it without installing anything

Open [txlookup.vercel.app](https://txlookup.vercel.app), click any of the **What people ask** chips, watch the agent fire.

### Install the MCP server (Claude Code)

```bash
claude mcp add txlookup -- python -m mcp.server
```

### Codex

```bash
codex mcp add txlookup --command python --args -m --args mcp.server
```

### Cursor — paste into MCP settings

```json
{
  "txlookup": {
    "command": "python",
    "args": ["-m", "mcp.server"]
  }
}
```

The server exposes **8 MCP tools**: `ask_data`, `discover_datasets`, `get_dataset_schema`, `fetch_data`, `get_task_status`, `create_miro_board`, `add_to_miro`, `list_known_tools`. Full reference at [/use-as-agent](https://txlookup.vercel.app/use-as-agent).

### Run locally

```bash
git clone https://github.com/ATX-TXLookup/TXLookup
cd TXLookup
npm install
pip install -r requirements.txt

# .env.local — keys only, never committed
cat > .env.local <<'EOF'
OPENAI_API_KEY=sk-...
SOCRATA_KEY_ID=...        # optional, higher rate limit
SOCRATA_KEY_SECRET=...
MIRO_API_TOKEN=eyJ...     # optional, for /q "render to Miro" path
EOF

npm run dev          # web app on :3000
python mcp/server.py # MCP server (stdio)
```

## Datasets

**11 deeply curated** (full schema knowledge, locally mirrored, hand-picked SoQL):

- `3syk-w9eu` — Austin construction permits
- `ecmv-9xxi` — Austin food-establishment inspections
- `xwdj-i9he` — Austin 311 service requests
- `6wtj-zbtb` — Austin code-complaint cases
- `9cir-efmm` — TX state franchise tax holders
- `gc4d-8a49` — Dallas 311
- `9fxf-t2tr` — Dallas police active calls
- `fdj4-gpfu` — Austin crime
- `y2wy-tgr5` — Austin traffic fatalities
- `2zpi-yjjs` — TX state expenditures
- `naix-2893` — Austin mixed-beverage licenses

**6,061 indexed** across 6 portals — every other dataset is answered live: agent reads catalog metadata, plans a query, runs it on the source portal. Full provenance ledger at [/sources](https://txlookup.vercel.app/sources).

## Tech stack

- **Frontend:** Next.js 14 App Router · TypeScript · Tailwind · inline-SVG charts
- **Agent runtime:** OpenAI Codex / GPT-4o · 4 distinct LLM roles · Featherless fallback
- **MCP server:** FastMCP · stdio transport · 8 tools
- **Data:** Socrata SODA (Austin / Dallas / TX state) · CKAN (San Antonio / Houston) · Miro REST
- **Cache:** Local JSON mirror (data/cache/*.json) · refreshed every 6h via GitHub Actions cron
- **Hosting:** Vercel (Next.js serverless) · 60s function timeout · ephemeral filesystem

## Project structure

```
.
├── app/              # Next.js App Router pages (TypeScript)
│   ├── api/agent/    # SSE streaming agent endpoint
│   ├── q/            # the agent observatory + DAG visualization
│   ├── chat/         # conversational support agent
│   ├── reports/      # 5 reports + 1 cross-dataset Heat Index
│   ├── datasets/     # universe browse + per-dataset detail
│   ├── sources/      # citations + glossary
│   ├── architecture/ # how the system fits together
│   ├── about/        # team
│   └── lib/          # cache, catalog, agent loop, specialists
├── agent/            # Python agent runtime + tools
│   ├── specialists/  # dataset_scout.py, ingestor.py
│   └── tools/        # data.py (SoQL), miro.py (REST)
├── mcp/              # FastMCP server (Python)
│   ├── server.py
│   └── manifest.json
├── prompts/          # System prompts per agent role
├── skills/txlookup/  # Cross-runtime skill doc
├── config/           # datasets.yaml, reports.ts, models.yaml
├── data/cache/       # local JSON mirror — committed, refreshed every 6h
├── docs/             # how-it-works, agents-strategy, demo-script, ...
├── tests/            # Python + TS tests (catalog integrity, doom-loop, e2e)
└── .github/workflows # deploy / scout / ingestor / watchdog crons
```

## Contributing

Issues and PRs welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a PR.

Areas where new contributors land easily:

1. **Add a portal** — pick a Socrata or CKAN open-data portal. Add it to `scripts/fetch-discovered-catalog.mjs`. Open a PR.
2. **Add a dataset** — pick one from the 6,000+ indexed. Add a `CatalogDataset` entry to `app/lib/catalog.ts` and an `INGEST_SPEC` row to `agent/specialists/ingestor.py`. The deep curation kicks in automatically.
3. **Add a report** — write a `ReportDef` in `config/reports.ts`. The default `[slug]/page.tsx` renders bar/line/stat charts. For a flagship layout, see `app/reports/[slug]/AustinConstructionReport.tsx`.

## License

MIT. See [`LICENSE`](LICENSE).

All data is the property of its issuing agency, used under public-records terms. TXLookup does not claim ownership of any source data — every claim links back to its source portal.

## Acknowledgements

Thanks to the City of Austin, the City of Dallas, the City of San Antonio, the City of Houston, and the State of Texas for publishing every dataset behind this site openly. Thanks to AITX and Codex for hosting the hackathon. Built on top of Anthropic's Model Context Protocol, Smithery, Miro, OpenAI, Featherless, and the Socrata + CKAN open-data standards.

---

Built by [Ravinder Jilkapally](https://www.linkedin.com/in/jravinder), [Kunal Vyas](https://www.linkedin.com/in/kunalvasavada), [Godwyn James](https://www.linkedin.com/in/goodguygoddy/), and [Raj Akula](https://www.linkedin.com/in/rajaakula/) at the [AITX × Codex Hackathon](https://aitx.ai/), May 8–10, 2026.
