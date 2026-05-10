"use client";

// AgentTopologyShowcase — homepage centerpiece replacing the static "How it
// works" 4-step poster. Visualizes a real multi-agent run as a horizontal
// swim-lane diagram with messages flowing between lanes on a 7s autoplay.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LaneKey =
  | "orchestrator"
  | "data_analyst"
  | "reporter"
  | "support"
  | "critic"
  | "scout";

const LANES: { key: LaneKey; label: string; color: string; sub: string }[] = [
  { key: "orchestrator", label: "Orchestrator", color: "#0D2340", sub: "router · planner" },
  { key: "data_analyst", label: "Data Analyst", color: "#3A7FBE", sub: "SoQL · stats" },
  { key: "reporter",     label: "Reporter",     color: "#D48B10", sub: "compose · cite" },
  { key: "support",      label: "Support",      color: "#C4420A", sub: "disambiguate" },
  { key: "critic",       label: "Critic",       color: "#1A1510", sub: "self-correct" },
  { key: "scout",        label: "Dataset Scout", color: "#6B6660", sub: "discover" },
];

type Evt = {
  t: number;
  dur: number;
  from: LaneKey;
  to?: LaneKey;
  tool: string;
  text: string;
  kind: "reason" | "plan" | "exec" | "done" | "critique" | "approve" | "compose" | "cite" | "scout";
};

const T0 = "12:02:00.000";

const SEQUENCE: Evt[] = [
  { t: 0,    dur: 600,  from: "orchestrator",                     tool: "reason",            text: "parsing question · domain=permits geo=78704 window=2024-Q4", kind: "reason" },
  { t: 250,  dur: 400,  from: "orchestrator", to: "scout",        tool: "discover_datasets", text: "scout: lookup catalog for permits + zip filter",            kind: "scout" },
  { t: 700,  dur: 350,  from: "scout",        to: "orchestrator", tool: "→ 3syk-w9eu",       text: "scout returned: 3syk-w9eu (Issued Construction Permits)",   kind: "scout" },
  { t: 1100, dur: 500,  from: "orchestrator",                     tool: "plan",              text: "plan: parallel(query_a, query_b) → critic → reporter",      kind: "plan" },
  { t: 1500, dur: 100,  from: "orchestrator", to: "data_analyst", tool: "delegate_parallel", text: "delegate_to_parallel(data_analyst × 2)",                    kind: "plan" },
  { t: 1700, dur: 1100, from: "data_analyst",                     tool: "query_a 3syk-w9eu", text: "data_analyst: querying 3syk-w9eu group by zip…",            kind: "exec" },
  { t: 1900, dur: 1300, from: "data_analyst",                     tool: "query_b 3syk-w9eu", text: "data_analyst: querying 3syk-w9eu group by month…",          kind: "exec" },
  { t: 2900, dur: 200,  from: "data_analyst", to: "orchestrator", tool: "step_done query_a", text: "step_done: 412 rows · 870ms",                               kind: "done" },
  { t: 3250, dur: 200,  from: "data_analyst", to: "orchestrator", tool: "step_done query_b", text: "step_done: 12 rows · 1100ms",                               kind: "done" },
  { t: 3500, dur: 200,  from: "orchestrator", to: "critic",       tool: "review",            text: "handing 2 result sets to critic for review",                kind: "plan" },
  { t: 3750, dur: 600,  from: "critic",                           tool: "critique",          text: "critic: query_b missing 2024 → replan window",              kind: "critique" },
  { t: 4400, dur: 100,  from: "critic",       to: "orchestrator", tool: "replan",            text: "critic flagged window — orchestrator replanning",           kind: "critique" },
  { t: 4500, dur: 700,  from: "data_analyst",                     tool: "query_b' retry",    text: "data_analyst: re-running query_b with 2024-01-01 floor…",   kind: "exec" },
  { t: 5300, dur: 200,  from: "data_analyst", to: "critic",       tool: "step_done",         text: "step_done: 38 rows · 700ms",                                kind: "done" },
  { t: 5550, dur: 350,  from: "critic",       to: "orchestrator", tool: "approve",           text: "critic: approved · all rows in window",                     kind: "approve" },
  { t: 5950, dur: 100,  from: "orchestrator", to: "reporter",     tool: "delegate_to",       text: "delegate_to(reporter)",                                     kind: "plan" },
  { t: 6100, dur: 800,  from: "reporter",                         tool: "compose_report",    text: "reporter: composing answer · 2 findings + 1 chart",         kind: "compose" },
  { t: 6950, dur: 200,  from: "reporter",     to: "orchestrator", tool: "step_done",         text: "step_done: report ready",                                   kind: "compose" },
  { t: 7150, dur: 150,  from: "orchestrator",                     tool: "cite_dataset",      text: "cite_dataset(3syk-w9eu, refreshed 2026-05-09)",             kind: "cite" },
  { t: 7300, dur: 100,  from: "orchestrator",                     tool: "done",              text: "done · 7.4s end-to-end",                                    kind: "done" },
];

const TOTAL_MS = 7400;
const CYCLE_MS = TOTAL_MS + 800;

function lane(key: LaneKey) {
  return LANES.find((l) => l.key === key)!;
}

function fmtClock(offsetMs: number): string {
  const totalMs = 12 * 3600_000 + 2 * 60_000 + offsetMs;
  const h = Math.floor(totalMs / 3600_000);
  const m = Math.floor((totalMs % 3600_000) / 60_000);
  const s = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

const VB_W = 1200;
const LANE_H = 64;
const LANE_LEFT = 180;
const LANE_RIGHT = VB_W - 24;
const LANE_TRACK = LANE_RIGHT - LANE_LEFT;
const VB_H = LANES.length * LANE_H + 32;

function laneY(idx: number): number {
  return 24 + idx * LANE_H + LANE_H / 2;
}

function tToX(timeMs: number): number {
  return LANE_LEFT + (timeMs / TOTAL_MS) * LANE_TRACK;
}

export default function AgentTopologyShowcase({
  replayHash = "a8f3c19d2e7b",
}: {
  replayHash?: string;
}) {
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

  const agentCount = new Set(
    LANES.filter((l) => SEQUENCE.some((e) => e.from === l.key || e.to === l.key)).map(
      (l) => l.key,
    ),
  ).size;
  const selfCorrections = SEQUENCE.filter(
    (e) => e.kind === "critique" && e.tool === "replan",
  ).length;

  return (
    <section className="border-b border-tx-ink/10 bg-tx-cream">
      <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
              How the agent works
            </p>
            <h2 className="mt-2 max-w-[28ch] font-display text-3xl font-normal tracking-tight text-tx-navy md:text-4xl">
              Five agents. One question. Self-correcting in 7.4 seconds.
            </h2>
          </div>
          <div className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-tx-ink/55 md:flex">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-tx-rust" />
            replaying recorded run · loop {Math.floor(now / 1000)}s / 7s
          </div>
        </div>

        <div
          className="mt-8 rounded-md border border-tx-ink/10 bg-tx-cream p-3 md:p-4"
          style={{ boxShadow: "0 2px 24px -16px rgba(13,35,64,0.25)" }}
        >
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="block h-auto w-full"
            role="img"
            aria-label="Live multi-agent topology — orchestrator delegating to specialists"
          >
            {LANES.map((l, i) => {
              const y = laneY(i);
              return (
                <g key={l.key}>
                  <rect
                    x={LANE_LEFT}
                    y={y - LANE_H / 2 + 6}
                    width={LANE_TRACK}
                    height={LANE_H - 12}
                    fill={l.color}
                    fillOpacity={0.04}
                    stroke={l.color}
                    strokeOpacity={0.14}
                  />
                  <rect
                    x={8}
                    y={y - LANE_H / 2 + 6}
                    width={LANE_LEFT - 16}
                    height={LANE_H - 12}
                    fill={l.color}
                    fillOpacity={active.from === l.key || active.to === l.key ? 0.95 : 0.85}
                  />
                  <text
                    x={20}
                    y={y - 4}
                    fontFamily="var(--font-display), Public Sans, sans-serif"
                    fontWeight={600}
                    fontSize={13}
                    fill="#FAF7F2"
                  >
                    {l.label}
                  </text>
                  <text
                    x={20}
                    y={y + 12}
                    fontFamily="var(--font-jetbrains-mono), IBM Plex Mono, monospace"
                    fontSize={9}
                    fill="#FAF7F2"
                    fillOpacity={0.7}
                    style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
                  >
                    {l.sub}
                  </text>
                </g>
              );
            })}

            {[0, 1, 2, 3, 4, 5, 6, 7].map((s) => {
              const x = tToX(s * 1000);
              return (
                <g key={s}>
                  <line
                    x1={x}
                    y1={20}
                    x2={x}
                    y2={VB_H - 4}
                    stroke="#1A1510"
                    strokeOpacity={0.06}
                    strokeDasharray="2 4"
                  />
                  <text
                    x={x + 3}
                    y={16}
                    fontFamily="var(--font-jetbrains-mono), monospace"
                    fontSize={9}
                    fill="#1A1510"
                    fillOpacity={0.4}
                  >
                    {s}s
                  </text>
                </g>
              );
            })}

            {SEQUENCE.map((e, idx) => {
              const visible = now >= e.t;
              if (!visible) return null;
              const fromIdx = LANES.findIndex((l) => l.key === e.from);
              const fromY = laneY(fromIdx);
              const x1 = tToX(e.t);
              const x2 = tToX(Math.min(now, e.t + e.dur));

              if (e.to) {
                const toIdx = LANES.findIndex((l) => l.key === e.to);
                const toY = laneY(toIdx);
                const midX = x1 + 14;
                const stroke = lane(e.from).color;
                const isActive = idx === activeIdx;
                return (
                  <g key={idx}>
                    <line
                      x1={midX}
                      y1={fromY}
                      x2={midX}
                      y2={toY}
                      stroke={stroke}
                      strokeOpacity={isActive ? 0.9 : 0.45}
                      strokeWidth={isActive ? 2 : 1.25}
                    />
                    <polygon
                      points={`${midX - 3},${toY + (toY > fromY ? -5 : 5)} ${midX + 3},${toY + (toY > fromY ? -5 : 5)} ${midX},${toY}`}
                      fill={stroke}
                      fillOpacity={isActive ? 0.95 : 0.55}
                    />
                    <text
                      x={midX + 7}
                      y={(fromY + toY) / 2 + 3}
                      fontFamily="var(--font-jetbrains-mono), monospace"
                      fontSize={9}
                      fill={stroke}
                      fillOpacity={0.85}
                    >
                      {e.tool}
                    </text>
                  </g>
                );
              }

              const w = Math.max(28, x2 - x1);
              const color = lane(e.from).color;
              const critique = e.kind === "critique";
              const approve = e.kind === "approve";
              const isActive = idx === activeIdx;
              return (
                <g key={idx}>
                  <rect
                    x={x1}
                    y={fromY - 14}
                    width={w}
                    height={28}
                    rx={4}
                    fill={critique ? "#1A1510" : approve ? "#3B6D3B" : color}
                    fillOpacity={isActive ? 0.95 : 0.78}
                    stroke={isActive ? "#D48B10" : "transparent"}
                    strokeWidth={isActive ? 1.5 : 0}
                  />
                  <text
                    x={x1 + 8}
                    y={fromY + 4}
                    fontFamily="var(--font-jetbrains-mono), monospace"
                    fontSize={10}
                    fill="#FAF7F2"
                  >
                    {e.tool} · {e.dur}ms
                  </text>
                </g>
              );
            })}

            <line
              x1={playheadX}
              y1={20}
              x2={playheadX}
              y2={VB_H - 4}
              stroke="#C4420A"
              strokeOpacity={0.7}
              strokeWidth={1.5}
            />
            <circle cx={playheadX} cy={20} r={3.5} fill="#C4420A" />
          </svg>
        </div>

        <div
          className="mt-4 overflow-hidden rounded-sm border border-tx-ink/10 bg-tx-navy px-4 py-3"
          aria-live="polite"
        >
          <p className="font-mono text-[12px] leading-relaxed text-tx-cream md:text-[13px]">
            <span style={{ color: "var(--tx-gold)" }}>
              [{fmtClock(active.t)}]
            </span>{" "}
            <span
              style={{
                color:
                  lane(active.from).color === "#0D2340" ? "#3A7FBE" : lane(active.from).color,
              }}
              className="font-semibold"
            >
              {active.from}
            </span>
            <span className="text-tx-cream/60">: </span>
            <span>{active.text}</span>
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5">
            <Link
              href={`/admin/replay/${replayHash}`}
              className="inline-flex items-center gap-2 rounded-sm bg-tx-rust px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-tx-rust-dark"
            >
              Watch a real query →
            </Link>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-tx-ink/55">
              opens the run archive · hash {replayHash.slice(0, 8)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-px border border-tx-ink/10 bg-tx-ink/10 md:col-span-7">
            {[
              { label: "Agents collaborating", value: `${agentCount}`, sub: "lanes lit" },
              { label: "Self-corrections", value: `${selfCorrections}`, sub: "critic replan" },
              { label: "End-to-end", value: "7.4s", sub: "wall clock" },
            ].map((s) => (
              <div key={s.label} className="bg-tx-cream px-4 py-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-tx-ink/55">
                  {s.label}
                </div>
                <div className="mt-1 font-display text-2xl font-bold tabular-nums text-tx-navy">
                  {s.value}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-tx-ink/45">
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-tx-ink/40">
          recorded run · t0 = {T0} · loops every 7s
        </p>
      </div>
    </section>
  );
}
