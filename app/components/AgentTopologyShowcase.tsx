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
    <section className="border-b border-[#27272A] bg-[#0A0A0F]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5B8DEF]">
              Improvement flywheel
            </p>
            <h2 className="mt-3 max-w-[18ch] text-[34px] font-bold leading-[1.05] tracking-tight text-[#FAFAFA] md:text-[44px]">
              Five agents.<br />
              One sourced answer.
            </h2>
            <p className="mt-6 max-w-[36ch] text-[14px] leading-relaxed text-[#A1A1AA]">
              The orchestrator dispatches parallel queries. The critic catches a window bug. The reporter composes the answer. The citation locks in. A real run, looped on autoplay.
            </p>
            <div className="mt-7 flex flex-col gap-2">
              <Link
                href={`/admin/replay/${replayHash}`}
                className="inline-flex w-fit items-center rounded-md bg-[#FAFAFA] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#0A0A0F] hover:bg-[#FAFAFA]/90"
              >
                Watch a real run →
              </Link>
              <Link
                href="/agents"
                className="inline-flex w-fit items-center text-[13px] font-medium text-[#5B8DEF] hover:underline"
              >
                See every agent at work →
              </Link>
            </div>
            <div className="mt-9 grid grid-cols-3 gap-3 border-t border-[#27272A] pt-5">
              {[
                { n: "5", l: "agents" },
                { n: "1", l: "self-correct" },
                { n: "7.3s", l: "end-to-end" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-[24px] font-bold tabular-nums tracking-tight text-[#FAFAFA]">{s.n}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#A1A1AA]">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-8">
            <div className="overflow-hidden rounded-md border border-[#27272A] bg-[#0A0A0F]">
              <div className="flex items-baseline justify-between border-b border-[#27272A] px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A1A1AA]">
                  Live replay · marquee question
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                  cycle: {(now / 1000).toFixed(2)}s / {(TOTAL_MS / 1000).toFixed(1)}s
                </p>
              </div>
              <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block w-full" aria-hidden>
                {/* Lane labels + thin baselines */}
                {LANES.map((lane, i) => (
                  <g key={lane.key}>
                    <text
                      x={20}
                      y={laneY(i) - 3}
                      fontSize={11}
                      fontFamily="Inter, ui-sans-serif"
                      fill="#0A0A0F"
                      fontWeight={700}
                    >
                      {lane.label}
                    </text>
                    <text
                      x={20}
                      y={laneY(i) + 11}
                      fontSize={9}
                      fontFamily="Inter, ui-sans-serif"
                      fill="#9CA3AF"
                    >
                      {lane.sub}
                    </text>
                    <line
                      x1={LANE_LEFT}
                      x2={LANE_RIGHT}
                      y1={laneY(i)}
                      y2={laneY(i)}
                      stroke="#E4E5E8"
                      strokeWidth={1}
                    />
                  </g>
                ))}

                {/* Edges between consecutive events (lane-to-lane curves) */}
                {SEQUENCE.slice(1).map((e, i) => {
                  const fired = e.t <= now;
                  if (!fired) return null;
                  const prev = SEQUENCE[i];
                  const x1 = tToX(prev.t);
                  const y1 = laneY(laneIndex(prev.from));
                  const x2 = tToX(e.t);
                  const y2 = laneY(laneIndex(e.to ?? e.from));
                  if (Math.abs(y1 - y2) < 1) {
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#CBD5E1" strokeWidth={1} />;
                  }
                  const mx = (x1 + x2) / 2;
                  const path = `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
                  return <path key={i} d={path} fill="none" stroke="#CBD5E1" strokeWidth={1} />;
                })}

                {/* Playhead */}
                <line
                  x1={playheadX}
                  x2={playheadX}
                  y1={4}
                  y2={VB_H - 4}
                  stroke="#2563EB"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  strokeDasharray="2 4"
                />

                {/* Event nodes */}
                {SEQUENCE.map((e, i) => {
                  const fired = e.t <= now;
                  if (!fired) return null;
                  const isActive = i === activeIdx;
                  const lane = LANES[laneIndex(e.from)];
                  const x = tToX(e.t);
                  const y = laneY(laneIndex(e.from));
                  return (
                    <g key={i}>
                      {isActive && (
                        <circle cx={x} cy={y} r={12} fill={lane.color} opacity={0.18} />
                      )}
                      {(e.kind === "critique" || e.kind === "approve") ? (
                        <polygon
                          points={`${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`}
                          fill={isActive ? lane.color : "white"}
                          stroke={lane.color}
                          strokeWidth={1.5}
                        />
                      ) : (
                        <circle
                          cx={x}
                          cy={y}
                          r={isActive ? 5 : 3.5}
                          fill={isActive ? lane.color : "white"}
                          stroke={lane.color}
                          strokeWidth={1.5}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Live readout */}
              <div className="border-t border-[#27272A] bg-[#16161B] px-5 py-3.5">
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
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                    {(active.t / 1000).toFixed(2)}s
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-[12px] text-[#FAFAFA]">
                  <span className="text-[#A1A1AA]">{active.tool}:</span> {active.text}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
