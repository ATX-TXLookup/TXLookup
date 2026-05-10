// /use-as-agent — install pitch + agent card. The page that tells someone
// landing from Smithery, Anthropic skills marketplace, GitHub, or word of
// mouth WHY to install TXLookup and HOW to prove it works in <60 seconds.
//
// Theme: dark palette (--ds-* tokens) — matches /q, /datasets, /chat, /reports,
// and the homepage. No tx-* brand tokens, no font-display-serif.

import Link from "next/link";
import { Shell, TerminalBlock } from "@/app/components/ds";

export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata = {
  title: "TXLookup as your Texas civic-data agent — install in 30 seconds",
  description:
    "MCP server + agent skill for Claude Code, Codex, Cursor. Sourced answers from Texas public data with citation enforcement, multi-agent reasoning, and a self-correcting critic loop.",
};

const RUNTIMES: { id: string; label: string; install: string; verify: string }[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    install: "claude mcp add txlookup -- python -m mcp.server",
    verify: 'claude --message "use txlookup to list food truck permits in 78702 last 6 months"',
  },
  {
    id: "codex",
    label: "Codex CLI",
    install: "codex --add-mcp 'name=txlookup,command=python,args=[-m,mcp.server]'",
    verify: 'codex "use txlookup ask_data: which Austin zips have the most code violations this year"',
  },
  {
    id: "cursor",
    label: "Cursor",
    install: 'Settings → MCP → Add: { "txlookup": { "command": "python", "args": ["-m", "mcp.server"] } }',
    verify: 'In chat: "@txlookup ask: 311 response times across the 10 council districts"',
  },
  {
    id: "custom",
    label: "Custom MCP client",
    install: "import the server: python -m mcp.server  # speaks MCP stdio",
    verify: 'POST { "method": "tools/call", "params": { "name": "ask_data", "arguments": { "query": "..." } } }',
  },
];

const TOOLS: { name: string; description: string; example: string }[] = [
  {
    name: "ask_data",
    description: "End-to-end loop: parse question → plan → dispatch tools → critic-revise → cited answer. Use this for plain-English questions.",
    example: '{ "query": "Where do permits and code violations both spike together this year by zip?" }',
  },
  {
    name: "discover_datasets",
    description: "Find a TX civic dataset for a topic. Returns top candidates from the curated catalog.",
    example: '{ "query": "311 service requests", "city": "Austin" }',
  },
  {
    name: "get_dataset_schema",
    description: "Inspect a dataset's columns and field-name aliases before SoQL. Run BEFORE fetch_data on a fresh dataset.",
    example: '{ "dataset_id": "3syk-w9eu" }',
  },
  {
    name: "fetch_data",
    description: "Bounded SODA fetch (≤100 rows). Cache-first; falls through to live with X-source pill in the envelope.",
    example: '{ "dataset_id": "3syk-w9eu", "where": "original_zip=\'78702\' AND issue_date >= \'2026-01-01\'" }',
  },
  {
    name: "summarize_data",
    description: "Compress a fetch result into a structured finding (top-N, deltas, anomalies) the reporter can cite.",
    example: '{ "rows": [...], "dimension": "zip", "metric": "count" }',
  },
  {
    name: "cite_dataset",
    description: "Mandatory step before answer composition. Records the dataset id + portal + query that backs every claim.",
    example: '{ "dataset_id": "3syk-w9eu", "portal": "data.austintexas.gov" }',
  },
  {
    name: "replan_step",
    description: "Self-correction. When a tool fails or the critic rejects the draft, the orchestrator replans from this point.",
    example: '{ "reason": "schema mismatch", "from_step": 3 }',
  },
  {
    name: "render_to_miro",
    description: "Post structured findings (heatmap, leaderboard, citation card) to a Miro board.",
    example: '{ "name": "Austin permit hotspots Q2 2026" }',
  },
  {
    name: "delegate_to",
    description: "Hand a sub-task to a named specialist (data_analyst, dataset_scout, critic, reporter). Multi-agent fan-out.",
    example: '{ "agent": "data_analyst", "task": "compute zip-level join" }',
  },
];

const MOATS = [
  {
    eyebrow: "Citation-enforced",
    body: "The tool loop structurally cannot return without `cite_dataset`. ChatGPT-style hallucination is a class of bug we don't have.",
  },
  {
    eyebrow: "Multi-agent reasoning, visible",
    body: "Orchestrator + 3 specialists + critic + dataset scout. Every step tagged with the responsible agent. Watch them collaborate at /q.",
  },
  {
    eyebrow: "Doom-loop guard",
    body: "Pattern-based detection (3+ identical OR [A,B,A,B]) catches stuck agents and triggers replan with diagnosis. Patentable; tests in tests/test_doom_loop.py.",
  },
  {
    eyebrow: "Cache-first SoQL with cross-dataset JOINs",
    body: "SQLite cache mirrors curated columns. Cross-dataset SQL joins Socrata's SoQL can't express. Source pill (cache | live | cache-fallback) on every tool envelope.",
  },
  {
    eyebrow: "Always-on dataset scout",
    body: "Multi-city cron scans Austin / Dallas / SA / Houston / state portals every 6h, files GitHub issues for new datasets. The corpus grows by itself.",
  },
  {
    eyebrow: "Replayable run archive",
    body: "Every accepted answer is fingerprinted + saved. /admin/replay/{hash} re-streams the full SSE flow. Demo insurance + audit trail.",
  },
];

export default function UseAsAgentPage() {
  return (
    <Shell active="/use-as-agent">
      {/* HERO */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1240px] px-6 py-12 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
            TXLookup · Use as agent · MCP server
          </p>
          <h1 className="mt-4 max-w-[22ch] text-[44px] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--ds-text)] md:text-[88px]">
            Sourced civic data,{" "}
            <span className="text-[var(--ds-text-mute)]">wherever your agent lives.</span>
          </h1>
          <p className="mt-7 max-w-[60ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)] md:text-[18px]">
            One MCP server. Eight tools. Curated Texas civic datasets — Austin, Dallas, San Antonio, Houston, state. The scout grows the corpus. <span className="text-[var(--ds-good)]">Install in 30 seconds. Verify in 60.</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#install"
              className="inline-flex items-center rounded-md bg-[var(--ds-text)] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-bg)] hover:bg-[var(--ds-text-mute)]"
            >
              Install in 30s →
            </a>
            <a
              href="#prove"
              className="inline-flex items-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-text)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
            >
              Prove it works in 60s →
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="inline-flex items-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-text)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
            >
              GitHub ↗
            </a>
            <Link
              href="/docs"
              className="inline-flex items-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-text)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
            >
              Full docs →
            </Link>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1240px] px-6 py-12 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
            Why TXLookup, not a wrapper
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[52px]">
            Six reasons your agent should use this instead of writing its own SoQL.
          </h2>
          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {MOATS.map((m) => (
              <div
                key={m.eyebrow}
                className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-5 md:p-7"
              >
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
                  {m.eyebrow}
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSTALL */}
      <section id="install" className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1240px] px-6 py-12 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
            Install
          </p>
          <h2 className="mt-3 max-w-[26ch] text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[52px]">
            Pick your runtime. Copy. Paste. Done.
          </h2>
          <p className="mt-4 max-w-[64ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
            TXLookup ships as a stdio MCP server. Any client that speaks MCP can install it — Claude Code, Codex CLI, Cursor, your own Python orchestrator. Smithery-listed via <code className="rounded bg-[var(--ds-bg-elev)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--ds-text)]">smithery.yaml</code> at the repo root. Requires Python 3.11+ and an OpenAI API key.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {RUNTIMES.map((r) => (
              <div
                key={r.id}
                className="overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]"
              >
                <div className="flex items-center justify-between border-b border-[var(--ds-border)] px-5 py-3">
                  <p className="text-[16px] font-bold tracking-tight text-[var(--ds-text)]">
                    {r.label}
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                    {r.id}
                  </span>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-accent)]">
                      Install
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-deep)] p-3 font-mono text-[12px] leading-relaxed text-[var(--ds-text)]">
{r.install}
                    </pre>
                  </div>
                  <div>
                    <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-good)]">
                      Verify
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-deep)] p-3 font-mono text-[12px] leading-relaxed text-[var(--ds-text)]">
{r.verify}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <TerminalBlock title="~/txlookup · pre-install" tone="accent">
{`$ git clone https://github.com/ATX-TXLookup/TXLookup
$ cd TXLookup && pip install -r requirements.txt
$ export OPENAI_API_KEY=sk-…
$ python -m mcp.server  # speaks MCP stdio`}
            </TerminalBlock>
          </div>
        </div>
      </section>

      {/* PROVE */}
      <section id="prove" className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1240px] px-6 py-12 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-good)]">
            Prove it works
          </p>
          <h2 className="mt-3 max-w-[26ch] text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[52px]">
            Sixty seconds to a sourced answer.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-5 md:p-7">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
                Option 1 · Hosted, no install
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
                Hit the live agent at{" "}
                <Link
                  href="/q"
                  className="text-[var(--ds-accent)] underline hover:text-[var(--ds-text)]"
                >
                  /q
                </Link>
                . Watch the DAG light up in the right column. Every node carries an agent name + source pill (cache / live).
              </p>
              <Link
                href="/q?q=Where%20do%20permits%20and%20code%20violations%20both%20spike%20together%20this%20year%20by%20zip"
                className="mt-5 inline-flex items-center rounded-md bg-[var(--ds-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-bg)] hover:opacity-90"
              >
                Try a marquee query →
              </Link>
            </div>
            <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-5 md:p-7">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
                Option 2 · One-shot smoke from your shell
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
                After install, run this from anywhere. Returns a JSON envelope with{" "}
                <code className="rounded bg-[var(--ds-bg-elev)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--ds-text)]">answer</code>{" "}
                +{" "}
                <code className="rounded bg-[var(--ds-bg-elev)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--ds-text)]">citation</code>.
              </p>
              <div className="mt-4">
                <TerminalBlock title="~/anywhere · smoke test" tone="good">
{`$ echo '{"query":"food truck permits 78702 last 6mo"}' \\
  | python -c '
import asyncio, json, sys
from mcp.server import ask_data
print(asyncio.run(ask_data(json.load(sys.stdin)["query"])))'`}
                </TerminalBlock>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOOLS CATALOG */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1240px] px-6 py-12 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
            What you get
          </p>
          <h2 className="mt-3 max-w-[26ch] text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[52px]">
            Eight tools, all bounded, all cited.
          </h2>
          <p className="mt-4 max-w-[64ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
            Full machine-readable catalog at{" "}
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/mcp/manifest.json"
              className="text-[var(--ds-accent)] underline hover:text-[var(--ds-text)]"
            >
              mcp/manifest.json
            </a>
            . Skill doc with safety rules at{" "}
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
              className="text-[var(--ds-accent)] underline hover:text-[var(--ds-text)]"
            >
              skills/txlookup/SKILL.md
            </a>
            . Reference docs at{" "}
            <Link
              href="/docs"
              className="text-[var(--ds-accent)] underline hover:text-[var(--ds-text)]"
            >
              /docs
            </Link>
            .
          </p>
          <ul className="mt-10 grid gap-3 md:grid-cols-2">
            {TOOLS.map((t) => (
              <li
                key={t.name}
                className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 md:p-6"
              >
                <p className="font-mono text-[13px] font-bold text-[var(--ds-accent)]">
                  {t.name}
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--ds-text-mute)]">
                  {t.description}
                </p>
                <pre className="mt-3 overflow-x-auto rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-deep)] p-3 font-mono text-[11px] leading-relaxed text-[var(--ds-text)]">
{t.example}
                </pre>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* MARKETPLACE */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1240px] px-6 py-12 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
            Find us
          </p>
          <h2 className="mt-3 max-w-[26ch] text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[52px]">
            Discoverable wherever agents look.
          </h2>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            <a
              href="https://smithery.ai"
              className="group block rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-5 md:p-7 transition-colors hover:border-[var(--ds-accent)]/60"
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
                Smithery
              </p>
              <p className="mt-3 text-[18px] font-bold tracking-tight text-[var(--ds-text)] group-hover:text-[var(--ds-accent)]">
                MCP server index
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--ds-text-mute)]">
                Submitted via smithery.yaml at the repo root.
              </p>
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="group block rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-5 md:p-7 transition-colors hover:border-[var(--ds-accent)]/60"
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-good)]">
                GitHub
              </p>
              <p className="mt-3 text-[18px] font-bold tracking-tight text-[var(--ds-text)] group-hover:text-[var(--ds-accent)]">
                Topic: mcp-server
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--ds-text-mute)]">
                + texas-data, agent-skill, civic-data.
              </p>
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
              className="group block rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-5 md:p-7 transition-colors hover:border-[var(--ds-accent)]/60"
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
                Anthropic Skills
              </p>
              <p className="mt-3 text-[18px] font-bold tracking-tight text-[var(--ds-text)] group-hover:text-[var(--ds-accent)]">
                SKILL.md installable
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--ds-text-mute)]">
                Drop into ~/.claude/skills/txlookup/.
              </p>
            </a>
          </div>
          <p className="mt-8 max-w-[64ch] text-[14px] leading-relaxed text-[var(--ds-text-dim)]">
            Want us in another marketplace? Open an issue on GitHub and we&rsquo;ll submit.
          </p>
        </div>
      </section>
    </Shell>
  );
}
