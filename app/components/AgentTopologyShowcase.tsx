"use client";

// AgentTopologyShowcase — the agentic flow as a clean top-down flowchart.
// Static layout (no spinning/sweeping); a gentle highlight steps through
// the nodes as the cycle timer advances. Critic -> Data Analyst re-plan
// loop is drawn explicitly. Support is an off-path helper node.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LaneKey = "orchestrator" | "data_analyst" | "reporter" | "support" | "critic";

const LANES: Record<LaneKey, { label: string; role: string; color: string; timing: string }> = {
  orchestrator: { label: "Orchestrator", role: "router · decomposer", color: "#2563EB", timing: "~0.6s" },
  data_analyst: { label: "Data Analyst", role: "SoQL · Socrata exec", color: "#10B981", timing: "~1.2s" },
  critic:       { label: "Critic",       role: "verify · grounding",  color: "#F59E0B", timing: "~0.4s" },
  reporter:     { label: "Reporter",     role: "prose · data viz",    color: "#A855F7", timing: "~0.9s" },
  support:      { label: "Support",      role: "schema · disambig",   color: "#EC4899", timing: "as-needed" },
};

type Evt = {
  t: number;
  from: LaneKey;
  to?: LaneKey;
  tool: string;
  text: string;
  kind: "reason" | "plan" | "exec" | "done" | "critique" | "approve" | "compose" | "cite";
};

const SEQUENCE: Evt[] = [
  { t: 0,    from: "orchestrator",                     tool: "reason",            text: "parsing · domain=permits geo=78704 window=2024-Q4", kind: "reason" },
  { t: 600,  from: "orchestrator",                     tool: "plan",              text: "plan: parallel(query_a, query_b) → critic → reporter", kind: "plan" },
  { t: 1100, from: "orchestrator", to: "data_analyst", tool: "delegate_parallel", text: "delegate_to_parallel(data_analyst × 2)",            kind: "plan" },
  { t: 1400, from: "data_analyst",                     tool: "query_a",           text: "querying 3syk-w9eu group by zip · 412 rows · 870ms", kind: "exec" },
  { t: 1600, from: "data_analyst",                     tool: "query_b",           text: "querying 3syk-w9eu group by month · 12 rows · 1100ms", kind: "exec" },
  { t: 2900, from: "data_analyst", to: "orchestrator", tool: "step_done",         text: "branch a done · 412 rows · 870ms",                   kind: "done" },
  { t: 3100, from: "data_analyst", to: "orchestrator", tool: "step_done",         text: "branch b done · 12 rows · 1100ms",                   kind: "done" },
  { t: 3400, from: "orchestrator", to: "critic",       tool: "review",            text: "handing 2 result sets to critic for review",         kind: "plan" },
  { t: 3700, from: "critic",                           tool: "critique",          text: "critic: query_b missing 2024 → replan window",       kind: "critique" },
  { t: 4300, from: "critic",       to: "orchestrator", tool: "replan",            text: "critic flagged window — orchestrator replanning",    kind: "critique" },
  { t: 4400, from: "data_analyst",                     tool: "query_b retry",     text: "re-running query_b with 2024-01-01 floor · 700ms",   kind: "exec" },
  { t: 5200, from: "data_analyst", to: "critic",       tool: "step_done",         text: "step_done · 38 rows · 700ms",                        kind: "done" },
  { t: 5500, from: "critic",       to: "orchestrator", tool: "approve",           text: "critic: approved · all rows in window",              kind: "approve" },
  { t: 5900, from: "orchestrator", to: "reporter",     tool: "delegate_to",       text: "delegate_to(reporter)",                              kind: "plan" },
  { t: 6000, from: "reporter",                         tool: "compose",           text: "composing · 2 findings + 1 chart",                   kind: "compose" },
  { t: 6900, from: "reporter",     to: "orchestrator", tool: "step_done",         text: "report ready",                                       kind: "compose" },
  { t: 7100, from: "orchestrator",                     tool: "cite_dataset",      text: "cite(3syk-w9eu, refreshed 2026-05-09)",              kind: "cite" },
  { t: 7300, from: "orchestrator",                     tool: "done",              text: "done · 7.3s end-to-end",                             kind: "done" },
];

const TOTAL_MS = 7400;
const CYCLE_MS = TOTAL_MS + 1400;

// Flowchart node — boxed agent step with color stripe + role + timing.
function FlowNode({
  laneKey,
  active,
  citing,
}: {
  laneKey: LaneKey;
  active: boolean;
  citing?: boolean;
}) {
  const lane = LANES[laneKey];
  return (
    <div
      className={`flex w-full items-stretch overflow-hidden rounded-md border transition-all duration-300 ${
        active
          ? "border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)]"
          : "border-[var(--ds-border)] bg-[var(--ds-bg)]"
      }`}
      style={active ? { boxShadow: `0 0 0 1px ${lane.color}66, 0 6px 20px ${lane.color}1f` } : undefined}
    >
      <span
        aria-hidden
        className="w-1.5 shrink-0 transition-opacity"
        style={{ background: lane.color, opacity: active ? 1 : 0.5 }}
      />
      <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
            {lane.role}
          </p>
          <p
            className="mt-0.5 text-[14px] font-semibold leading-tight"
            style={{ color: active ? lane.color : "var(--ds-text)" }}
          >
            {lane.label}
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
          {citing ? "+ cite" : lane.timing}
        </span>
      </div>
    </div>
  );
}

// Terminal pill — question (top) / answer (bottom).
function FlowPill({ kind }: { kind: "question" | "answer" }) {
  const isAnswer = kind === "answer";
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 ${
        isAnswer
          ? "border-[var(--ds-good)] bg-[var(--ds-good)]/10"
          : "border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)]"
      }`}
    >
      <span
        className={`font-mono text-[13px] ${isAnswer ? "text-[var(--ds-good)]" : "text-[var(--ds-text-mute)]"}`}
      >
        {isAnswer ? "✓" : "?"}
      </span>
      <span
        className={`text-[13px] font-semibold ${isAnswer ? "text-[var(--ds-good)]" : "text-white"}`}
      >
        {isAnswer ? "Sourced answer" : "User question"}
      </span>
      {isAnswer && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
          cited · replayable
        </span>
      )}
    </div>
  );
}

// Vertical connector arrow with optional mid-label.
function FlowArrow({ label, color }: { label?: string; color?: string }) {
  return (
    <div className="flex flex-col items-center py-1.5" aria-hidden>
      <span className="h-4 w-px bg-[var(--ds-border-strong)]" />
      {label && (
        <span
          className="my-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: color ?? "var(--ds-text-dim)" }}
        >
          {label}
        </span>
      )}
      <span className="h-4 w-px bg-[var(--ds-border-strong)]" />
      <span
        className="-mt-1 text-[10px] leading-none text-[var(--ds-border-strong)]"
        style={{ transform: "scaleX(1.6)" }}
      >
        ▼
      </span>
    </div>
  );
}

export default function AgentTopologyShowcase({ replayHash = "a8f3c19d2e7b" }: { replayHash?: string }) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      setNow((t - start) % CYCLE_MS);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const activeIdx = useMemo(() => {
    let i = 0;
    for (let k = 0; k < SEQUENCE.length; k++) {
      if (SEQUENCE[k].t <= Math.min(now, TOTAL_MS)) i = k;
      else break;
    }
    return i;
  }, [now]);
  const active = SEQUENCE[activeIdx];
  const activeLane = active.from;
  const inCritique = active.kind === "critique";
  const inCite = active.kind === "cite";

  return (
    <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
      <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
        <div className="text-center">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
            Agentic flow
          </p>
          <h2 className="mx-auto mt-3 max-w-[24ch] text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-white md:text-[36px]">
            How a question becomes a sourced answer.
          </h2>
        </div>

        {/* Flowchart — centered spine, Support off to the right, re-plan
            loop on the left. Stacks cleanly on mobile. */}
        <div className="relative mx-auto mt-10 max-w-[760px]">
          <div className="flex flex-col items-center">
            <FlowPill kind="question" />
            <FlowArrow />
            <div className="w-full max-w-[400px]">
              <FlowNode laneKey="orchestrator" active={activeLane === "orchestrator" && !inCite} />
            </div>
            <FlowArrow />
            <div className="w-full max-w-[400px]">
              <FlowNode laneKey="data_analyst" active={activeLane === "data_analyst"} />
            </div>
            <FlowArrow />
            <div className="w-full max-w-[400px]">
              <FlowNode laneKey="critic" active={activeLane === "critic"} />
            </div>
            <FlowArrow label="pass" color="var(--ds-good)" />
            <div className="w-full max-w-[400px]">
              <FlowNode laneKey="reporter" active={activeLane === "reporter"} />
            </div>
            <FlowArrow />
            <div className="w-full max-w-[400px]">
              <div
                className={`flex items-center justify-between rounded-md border px-4 py-3 transition-all duration-300 ${
                  inCite
                    ? "border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)]"
                    : "border-[var(--ds-border)] bg-[var(--ds-bg)]"
                }`}
              >
                <div>
                  <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                    provenance lock
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold leading-tight text-[var(--ds-text)]">
                    Citation step
                  </p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                  ~0.1s
                </span>
              </div>
            </div>
            <FlowArrow />
            <FlowPill kind="answer" />
          </div>

          {/* Re-plan loop — left side, spans Critic back up to Data Analyst.
              Highlights amber while the Critic is mid-critique. */}
          <div className="pointer-events-none absolute left-0 top-[150px] hidden h-[150px] w-[90px] md:block">
            <svg viewBox="0 0 90 150" className="h-full w-full" aria-hidden>
              <path
                d="M84 142 L40 142 Q22 142 22 124 L22 26 Q22 8 40 8 L84 8"
                fill="none"
                stroke={inCritique ? "var(--ds-warn)" : "var(--ds-border-strong)"}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <path
                d="M84 8 L78 4 M84 8 L78 12"
                fill="none"
                stroke={inCritique ? "var(--ds-warn)" : "var(--ds-border-strong)"}
                strokeWidth={1.5}
              />
            </svg>
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: inCritique ? "var(--ds-warn)" : "var(--ds-text-dim)" }}
            >
              ↺ re-plan
            </span>
          </div>

          {/* Support agent — off-path helper on the right. */}
          <div className="absolute right-0 top-[200px] hidden w-[180px] md:block">
            <div className="flex items-stretch overflow-hidden rounded-md border border-dashed border-[var(--ds-border-strong)] bg-[var(--ds-bg)]">
              <span
                aria-hidden
                className="w-1.5 shrink-0"
                style={{ background: LANES.support.color, opacity: 0.6 }}
              />
              <div className="px-3 py-2.5">
                <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                  {LANES.support.role}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-[var(--ds-text)]">
                  {LANES.support.label}
                </p>
                <p className="mt-1 text-[10.5px] leading-snug text-[var(--ds-text-dim)]">
                  Called by any agent for schema lookups + disambiguation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live readout — current step in the cycle. */}
        <div className="mx-auto mt-8 max-w-[640px] rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-5 py-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ backgroundColor: LANES[activeLane].color }}
            />
            <span
              className="text-[10.5px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: LANES[activeLane].color }}
            >
              {LANES[activeLane].label}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
              {(active.t / 1000).toFixed(2)}s
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[12px] text-white">
            <span className="text-[var(--ds-text-mute)]">{active.tool}:</span> {active.text}
          </p>
        </div>

        {/* Footer — cycle facts + quiet links. */}
        <div className="mx-auto mt-6 flex max-w-[640px] flex-wrap items-center justify-between gap-4 border-t border-[var(--ds-border)] pt-5 text-[12px] text-[var(--ds-text-mute)]">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">
            Typical cycle · <span className="text-white">7.3s</span> · 0&ndash;3 re-plan loops
          </p>
          <div className="flex gap-5">
            <Link href={`/admin/replay/${replayHash}`} className="text-[var(--ds-accent)] hover:underline">
              Watch a real run →
            </Link>
            <Link href="/agents" className="text-[var(--ds-accent)] hover:underline">
              All agents →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
