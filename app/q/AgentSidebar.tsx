"use client";

// AgentSidebar — the right-column observatory panel for /q.
//
// Brand-faithful per BRAND.md (brand-guide/BRAND.md): the dark-hero pattern
// from §7 (tx-navy-dark bg with subtle radial-glow), tx-cream foreground,
// tx-gold for state/labels, tx-sky for info, tx-sage for completion,
// tx-rust for errors, IBM Plex Mono for telemetry rows. Tabs keep their
// 4-tab structure but render as gold-underlined uppercase labels on navy.
//
// IMPORTANT: prop shapes, tab IDs, filter logic, scroll/auto-tail behavior,
// and the SidebarStep / SidebarReplan / TokenUsage types are byte-identical
// to the pre-restyle version. Only `className`, inline styles, and the
// visual structure change.

import { useEffect, useRef, useState } from "react";

import type { ObsEvent } from "./AgentObservatory";
import { AgentDAG, type DagEvent, type DagNodeSelection } from "./AgentDAG";

type SidebarStep = {
  step: number;
  tool: string;
  args: unknown;
  rationale?: string;
  status: "pending" | "completed" | "failed";
  preview?: string;
  error?: string | null;
  fromReplan?: boolean;
  durationMs?: number;
  // Responsible agent emitted on SSE step_done (PR #68). Drives Flow-tab
  // color-coding: orchestrator=navy, support=gold, data_analyst=sky,
  // reporter=rust. Absent (older streams or pre-step_done) → orchestrator.
  agent?: string;
};

type SidebarReplan = {
  failedStep: number;
  failedTool: string;
  error: string | null;
  diagnosis?: string;
  reason?: "step_failed" | "doom_loop";
};

type TokenUsage = { prompt: number; completion: number; total: number };

type Phase =
  | "idle"
  | "reasoning"
  | "planning"
  | "executing"
  | "replanning"
  | "completing"
  | "done"
  | "error";

type Props = {
  events: ObsEvent[];
  // Issue #90 — raw SSE events for the live DAG. Carries critique scores,
  // parallel branch ids, source pills the obs-event mapping flattens away.
  dagEvents: DagEvent[];
  steps: SidebarStep[];
  replans: SidebarReplan[];
  status: "idle" | "running" | "done" | "error";
  phase: Phase;
  currentStep: number;
  totalSteps: number;
  currentTool: string | null;
  durationMs: number | null;
  usageTotal: TokenUsage | null;
  citationCount: number;
  startedAt: number | null;
};

type Tab = "status" | "dag" | "steps" | "telemetry";

// User feedback: Flow + Execution did the same thing in two slightly
// different shapes. Consolidated into a single "Steps" tab that uses
// the existing ExecutionTab renderer (richer per-step info than Flow).
// The visual flowchart still lives in the DAG tab.
const TABS: { id: Tab; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "dag", label: "DAG" },
  { id: "steps", label: "Steps" },
  { id: "telemetry", label: "Telemetry" },
];

// Step-status palette on dark navy. Matches the brand mapping:
//   completed → sage   ·  failed → rust   ·  pending → muted cream
//   replan-origin step → gold (highlighted on dark)
const PILL_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  completed: {
    bg: "rgba(59,109,59,0.18)",
    fg: "var(--tx-sage)",
    border: "rgba(59,109,59,0.55)",
  },
  failed: {
    bg: "rgba(196,66,10,0.18)",
    fg: "var(--tx-rust-light)",
    border: "rgba(196,66,10,0.65)",
  },
  pending: {
    bg: "rgba(250,247,242,0.04)",
    fg: "rgba(250,247,242,0.55)",
    border: "rgba(250,247,242,0.12)",
  },
  replan: {
    bg: "rgba(212,139,16,0.16)",
    fg: "var(--tx-gold)",
    border: "rgba(212,139,16,0.5)",
  },
};

// Per-agent tone palette for Flow-tab color-coding (PR #68 step_done.agent).
// Mapping per the brief:
//   orchestrator → tx-navy   (neutral; raw tool calls)
//   support      → tx-gold   (clarifier / meta — the gold thread)
//   data_analyst → tx-sky    (data, info)
//   reporter     → tx-rust   (CTA, output, "the published thing")
// `accent` is a Tailwind border-l-* class; `badge` is a Tailwind text-* class
// for the tiny mono badge next to the step number; `dot` is a CSS-var color
// for the legend dot. Unknown agents collapse to orchestrator.
type AgentTone = { accent: string; badge: string; dot: string; label: string };
const AGENT_TONES: Record<string, AgentTone> = {
  orchestrator: {
    accent: "border-l-tx-navy",
    badge: "text-[var(--ds-text)]",
    dot: "var(--tx-navy)",
    label: "orchestrator",
  },
  support: {
    accent: "border-l-tx-gold",
    badge: "text-tx-gold",
    dot: "var(--tx-gold)",
    label: "support",
  },
  data_analyst: {
    accent: "border-l-tx-sky",
    badge: "text-tx-sky",
    dot: "var(--tx-sky)",
    label: "data_analyst",
  },
  reporter: {
    accent: "border-l-tx-rust",
    badge: "text-tx-rust-light",
    dot: "var(--tx-rust)",
    label: "reporter",
  },
};

function agentTone(agent?: string): AgentTone {
  if (!agent) return AGENT_TONES.orchestrator;
  return AGENT_TONES[agent] ?? AGENT_TONES.orchestrator;
}

// Order for the legend row — matches narrative flow: orchestrator drives,
// delegates to support / data_analyst, then reporter publishes.
const AGENT_LEGEND: Array<keyof typeof AGENT_TONES> = [
  "orchestrator",
  "support",
  "data_analyst",
  "reporter",
];

export function AgentSidebar(props: Props) {
  // Default to the Status tab — gives the user an at-a-glance "what's
  // happening right now" view on first paint. DAG / Steps / Telemetry are
  // one click away.
  const [tab, setTab] = useState<Tab>("status");
  const [selectedDagNode, setSelectedDagNode] = useState<DagNodeSelection | null>(null);

  return (
    <aside
      className="flex h-[min(760px,calc(100vh-96px))] min-h-[520px] flex-col overflow-hidden rounded-md border border-white/10 text-tx-cream shadow-sm"
      style={{
        background: "var(--tx-navy-dark)",
        backgroundImage:
          "radial-gradient(circle at 80% 10%, rgba(58,127,190,0.14) 0%, transparent 55%), radial-gradient(circle at 10% 90%, rgba(196,66,10,0.10) 0%, transparent 50%)",
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.18em] text-tx-gold">
            How TXLookup answered
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-tx-cream/70">
            Follow the plan, data calls, checks, and source citations behind the result.
          </p>
        </div>

        {/* Tab bar — gold underline on active, mono labels */}
        <div role="tablist" className="flex border-b border-white/10">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`flex-1 border-b-2 px-3 py-3 font-mono text-[13px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? "border-tx-gold text-tx-cream"
                    : "border-transparent text-[var(--ds-text-mute)] hover:text-tx-cream"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "status" && <StatusTab {...props} />}
          {tab === "dag" && (
            <AgentDAG
              events={props.dagEvents}
              selectedTs={selectedDagNode?.ts ?? null}
              onSelectNode={(node) => {
                setSelectedDagNode(node);
                setTab("telemetry");
              }}
            />
          )}
          {tab === "steps" && <ExecutionTab steps={props.steps} replans={props.replans} />}
          {tab === "telemetry" && (
            <TelemetryTab
              events={props.events}
              startedAt={props.startedAt}
              selectedDagNode={selectedDagNode}
              onClearSelection={() => setSelectedDagNode(null)}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

function StatusTab({
  status,
  phase,
  currentStep,
  totalSteps,
  currentTool,
  durationMs,
  usageTotal,
  replans,
  citationCount,
  steps,
}: Props) {
  const completed = steps.filter((s) => s.status === "completed").length;
  const failed = steps.filter((s) => s.status === "failed").length;

  const phaseLine = (() => {
    switch (phase) {
      case "reasoning":
        return "Reading the question";
      case "planning":
        return "Planning the tool sequence";
      case "executing":
        return currentTool
          ? `Step ${currentStep}/${totalSteps} · ${currentTool}`
          : `Running step ${currentStep}/${totalSteps}`;
      case "replanning":
        return "Self-correcting after a failure";
      case "completing":
        return "Synthesizing the answer";
      case "done":
        return "Answer ready, citation attached";
      case "error":
        return "Run failed — check telemetry";
      default:
        return "Idle";
    }
  })();

  const dot =
    status === "running"
      ? "var(--tx-gold)"
      : status === "done"
        ? "var(--tx-sage)"
        : status === "error"
          ? "var(--tx-rust)"
          : "rgba(250,247,242,0.45)";

  const phaseLabel = (() => {
    if (status === "running") return "In flight";
    if (status === "done") return "Complete";
    if (status === "error") return "Error";
    return "Idle";
  })();

  return (
    <div className="px-5 py-5">
      <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.18em] text-tx-gold">
        Agent status
      </p>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status === "running" ? "animate-pulse" : ""
          }`}
          style={{ backgroundColor: dot }}
        />
        <p className="text-base font-medium text-tx-cream">{phaseLabel}</p>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-tx-cream/70">{phaseLine}</p>
      {status === "running" && totalSteps > 0 && (
        <div
          className="mt-3 h-1 w-full overflow-hidden rounded-full"
          style={{ background: "rgba(250,247,242,0.10)" }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              background: "var(--tx-gold)",
              width: `${Math.min(100, Math.round(((currentStep + (phase === "completing" ? 1 : 0)) / Math.max(totalSteps, 1)) * 100))}%`,
            }}
          />
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Tile
          label="Latency"
          value={
            durationMs !== null
              ? `${(durationMs / 1000).toFixed(1)}s`
              : status === "running"
                ? "—"
                : "—"
          }
        />
        <Tile
          label="Tokens"
          value={usageTotal ? usageTotal.total.toLocaleString() : "—"}
        />
        <Tile label="Steps" value={`${completed}${failed ? ` · ${failed} failed` : ""}`} />
        <Tile label="Self-corrections" value={replans.length.toString()} />
      </div>

      <div
        className="mt-5 rounded-[10px] px-4 py-3"
        style={{
          background: "rgba(250,247,242,0.04)",
          border: "0.5px solid rgba(250,247,242,0.12)",
        }}
      >
        <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.18em] text-tx-cream/45">
          Reachability
        </p>
        <ul className="mt-2 space-y-1 font-mono text-[13px] text-tx-cream/70">
          <li>
            <span className="text-tx-sage">●</span> Codex reachable
          </li>
          <li>
            <span className="text-tx-sage">●</span> Socrata reachable
          </li>
          <li>
            <span className="text-tx-sage">●</span> {citationCount} primary source
            {citationCount === 1 ? "" : "s"} cited
          </li>
        </ul>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[10px] px-3 py-3"
      style={{
        background: "rgba(250,247,242,0.04)",
        border: "0.5px solid rgba(250,247,242,0.12)",
      }}
    >
      <p className="font-mono text-[13px] uppercase tracking-wider text-tx-cream/45">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-tx-cream">
        {value}
      </p>
    </div>
  );
}

function FlowTab({
  steps,
  replans,
}: {
  steps: SidebarStep[];
  replans: SidebarReplan[];
}) {
  if (steps.length === 0) {
    return (
      <div className="px-5 py-12 text-center font-mono text-[13px] text-[var(--ds-text-mute)]">
        Waiting for plan…
      </div>
    );
  }
  const replanIndex = new Set(replans.map((r) => r.failedStep));
  return (
    <div className="px-5 py-5">
      <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.18em] text-tx-gold">
        Reasoning trace
      </p>

      {/* Agent-color legend — one-line key for the per-step accent + badge.
          Mirrors PR #68's responsible-agent attribution so users can read the
          visual code at a glance. IBM Plex Mono, muted labels per BRAND.md. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {AGENT_LEGEND.map((name) => {
          const tone = AGENT_TONES[name];
          return (
            <span key={name} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: tone.dot }}
              />
              <span className="font-mono text-[13px] uppercase tracking-[0.12em] text-tx-muted">
                {tone.label}
              </span>
            </span>
          );
        })}
      </div>

      <ol className="mt-4 space-y-0">
        {steps.map((s, i) => {
          const replan = replanIndex.has(s.step);
          const colors =
            s.status === "completed"
              ? PILL_COLORS.completed
              : s.status === "failed"
                ? PILL_COLORS.failed
                : s.fromReplan
                  ? PILL_COLORS.replan
                  : PILL_COLORS.pending;
          const tone = agentTone(s.agent);
          const isLast = i === steps.length - 1;
          return (
            <li key={s.step} className="relative pl-8 pb-4">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[11px] top-5 h-full w-px"
                  style={{ background: "rgba(250,247,242,0.15)" }}
                />
              )}
              <span
                aria-hidden
                className="absolute left-[6px] top-1.5 h-3 w-3 rounded-full border-2"
                style={{
                  borderColor: colors.border,
                  background: "var(--tx-navy-dark)",
                }}
              />
              {/* Card — left edge accent reflects the responsible agent;
                  status border + bg still reflect step pass/fail/pending. */}
              <div
                className={`rounded-[10px] border-l-4 px-3 py-2 ${tone.accent}`}
                style={{ borderColor: colors.border, borderWidth: "0.5px", borderStyle: "solid", borderLeftWidth: "4px", backgroundColor: colors.bg }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-[13px] tabular-nums text-[var(--ds-text-mute)]">
                      {String(s.step).padStart(2, "0")}
                    </span>
                    {/* Agent badge — colored mono tag attributing this step
                        to its responsible agent (orchestrator default). */}
                    <span
                      className={`font-mono text-[13px] uppercase tracking-[0.12em] ${tone.badge}`}
                    >
                      {tone.label}
                    </span>
                    <span className="truncate font-mono text-[13px] font-semibold text-tx-cream">
                      {s.tool}
                    </span>
                  </div>
                  <span
                    className="font-mono text-[13px] uppercase tracking-wider"
                    style={{ color: colors.fg }}
                  >
                    {s.status}
                    {typeof s.durationMs === "number" && s.status !== "pending" && (
                      <span className="ml-1.5 normal-case tracking-normal text-[var(--ds-text-mute)]">
                        {s.durationMs}ms
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {replan && (
                <div
                  className="mt-1 ml-2 rounded-sm px-2 py-1 font-mono text-[13px]"
                  style={{
                    borderLeft: "2px solid var(--tx-gold)",
                    background: "rgba(212,139,16,0.12)",
                    color: "var(--tx-gold)",
                  }}
                >
                  ↳ REPLAN · self-correction
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ExecutionTab({
  steps,
  replans,
}: {
  steps: SidebarStep[];
  replans: SidebarReplan[];
}) {
  if (steps.length === 0) {
    return (
      <div className="px-5 py-12 text-center font-mono text-[13px] text-[var(--ds-text-mute)]">
        No steps yet.
      </div>
    );
  }
  const replanByStep = new Map(replans.map((r) => [r.failedStep, r]));
  return (
    <div className="px-5 py-5 space-y-2">
      <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.18em] text-tx-gold">
        Execution
      </p>
      <ol className="space-y-2">
        {steps.map((s) => {
          const colors =
            s.status === "completed"
              ? PILL_COLORS.completed
              : s.status === "failed"
                ? PILL_COLORS.failed
                : s.fromReplan
                  ? PILL_COLORS.replan
                  : PILL_COLORS.pending;
          const rp = replanByStep.get(s.step);
          const isDoomLoop = rp?.reason === "doom_loop";
          return (
            <li key={s.step}>
              <div
                className="rounded-[10px] px-3 py-2"
                style={{
                  background: "rgba(250,247,242,0.04)",
                  border: "0.5px solid rgba(250,247,242,0.12)",
                }}
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono text-[13px] tabular-nums text-[var(--ds-text-mute)]">
                    {String(s.step).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[13px] font-semibold text-tx-cream">
                    {s.tool}
                  </span>
                  {s.fromReplan && (
                    <span
                      className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em]"
                      style={{
                        background: "var(--tx-gold)",
                        color: "var(--tx-navy-dark)",
                      }}
                    >
                      Replan
                    </span>
                  )}
                  <span
                    className="ml-auto rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider"
                    style={{
                      color: colors.fg,
                      backgroundColor: colors.bg,
                      border: `0.5px solid ${colors.border}`,
                    }}
                  >
                    {s.status}
                  </span>
                </div>
                {typeof s.durationMs === "number" && s.status !== "pending" && (
                  <p className="mt-1 font-mono text-[13px] text-[var(--ds-text-mute)]">
                    {s.durationMs}ms
                  </p>
                )}
                {s.error && (
                  <p className="mt-1 font-mono text-[13px] text-tx-rust-light">↳ {s.error}</p>
                )}
              </div>
              {rp && rp.diagnosis && (
                <div
                  className="mt-1 ml-3 rounded-sm px-2 py-1.5"
                  style={{
                    borderLeft: `2px solid ${
                      isDoomLoop ? "var(--tx-rust)" : "var(--tx-gold)"
                    }`,
                    background: isDoomLoop
                      ? "rgba(196,66,10,0.14)"
                      : "rgba(212,139,16,0.12)",
                  }}
                >
                  <p
                    className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em]"
                    style={{
                      color: isDoomLoop ? "var(--tx-rust-light)" : "var(--tx-gold)",
                    }}
                  >
                    Autonomous replan
                    {isDoomLoop && " · doom-loop"}
                  </p>
                  <p
                    className="mt-0.5 text-[13px]"
                    style={{
                      color: isDoomLoop ? "var(--tx-rust-light)" : "var(--tx-cream)",
                    }}
                  >
                    {rp.diagnosis}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TelemetryTab({
  events,
  startedAt,
  selectedDagNode,
  onClearSelection,
}: {
  events: ObsEvent[];
  startedAt: number | null;
  selectedDagNode: DagNodeSelection | null;
  onClearSelection: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<"all" | "codex" | "socrata" | "errors">("all");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  useEffect(() => {
    if (!selectedDagNode) return;
    setFilter("all");
    window.setTimeout(() => {
      document
        .getElementById(`telemetry-event-${selectedDagNode.ts}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);
  }, [selectedDagNode]);

  const filtered = events.filter((e) => {
    if (filter === "all") return true;
    if (filter === "errors") return e.level === "error" || e.level === "warn";
    if (filter === "codex")
      return ["reasoning", "planning", "completing", "replanned"].includes(e.phase);
    if (filter === "socrata")
      return ["executing", "step_done"].includes(e.phase) && (e.detail?.includes("austintexas") || true);
    return true;
  });

  const start = startedAt ?? events[0]?.ts ?? Date.now();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-tx-gold">
            Event log
          </p>
          <span className="font-mono text-[13px] text-tx-cream/45">
            {filtered.length} / {events.length}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
        {(["all", "codex", "socrata", "errors"] as const).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-[13px] font-medium capitalize transition-colors ${
                active
                  ? "bg-white/12 text-tx-cream"
                  : "text-tx-cream/45 hover:text-tx-cream"
              }`}
            >
              {f}
            </button>
          );
        })}
        </div>
        {selectedDagNode && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-tx-gold/35 bg-tx-gold/10 px-3 py-2">
            <p className="min-w-0 text-[13px] leading-snug text-tx-cream/80">
              <span className="font-mono uppercase tracking-[0.12em] text-tx-gold">
                From DAG
              </span>{" "}
              <span className="font-medium">{selectedDagNode.displayLabel}</span>
              {selectedDagNode.phase && (
                <span className="text-tx-cream/45"> · {selectedDagNode.phase}</span>
              )}
            </p>
            <button
              type="button"
              onClick={onClearSelection}
              className="shrink-0 font-mono text-[13px] uppercase tracking-[0.12em] text-tx-cream/45 transition-colors hover:text-tx-cream"
            >
              Clear
            </button>
          </div>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 leading-relaxed">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-tx-cream/45">No events yet.</p>
        ) : (
          <ol className="space-y-3">
            {filtered.map((e, i) => {
              const selected = selectedDagNode?.ts === e.ts;
              return (
              <li
                key={i}
                id={`telemetry-event-${e.ts}`}
                className={`rounded-md border p-3 transition-colors ${
                  selected
                    ? "border-tx-gold/70 bg-tx-gold/12 shadow-[0_0_0_1px_rgba(212,139,16,0.18)]"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className="text-[13px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: levelColor(e.level) }}
                  >
                    {e.phase.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-tx-cream/45">
                    {fmtClock(e.ts, start)}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-snug text-tx-cream">
                  {e.message}
                </p>
                {e.detail && (
                  <details className="mt-2 group">
                    <summary className="cursor-pointer font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-tx-cream/45 transition-colors hover:text-tx-cream">
                      Details
                    </summary>
                    <pre className="mt-2 max-h-32 overflow-x-auto whitespace-pre-wrap break-words rounded bg-black/35 px-2.5 py-2 font-mono text-[11.5px] leading-relaxed text-tx-cream/70">
                      {e.detail}
                    </pre>
                  </details>
                )}
              </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function fmtClock(ts: number, start: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  const since = ((ts - start) / 1000).toFixed(2);
  return `${hh}:${mm}:${ss}.${ms} +${since}s`;
}

// Level → CSS-var color. Brand-mapped: ok=sage, info=sky, warn=gold, error=rust.
function levelColor(level: string): string {
  if (level === "ok") return "var(--tx-sage)";
  if (level === "warn") return "var(--tx-gold)";
  if (level === "error") return "var(--tx-rust-light)";
  return "var(--tx-sky)";
}
