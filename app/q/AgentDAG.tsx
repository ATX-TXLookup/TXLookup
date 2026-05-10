"use client";

// AgentDAG — proper top-to-bottom flowchart of the agent run on /q's
// right column. Replaces the prior lane-and-squiggly version which
// read as a timeline rather than a flowchart.
//
// Layout: nodes flow vertically, parallel siblings sit side-by-side at
// the same row, right-angle (Manhattan) edges with arrow markers, curved
// dashed loopback for replans + critic-driven revisions.
//
// Issue #90.

import { useMemo } from "react";

export type DagEvent = {
  ts: number;
  phase: string;
  step?: number;
  tool?: string;
  agent?: string;
  status?: string;
  duration_ms?: number;
  source?: "cache" | "live" | "cache-fallback";
  tool_source?: "cache" | "live" | "cache-fallback";
  branches?: Array<{ id: string; tool: string; args: unknown }>;
  branch_ids?: string[];
  target?: "plan" | "answer";
  approve?: boolean;
  score?: number;
  issues?: string[];
  reason?: string;
  failedStep?: number;
  failedTool?: string;
  input_summary?: string;
  output_summary?: string;
  message?: string;
  detail?: string;
};

type AgentKey = "orchestrator" | "data_analyst" | "reporter" | "support" | "critic";

const AGENT_COLOR: Record<AgentKey, string> = {
  orchestrator: "#5B8DEF",
  data_analyst: "#10B981",
  reporter:     "#A855F7",
  support:      "#F97316",
  critic:       "#F59E0B",
};

// One-sentence explanations for every agent and every tool node that can
// appear in the DAG. Surfaced as native SVG <title> hover tooltips and as
// the (i) icon caption in the legend. Keep these terse — they show up in
// hover bubbles, not in articles.
const AGENT_DOCS: Record<AgentKey, string> = {
  orchestrator: "Drives the loop. Reasons, plans, dispatches tools, and synthesizes the final answer.",
  data_analyst: "Computes aggregates with quality flags (null rate, top concentration, sample factor).",
  reporter: "Composes the final answer paragraph from the analyst's findings.",
  support: "Handles meta-questions and disambiguation. No Socrata calls.",
  critic: "Verifies plan and answer. Rejects ungrounded outputs.",
};

const TOOL_DOCS: Record<string, string> = {
  reason: "Codex parses the question into a structured intent (domain, geography, time, analysis).",
  plan: "Codex emits a structured plan: which datasets, which SoQL, which specialists to dispatch.",
  replan: "Re-derives the plan from the failure point with a fresh diagnosis.",
  "doom-loop catch": "Caught a repeating failure pattern. Aborts before the loop wastes tokens.",
  done: "All steps verified, citation attached, answer published.",
  join: "Parallel branches finished. Results merged for the next step.",
  "critic · plan": "Critic LLM grades the plan. Score < threshold triggers a revise.",
  "critic · answer": "Critic LLM grades the answer for grounding + citation. Reject = revise.",
  "revise · plan": "Orchestrator rewrites the plan after critic feedback.",
  "revise · answer": "Orchestrator rewrites the answer after critic feedback.",
  discover_datasets: "Finds the relevant dataset from the catalog.",
  get_dataset_schema: "Inspects columns + types before constructing a query.",
  fetch_data: "Bounded SoQL query against Socrata. Hard-capped at 5000 rows.",
  summarize_data: "Computes stats over a slice (count, sum, avg, top-N).",
  cite_dataset: "Emits portal + dataset_id + URL citation. Required to terminate.",
  delegate_to: "Hands off to a specialist agent (analyst / reporter / support).",
  delegate_to_parallel: "Fans out to multiple specialists concurrently, then joins.",
};

function docsForNode(label: string, agent: AgentKey): string {
  // Tool docs first (most specific). Strip a "delegate_to(name)" wrapper if
  // present — the route emits that form for delegate_to steps.
  const bare = label.replace(/\(.*\)$/, "");
  if (TOOL_DOCS[label]) return TOOL_DOCS[label];
  if (TOOL_DOCS[bare]) return TOOL_DOCS[bare];
  return AGENT_DOCS[agent];
}

type NodeShape = "rect" | "diamond" | "pill" | "round";

type Node = {
  id: string;
  agent: AgentKey;
  label: string;
  sub?: string;
  shape: NodeShape;
  status: "running" | "done" | "fail";
  source?: "cache" | "live" | "cache-fallback";
  ts: number;
  parallelGroup?: number;
};

type Edge = {
  fromId: string;
  toId: string;
  kind: "next" | "fork" | "join" | "loopback";
};

function agentFor(ev: DagEvent): AgentKey {
  if (ev.agent === "data_analyst") return "data_analyst";
  if (ev.agent === "reporter") return "reporter";
  if (ev.agent === "support") return "support";
  if (ev.phase === "critique" || ev.phase === "revising") return "critic";
  return "orchestrator";
}

function buildGraph(events: DagEvent[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const stepNodeId = new Map<number, string>();
  let prevId: string | null = null;
  let parallelGroup = 0;
  let inParallel = false;
  let parallelStartId: string | null = null;
  const parallelChildIds: string[] = [];

  const link = (from: string | null, to: string, kind: Edge["kind"] = "next") => {
    if (from && from !== to) edges.push({ fromId: from, toId: to, kind });
  };

  for (const ev of events) {
    switch (ev.phase) {
      case "reasoning": {
        const id = `reason-${ev.ts}`;
        nodes.push({ id, agent: "orchestrator", label: "reason", shape: "pill", status: "running", ts: ev.ts });
        link(prevId, id);
        prevId = id;
        break;
      }
      case "planning": {
        const last = nodes.findLast?.((n) => n.label === "reason");
        if (last && last.status === "running") last.status = "done";
        const id = `plan-${ev.ts}`;
        nodes.push({ id, agent: "orchestrator", label: "plan", shape: "pill", status: "done", ts: ev.ts });
        link(prevId, id);
        prevId = id;
        break;
      }
      case "executing": {
        const a = agentFor(ev);
        const id = `step-${ev.step ?? 0}-${ev.ts}`;
        nodes.push({ id, agent: a, label: ev.tool ?? "tool", shape: "rect", status: "running", ts: ev.ts });
        if (typeof ev.step === "number") stepNodeId.set(ev.step, id);
        if (inParallel) {
          parallelChildIds.push(id);
          if (parallelStartId) link(parallelStartId, id, "fork");
        } else {
          link(prevId, id);
          prevId = id;
        }
        break;
      }
      case "step_done": {
        if (typeof ev.step === "number") {
          const id = stepNodeId.get(ev.step);
          const target = id ? nodes.find((n) => n.id === id) : null;
          if (target) {
            target.status = ev.status === "completed" ? "done" : "fail";
            if (typeof ev.duration_ms === "number") target.sub = `${ev.duration_ms}ms`;
            if (ev.tool_source) target.source = ev.tool_source;
            if (ev.agent) target.agent = agentFor(ev);
          }
        }
        break;
      }
      case "tool_source": {
        if (typeof ev.step === "number") {
          const id = stepNodeId.get(ev.step);
          const target = id ? nodes.find((n) => n.id === id) : null;
          if (target && ev.source) target.source = ev.source;
        }
        break;
      }
      case "parallel_dispatch": {
        parallelGroup += 1;
        inParallel = true;
        parallelStartId = prevId;
        parallelChildIds.length = 0;
        if (Array.isArray(ev.branches) && ev.branches.length > 0) {
          for (const b of ev.branches) {
            const id = `branch-${b.id}-${ev.ts}`;
            nodes.push({
              id,
              agent: "data_analyst",
              label: b.tool,
              shape: "rect",
              status: "running",
              ts: ev.ts,
              parallelGroup,
            });
            parallelChildIds.push(id);
            if (parallelStartId) link(parallelStartId, id, "fork");
          }
        }
        break;
      }
      case "parallel_join": {
        const joinId = `join-${ev.ts}`;
        nodes.push({ id: joinId, agent: "orchestrator", label: "join", shape: "round", status: "done", ts: ev.ts });
        for (const id of [...parallelChildIds]) link(id, joinId, "join");
        for (const childId of parallelChildIds) {
          const c = nodes.find((n) => n.id === childId);
          if (c && c.status === "running") c.status = "done";
        }
        inParallel = false;
        parallelStartId = null;
        parallelChildIds.length = 0;
        prevId = joinId;
        break;
      }
      case "delegate_start": {
        const a = agentFor(ev);
        const id = `del-${ev.step ?? nodes.length}-${ev.ts}`;
        nodes.push({
          id,
          agent: a,
          label: ev.input_summary?.slice(0, 28) ?? ev.agent ?? "delegate",
          shape: "rect",
          status: "running",
          ts: ev.ts,
        });
        if (typeof ev.step === "number") stepNodeId.set(ev.step, id);
        link(prevId, id);
        prevId = id;
        break;
      }
      case "delegate_done": {
        if (typeof ev.step === "number") {
          const id = stepNodeId.get(ev.step);
          const target = id ? nodes.find((n) => n.id === id) : null;
          if (target) target.status = ev.status === "failed" ? "fail" : "done";
        }
        break;
      }
      case "critique": {
        const id = `crit-${ev.ts}`;
        const passed = ev.approve === true;
        nodes.push({
          id,
          agent: "critic",
          label: ev.target === "plan" ? "critic · plan" : "critic · answer",
          sub: typeof ev.score === "number" ? `${ev.score.toFixed(2)} ${passed ? "✓" : "✗"}` : passed ? "✓" : "✗",
          shape: "diamond",
          status: passed ? "done" : "fail",
          ts: ev.ts,
        });
        link(prevId, id);
        prevId = id;
        break;
      }
      case "revising": {
        const id = `rev-${ev.ts}`;
        nodes.push({
          id,
          agent: "orchestrator",
          label: ev.target === "answer" ? "revise · answer" : "revise · plan",
          shape: "pill",
          status: "running",
          ts: ev.ts,
        });
        const lastCritic = [...nodes].reverse().find((n) => n.shape === "diamond");
        if (lastCritic) link(lastCritic.id, id, "loopback");
        else link(prevId, id);
        prevId = id;
        break;
      }
      case "replanning": {
        const id = `replan-${ev.ts}`;
        nodes.push({ id, agent: "orchestrator", label: "replan", shape: "pill", status: "running", ts: ev.ts });
        link(prevId, id, "loopback");
        prevId = id;
        break;
      }
      case "doom_loop": {
        const id = `dl-${ev.ts}`;
        nodes.push({ id, agent: "orchestrator", label: "doom-loop catch", shape: "pill", status: "fail", ts: ev.ts });
        link(prevId, id);
        prevId = id;
        break;
      }
      case "done": {
        const id = `done-${ev.ts}`;
        nodes.push({ id, agent: "orchestrator", label: "done", shape: "round", status: "done", ts: ev.ts });
        link(prevId, id);
        prevId = id;
        break;
      }
    }
  }
  return { nodes, edges };
}

type Positioned = Node & { x: number; y: number };
function layoutNodes(nodes: Node[]): { positioned: Positioned[]; rows: number } {
  const positioned: Positioned[] = [];
  const center = 1;
  let row = 0;
  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i];
    if (n.parallelGroup !== undefined) {
      const group: Node[] = [];
      while (i < nodes.length && nodes[i].parallelGroup === n.parallelGroup) {
        group.push(nodes[i]);
        i += 1;
      }
      group.forEach((g, idx) => {
        const offset = idx - (group.length - 1) / 2;
        positioned.push({ ...g, x: center + offset, y: row });
      });
      row += 1;
    } else {
      positioned.push({ ...n, x: center, y: row });
      row += 1;
      i += 1;
    }
  }
  return { positioned, rows: row };
}

const STATUS_RING: Record<Node["status"], string> = {
  running: "#5B8DEF",
  done:    "#10B981",
  fail:    "#EF4444",
};
const STATUS_FILL: Record<Node["status"], string> = {
  running: "#15171C",
  done:    "#15171C",
  fail:    "#15171C",
};

const SOURCE_COLOR: Record<NonNullable<Node["source"]>, { bg: string; fg: string; label: string }> = {
  cache:            { bg: "#10B98122", fg: "#10B981", label: "cache" },
  live:             { bg: "#F9731622", fg: "#F97316", label: "live" },
  "cache-fallback": { bg: "#F59E0B22", fg: "#F59E0B", label: "cache→live" },
};

export function AgentDAG({ events }: { events: DagEvent[] }) {
  const built = useMemo(() => buildGraph(events), [events]);
  const { positioned, rows } = useMemo(() => layoutNodes(built.nodes), [built.nodes]);

  if (positioned.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-12 text-center">
        <div className="h-2 w-2 animate-pulse rounded-full bg-[#5B8DEF]" />
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#71717A]">
          Awaiting agent run…
        </p>
      </div>
    );
  }

  // Geometry tuned to fit the right-column sidebar (~380-420px) without
  // overflowing or shrinking text below readability. Was sized for desktop
  // SVG which made boxes balloon outside the sidebar viewport.
  const NODE_W = 110;
  const NODE_H = 38;
  const COL_W = 132;
  const ROW_H = 60;
  const PAD_X = 16;
  const PAD_Y = 18;
  const cols = 3;
  const innerW = cols * COL_W;
  const W = PAD_X * 2 + innerW;
  const H = PAD_Y * 2 + rows * ROW_H;

  const idToPos = new Map(positioned.map((n) => [n.id, n] as const));
  const cx = (n: Positioned) => PAD_X + n.x * COL_W + COL_W / 2;
  const cy = (n: Positioned) => PAD_Y + n.y * ROW_H + NODE_H / 2;

  return (
    <div className="bg-[var(--ds-bg)]">
      <div className="border-b border-[var(--ds-border)] px-4 py-2">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-text-dim)]">
            Live DAG
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
            {positioned.length} node{positioned.length === 1 ? "" : "s"} · {built.edges.length} edge{built.edges.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
        <defs>
          <marker id="dag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#3F3F46" />
          </marker>
          <marker id="dag-arrow-warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#F59E0B" />
          </marker>
        </defs>

        {built.edges.map((e, i) => {
          const from = idToPos.get(e.fromId);
          const to = idToPos.get(e.toId);
          if (!from || !to) return null;
          const x1 = cx(from);
          const y1 = cy(from) + NODE_H / 2;
          const x2 = cx(to);
          const y2 = cy(to) - NODE_H / 2;

          if (e.kind === "loopback") {
            const arcX = Math.max(x1, x2) + COL_W * 0.8;
            const path = `M ${x1} ${y1} L ${x1} ${y1 - 8} L ${arcX} ${y1 - 8} L ${arcX} ${y2 + 8} L ${x2} ${y2 + 8} L ${x2} ${y2}`;
            return (
              <path key={i} d={path} fill="none" stroke="#F59E0B" strokeWidth={1.25} strokeDasharray="3 3" markerEnd="url(#dag-arrow-warn)" />
            );
          }

          const midY = (y1 + y2) / 2;
          const path =
            x1 === x2
              ? `M ${x1} ${y1} L ${x2} ${y2}`
              : `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
          return <path key={i} d={path} fill="none" stroke="#3F3F46" strokeWidth={1.25} markerEnd="url(#dag-arrow)" />;
        })}

        {positioned.map((n) => {
          const x = cx(n);
          const y = cy(n);
          const ring = STATUS_RING[n.status];
          const fill = STATUS_FILL[n.status];
          const agentTone = AGENT_COLOR[n.agent];

          const tip = docsForNode(n.label, n.agent);
          if (n.shape === "diamond") {
            const r = 22;
            return (
              <g key={n.id} style={{ cursor: "help" }}>
                <title>{`${n.label} — ${tip}`}</title>
                <polygon
                  points={`${x},${y - r} ${x + r * 1.2},${y} ${x},${y + r} ${x - r * 1.2},${y}`}
                  fill={fill}
                  stroke={ring}
                  strokeWidth={1.5}
                />
                <text x={x} y={y - 1} textAnchor="middle" fontSize={8.5} fontFamily="JetBrains Mono, monospace" fill={agentTone} fontWeight={700}>
                  {(n.label.length > 13 ? n.label.slice(0, 12) + "…" : n.label)}
                </text>
                {n.sub && (
                  <text x={x} y={y + 10} textAnchor="middle" fontSize={8} fontFamily="JetBrains Mono, monospace" fill="#A1A1AA">
                    {n.sub}
                  </text>
                )}
                {/* (i) icon — top-right corner of the diamond's bbox */}
                <circle cx={x + r * 1.2 - 4} cy={y - r + 4} r={4} fill="#15171C" stroke="#71717A" strokeWidth={0.75} />
                <text x={x + r * 1.2 - 4} y={y - r + 6.5} textAnchor="middle" fontSize={6.5} fontFamily="JetBrains Mono, monospace" fill="#A1A1AA" fontWeight={700}>i</text>
              </g>
            );
          }
          if (n.shape === "pill" || n.shape === "round") {
            const w = NODE_W * 0.85;
            const h = NODE_H;
            return (
              <g key={n.id} style={{ cursor: "help" }}>
                <title>{`${n.label} — ${tip}`}</title>
                <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={fill} stroke={ring} strokeWidth={1.5} />
                <circle cx={x - w / 2 + 9} cy={y} r={2.5} fill={agentTone} />
                <text x={x - w / 2 + 16} y={y + 3.5} fontSize={9.5} fontFamily="JetBrains Mono, monospace" fill="#F5F5F7" fontWeight={500}>
                  {(n.label.length > 12 ? n.label.slice(0, 11) + "…" : n.label)}
                </text>
                {/* (i) icon — top-right of the pill */}
                <circle cx={x + w / 2 - 6} cy={y - h / 2 + 6} r={4} fill="#15171C" stroke="#71717A" strokeWidth={0.75} />
                <text x={x + w / 2 - 6} y={y - h / 2 + 8.5} textAnchor="middle" fontSize={6.5} fontFamily="JetBrains Mono, monospace" fill="#A1A1AA" fontWeight={700}>i</text>
              </g>
            );
          }
          const w = NODE_W;
          const h = NODE_H;
          // Truncate strictly to width (rough char width ≈ 5.5px at 9.5px font).
          const maxLabelChars = Math.floor((w - 18) / 5.5);
          const labelDisplay =
            n.label.length > maxLabelChars
              ? n.label.slice(0, maxLabelChars - 1) + "…"
              : n.label;
          const subDisplay = n.sub ?? n.agent;
          const maxSubChars = Math.floor((w - 14) / 5.0);
          const subDisplayClipped =
            subDisplay && subDisplay.length > maxSubChars
              ? subDisplay.slice(0, maxSubChars - 1) + "…"
              : subDisplay;
          return (
            <g key={n.id} style={{ cursor: "help" }}>
              <title>{`${n.label} — ${tip}`}</title>
              <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={4} fill={fill} stroke={ring} strokeWidth={1.5} />
              <rect x={x - w / 2} y={y - h / 2} width={2.5} height={h} fill={agentTone} />
              <text x={x - w / 2 + 7} y={y - 4} fontSize={9.5} fontFamily="JetBrains Mono, monospace" fill="#F5F5F7" fontWeight={600}>
                {labelDisplay}
              </text>
              <text x={x - w / 2 + 7} y={y + 8} fontSize={8} fontFamily="JetBrains Mono, monospace" fill="#A1A1AA">
                {subDisplayClipped}
              </text>
              {/* (i) icon — bottom-right corner. Don't overlap the source pill which is top-right. */}
              <circle cx={x + w / 2 - 6} cy={y + h / 2 - 6} r={4} fill="#15171C" stroke="#71717A" strokeWidth={0.75} />
              <text x={x + w / 2 - 6} y={y + h / 2 - 3.5} textAnchor="middle" fontSize={6.5} fontFamily="JetBrains Mono, monospace" fill="#A1A1AA" fontWeight={700}>i</text>
              {n.source && (() => {
                const p = SOURCE_COLOR[n.source];
                return (
                  <g>
                    <rect x={x + w / 2 - 32} y={y - h / 2 + 4} width={28} height={11} rx={2} fill={p.bg} />
                    <text x={x + w / 2 - 18} y={y - h / 2 + 12.5} textAnchor="middle" fontSize={7} fontFamily="JetBrains Mono, monospace" fill={p.fg} fontWeight={700}>
                      {p.label.slice(0, 5)}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>

      <div className="border-t border-[var(--ds-border)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
          {(["orchestrator", "data_analyst", "critic", "reporter", "support"] as AgentKey[]).map((a) => (
            <div key={a} className="inline-flex items-center gap-1.5" title={AGENT_DOCS[a]} style={{ cursor: "help" }}>
              <span className="block h-2 w-2 rounded-full" style={{ background: AGENT_COLOR[a] }} />
              <span>{a}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-[var(--ds-text-dim)]/70">
          Hover any node for what it does.
        </p>
      </div>
    </div>
  );
}
