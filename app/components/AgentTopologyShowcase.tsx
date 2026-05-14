"use client";

// AgentTopologyShowcase — homepage centerpiece. White editorial aesthetic
// matching the VCAP-inspired homepage. Diagram lives inside a clean
// bordered card; nodes are minimal circles with thin connecting lines.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LaneKey = "orchestrator" | "data_analyst" | "reporter" | "support" | "critic";

const LANES: { key: LaneKey; label: string; color: string; sub: string }[] = [
  { key: "orchestrator", label: "Orchestrator", color: "#2563EB", sub: "router · planner" },
  { key: "data_analyst", label: "Data Analyst", color: "#10B981", sub: "SoQL · stats" },
  { key: "critic",       label: "Critic",       color: "#F59E0B", sub: "self-correct" },
  { key: "reporter",     label: "Reporter",     color: "#A855F7", sub: "compose · cite" },
  { key: "support",      label: "Support",      color: "#EC4899", sub: "disambiguate" },
];

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
const CYCLE_MS = TOTAL_MS + 1200;
const VB_W = 1100;
const LANE_H = 56;
const LANE_LEFT = 168;
const LANE_RIGHT = VB_W - 24;
const LANE_TRACK = LANE_RIGHT - LANE_LEFT;
const VB_H = LANES.length * LANE_H + 24;

function laneIndex(k: LaneKey) { return LANES.findIndex((l) => l.key === k); }
function laneY(idx: number) { return 12 + idx * LANE_H + LANE_H / 2; }
function tToX(ms: number) { return LANE_LEFT + (ms / TOTAL_MS) * LANE_TRACK; }

export default function AgentTopologyShowcase({ replayHash = "a8f3c19d2e7b" }: { replayHash?: string }) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const elapsed = (t - start) % CYCLE_MS;
      setNow(elapsed);
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

  const playheadX = tToX(Math.min(now, TOTAL_MS));

  return (
    <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-accent)]">
              Improvement flywheel
            </p>
            <h2 className="mt-3 max-w-[18ch] text-[34px] font-bold leading-[1.05] tracking-tight text-[var(--ds-text)] md:text-[44px]">
              Five agents.<br />
              One sourced answer.
            </h2>
            <p className="mt-6 max-w-[36ch] text-[14px] leading-relaxed text-[var(--ds-text-mute)]">
              The orchestrator dispatches parallel queries. The critic catches a window bug. The reporter composes the answer. The citation locks in. A real run, looped on autoplay.
            </p>
            <div className="mt-7 flex flex-col gap-2">
              <Link
                href={`/admin/replay/${replayHash}`}
                className="inline-flex w-fit items-center rounded-md bg-white px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-bg)] hover:opacity-90"
              >
                Watch a real run →
              </Link>
              <Link
                href="/agents"
                className="inline-flex w-fit items-center text-[13px] font-medium text-[var(--ds-accent)] hover:underline"
              >
                See every agent at work →
              </Link>
            </div>
            <div className="mt-9 grid grid-cols-3 gap-3 border-t border-[var(--ds-border)] pt-5">
              {[
                { n: "5", l: "agents" },
                { n: "1", l: "self-correct" },
                { n: "7.3s", l: "end-to-end" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-[24px] font-bold tabular-nums tracking-tight text-[var(--ds-text)]">{s.n}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-mute)]">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-8">
            <div className="overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)]">
              <div className="flex items-baseline justify-between border-b border-[var(--ds-border)] px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-mute)]">
                  Live replay · marquee question
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                  cycle: {(now / 1000).toFixed(2)}s / {(TOTAL_MS / 1000).toFixed(1)}s
                </p>
              </div>

              {/* Top-down agent flow. Vertical stack, color stripes per lane,
                  current agent glows. A side curve loops Critic back to Data
                  Analyst on critique events to show the self-correct cycle. */}
              <div className="relative px-5 py-6">
                <ol className="space-y-2">
                  {LANES.map((lane) => {
                    const isActive = active.from === lane.key;
                    const isCritiqueLoop =
                      active.kind === "critique" && lane.key === "data_analyst";
                    return (
                      <li
                        key={lane.key}
                        className={`relative flex items-center gap-4 overflow-hidden rounded-md border transition-all duration-200 ${
                          isActive
                            ? "border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] shadow-lg"
                            : "border-[var(--ds-border)] bg-[var(--ds-bg)]"
                        }`}
                        style={
                          isActive
                            ? { boxShadow: `0 0 0 1px ${lane.color}55, 0 8px 24px ${lane.color}22` }
                            : undefined
                        }
                      >
                        <span
                          aria-hidden
                          className="w-1.5 self-stretch"
                          style={{
                            background: lane.color,
                            opacity: isActive ? 1 : 0.45,
                          }}
                        />
                        <div className="flex flex-1 items-center justify-between gap-4 py-3 pr-4">
                          <div>
                            <p
                              className="text-[14px] font-semibold leading-tight"
                              style={{ color: isActive ? lane.color : "var(--ds-text)" }}
                            >
                              {lane.label}
                            </p>
                            <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                              {lane.sub}
                            </p>
                          </div>
                          {isActive && (
                            <div className="flex items-center gap-2">
                              <span
                                className="h-1.5 w-1.5 animate-pulse rounded-full"
                                style={{ backgroundColor: lane.color }}
                              />
                              <span
                                className="font-mono text-[10px] uppercase tracking-wider"
                                style={{ color: lane.color }}
                              >
                                {(active.t / 1000).toFixed(2)}s
                              </span>
                            </div>
                          )}
                          {isCritiqueLoop && (
                            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-warn)]">
                              ↺ re-plan
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {/* Sourced answer terminal node */}
                <div className="mt-4 flex items-center justify-center gap-2 border-t border-[var(--ds-border)] pt-4 font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-good)]">
                  <span>✓ sourced answer</span>
                  <span className="text-[var(--ds-text-dim)]">· cited · replayable</span>
                </div>
              </div>

              {/* Live readout */}
              <div className="border-t border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ backgroundColor: LANES[laneIndex(active.from)].color }}
                  />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: LANES[laneIndex(active.from)].color }}
                  >
                    {LANES[laneIndex(active.from)].label}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                    {(active.t / 1000).toFixed(2)}s
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-[12px] text-[var(--ds-text)]">
                  <span className="text-[var(--ds-text-mute)]">{active.tool}:</span> {active.text}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
