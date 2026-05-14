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

  // Wheel geometry — 5 agents around a centered circle. Each lane sits at
  // -90 + i*72 degrees (Orchestrator at top, going clockwise: Data Analyst,
  // Critic, Reporter, Support).
  const W = 520;
  const H = 520;
  const CX = W / 2;
  const CY = H / 2;
  const R = 180; // node ring radius
  const NODE_R_BASE = 38;
  const NODE_R_ACTIVE = 46;
  const polar = (i: number) => {
    const angle = (-90 + i * (360 / LANES.length)) * (Math.PI / 180);
    return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
  };
  const progress = Math.min(now, TOTAL_MS) / TOTAL_MS; // 0..1 around the wheel
  const sweepEndAngle = -90 + progress * 360;

  return (
    <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
      <div className="mx-auto max-w-[920px] px-6 py-14 md:px-8 md:py-20">
        <div className="text-center">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
            Improvement flywheel
          </p>
          <h2 className="mx-auto mt-3 max-w-[20ch] text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-white md:text-[36px]">
            Five agents. One sourced answer.
          </h2>
          <p className="mx-auto mt-3 max-w-[48ch] text-[14.5px] leading-relaxed text-[var(--ds-text-mute)]">
            The orchestrator dispatches. The critic self-corrects. The reporter cites. The cycle loops on autoplay — a real run, replayed.
          </p>
        </div>

        {/* Wheel — centered SVG; 5 agents around the rim, sweep arc shows
            cycle progress, active node enlarges + glows. */}
        <div className="relative mx-auto mt-10 w-full max-w-[520px]">
          <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-hidden>
            {/* Outer ring (very faint) */}
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--ds-border)" strokeWidth={1} />

            {/* Cycle progress arc */}
            <path
              d={describeArc(CX, CY, R, -90, sweepEndAngle)}
              fill="none"
              stroke="var(--ds-accent)"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.7}
            />

            {/* Connector segments between consecutive nodes (very faint) */}
            {LANES.map((_, i) => {
              const a = polar(i);
              const b = polar((i + 1) % LANES.length);
              return (
                <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--ds-border-strong)" strokeWidth={1} strokeDasharray="3 4" />
              );
            })}

            {/* Center medallion */}
            <circle cx={CX} cy={CY} r={62} fill="var(--ds-bg-elev)" stroke="var(--ds-border-strong)" strokeWidth={1} />
            <text x={CX} y={CY - 10} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" fill="#71717A" letterSpacing="1.5">
              CYCLE
            </text>
            <text x={CX} y={CY + 8} textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="18" fontWeight={700} fill="#F5F5F7">
              {(now / 1000).toFixed(1)}s
            </text>
            <text x={CX} y={CY + 24} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="9" fill="#71717A">
              of {(TOTAL_MS / 1000).toFixed(1)}s
            </text>

            {/* Agent nodes */}
            {LANES.map((lane, i) => {
              const { x, y } = polar(i);
              const isActive = active.from === lane.key;
              const r = isActive ? NODE_R_ACTIVE : NODE_R_BASE;
              return (
                <g key={lane.key}>
                  {isActive && (
                    <circle cx={x} cy={y} r={r + 10} fill={lane.color} opacity={0.18} />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={isActive ? lane.color : "var(--ds-bg-elev)"}
                    stroke={lane.color}
                    strokeWidth={isActive ? 0 : 1.5}
                  />
                  <text
                    x={x}
                    y={y - 2}
                    textAnchor="middle"
                    fontFamily="ui-sans-serif, system-ui"
                    fontSize={isActive ? 12 : 11}
                    fontWeight={700}
                    fill={isActive ? "#0E1014" : "#F5F5F7"}
                  >
                    {lane.label.split(" ")[0]}
                  </text>
                  {lane.label.split(" ").length > 1 && (
                    <text
                      x={x}
                      y={y + 11}
                      textAnchor="middle"
                      fontFamily="ui-sans-serif, system-ui"
                      fontSize={isActive ? 12 : 11}
                      fontWeight={700}
                      fill={isActive ? "#0E1014" : "#F5F5F7"}
                    >
                      {lane.label.split(" ").slice(1).join(" ")}
                    </text>
                  )}
                  <text
                    x={x}
                    y={y + 24}
                    textAnchor="middle"
                    fontFamily="ui-monospace, monospace"
                    fontSize={8.5}
                    letterSpacing={0.5}
                    fill={isActive ? "#0E1014" : "#71717A"}
                    opacity={0.85}
                  >
                    {lane.sub.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Live readout strip below the wheel */}
        <div className="mx-auto mt-6 max-w-[640px] rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-5 py-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ backgroundColor: LANES[laneIndex(active.from)].color }}
            />
            <span
              className="text-[10.5px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: LANES[laneIndex(active.from)].color }}
            >
              {LANES[laneIndex(active.from)].label}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
              {(active.t / 1000).toFixed(2)}s
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[12px] text-white">
            <span className="text-[var(--ds-text-mute)]">{active.tool}:</span> {active.text}
          </p>
        </div>

        {/* Stats row + quiet text links */}
        <div className="mx-auto mt-6 flex max-w-[640px] flex-wrap items-center justify-between gap-4 border-t border-[var(--ds-border)] pt-5 text-[12px] text-[var(--ds-text-mute)]">
          <div className="flex gap-6">
            {[
              { n: "5", l: "agents" },
              { n: "1", l: "self-correct" },
              { n: "7.3s", l: "end-to-end" },
            ].map((s) => (
              <div key={s.l}>
                <span className="font-semibold tabular-nums text-white">{s.n}</span>
                <span className="ml-1.5 font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">{s.l}</span>
              </div>
            ))}
          </div>
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

// Arc-path helper. Standard polar-to-Cartesian SVG arc.
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const toRad = (a: number) => (a * Math.PI) / 180;
  const start = { x: cx + r * Math.cos(toRad(startAngle)), y: cy + r * Math.sin(toRad(startAngle)) };
  const end = { x: cx + r * Math.cos(toRad(endAngle)), y: cy + r * Math.sin(toRad(endAngle)) };
  const sweep = endAngle - startAngle;
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}
