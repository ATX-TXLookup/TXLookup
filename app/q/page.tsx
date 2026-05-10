// TXLookup agent observatory page (/q). Wrapped in the shared Shell chrome
// for consistency with the rest of the site. When there's no `?q=` query
// param, render a proper empty-state landing with search + sample chips +
// brief "what happens when you ask" explainer. Otherwise hand off to
// AgentRunner (left answer column + right observatory sidebar).

import Link from "next/link";
import { Shell } from "@/app/components/ds";

import { AgentRunner } from "./AgentRunner";

const SAMPLES = [
  "Where do permits and code violations both spike together this year by zip?",
  "How has Austin's permit mix shifted from residential to commercial since 2024?",
  "Restaurants near 78704 with failing inspections this year",
  "Build a Miro board mapping 311 hotspots by council district",
  "Top zips by 311 noise complaints in the last 30 days",
  "Compare crime trends in 78744 vs 78704 since 2024",
];

const PIPELINE = [
  { num: "01", label: "Reason",  body: "Codex parses your question into a structured intent: domain, geography, time range, analysis type." },
  { num: "02", label: "Plan",    body: "The orchestrator emits a JSON plan — which datasets, which SoQL, which specialist agents to dispatch." },
  { num: "03", label: "Execute", body: "Tool calls hit the cache first, fall through to live Socrata. Source pill (cache/live) on every step." },
  { num: "04", label: "Critic",  body: "A separate critic LLM grades the plan + answer. On reject, the orchestrator revises with diagnosis." },
  { num: "05", label: "Cite",    body: "Loop cannot terminate without cite_dataset. Every claim has an attribution. Replayable in /admin." },
];

export default async function QueryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dataset?: string; demo?: string; fallback?: string }>;
}) {
  const { q, dataset, demo, fallback } = await searchParams;
  const query = q?.trim() || "";
  const mode = fallback === "1" ? "fallback" : demo === "1" ? "demo" : "live";

  // No query → render the empty-state landing (search + samples + explainer).
  if (!query) {
    return (
      <Shell active="/q">
        {/* HERO — search-first */}
        <section className="border-b border-[var(--ds-border)]">
          <div className="mx-auto max-w-[1100px] px-6 py-16 md:px-8 md:py-24">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
              Ask the agent
            </p>
            <h1 className="mt-4 max-w-[18ch] text-[44px] font-bold leading-[1.04] tracking-[-0.025em] text-[var(--ds-text)] md:text-[72px]">
              Type a question. Get a sourced answer.
            </h1>
            <p className="mt-6 max-w-[58ch] text-[18px] leading-[1.55] text-[var(--ds-text-mute)]">
              Plain English over 6,061 indexed Texas datasets across 6 portals. 9 are deeply curated and locally mirrored; the rest are answered on demand from catalog metadata. The agent picks the dataset, runs bounded SoQL, asks the critic to verify, composes the answer, attaches the citation.
            </p>

            <form action="/q" method="GET" className="mt-10 max-w-[820px]">
              <div className="flex items-center gap-2 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-2 transition-colors focus-within:border-[var(--ds-accent)]">
                <input
                  name="q"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. where do permits and code violations both spike together this year"
                  className="flex-1 bg-transparent px-3 py-3 text-[16px] text-[var(--ds-text)] placeholder:text-[var(--ds-text-dim)] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-md bg-[var(--ds-text)] px-5 py-2.5 text-[13px] font-semibold text-[var(--ds-bg)] hover:bg-[var(--ds-text-mute)]"
                >
                  Ask →
                </button>
              </div>
            </form>

            <div className="mt-8 max-w-[820px]">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                Try a marquee question
              </p>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {SAMPLES.map((s) => (
                  <Link
                    key={s}
                    href={`/q?q=${encodeURIComponent(s)}`}
                    className="group flex items-center justify-between gap-3 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-4 py-3 text-[14px] leading-snug text-[var(--ds-text)] transition-colors hover:border-[var(--ds-accent)]/50"
                  >
                    <span className="line-clamp-2">{s}</span>
                    <span className="font-mono text-[12px] text-[var(--ds-accent)] opacity-0 transition-opacity group-hover:opacity-100">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[var(--ds-text-dim)]">
              <span className="font-mono uppercase tracking-[0.14em]">Or run a demo replay</span>
              <Link
                href={`/q?demo=1&q=${encodeURIComponent(SAMPLES[2])}`}
                className="rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-3 py-1 text-[12px] text-[var(--ds-text)] hover:border-[var(--ds-accent)]/50"
              >
                ?demo=1 (no Codex spend) →
              </Link>
            </div>
          </div>
        </section>

        {/* WHAT HAPPENS WHEN YOU ASK — the 5-step pipeline */}
        <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
          <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-good)]">
              What happens when you ask
            </p>
            <h2 className="mt-3 max-w-[20ch] text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[40px]">
              Five steps from question to citation.
            </h2>
            <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
              The right column on the answer page shows this loop running live — every tool call as a node in a flowchart, every cache hit / live fetch as a labeled pill, every critic decision as a diamond.
            </p>
            <div className="mt-10 grid gap-3 md:grid-cols-5">
              {PIPELINE.map((p) => (
                <div
                  key={p.num}
                  className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-5"
                >
                  <p className="font-mono text-[14px] font-bold tabular-nums text-[var(--ds-accent)]">
                    {p.num}
                  </p>
                  <h3 className="mt-3 text-[15px] font-bold tracking-tight text-[var(--ds-text)]">
                    {p.label}
                  </h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--ds-text-mute)]">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/agents"
                className="inline-flex items-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-text)] hover:border-[var(--ds-text-dim)]"
              >
                See the agent roster →
              </Link>
              <Link
                href="/use-as-agent"
                className="inline-flex items-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-text)] hover:border-[var(--ds-text-dim)]"
              >
                Install as MCP server →
              </Link>
            </div>
          </div>
        </section>
      </Shell>
    );
  }

  // Query present → hand off to the AgentRunner (left answer + right DAG).
  return (
    <Shell active="/q">
      <AgentRunner query={query} dataset={dataset} mode={mode} />
    </Shell>
  );
}
