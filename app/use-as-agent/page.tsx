// /use-as-agent — install pitch + agent card. The page that tells someone
// landing from Smithery, Anthropic skills marketplace, GitHub, or word of
// mouth WHY to install TXLookup and HOW to prove it works in <60 seconds.
//
// Brand: tx-cream/tx-navy/tx-rust/tx-gold — same as the rest of the site.

import Link from "next/link";
import { Shell } from "@/app/components/ds";

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
    name: "create_miro_board / add_to_miro",
    description: "Post structured findings (heatmap, leaderboard, citation card) to a Miro board.",
    example: '{ "name": "Austin permit hotspots Q2 2026" }',
  },
  {
    name: "list_known_tools",
    description: "Self-introspection. Returns this catalog. Useful for dynamic agents.",
    example: "{}",
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
      {/* Hero */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 pb-16 pt-12 md:px-8 md:pb-24 md:pt-16">
          <h1 className="max-w-[24ch] text-[42px] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--ds-text)] md:text-[64px]">
            Sourced civic data,{" "}
            <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
              wherever your agent lives.
            </span>
          </h1>
          <p className="mt-6 max-w-[60ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
            One MCP server. Eight tools. Curated Texas civic datasets — Austin, Dallas, SA, Houston, state. The scout grows the corpus. Install in 30 seconds. Verify in 60.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#install"
              className="inline-flex items-center rounded-md bg-[var(--ds-text)] px-5 py-2.5 text-[13px] font-semibold text-[var(--ds-bg)] hover:bg-[var(--ds-text-mute)]"
            >
              Install in 30s →
            </a>
            <a
              href="#prove"
              className="inline-flex items-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-5 py-2.5 text-[13px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-text-dim)]"
            >
              Prove it works in 60s →
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="inline-flex items-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-5 py-2.5 text-[13px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-text-dim)]"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="border-b border-[var(--ds-border)] bg-white">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-10 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
            Why TXLookup, not a wrapper
          </p>
          <h2 className="mt-2 max-w-[28ch] font-display-serif text-3xl font-bold tracking-tight text-[var(--ds-text)] md:text-4xl">
            Six reasons your agent should use this instead of writing its own SoQL.
          </h2>
          <div className="mt-10 grid gap-px bg-tx-ink/10 md:grid-cols-2">
            {MOATS.map((m) => (
              <div key={m.eyebrow} className="bg-white p-6">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warn)]">
                  {m.eyebrow}
                </p>
                <p className="mt-3 text-base leading-relaxed text-[var(--ds-text)]">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Install */}
      <section id="install" className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-10 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
            Install
          </p>
          <h2 className="mt-2 font-display-serif text-3xl font-bold tracking-tight text-[var(--ds-text)] md:text-4xl">
            Pick your runtime. Copy. Paste. Done.
          </h2>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ds-text)]/75">
            TXLookup ships as a stdio MCP server. Any client that speaks MCP can install it — Claude Code, Codex CLI, Cursor, your own Python orchestrator. Requires Python 3.11+ and an OpenAI API key.
          </p>
          <div className="mt-8 grid gap-4">
            {RUNTIMES.map((r) => (
              <div key={r.id} className="border border-[var(--ds-border)] bg-white">
                <div className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-5 py-3">
                  <p className="font-display-serif text-lg font-semibold text-white">{r.label}</p>
                </div>
                <div className="divide-y divide-tx-ink/10">
                  <div className="px-5 py-4">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-warm)]">Install</p>
                    <pre className="mt-2 overflow-x-auto bg-[var(--ds-bg-deep)] px-4 py-3 font-mono text-[12px] leading-relaxed text-[var(--ds-text)]">
{r.install}
                    </pre>
                  </div>
                  <div className="px-5 py-4">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-warn)]">Verify</p>
                    <pre className="mt-2 overflow-x-auto bg-[var(--ds-bg-deep)] px-4 py-3 font-mono text-[12px] leading-relaxed text-[var(--ds-text)]">
{r.verify}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[60ch] text-sm leading-relaxed text-[var(--ds-text)]/65">
            Pre-install: <code className="bg-[var(--ds-bg)] px-1.5 py-0.5 font-mono text-[11px]">git clone https://github.com/ATX-TXLookup/TXLookup &amp;&amp; cd TXLookup &amp;&amp; pip install -r requirements.txt</code> — then export <code className="bg-[var(--ds-bg)] px-1.5 py-0.5 font-mono text-[11px]">OPENAI_API_KEY</code>.
          </p>
        </div>
      </section>

      {/* Prove */}
      <section id="prove" className="border-b border-[var(--ds-border)] bg-white">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-10 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
            Prove it works
          </p>
          <h2 className="mt-2 font-display-serif text-3xl font-bold tracking-tight text-[var(--ds-text)] md:text-4xl">
            Sixty seconds to a sourced answer.
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-warn)]">
                Option 1 · Hosted, no install
              </p>
              <p className="mt-3 text-base leading-relaxed text-[var(--ds-text)]">
                Hit the live agent at <Link href="/q?q=Where%20do%20permits%20and%20code%20violations%20both%20spike%20together%20this%20year%20by%20zip" className="text-[var(--ds-warm)] underline hover:text-[var(--ds-text)]">/q</Link>. Watch the DAG light up in the right column. Every node carries an agent name + source pill (cache / live).
              </p>
              <Link
                href="/q?q=Where%20do%20permits%20and%20code%20violations%20both%20spike%20together%20this%20year%20by%20zip"
                className="mt-4 inline-flex items-center rounded-md bg-[var(--ds-text)] px-4 py-2 text-[12px] font-semibold text-[var(--ds-bg)] hover:bg-[var(--ds-text-mute)]"
              >
                Try a marquee query →
              </Link>
            </div>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-warn)]">
                Option 2 · One-shot smoke from your shell
              </p>
              <p className="mt-3 text-base leading-relaxed text-[var(--ds-text)]">
                After install, run this from anywhere. Returns a JSON envelope with <code className="bg-[var(--ds-bg)] px-1 font-mono text-[11px]">answer</code> + <code className="bg-[var(--ds-bg)] px-1 font-mono text-[11px]">citation</code>.
              </p>
              <pre className="mt-4 overflow-x-auto bg-[var(--ds-bg-deep)] px-4 py-3 font-mono text-[12px] leading-relaxed text-[var(--ds-text)]">
{`echo '{"query":"food truck permits in 78702 last 6 months"}' \\
  | python -c '
import asyncio, json, sys
from mcp.server import ask_data
print(asyncio.run(ask_data(json.load(sys.stdin)["query"])))'`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Tools catalog */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-10 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
            What you get
          </p>
          <h2 className="mt-2 font-display-serif text-3xl font-bold tracking-tight text-[var(--ds-text)] md:text-4xl">
            Eight tools, all bounded, all cited.
          </h2>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-[var(--ds-text)]/75">
            Full machine-readable catalog at <a href="https://github.com/ATX-TXLookup/TXLookup/blob/main/mcp/manifest.json" className="text-[var(--ds-warm)] underline hover:text-[var(--ds-text)]">mcp/manifest.json</a>. Skill doc with safety rules at <a href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md" className="text-[var(--ds-warm)] underline hover:text-[var(--ds-text)]">skills/txlookup/SKILL.md</a>.
          </p>
          <div className="mt-8 divide-y divide-tx-ink/10 border border-[var(--ds-border)] bg-white">
            {TOOLS.map((t) => (
              <div key={t.name} className="grid gap-4 p-5 md:grid-cols-[200px_1fr]">
                <div>
                  <p className="font-mono text-sm font-bold text-[var(--ds-text)]">{t.name}</p>
                </div>
                <div>
                  <p className="text-base leading-relaxed text-[var(--ds-text)]">{t.description}</p>
                  <pre className="mt-3 overflow-x-auto bg-[var(--ds-bg)] px-3 py-2 font-mono text-[11px] leading-relaxed text-[var(--ds-text)]">
{t.example}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marketplace */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)] text-white">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-10 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warn)]">
            Find us
          </p>
          <h2 className="mt-2 font-display-serif text-3xl font-bold tracking-tight text-white md:text-4xl">
            Discoverable wherever agents look.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <a href="https://smithery.ai" className="block border border-white/20 p-5 hover:border-tx-gold">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-warn)]">Smithery</p>
              <p className="mt-2 font-display-serif text-lg font-semibold text-white">MCP server index</p>
              <p className="mt-1 text-sm text-white/70">Submitted via mcp/manifest.json</p>
            </a>
            <a href="https://github.com/ATX-TXLookup/TXLookup" className="block border border-white/20 p-5 hover:border-tx-gold">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-warn)]">GitHub</p>
              <p className="mt-2 font-display-serif text-lg font-semibold text-white">Topic: mcp-server</p>
              <p className="mt-1 text-sm text-white/70">+ texas-data, agent-skill</p>
            </a>
            <a href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md" className="block border border-white/20 p-5 hover:border-tx-gold">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-warn)]">Anthropic Skills</p>
              <p className="mt-2 font-display-serif text-lg font-semibold text-white">SKILL.md installable</p>
              <p className="mt-1 text-sm text-white/70">Drop into ~/.claude/skills/txlookup/</p>
            </a>
          </div>
          <p className="mt-6 max-w-[60ch] text-sm leading-relaxed text-white/65">
            Want us in another marketplace? Open an issue on GitHub and we'll submit.
          </p>
        </div>
      </section>

    </Shell>
  );
}
