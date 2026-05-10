import { Shell } from "@/app/components/ds";
import { loadDiscovery } from "@/app/lib/catalog-discovered";
import { CATALOG } from "@/app/lib/catalog";

export const dynamic = "force-dynamic";
export const revalidate = 600;

const flows = [
  {
    n: "01",
    title: "User asks a question (live agent)",
    surface: "/q?q=…",
    steps: [
      "Browser POST /api/agent { query }",
      "Server SSE stream opens (text/event-stream)",
      "phase=reasoning — Codex parses intent",
      "phase=planning — Codex returns structured Plan { intent, steps[] }",
      "phase=executing — for each step, dispatch tool",
      "phase=replanning (if step fails ≤2 times) — Codex emits a new Plan",
      "phase=completing — Codex synthesizes final answer",
      "phase=done — answer + citation + artifacts streamed back",
    ],
    nodes: ["Browser", "/api/agent (Vercel)", "Codex (gpt-4o)", "Socrata SODA", "Miro REST"],
  },
  {
    n: "02",
    title: "Browse a dataset",
    surface: "/datasets/[id]",
    steps: [
      "Server component renders at request time (revalidate 600s)",
      "Promise.all fetches /api/views/{id}.json + /resource/{id}.json?$limit=5",
      "Schema columns + sample rows + last refresh rendered as static HTML",
      "Scoped 'ask about this dataset' search submits back to /q with dataset=<id>",
    ],
    nodes: ["Browser", "/datasets/[id] server component", "Socrata SODA"],
  },
  {
    n: "03",
    title: "Live homepage stats",
    surface: "/",
    steps: [
      "Server-render at request time (revalidate 300s)",
      "Promise.all fans out 5+ Socrata queries:",
      "  • Austin permits last 7 days (group by day)",
      "  • Austin permits 7d total",
      "  • Top inspection zip last 30 days",
      "  • 311 requests last 30 days",
      "  • Open code violations",
      "  • Per-dataset metadata for the cards",
      "Sparkline + ticker render with real numbers",
    ],
    nodes: ["Browser", "/ server component", "Socrata SODA"],
  },
  {
    n: "04",
    title: "Cache-resilience layer (the local mirror)",
    surface: "data/cache/<id>.json",
    steps: [
      "GitHub Actions ingestor cron fires every 6h",
      "Pulls 5,000 most-recent rows per curated dataset to JSON",
      "Commits data/cache/*.json (~5 MB total) to main",
      "Vercel build bundles cache files into every serverless function",
      "Reader: try cache → on miss, hit live Socrata → on 429/5xx, fall back to stale cache with caveat",
      "Each visible stat tile carries a freshness badge (Mirror · Nh ago / Live · just now)",
    ],
    nodes: ["GitHub Actions cron", "ingestor.py", "data/cache/*.json", "app/lib/cache.ts"],
  },
  {
    n: "05",
    title: "External agent installs TXLookup",
    surface: "claude mcp add txlookup …",
    steps: [
      "Developer runs claude/codex/cursor mcp add against mcp/server.py",
      "FastMCP advertises 8 tools (ask_data, discover_datasets, get_dataset_schema, fetch_data, get_task_status, create_miro_board, add_to_miro, list_known_tools)",
      "Skill doc (skills/txlookup/SKILL.md) teaches the runtime when to call each",
      "Tool calls land at the same data layer (agent/tools/data.py)",
      "Citations enforced — every reply includes portal + dataset_id + last_refreshed",
    ],
    nodes: ["External agent runtime", "TXLookup MCP server", "Socrata SODA + CKAN"],
  },
  {
    n: "06",
    title: "Agent-to-agent (A2A) — render to Miro",
    surface: "create_miro_board tool",
    steps: [
      "Planner emits create_miro_board for visualizable answers",
      "Executor calls Miro REST API with title + summary + records",
      "Miro returns board_id + view_link",
      "View link surfaced as an artifact alongside the answer",
      "Judge clicks → opens the live, persistent Miro board",
    ],
    nodes: ["TXLookup agent", "Miro REST API", "Miro board (persistent)"],
  },
];

const layers = [
  { name: "User surface", items: ["Browser", "MCP-client (Claude Code, Codex, Cursor)"] },
  { name: "Edge", items: ["Vercel — / · /q · /chat · /datasets · /reports · /sources · /api/agent (SSE)"] },
  { name: "Agent loop", items: ["7 specialists (planner · analyst · reporter · support · critic · scout · ingestor)", "Doom-loop guard", "Replanner", "Synthesizer"] },
  { name: "Tool dispatch", items: ["8 MCP tools · discover · describe · fetch · summarize · cite · status · miro_create · miro_add"] },
  { name: "Data + I/O", items: ["Socrata SODA (Austin / Austin Hub / Dallas / TX state)", "CKAN (San Antonio / Houston)", "data/cache/*.json local mirror", "Miro REST API"] },
  { name: "Resilience", items: ["cache → live → stale-cache → error chain", "5,000-row cap · 30s timeout · 429 backoff", "freshness badge per visible stat"] },
  { name: "Bound + safety", items: ["Skill doc · citation enforced · doom-loop pattern detection · replan preserves intent"] },
];

export const metadata = { title: "Architecture — TXLookup" };

export default async function ArchitecturePage() {
  const discovery = await loadDiscovery();
  return (
    <Shell active="/architecture">
      {/* Hero */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
            Architecture · the whole system
          </p>
          <h1 className="mt-4 max-w-[24ch] text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--ds-text)] md:text-[64px]">
            How the system{" "}
            <span className="text-[var(--ds-text-mute)]">fits together.</span>
          </h1>
          <p className="mt-6 max-w-[68ch] text-base leading-relaxed text-[var(--ds-text-mute)] md:text-lg">
            TXLookup is one Codex-driven multi-agent loop surfaced through six flows. All six share a typed plan/dispatch contract, a single skill policy, the same bounded Socrata + CKAN client, and a local-mirror resilience layer. The diagram below shows the layers; the cards walk through each flow end-to-end.
          </p>

          {/* Story numbers strip */}
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              { value: discovery.totalKnown.toLocaleString(), label: "Datasets indexed", sub: `${discovery.portals.length} portals · Socrata + CKAN`, tone: "var(--ds-accent)" },
              { value: String(CATALOG.length), label: "Deeply curated", sub: "Schema + cached rows + glossary", tone: "var(--ds-good)" },
              { value: "7", label: "Specialists", sub: "5 in /q loop · 2 scheduled crons", tone: "var(--ds-purple)" },
              { value: "8", label: "MCP tools", sub: "Installable in Claude Code, Cursor, Codex", tone: "var(--ds-warm)" },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4">
                <p className="text-[28px] font-bold tabular-nums tracking-tight md:text-[36px]" style={{ color: s.tone }}>
                  {s.value}
                </p>
                <p className="mt-1 text-[14px] font-medium text-[var(--ds-text)]">{s.label}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Layered diagram */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--ds-text)] md:text-4xl">
            Seven layers,{" "}
            <span className="text-[var(--ds-text-mute)]">top to bottom.</span>
          </h2>
          <div className="mt-8 grid gap-3">
            {layers.map((layer, i) => (
              <div
                key={layer.name}
                className="grid items-center gap-4 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-5 py-4 md:grid-cols-[200px_1fr]"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-accent)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-base font-bold text-[var(--ds-text)]">
                    {layer.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {layer.items.map((it) => (
                    <span
                      key={it}
                      className="rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg)] px-3 py-1 font-mono text-[11px] text-[var(--ds-text-mute)]"
                    >
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-dim)]">
            Markdown source: docs/architecture.md
          </p>
        </div>
      </section>

      {/* Flows */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--ds-text)] md:text-4xl">
            Six flows,{" "}
            <span className="text-[var(--ds-text-mute)]">one agent.</span>
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {flows.map((f) => (
              <div
                key={f.n}
                className="flex flex-col rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-6"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-accent)]">
                    Flow {f.n}
                  </span>
                  <span className="rounded-sm bg-[var(--ds-text)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-bg)]">
                    {f.surface}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-bold leading-tight text-[var(--ds-text)]">
                  {f.title}
                </h3>
                <ol className="mt-4 space-y-2 text-sm text-[var(--ds-text-mute)]">
                  {f.steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--ds-text-dim)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--ds-border)] pt-4">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                    Nodes:
                  </span>
                  {f.nodes.map((n) => (
                    <span
                      key={n}
                      className="rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg)] px-2 py-0.5 font-mono text-[10px] text-[var(--ds-text-mute)]"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* See also */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--ds-text)] md:text-4xl">
            Companion <span className="text-[var(--ds-text-mute)]">docs.</span>
          </h2>
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              {
                href: "https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/how-it-works.md",
                t: "How it works",
                d: "End-to-end live trace of the marquee question — every SSE event, every tool call, every Socrata response.",
              },
              {
                href: "https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/agents-strategy.md",
                t: "Agents strategy",
                d: "Codex's five distinct roles in the loop, and the explicit 'why this isn't a wrapper' framing for the Agents Track.",
              },
              {
                href: "https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md",
                t: "Agent skill",
                d: "The deliverable agent skill — when to invoke TXLookup, which tool to pick, the safety rules, worked examples.",
              },
              {
                href: "https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md",
                t: "Integration guide",
                d: "Install the MCP server in Claude Code / Codex / standalone; full tool catalog with examples.",
              },
            ].map((d) => (
              <li
                key={d.href}
                className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 hover:border-[var(--ds-text-dim)]"
              >
                <a href={d.href} className="block">
                  <p className="text-base font-bold text-[var(--ds-text)]">
                    {d.t}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ds-text-mute)]">{d.d}</p>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-[var(--ds-accent)]">
                    Read on GitHub →
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Shell>
  );
}
