// Public answers library — editorial framing of saved agent runs.
// This is the read-only public face of /admin's run archive: visitors browse
// curated investigations, they don't fire fresh agent calls.

import Link from "next/link";

import { Shell } from "@/app/components/ds";
import { listRuns, slugifyQuery, type SavedRun } from "@/app/lib/run-archive";

export const dynamic = "force-dynamic";
export const revalidate = 60;

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
  const events = (run.events ?? []) as Array<Record<string, unknown>>;
  for (const ev of events) {
    if (ev.phase === "executing" && ev.args && typeof ev.args === "object") {
      const dsId = (ev.args as Record<string, unknown>).datasetId;
      if (typeof dsId === "string") return dsId;
    }
  }
  return null;
}

export default async function AnswersPage() {
  const runs = (await listRuns(100)).filter((r) => r.status !== "bad" && r.answer);

  return (
    <Shell active="/answers">
      {/* HERO — editorial framing */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1100px] px-6 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
            Investigations · TXLookup
          </p>
          <h1 className="mt-4 max-w-[22ch] text-[44px] font-bold leading-[1.04] tracking-[-0.025em] text-[var(--ds-text)] md:text-[56px]">
            What the data says about Texas.
          </h1>
          <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-[var(--ds-text-mute)]">
            Each entry is an investigation a multi-agent loop ran against authoritative civic data — Socrata and CKAN portals — with the full plan, every tool call, and the cited dataset preserved.
          </p>
          <p className="mt-3 max-w-[58ch] font-mono text-[12px] uppercase tracking-wider text-[var(--ds-text-dim)]">
            {runs.length} investigation{runs.length === 1 ? "" : "s"} · refreshed every 60s · methodology open-source under MIT
          </p>
        </div>
      </section>

      {/* INVESTIGATIONS — editorial card grid */}
      <section className="bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-8">
          {runs.length === 0 ? (
            <div className="rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-8 text-center">
              <p className="text-[var(--ds-text-mute)]">No investigations yet.</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                The first ones will appear here as the agent runs them.
              </p>
            </div>
          ) : (
            <ul className="space-y-0 divide-y divide-[var(--ds-border)] border-y border-[var(--ds-border)]">
              {runs.map((r) => {
                const slug = slugifyQuery(r.query);
                const finding = extractFinding(r);
                const dataset = extractDataset(r);
                return (
                  <li key={r.hash}>
                    <Link
                      href={`/answers/${slug}`}
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
                          read →
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

      {/* METHODOLOGY footer */}
      <section className="border-t border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ds-text-mute)]">
            Methodology
          </p>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-[var(--ds-text)]">
            Each investigation passes through a planner → executor → critic → synthesizer loop. The critic must approve the plan and the answer before publication. Source datasets are queried live with cache-resilient fallback; raw SoQL and every tool call are preserved per run.
          </p>
          <p className="mt-3 max-w-[62ch] text-sm text-[var(--ds-text-mute)]">
            Sources are tagged{" "}
            <span className="font-mono text-[var(--ds-good)]">authoritative</span>{" "}
            (government datasets),{" "}
            <span className="font-mono text-[var(--ds-warm)]">modeled</span>{" "}
            (derived/aggregated), or{" "}
            <span className="font-mono text-[var(--ds-accent)]">community</span>{" "}
            (third-party). Authoritative-only by default; expand to see all three classes.
          </p>
        </div>
      </section>
    </Shell>
  );
}
