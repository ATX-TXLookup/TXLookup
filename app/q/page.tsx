// /q — the single public surface.
// Three states based on ?q=:
//   no q          → list view (all cached investigations)
//   q matches     → detail view (live agent replay + finding + evidence)
//   q is uncached → gate view (BYOK / suggest — no public fresh runs)

import Link from "next/link";

import { Shell } from "@/app/components/ds";
import {
  findRun,
  listRuns,
  slugifyQuery,
  type SavedRun,
} from "@/app/lib/run-archive";

import { AgentRunner } from "./AgentRunner";
import { WatchToggle } from "./WatchToggle";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type ToolEvent = {
  phase?: string;
  step?: number;
  tool?: string;
  args?: Record<string, unknown>;
  rationale?: string;
  result?: unknown;
  status?: string;
  source?: string;
  duration_ms?: number;
};

function timeAgo(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  if (d < 7 * 86_400_000) return `${Math.floor(d / 86_400_000)}d ago`;
  return new Date(ms).toISOString().slice(0, 10);
}

function extractFinding(run: SavedRun): string {
  if (!run.answer) return "";
  const firstPara = run.answer.split(/\n\n+/)[0] ?? run.answer;
  return firstPara.slice(0, 220).trim();
}

function extractDataset(run: SavedRun): string | null {
  const events = (run.events ?? []) as ToolEvent[];
  for (const ev of events) {
    if (ev.phase === "executing" && ev.args && typeof ev.args === "object") {
      const dsId = (ev.args as Record<string, unknown>).datasetId;
      if (typeof dsId === "string") return dsId;
    }
  }
  return null;
}

function extractEvidence(
  run: SavedRun,
): Array<{ datasetId: string; klass: "authoritative" | "modeled" | "community" }> {
  const events = (run.events ?? []) as ToolEvent[];
  const seen = new Map<string, "authoritative" | "modeled" | "community">();
  for (const ev of events) {
    if (ev.phase === "executing" && ev.args && typeof ev.args === "object") {
      const dsId = (ev.args as Record<string, unknown>).datasetId;
      if (typeof dsId === "string" && !seen.has(dsId)) {
        seen.set(dsId, "authoritative");
      }
    }
  }
  return Array.from(seen.entries()).map(([datasetId, klass]) => ({ datasetId, klass }));
}

// ------- views -------

function ListView({ runs }: { runs: SavedRun[] }) {
  return (
    <Shell active="/q">
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1100px] px-6 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
            Lookups · TXLookup
          </p>
          <h1 className="mt-4 max-w-[22ch] text-[44px] font-bold leading-[1.04] tracking-[-0.025em] text-[var(--ds-text)] md:text-[56px]">
            What the data says about Texas.
          </h1>
          <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-[var(--ds-text-mute)]">
            Each entry is a question the multi-agent loop has already answered against authoritative civic data — click to watch the agent run.
          </p>
          <p className="mt-3 max-w-[58ch] font-mono text-[12px] uppercase tracking-wider text-[var(--ds-text-dim)]">
            {runs.length} lookup{runs.length === 1 ? "" : "s"} · refreshed every 60s ·{" "}
            <Link href="/byok" className="text-[var(--ds-accent)] hover:underline">
              Ask your own
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-8">
          {runs.length === 0 ? (
            <div className="rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-8 text-center">
              <p className="text-[var(--ds-text-mute)]">No lookups yet.</p>
            </div>
          ) : (
            <ul className="space-y-0 divide-y divide-[var(--ds-border)] border-y border-[var(--ds-border)]">
              {runs.map((r) => {
                const finding = extractFinding(r);
                const dataset = extractDataset(r);
                return (
                  <li key={r.hash}>
                    <Link
                      href={`/q?q=${encodeURIComponent(r.query)}`}
                      className="block py-7 transition-colors hover:bg-[var(--ds-bg-elev)]"
                    >
                      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-baseline md:gap-8">
                        <div className="min-w-0">
                          <h2 className="text-xl font-semibold leading-snug text-[var(--ds-text)] md:text-2xl">
                            {r.query}
                          </h2>
                          {finding && (
                            <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
                              {finding}
                            </p>
                          )}
                          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                            <span>{timeAgo(r.savedAt)}</span>
                            {dataset && <span className="text-[var(--ds-accent)]">{dataset}</span>}
                            <span>{r.durationMs.toLocaleString()}ms</span>
                            <span>{r.tokenTotal.toLocaleString()} tok</span>
                            {r.status === "good" && (
                              <span className="text-[var(--ds-good)]">verified</span>
                            )}
                          </p>
                        </div>
                        <span className="self-start font-mono text-[11px] uppercase tracking-wider text-[var(--ds-accent)]">
                          watch →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="border-t border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ds-text-mute)]">
            Methodology
          </p>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-[var(--ds-text)]">
            Each lookup passes through a planner → executor → critic → synthesizer loop. The critic must approve the plan and the answer before publication. Source datasets are queried live with cache-resilient fallback; raw SoQL and every tool call are preserved per run.
          </p>
        </div>
      </section>
    </Shell>
  );
}

function pickRelated(current: SavedRun, all: SavedRun[]): SavedRun[] {
  // Score by overlap: shared dataset weight 3, shared 4+char word weight 1.
  const myEv = extractEvidence(current).map((e) => e.datasetId);
  const myWords = new Set(
    current.query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4),
  );
  type Scored = { run: SavedRun; score: number };
  const scored: Scored[] = [];
  for (const r of all) {
    if (r.hash === current.hash || !r.answer || r.status === "bad") continue;
    let score = 0;
    const ev = extractEvidence(r).map((e) => e.datasetId);
    for (const d of ev) if (myEv.includes(d)) score += 3;
    const words = r.query.toLowerCase().split(/[^a-z0-9]+/);
    for (const w of words) if (w.length >= 4 && myWords.has(w)) score += 1;
    if (score > 0) scored.push({ run: r, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6).map((s) => s.run);
}

function DetailView({ run }: { run: SavedRun }) {
  // Cached and fresh runs render IDENTICALLY — no extra sections, no
  // "Related lookups", no "Watch toggle". AgentRunner in fallback mode
  // streams the saved events; the visitor sees the same UI a live run
  // produces. Cache is invisible.
  return (
    <Shell active="/q">
      <AgentRunner query={run.query} mode="fallback" />
    </Shell>
  );
}

function GateView({ query, libraryCount }: { query: string; libraryCount: number }) {
  return (
    <Shell active="/q">
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[820px] px-6 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
            Not in the library yet
          </p>
          <h1 className="mt-4 text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
            &quot;{query}&quot;
          </h1>
          <p className="mt-5 max-w-[58ch] text-[16px] leading-[1.65] text-[var(--ds-text-mute)]">
            We curate the public library by hand. This question hasn&apos;t been answered yet — two ways to get to one:
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Link
              href={`/byok`}
              className="block rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-6 transition-colors hover:border-[var(--ds-accent)]"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-good)]">
                Bring your own key
              </p>
              <p className="mt-2 text-[15px] text-[var(--ds-text)]">
                Paste an OpenAI key, run the loop on your wallet. ~$0.05 per question.
              </p>
            </Link>
            <Link
              href={`/suggest?q=${encodeURIComponent(query)}`}
              className="block rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-6 transition-colors hover:border-[var(--ds-accent)]"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-warm)]">
                Suggest it
              </p>
              <p className="mt-2 text-[15px] text-[var(--ds-text)]">
                Leave us your email. We&apos;ll run high-signal questions on our balance and notify you when they land.
              </p>
            </Link>
          </div>
          <p className="mt-10 font-mono text-[11px] text-[var(--ds-text-mute)]">
            Or{" "}
            <Link href="/q" className="text-[var(--ds-accent)] hover:underline">
              browse the {libraryCount} existing lookups →
            </Link>
          </p>
        </div>
      </section>
    </Shell>
  );
}

// ------- entry -------

export default async function QPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  if (!query) {
    const runs = (await listRuns(100)).filter((r) => r.status !== "bad" && r.answer);
    return <ListView runs={runs} />;
  }

  const cached = await findRun(query);
  if (cached && cached.answer) {
    return <DetailView run={cached} />;
  }

  const libraryCount = (await listRuns(200)).length;
  return <GateView query={query} libraryCount={libraryCount} />;
}
