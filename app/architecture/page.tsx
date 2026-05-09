import Link from "next/link";

import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";

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
    title: "External agent installs TXLookup",
    surface: "claude mcp add txlookup …",
    steps: [
      "Developer runs claude/codex mcp add against mcp/server.py",
      "FastMCP advertises 5 tools: discover, describe, query, summarize, cite",
      "Skill doc (skills/txlookup/SKILL.md) teaches the runtime when to call each",
      "Tool calls land at the same data layer (agent/tools/data.py)",
      "Citations enforced — every reply includes portal + dataset_id + last_refreshed",
    ],
    nodes: ["External agent runtime", "TXLookup MCP server", "Socrata SODA"],
  },
  {
    n: "05",
    title: "Agent-to-agent (A2A) — render to Miro",
    surface: "render_to_miro tool",
    steps: [
      "Planner emits render_to_miro for visualizable answers",
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
  { name: "Edge", items: ["Vercel — / · /q · /datasets/[id] · /api/agent (SSE)"] },
  { name: "Agent loop", items: ["Codex (gpt-4o)", "Replanner", "Synthesizer", "Doom-loop guard"] },
  { name: "Tool dispatch", items: ["discover · describe · query · summarize · cite · render_to_miro"] },
  { name: "Data + I/O", items: ["Socrata SODA APIs (live)", "Local YAML catalog", "Miro REST API"] },
  { name: "Bound + safety", items: ["Skill doc · 5000-row cap · 30s timeout · 429 backoff · citation enforced"] },
];

export const metadata = { title: "Architecture — TXLookup" };

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-white text-[#1A1F2A] font-body">
      <SiteHeader activePath="/architecture" />

      {/* Hero */}
      <section className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
          <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
            Architecture
          </p>
          <h1 className="mt-4 max-w-[24ch] font-display text-[40px] font-black leading-[1.05] tracking-tight text-[#0B2545] md:text-[64px]">
            How the system fits together.
          </h1>
          <p className="mt-6 max-w-[64ch] text-base leading-relaxed text-[#1A1F2A]/80 md:text-lg">
            TXLookup is one Codex-driven agent surfaced through five flows.
            All five share a typed plan/dispatch contract, a single skill
            policy, and the same bounded Socrata client. The diagram below
            shows the layers; the cards underneath walk through each flow
            end-to-end.
          </p>
        </div>
      </section>

      {/* Layered diagram */}
      <section className="border-b border-[#1A1F2A]/10 bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
            Layers
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#0B2545] md:text-4xl">
            Six layers, top to bottom.
          </h2>
          <div className="mt-8 grid gap-3">
            {layers.map((layer, i) => (
              <div
                key={layer.name}
                className="grid items-center gap-4 rounded-md border border-[#1A1F2A]/10 bg-white px-5 py-4 md:grid-cols-[200px_1fr]"
                style={{
                  background:
                    i % 2 === 0
                      ? "linear-gradient(90deg, #F4F6FB 0%, white 30%)"
                      : "white",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-base font-bold text-[#0B2545]">
                    {layer.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {layer.items.map((it) => (
                    <span
                      key={it}
                      className="rounded-sm border border-[#1A1F2A]/10 bg-white px-3 py-1 font-mono text-[11px] text-[#1A1F2A]/85"
                    >
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
            Markdown source: docs/architecture.md
          </p>
        </div>
      </section>

      {/* Flows */}
      <section className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
            Flows
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#0B2545] md:text-4xl">
            Five surfaces, one agent.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {flows.map((f) => (
              <div
                key={f.n}
                className="flex flex-col rounded-md border border-[#1A1F2A]/10 bg-white p-6"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                    Flow {f.n}
                  </span>
                  <span className="rounded-sm bg-[#0B2545] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
                    {f.surface}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl font-bold leading-tight text-[#0B2545]">
                  {f.title}
                </h3>
                <ol className="mt-4 space-y-2 text-sm text-[#1A1F2A]/85">
                  {f.steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-mono text-[11px] font-semibold tabular-nums text-[#1A1F2A]/55">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#1A1F2A]/10 pt-4">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#1A1F2A]/55">
                    Nodes:
                  </span>
                  {f.nodes.map((n) => (
                    <span
                      key={n}
                      className="rounded-sm border border-[#1A1F2A]/10 bg-[#F4F6FB] px-2 py-0.5 font-mono text-[10px] text-[#1A1F2A]/85"
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
      <section className="border-b border-[#1A1F2A]/10 bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
            Read more
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#0B2545] md:text-4xl">
            Companion docs.
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
                className="rounded-md border border-[#1A1F2A]/10 bg-white p-5 hover:border-[#0B5FFF]"
              >
                <a href={d.href} className="block">
                  <p className="font-display text-base font-bold text-[#0B2545]">
                    {d.t}
                  </p>
                  <p className="mt-1 text-sm text-[#1A1F2A]/75">{d.d}</p>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-[#0B5FFF]">
                    Read on GitHub →
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
