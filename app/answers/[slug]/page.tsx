// Public investigation page — editorial framing of a single saved agent run.
// Title + finding + evidence + collapsible methodology + watchlist primitive.

import Link from "next/link";
import { notFound } from "next/navigation";

import { Shell } from "@/app/components/ds";
import { AgentRunner } from "@/app/q/AgentRunner";
import { findRunBySlug, listRuns, slugifyQuery, type SavedRun } from "@/app/lib/run-archive";

import { WatchToggle } from "./WatchToggle";

export const dynamic = "force-dynamic";

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

function extractEvidence(run: SavedRun): Array<{ datasetId: string; klass: "authoritative" | "modeled" | "community"; source?: string }> {
  const events = (run.events ?? []) as ToolEvent[];
  const seen = new Map<string, { datasetId: string; klass: "authoritative" | "modeled" | "community"; source?: string }>();
  for (const ev of events) {
    if (ev.phase === "executing" && ev.args && typeof ev.args === "object") {
      const dsId = (ev.args as Record<string, unknown>).datasetId;
      if (typeof dsId === "string" && !seen.has(dsId)) {
        // For now everything from Socrata/CKAN is "authoritative" — those are
        // government portals. Modeled/community classes apply once we add
        // derived datasets and community datasets in a later branch.
        seen.set(dsId, { datasetId: dsId, klass: "authoritative" });
      }
    }
    if (ev.phase === "tool_source" && typeof ev.source === "string") {
      const last = Array.from(seen.values()).pop();
      if (last) last.source = ev.source;
    }
  }
  return Array.from(seen.values());
}

function extractTimeline(run: SavedRun): Array<{ phase: string; label: string; durationMs?: number }> {
  const events = (run.events ?? []) as ToolEvent[];
  return events.map((ev) => {
    const phase = ev.phase ?? "?";
    let label = "";
    if (phase === "reasoning") label = "Parsed intent";
    else if (phase === "planning") label = "Drafted plan";
    else if (phase === "critique") label = "Critic reviewed";
    else if (phase === "revising") label = "Revising on critic feedback";
    else if (phase === "executing") label = `${ev.tool ?? "step"} — ${ev.rationale ?? ""}`.slice(0, 120);
    else if (phase === "step_done") label = `step ${ev.step ?? ""} ${ev.status ?? ""}`;
    else if (phase === "tool_source") label = `${ev.source ?? ""}`;
    else if (phase === "completing") label = "Synthesizing final answer";
    else if (phase === "done") label = "Investigation complete";
    return { phase, label, durationMs: ev.duration_ms };
  });
}

export default async function InvestigationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const run = await findRunBySlug(slug);
  if (!run || !run.answer) notFound();

  const evidence = extractEvidence(run);
  const timeline = extractTimeline(run);

  // Related — other recent investigations sharing the same primary dataset.
  const primaryDsId = evidence[0]?.datasetId;
  const allRuns = await listRuns(50);
  const related = primaryDsId
    ? allRuns
        .filter((r) => r.hash !== run.hash && r.answer)
        .filter((r) => {
          const evts = (r.events ?? []) as ToolEvent[];
          return evts.some(
            (e) =>
              e.phase === "executing" &&
              e.args &&
              typeof e.args === "object" &&
              (e.args as Record<string, unknown>).datasetId === primaryDsId,
          );
        })
        .slice(0, 5)
    : [];

  return (
    <Shell active="/answers">
      {/* HERO — title + finding */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[820px] px-6 py-12 md:px-8 md:py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ds-text-mute)]">
            <Link href="/answers" className="hover:text-[var(--ds-accent)]">
              ← All investigations
            </Link>
            {evidence[0] && (
              <span className="ml-3 text-[var(--ds-accent)]">
                {evidence[0].datasetId}
              </span>
            )}
          </p>

          <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
            {run.query}
          </h1>

          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-dim)]">
            Investigated {new Date(run.savedAt).toISOString().slice(0, 10)} · {run.durationMs.toLocaleString()}ms · {run.tokenTotal.toLocaleString()} tok
            {run.status === "good" && <span className="ml-3 text-[var(--ds-good)]">· verified</span>}
          </p>
        </div>
      </section>

      {/* LIVE REPLAY — re-stream the saved agent events through AgentRunner.
          Mode=fallback hits /api/agent with {fallback:true} which returns the
          saved SSE events at realistic timing. The user sees the planner →
          critic → tools → synth → answer animate as if running now. */}
      <AgentRunner query={run.query} mode="fallback" />

      {/* FINDING — the prose answer in editorial typography (also rendered
          at the end of the live stream, but we keep it here as a stable
          post-replay anchor for SEO + non-JS visitors). */}
      <section className="border-t border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[820px] px-6 py-10 md:px-8 md:py-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ds-accent)]">
            Finding
          </p>
          <div className="mt-4 space-y-5 text-[18px] leading-[1.65] text-[var(--ds-text)] md:text-[19px]">
            {run.answer.split(/\n\n+/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </section>

      {/* EVIDENCE — sources with class labels */}
      {evidence.length > 0 && (
        <section className="border-t border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
          <div className="mx-auto max-w-[820px] px-6 py-10 md:px-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ds-accent)]">
              Evidence
            </p>
            <p className="mt-2 text-sm text-[var(--ds-text-mute)]">
              {evidence.length} dataset{evidence.length === 1 ? "" : "s"} queried · all classes shown
            </p>
            <ul className="mt-5 space-y-3">
              {evidence.map((e) => (
                <li
                  key={e.datasetId}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-[var(--ds-border)] pb-3"
                >
                  <Link
                    href={`/datasets/${e.datasetId}`}
                    className="font-mono text-sm font-semibold text-[var(--ds-text)] hover:text-[var(--ds-accent)]"
                  >
                    {e.datasetId}
                  </Link>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
                      e.klass === "authoritative"
                        ? "text-[var(--ds-good)]"
                        : e.klass === "modeled"
                        ? "text-[var(--ds-warm)]"
                        : "text-[var(--ds-accent)]"
                    }`}
                  >
                    {e.klass}
                  </span>
                  {e.source && (
                    <span className="font-mono text-[11px] text-[var(--ds-text-dim)]">{e.source}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* WATCH — primitive that promises to refresh + alert on change */}
      <section className="border-t border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[820px] px-6 py-8 md:px-8">
          <WatchToggle slug={slugifyQuery(run.query)} query={run.query} />
        </div>
      </section>

      {/* METHODOLOGY — collapsible full agent trace */}
      <section className="border-t border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[820px] px-6 py-10 md:px-8 md:py-12">
          <details className="group">
            <summary className="cursor-pointer list-none">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ds-accent)]">
                Methodology — full agent trace
              </p>
              <p className="mt-2 text-sm text-[var(--ds-text-mute)] group-open:hidden">
                {timeline.length} events · click to expand
              </p>
            </summary>
            <ol className="mt-5 space-y-2 border-l border-[var(--ds-border)] pl-4 font-mono text-[12px]">
              {timeline.map((ev, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className={`w-24 shrink-0 uppercase tracking-wider ${
                      ev.phase === "done"
                        ? "text-[var(--ds-good)]"
                        : ev.phase === "critique" || ev.phase === "revising"
                        ? "text-[var(--ds-warm)]"
                        : "text-[var(--ds-text-dim)]"
                    }`}
                  >
                    {ev.phase}
                  </span>
                  <span className="text-[var(--ds-text)]">{ev.label || "—"}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 font-mono text-[11px] text-[var(--ds-text-mute)]">
              View raw events:{" "}
              <Link href={`/admin/replay/${run.hash}`} className="text-[var(--ds-accent)] hover:underline">
                replay this run →
              </Link>
            </p>
          </details>
        </div>
      </section>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="border-t border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
          <div className="mx-auto max-w-[820px] px-6 py-10 md:px-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ds-accent)]">
              Related investigations
            </p>
            <ul className="mt-5 space-y-3">
              {related.map((r) => (
                <li key={r.hash}>
                  <Link
                    href={`/answers/${slugifyQuery(r.query)}`}
                    className="block hover:text-[var(--ds-accent)]"
                  >
                    <span className="text-[15px] font-semibold text-[var(--ds-text)]">
                      {r.query}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </Shell>
  );
}
