"use client";

// AgentDAG — issue #90.
//
// Live, event-sourced DAG of every tool call, specialist delegation, critic
// pass, parallel fan-out, and cache vs. live source tag the agent emits while
// answering a question. Renders into the right-column DAG tab on /q with
// inline SVG (no chart deps). Each node lights up as its SSE event arrives.
//
// Visual language follows brand-guide/BRAND.md §3:
//   orchestrator → tx-navy   (raw tool calls — discover/schema/fetch/cite)
//   support      → tx-gold   (clarifier / meta)
//   data_analyst → tx-sky    (statistical / chart specialist)
//   reporter     → tx-rust   (composed report)
//   critic       → diamond   (judges plan + answer; loopback on revise)
// Status dot:
//   running → tx-gold + pulse
//   done    → tx-sage
//   failed  → tx-rust
// Source pill:
//   cache          → tx-sage    (green, fastest)
//   live           → tx-rust    (live fetch)
//   cache-fallback → tx-gold    (cache miss → live)

import { useMemo } from "react";

// The set of SSE events the DAG knows how to consume. Mirrors the
// SseEvent type in AgentRunner — we keep it loose (any extra fields the
// runner ships through) so future event kinds don't break the DAG.
export type DagEvent = {
  phase: string;
  ts?: number;
  step?: number;
  total?: number;
  tool?: string;
  args?: unknown;
  rationale?: string;
  status?: "completed" | "failed";
  duration_ms?: number;
  agent?: string;
  // Critique
  target?: "plan" | "answer";
  score?: number;
  approve?: boolean;
  issues?: string[];
  // Parallel
  branches?: Array<{ id: string; tool: string; args?: unknown }>;
  branch_ids?: string[];
  results_count?: number;
  // Delegate
  input_summary?: string;
  output_summary?: string;
  // Tool source
  source?: "cache" | "live" | "cache-fallback";
  tool_source?: "cache" | "live" | "cache-fallback";
  // Plan / replan
  plan?: { steps?: Array<{ tool: string }> };
  failedStep?: number;
  reason?: string;
  // Misc passthrough
  error?: string | null;
  message?: string;
};

type LaneId = "orchestrator" | "support" | "data_analyst" | "reporter" | "critic";

type NodeKind = "tool" | "delegate" | "critic" | "branch";
type NodeStatus = "waiting" | "running" | "done" | "failed";

type DagNode = {
  id: string;
  kind: NodeKind;
  lane: LaneId;
  label: string;
  step?: number;
  branchOf?: string; // parent node id for parallel branches
  status: NodeStatus;
  duration?: number;
  source?: "cache" | "live" | "cache-fallback";
  // Critic-only
  target?: "plan" | "answer";
  score?: number;
  // Layout (filled in during graph build)
  x?: number;
  y?: number;
};

type DagEdge = {
  from: string;
  to: string;
  kind: "seq" | "fork" | "join" | "loopback";
};

const LANES: { id: LaneId; label: string; color: string }[] = [
  { id: "orchestrator", label: "ORCHESTRATOR", color: "var(--tx-navy)" },
  { id: "data_analyst", label: "DATA_ANALYST", color: "var(--tx-sky)" },
  { id: "support", label: "SUPPORT", color: "var(--tx-gold)" },
  { id: "reporter", label: "REPORTER", color: "var(--tx-rust)" },
  { id: "critic", label: "CRITIC", color: "var(--tx-cream)" },
];

const LANE_COLOR: Record<LaneId, string> = {
  orchestrator: "#0D2340",
  data_analyst: "#3A7FBE",
  support: "#D48B10",
  reporter: "#C4420A",
  critic: "#FAF7F2",
};

// Brand-mapped status fills. Done is sage-green, running pulses gold,
// failed is rust, waiting is muted cream-low-alpha.
const STATUS_FILL: Record<NodeStatus, string> = {
  waiting: "rgba(250,247,242,0.10)",
  running: "rgba(212,139,16,0.30)",
  done: "rgba(59,109,59,0.32)",
  failed: "rgba(196,66,10,0.32)",
};
const STATUS_STROKE: Record<NodeStatus, string> = {
  waiting: "rgba(250,247,242,0.25)",
  running: "#D48B10",
  done: "#3B6D3B",
  failed: "#C4420A",
};

const SOURCE_LABEL: Record<string, { fg: string; bg: string; label: string }> = {
  cache: { fg: "#3B6D3B", bg: "rgba(59,109,59,0.20)", label: "cache" },
  live: { fg: "#C4420A", bg: "rgba(196,66,10,0.20)", label: "live" },
  "cache-fallback": {
    fg: "#D48B10",
    bg: "rgba(212,139,16,0.20)",
    label: "cache→live",
  },
};

// Tools the orchestrator runs directly fall in the orchestrator lane.
function laneForTool(tool: string): LaneId {
  // Specialist names route to their own lane.
  if (tool === "delegate_to") return "orchestrator"; // overridden by event.agent
  if (tool === "delegate_to_parallel") return "orchestrator";
  return "orchestrator";
}

// Derive the (lane, kind) for an arbitrary node. Specialist-named delegates
// override the orchestrator default.
function laneForAgent(agent?: string): LaneId {
  if (agent === "data_analyst") return "data_analyst";
  if (agent === "support") return "support";
  if (agent === "reporter") return "reporter";
  if (agent === "critic") return "critic";
  return "orchestrator";
}

// Event-sourced reducer. Walks the DagEvent stream once and produces the
// node + edge graph. Pure / deterministic so the parent component can
// re-derive on every render without extra state.
function buildGraph(events: DagEvent[]): { nodes: DagNode[]; edges: DagEdge[] } {
  const nodes: DagNode[] = [];
  const edges: DagEdge[] = [];
  const byStep = new Map<number, string>(); // step -> nodeId
  const branchParents = new Map<string, string[]>(); // parentId -> branchIds
  const lastNodeId: { v: string | null } = { v: null };
  // For revising → loopback. Keyed by target ("plan" / "answer").
  const lastCritique = new Map<string, string>(); // target -> critic node id

  function addNode(n: DagNode) {
    nodes.push(n);
    return n;
  }
  function addEdge(from: string, to: string, kind: DagEdge["kind"] = "seq") {
    edges.push({ from, to, kind });
  }

  for (const ev of events) {
    switch (ev.phase) {
      case "executing": {
        const step = ev.step ?? nodes.length + 1;
        const tool = ev.tool ?? "tool";
        const id = `step-${step}`;
        // delegate_to / delegate_to_parallel get their own kind so they
        // render in the right lane. The lane is finalized when the matching
        // delegate_start event arrives (carries the agent name).
        const kind: NodeKind =
          tool === "delegate_to" || tool === "delegate_to_parallel"
            ? "delegate"
            : "tool";
        const node = addNode({
          id,
          kind,
          lane: laneForTool(tool),
          label: tool,
          step,
          status: "running",
        });
        byStep.set(step, id);
        if (lastNodeId.v && !id.includes(".b")) {
          addEdge(lastNodeId.v, id, "seq");
        }
        lastNodeId.v = id;
        node.x = 0;
        break;
      }
      case "step_done": {
        const id = byStep.get(ev.step ?? -1);
        if (!id) break;
        const n = nodes.find((x) => x.id === id);
        if (!n) break;
        n.status = ev.status === "completed" ? "done" : "failed";
        n.duration = ev.duration_ms;
        if (ev.agent) n.lane = laneForAgent(ev.agent);
        if (ev.tool_source) n.source = ev.tool_source;
        break;
      }
      case "tool_source": {
        const id = byStep.get(ev.step ?? -1);
        if (!id) break;
        const n = nodes.find((x) => x.id === id);
        if (n && ev.source) n.source = ev.source;
        break;
      }
      case "delegate_start": {
        const id = byStep.get(ev.step ?? -1);
        if (!id) break;
        const n = nodes.find((x) => x.id === id);
        if (!n) break;
        n.lane = laneForAgent(ev.agent);
        n.label = `delegate_to(${ev.agent ?? "?"})`;
        n.status = "running";
        break;
      }
      case "delegate_done": {
        const id = byStep.get(ev.step ?? -1);
        if (!id) break;
        const n = nodes.find((x) => x.id === id);
        if (!n) break;
        n.status = ev.status === "completed" ? "done" : "failed";
        if (ev.agent) n.lane = laneForAgent(ev.agent);
        break;
      }
      case "parallel_dispatch": {
        const parentId = byStep.get(ev.step ?? -1);
        if (!parentId) break;
        const branches = ev.branches ?? [];
        const ids: string[] = [];
        for (const b of branches) {
          const bid = b.id;
          ids.push(bid);
          // Lane is inferred from the branch tool name "delegate_to(X)".
          const m = /delegate_to\(([^)]+)\)/.exec(b.tool);
          const lane = laneForAgent(m?.[1]);
          addNode({
            id: bid,
            kind: "branch",
            lane,
            label: b.tool,
            branchOf: parentId,
            status: "running",
          });
          addEdge(parentId, bid, "fork");
        }
        branchParents.set(parentId, ids);
        break;
      }
      case "parallel_join": {
        const parentId = byStep.get(ev.step ?? -1);
        if (!parentId) break;
        const ids = branchParents.get(parentId) ?? ev.branch_ids ?? [];
        // Mark each branch done (the join carries no per-branch status —
        // the parent step_done sets the parent's pass/fail).
        for (const bid of ids as string[]) {
          const n = nodes.find((x) => x.id === bid);
          if (n && n.status === "running") n.status = "done";
        }
        // Synthetic join node so the visual converges back to a single point.
        const joinId = `${parentId}-join`;
        addNode({
          id: joinId,
          kind: "tool",
          lane: "orchestrator",
          label: "join",
          status: "done",
        });
        for (const bid of ids as string[]) addEdge(bid, joinId, "join");
        lastNodeId.v = joinId;
        break;
      }
      case "critique": {
        const target = ev.target ?? "plan";
        const id = `critic-${target}-${nodes.filter((n) => n.kind === "critic").length + 1}`;
        const status: NodeStatus = ev.approve ? "done" : "failed";
        addNode({
          id,
          kind: "critic",
          lane: "critic",
          label: `critic · ${target}`,
          status,
          target,
          score: ev.score,
        });
        if (lastNodeId.v) addEdge(lastNodeId.v, id, "seq");
        lastNodeId.v = id;
        lastCritique.set(target, id);
        break;
      }
      case "revising": {
        // Curved loopback edge from the critic node back to the most recent
        // node of the matching phase (planning / synth). For planning we
        // loop back to the FIRST node (orchestrator's plan). For answer we
        // loop back to the last orchestrator node before the critic.
        const target = ev.target ?? "plan";
        const criticId = lastCritique.get(target);
        if (!criticId) break;
        // Pick the most recent non-critic node before the critic as the loop
        // target — the planner / synth that produced the rejected output.
        const criticIdx = nodes.findIndex((n) => n.id === criticId);
        let loopTo: string | null = null;
        for (let i = criticIdx - 1; i >= 0; i--) {
          if (nodes[i].kind !== "critic") {
            loopTo = nodes[i].id;
            break;
          }
        }
        if (loopTo) addEdge(criticId, loopTo, "loopback");
        break;
      }
      default:
        break;
    }
  }

  return { nodes, edges };
}

// Layout: assign each node an (x, y). Lanes are vertical bands (by laneId);
// x is by topological order so siblings render side-by-side after a fork.
function layout(
  nodes: DagNode[],
  width: number,
  laneHeight: number,
  nodeW: number,
  nodeH: number,
): { positioned: DagNode[]; height: number } {
  const laneIndex: Record<LaneId, number> = {
    orchestrator: 0,
    data_analyst: 1,
    support: 2,
    reporter: 3,
    critic: 4,
  };
  // Simple column assignment: each "step" (or join, or critic) is a column.
  // Branches share the column of their parent's NEXT slot — so a fork pushes
  // the join one column further than a non-fork would.
  let col = 0;
  const colOf = new Map<string, number>();
  for (const n of nodes) {
    if (n.kind === "branch") {
      // Branches all share the same column (one to the right of their parent).
      const parentCol = colOf.get(n.branchOf ?? "") ?? col;
      colOf.set(n.id, parentCol + 1);
    } else {
      // After branches, the next non-branch node sits in parent+2.
      const lastBranch = [...nodes].reverse().find((x) => x.kind === "branch");
      if (lastBranch && colOf.has(lastBranch.id) && !colOf.has(n.id)) {
        const branchCol = colOf.get(lastBranch.id) ?? col;
        col = Math.max(col, branchCol + 1);
      }
      colOf.set(n.id, col);
      col += 1;
    }
  }
  const totalCols = Math.max(1, col);
  // Step-x: leave a 60px left margin for lane labels.
  const leftPad = 70;
  const rightPad = 30;
  const stepX = (totalCols > 1 ? (width - leftPad - rightPad) / (totalCols - 1) : 0) || 80;

  const positioned: DagNode[] = nodes.map((n) => {
    const c = colOf.get(n.id) ?? 0;
    const lane = laneIndex[n.lane] ?? 0;
    return {
      ...n,
      x: leftPad + c * stepX,
      y: lane * laneHeight + laneHeight / 2,
    };
  });
  // Height = number of lanes * laneHeight + 30px footer.
  const height = LANES.length * laneHeight + 20;
  return { positioned, height };
}

export function AgentDAG({ events }: { events: DagEvent[] }) {
  const { nodes, edges } = useMemo(() => buildGraph(events), [events]);
  const width = 360;
  const laneHeight = 64;
  const nodeW = 110;
  const nodeH = 28;
  const { positioned, height } = layout(nodes, width, laneHeight, nodeW, nodeH);
  const byId = new Map(positioned.map((n) => [n.id, n]));

  if (positioned.length === 0) {
    return (
      <div className="px-5 py-12 text-center font-mono text-[12px] text-tx-cream/45">
        Waiting for the first tool call…
        <p className="mx-auto mt-3 max-w-[26ch] text-tx-cream/35">
          Each tool, delegate, critic pass, and parallel branch lights up here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header — title + active-agent legend */}
      <div className="border-b border-white/10 px-5 py-3">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-gold">
          Live DAG
        </p>
        <p className="mt-1 text-[11px] text-tx-cream/55">
          {nodes.length} node{nodes.length === 1 ? "" : "s"} · {edges.length} edge
          {edges.length === 1 ? "" : "s"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {LANES.map((l) => (
            <span key={l.id} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-sm"
                style={{ background: l.color }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-tx-cream/55">
                {l.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* DAG canvas — inline SVG so we never reach for a chart lib */}
      <div className="flex-1 overflow-auto px-3 py-4" style={{ background: "rgba(7,21,42,0.6)" }}>
        <svg
          width={Math.max(width, (positioned.at(-1)?.x ?? 0) + 80)}
          height={height}
          style={{ display: "block" }}
        >
          {/* Lane bands — subtle horizontal stripes per agent. */}
          {LANES.map((l, i) => (
            <g key={l.id}>
              <rect
                x={0}
                y={i * laneHeight}
                width={Math.max(width, (positioned.at(-1)?.x ?? 0) + 80)}
                height={laneHeight}
                fill={i % 2 === 0 ? "rgba(250,247,242,0.02)" : "transparent"}
              />
              <text
                x={6}
                y={i * laneHeight + laneHeight / 2 + 3}
                fill="rgba(250,247,242,0.35)"
                fontFamily="monospace"
                fontSize={9}
                fontWeight={600}
                style={{ letterSpacing: "0.08em" }}
              >
                {l.label.slice(0, 6)}
              </text>
              {/* Lane divider */}
              <line
                x1={0}
                y1={(i + 1) * laneHeight}
                x2={Math.max(width, (positioned.at(-1)?.x ?? 0) + 80)}
                y2={(i + 1) * laneHeight}
                stroke="rgba(250,247,242,0.06)"
                strokeWidth={0.5}
              />
            </g>
          ))}

          {/* Edges first so nodes paint over them */}
          {edges.map((e, idx) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const ax = (a.x ?? 0) + nodeW / 2;
            const ay = a.y ?? 0;
            const bx = (b.x ?? 0) - nodeW / 2;
            const by = b.y ?? 0;
            const stroke =
              e.kind === "loopback"
                ? "var(--tx-gold)"
                : e.kind === "fork"
                  ? "var(--tx-sky)"
                  : e.kind === "join"
                    ? "var(--tx-sage)"
                    : "rgba(250,247,242,0.35)";
            const dash = e.kind === "loopback" ? "4 3" : undefined;
            if (e.kind === "loopback") {
              // Curved arc back to a prior node. Loop ABOVE the lanes.
              const midX = (ax + bx) / 2;
              const peakY = Math.min(ay, by) - laneHeight / 1.4;
              const d = `M ${ax} ${ay} C ${midX} ${peakY}, ${midX} ${peakY}, ${bx} ${by}`;
              return (
                <g key={`e-${idx}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={1.5}
                    strokeDasharray={dash}
                  />
                  <text
                    x={midX}
                    y={peakY + 4}
                    fill="var(--tx-gold)"
                    fontFamily="monospace"
                    fontSize={9}
                    textAnchor="middle"
                  >
                    revise
                  </text>
                </g>
              );
            }
            // Straight or gently-curved edge for forks (different lanes).
            const d = `M ${ax} ${ay} C ${ax + 24} ${ay}, ${bx - 24} ${by}, ${bx} ${by}`;
            return (
              <path
                key={`e-${idx}`}
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={1}
                strokeDasharray={dash}
              />
            );
          })}

          {/* Nodes */}
          {positioned.map((n) => {
            const x = (n.x ?? 0) - nodeW / 2;
            const y = (n.y ?? 0) - nodeH / 2;
            const fill = STATUS_FILL[n.status];
            const stroke = STATUS_STROKE[n.status];
            const laneStripe = LANE_COLOR[n.lane];
            const isCritic = n.kind === "critic";
            const isPulsing = n.status === "running";
            // Diamond for critic, pill for everything else.
            return (
              <g key={n.id}>
                {isCritic ? (
                  <g transform={`translate(${(n.x ?? 0)} ${(n.y ?? 0)})`}>
                    <polygon
                      points={`0,-${nodeH / 1.4} ${nodeW / 2},0 0,${nodeH / 1.4} -${nodeW / 2},0`}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isPulsing ? 1.6 : 1}
                    />
                    <text
                      y={3}
                      textAnchor="middle"
                      fill="var(--tx-cream)"
                      fontFamily="monospace"
                      fontSize={9}
                      fontWeight={600}
                    >
                      {n.label}
                    </text>
                    {typeof n.score === "number" && (
                      <text
                        y={nodeH / 1.4 + 11}
                        textAnchor="middle"
                        fill="rgba(250,247,242,0.7)"
                        fontFamily="monospace"
                        fontSize={9}
                      >
                        {n.score.toFixed(2)} {n.status === "failed" ? "✗" : "✓"}
                      </text>
                    )}
                  </g>
                ) : (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={nodeW}
                      height={nodeH}
                      rx={6}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isPulsing ? 1.6 : 1}
                    />
                    {/* Lane-color left stripe so the agent identity is
                        readable even at glance distance. */}
                    <rect
                      x={x}
                      y={y}
                      width={3}
                      height={nodeH}
                      rx={2}
                      fill={laneStripe}
                    />
                    <text
                      x={x + 8}
                      y={y + nodeH / 2 + 3}
                      fill="var(--tx-cream)"
                      fontFamily="monospace"
                      fontSize={9.5}
                      fontWeight={600}
                    >
                      {n.label.length > 16 ? n.label.slice(0, 15) + "…" : n.label}
                    </text>
                    {/* Status dot, top-right */}
                    <circle
                      cx={x + nodeW - 6}
                      cy={y + 6}
                      r={3}
                      fill={
                        n.status === "done"
                          ? "var(--tx-sage)"
                          : n.status === "failed"
                            ? "var(--tx-rust)"
                            : n.status === "running"
                              ? "var(--tx-gold)"
                              : "rgba(250,247,242,0.4)"
                      }
                    >
                      {isPulsing && (
                        <animate
                          attributeName="opacity"
                          values="1;0.3;1"
                          dur="1.2s"
                          repeatCount="indefinite"
                        />
                      )}
                    </circle>
                    {/* Duration + source pill below */}
                    {(typeof n.duration === "number" || n.source) && (
                      <g>
                        {typeof n.duration === "number" && (
                          <text
                            x={x + 8}
                            y={y + nodeH + 10}
                            fill="rgba(250,247,242,0.55)"
                            fontFamily="monospace"
                            fontSize={8.5}
                          >
                            {n.duration}ms
                          </text>
                        )}
                        {n.source && (
                          <g
                            transform={`translate(${x + nodeW - 38} ${y + nodeH + 2})`}
                          >
                            <rect
                              width={36}
                              height={11}
                              rx={3}
                              fill={SOURCE_LABEL[n.source].bg}
                              stroke={SOURCE_LABEL[n.source].fg}
                              strokeWidth={0.5}
                            />
                            <text
                              x={18}
                              y={8}
                              textAnchor="middle"
                              fill={SOURCE_LABEL[n.source].fg}
                              fontFamily="monospace"
                              fontSize={7.5}
                              fontWeight={700}
                            >
                              {SOURCE_LABEL[n.source].label}
                            </text>
                          </g>
                        )}
                      </g>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
