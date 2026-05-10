"use client";

// AgentRunner — the brain of the /q observatory page. Streams Server-Sent
// Events from /api/agent and renders the answer column on the left + the
// observatory sidebar on the right. Visual chrome is brand-faithful per
// BRAND.md (brand-guide/BRAND.md): tx-cream surfaces, tx-navy hero, tx-rust
// CTAs, tx-gold accents, DM Serif Display headlines, IBM Plex Mono for
// queries / dataset IDs / errors. Functional logic (SSE handling, state
// machine, prop shapes) is byte-identical to the pre-restyle version.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  trackAgentDone,
  trackAgentError,
  trackAgentStart,
} from "../lib/analytics-events";
import { ObsEvent } from "./AgentObservatory";
import { AgentSidebar } from "./AgentSidebar";
import type { DagEvent } from "./AgentDAG";
import { SupportChips, type SupportResult } from "./components/SupportChips";
import {
  AnalystFindings,
  type AnalystResult,
} from "./components/AnalystFindings";
import {
  ReporterComposition,
  type ReporterResult,
} from "./components/ReporterComposition";

type Citation = {
  portal: string;
  portal_host: string;
  dataset_name: string;
  dataset_id: string;
  url: string;
  api_url: string;
};

type StepLog = {
  step: number;
  tool: string;
  args: unknown;
  rationale?: string;
  status: "pending" | "completed" | "failed";
  preview?: string;
  error?: string | null;
  fromReplan?: boolean;
  durationMs?: number;
  // Responsible agent for this step (PR #68 SSE step_done.agent):
  // "orchestrator" | "support" | "data_analyst" | "reporter".
  agent?: string;
  // Full structured result envelope from delegate_to specialists. Carried
  // on the `result_json` field of step_done; used by SupportChips /
  // AnalystFindings / ReporterComposition surfaces.
  resultPayload?: unknown;
};

type ReplanLog = {
  failedStep: number;
  failedTool: string;
  error: string | null;
  diagnosis?: string;
  thinking?: string;
  reason?: "step_failed" | "doom_loop";
};

type AgentState = {
  phase:
    | "idle"
    | "reasoning"
    | "planning"
    | "executing"
    | "replanning"
    | "completing"
    | "done"
    | "error";
  totalSteps: number;
  currentStep: number;
  thinking: string | null;
  steps: StepLog[];
  replans: ReplanLog[];
  answer: string | null;
  citation: Citation | null;
  artifacts: string[];
  error: string | null;
  events: ObsEvent[];
  // Issue #90 — raw SSE events fed to the DAG visualization. Carries the
  // structured fields (score, branches, source) the obs-event mapping drops.
  dagEvents: DagEvent[];
  startedAt: number | null;
  usageTotal: TokenUsage | null;
  durationMs: number | null;
};

const initial: AgentState = {
  phase: "idle",
  totalSteps: 4,
  currentStep: 0,
  thinking: null,
  steps: [],
  replans: [],
  answer: null,
  citation: null,
  artifacts: [],
  error: null,
  events: [],
  dagEvents: [],
  startedAt: null,
  usageTotal: null,
  durationMs: null,
};

function parseSseLine(line: string): unknown | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch {
    return null;
  }
}

type TokenUsage = { prompt: number; completion: number; total: number };

type SseEvent = {
  phase:
    | "reasoning"
    | "planning"
    | "executing"
    | "step_done"
    | "doom_loop"
    | "replanning"
    | "replanned"
    | "completing"
    | "done"
    | "error"
    // Issue #90 — orchestrator + critic + parallel + cache-source events.
    | "critique"
    | "revising"
    | "parallel_dispatch"
    | "parallel_join"
    | "delegate_start"
    | "delegate_done"
    | "tool_source";
  // Issue #90 — extra fields for the new event kinds. All optional so older
  // streams parse cleanly.
  target?: "plan" | "answer";
  score?: number;
  approve?: boolean;
  issues?: string[];
  branches?: Array<{ id: string; tool: string; args: unknown }>;
  branch_ids?: string[];
  results_count?: number;
  input_summary?: string;
  output_summary?: string;
  source?: "cache" | "live" | "cache-fallback";
  tool_source?: "cache" | "live" | "cache-fallback";
  message?: string;
  thinking?: string;
  diagnosis?: string;
  plan?: {
    intent?: { thinking?: string };
    steps?: { tool: string; args: unknown; rationale?: string }[];
    diagnosis?: string;
  };
  step?: number;
  total?: number;
  tool?: string;
  args?: unknown;
  rationale?: string;
  status?: "completed" | "failed";
  preview?: string;
  error?: string | null;
  failedStep?: number;
  failedTool?: string;
  answer?: string;
  citation?: Citation | null;
  artifacts?: string[];
  duration_ms?: number;
  usage?: TokenUsage;
  usage_total?: TokenUsage;
  kind?: "identical" | "sequence";
  detail?: string;
  reason?: "step_failed" | "doom_loop";
  // Responsible agent on `step_done` (PR #68 / issue #67) — drives both
  // Flow-tab color coding (AgentSidebar) and the per-specialist render
  // branches (SupportChips / AnalystFindings / ReporterComposition).
  agent?: string;
  // Full specialist envelope on `step_done` for delegate_to steps. The
  // 240-char `preview` truncates mid-payload for reporter, so the route
  // ships the whole result here for the UI's render branches.
  result_json?: unknown;
};

function eventForObservatory(ev: SseEvent): ObsEvent | null {
  const ts = Date.now();
  switch (ev.phase) {
    case "reasoning":
      return {
        ts,
        phase: "reasoning",
        level: "info",
        message: "Codex parsing the question",
        detail: ev.message,
      };
    case "planning":
      return {
        ts,
        phase: "planning",
        level: "info",
        message: `Codex returned plan with ${ev.plan?.steps?.length ?? 0} step(s)${
          ev.usage ? ` · ${ev.usage.total} tok` : ""
        }`,
        detail: ev.plan?.intent?.thinking
          ? `intent.thinking: ${ev.plan.intent.thinking}`
          : undefined,
      };
    case "executing":
      return {
        ts,
        phase: "executing",
        level: "info",
        message: `Step ${ev.step}/${ev.total} → ${ev.tool}`,
        detail:
          (ev.rationale ? `rationale: ${ev.rationale}\n` : "") +
          `args: ${JSON.stringify(ev.args)}`,
      };
    case "step_done":
      return {
        ts,
        phase: "step_done",
        level: ev.status === "completed" ? "ok" : "error",
        message: `Step ${ev.step} ${ev.status}${
          typeof ev.duration_ms === "number" ? ` · ${ev.duration_ms}ms` : ""
        }`,
        detail: ev.error
          ? `error: ${ev.error}`
          : ev.preview
            ? `preview: ${ev.preview}`
            : undefined,
      };
    case "doom_loop":
      return {
        ts,
        phase: "doom_loop",
        level: "warn",
        message: `Doom-loop caught — ${ev.kind} pattern at step ${ev.step}`,
        detail: ev.detail,
      };
    case "replanning":
      return {
        ts,
        phase: "replanning",
        level: "warn",
        message: `Replanning — step ${ev.failedStep} (${ev.failedTool}) failed`,
        detail: ev.error ?? undefined,
      };
    case "replanned":
      return {
        ts,
        phase: "replanned",
        level: "warn",
        message: `New plan after diagnosis (${ev.plan?.steps?.length ?? 0} step(s))${
          ev.usage ? ` · ${ev.usage.total} tok` : ""
        }`,
        detail:
          (ev.diagnosis ? `diagnosis: ${ev.diagnosis}\n` : "") +
          (ev.plan?.intent?.thinking
            ? `intent.thinking: ${ev.plan.intent.thinking}`
            : ""),
      };
    case "completing":
      return {
        ts,
        phase: "completing",
        level: "info",
        message: "Codex synthesizing the answer",
      };
    case "done": {
      const tot = ev.usage_total;
      const dur = typeof ev.duration_ms === "number" ? ev.duration_ms : null;
      const summary = [
        dur !== null ? `${(dur / 1000).toFixed(1)}s` : null,
        tot ? `${tot.total} tok` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        ts,
        phase: "done",
        level: "ok",
        message: summary ? `Answer ready · ${summary}` : "Answer ready",
        detail: ev.answer ? `answer: ${ev.answer.slice(0, 200)}` : undefined,
      };
    }
    case "error":
      return {
        ts,
        phase: "error",
        level: "error",
        message: "Agent error",
        detail: ev.error ?? undefined,
      };
    // Issue #90 — surface the new event kinds in the telemetry log too, so
    // they're not invisible outside the DAG tab.
    case "critique":
      return {
        ts,
        phase: "critique",
        level: ev.approve ? "ok" : "warn",
        message: `Critic on ${ev.target} → score ${typeof ev.score === "number" ? ev.score.toFixed(2) : "?"} (${ev.approve ? "approve" : "revise"})`,
        detail: ev.issues?.length ? ev.issues.join("\n") : undefined,
      };
    case "revising":
      return {
        ts,
        phase: "revising",
        level: "warn",
        message: `Revising ${ev.target} after critic feedback`,
        detail: ev.error ?? undefined,
      };
    case "parallel_dispatch":
      return {
        ts,
        phase: "parallel_dispatch",
        level: "info",
        message: `Parallel fan-out · ${ev.branches?.length ?? 0} branches`,
        detail: ev.branches?.map((b) => `${b.id}: ${b.tool}`).join("\n"),
      };
    case "parallel_join":
      return {
        ts,
        phase: "parallel_join",
        level: "info",
        message: `Parallel join · ${ev.results_count ?? 0} results`,
      };
    case "delegate_start":
      return {
        ts,
        phase: "delegate_start",
        level: "info",
        message: `Delegating → ${ev.agent}`,
        detail: ev.input_summary,
      };
    case "delegate_done":
      return {
        ts,
        phase: "delegate_done",
        level: ev.status === "completed" ? "ok" : "warn",
        message: `Delegate ${ev.agent} → ${ev.status}`,
        detail: ev.output_summary,
      };
    case "tool_source":
      return {
        ts,
        phase: "tool_source",
        level: "info",
        message: `Source → ${ev.source}`,
      };
    default:
      return null;
  }
}

export function AgentRunner({
  query,
  dataset,
  mode,
}: {
  query: string;
  dataset?: string;
  mode?: "live" | "fallback" | "demo";
}) {
  const [state, setState] = useState<AgentState>(initial);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (!query.trim()) return;

    const startedAt = Date.now();
    trackAgentStart(query);
    setState({
      ...initial,
      phase: "reasoning",
      startedAt,
      events: [
        {
          ts: startedAt,
          phase: "reasoning",
          level: "info",
          message: "POST /api/agent",
          detail: `query: ${query}`,
        },
      ],
      dagEvents: [],
    });

    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            dataset,
            fallback: mode === "fallback",
            demo: mode === "demo",
          }),
          signal: ctrl.signal,
        });
        if (!r.ok || !r.body) {
          setState((s) => ({
            ...s,
            phase: "error",
            error: `HTTP ${r.status}`,
            events: [
              ...s.events,
              {
                ts: Date.now(),
                phase: "error",
                level: "error",
                message: `Endpoint returned HTTP ${r.status}`,
              },
            ],
          }));
          return;
        }
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let replanCount = 0;
        while (!cancelled.current) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n\n");
          buf = lines.pop() ?? "";
          for (const block of lines) {
            for (const line of block.split("\n")) {
              const ev = parseSseLine(line.trim()) as SseEvent | null;
              if (!ev) continue;
              if (ev.phase === "replanning") replanCount += 1;
              if (ev.phase === "done") {
                trackAgentDone(
                  typeof ev.duration_ms === "number" ? ev.duration_ms : 0,
                  replanCount,
                  ev.usage_total?.total ?? 0,
                );
              } else if (ev.phase === "error") {
                trackAgentError(ev.error ?? "unknown");
              }
              const obs = eventForObservatory(ev);
              setState((s) => {
                const eventsNext = obs ? [...s.events, obs] : s.events;
                // Issue #90 — every raw SSE event feeds the DAG's
                // event-sourced state machine.
                const dagNext: DagEvent[] = [
                  ...s.dagEvents,
                  { ...ev, ts: Date.now() } as DagEvent,
                ];
                switch (ev.phase) {
                  case "reasoning":
                    return { ...s, phase: "reasoning", events: eventsNext, dagEvents: dagNext };
                  case "planning":
                    return {
                      ...s,
                      phase: "planning",
                      thinking: ev.thinking ?? ev.plan?.intent?.thinking ?? s.thinking,
                      totalSteps: ev.plan?.steps?.length ?? s.totalSteps,
                      steps: (ev.plan?.steps ?? []).map((p, i) => ({
                        step: i + 1,
                        tool: p.tool,
                        args: p.args,
                        rationale: p.rationale,
                        status: "pending" as const,
                      })),
                      events: eventsNext, dagEvents: dagNext,
                    };
                  case "executing":
                    return {
                      ...s,
                      phase: "executing",
                      currentStep: ev.step ?? s.currentStep,
                      totalSteps: ev.total ?? s.totalSteps,
                      events: eventsNext, dagEvents: dagNext,
                    };
                  case "step_done": {
                    const idx = (ev.step ?? 1) - 1;
                    const next = [...s.steps];
                    if (next[idx]) {
                      next[idx] = {
                        ...next[idx],
                        status: ev.status === "completed" ? "completed" : "failed",
                        preview: ev.preview,
                        error: ev.error,
                        durationMs: ev.duration_ms,
                        // Pipe responsible agent + full specialist envelope
                        // through so AgentSidebar Flow tab can color-code rows
                        // (PR #68) and SupportChips / AnalystFindings /
                        // ReporterComposition can render below the step
                        // (PR #82, issue #67).
                        agent: ev.agent ?? next[idx].agent,
                        resultPayload:
                          ev.result_json !== undefined
                            ? ev.result_json
                            : next[idx].resultPayload,
                      };
                    } else if (idx >= next.length) {
                      // Failure-fallback path: the route emits a synthetic
                      // step_done past the original plan length when it
                      // hands off to support after exhausting replans.
                      // Materialize a row so SupportChips still renders.
                      next.push({
                        step: idx + 1,
                        tool: "delegate_to",
                        args: {},
                        status: ev.status === "completed" ? "completed" : "failed",
                        preview: ev.preview,
                        error: ev.error,
                        durationMs: ev.duration_ms,
                        agent: ev.agent,
                        resultPayload: ev.result_json,
                      });
                    }
                    return { ...s, steps: next, events: eventsNext, dagEvents: dagNext };
                  }
                  case "doom_loop":
                    // The corrective replan event will follow; just log here.
                    return { ...s, events: eventsNext, dagEvents: dagNext };
                  case "replanning":
                    return {
                      ...s,
                      phase: "replanning",
                      replans: [
                        ...s.replans,
                        {
                          failedStep: ev.failedStep ?? s.currentStep,
                          failedTool: ev.failedTool ?? "",
                          error: ev.error ?? null,
                          reason: ev.reason,
                        },
                      ],
                      events: eventsNext, dagEvents: dagNext,
                    };
                  case "replanned": {
                    // The route rebuilds currentPlan = [...prefix, ...replanSteps]
                    // and resumes at the failed-step index. SSE step_done events
                    // index into THIS rebuilt plan, so the UI must replace the
                    // tail (not append) — otherwise step_done({step: N}) lands
                    // on the original step N instead of the new replan step,
                    // and the displayed tool name no longer matches the running tool.
                    const lastReplan = s.replans[s.replans.length - 1];
                    const failedIdx = (lastReplan?.failedStep ?? s.steps.length) - 1;
                    const newSteps = (ev.plan?.steps ?? []).map((p, i) => ({
                      step: failedIdx + i + 1,
                      tool: p.tool,
                      args: p.args,
                      rationale: p.rationale,
                      status: "pending" as const,
                      fromReplan: true,
                    }));
                    const replans = [...s.replans];
                    if (replans.length > 0) {
                      const last = replans[replans.length - 1];
                      replans[replans.length - 1] = {
                        ...last,
                        diagnosis: ev.diagnosis ?? ev.plan?.diagnosis,
                        thinking: ev.thinking ?? ev.plan?.intent?.thinking,
                      };
                    }
                    return {
                      ...s,
                      phase: "executing",
                      steps: [...s.steps.slice(0, failedIdx), ...newSteps],
                      totalSteps: failedIdx + newSteps.length,
                      replans,
                      events: eventsNext, dagEvents: dagNext,
                    };
                  }
                  case "completing":
                    return { ...s, phase: "completing", events: eventsNext, dagEvents: dagNext };
                  case "done":
                    return {
                      ...s,
                      phase: "done",
                      answer: ev.answer ?? null,
                      citation: ev.citation ?? null,
                      artifacts: ev.artifacts ?? [],
                      usageTotal: ev.usage_total ?? null,
                      durationMs: ev.duration_ms ?? null,
                      events: eventsNext, dagEvents: dagNext,
                    };
                  case "error":
                    return {
                      ...s,
                      phase: "error",
                      error: ev.error ?? "unknown error",
                      events: eventsNext, dagEvents: dagNext,
                    };
                  default:
                    // Issue #90 — even unknown phases (critique, parallel_*,
                    // delegate_*, tool_source) need to land in dagEvents so
                    // the DAG can render them. Telemetry already got obs.
                    return { ...s, events: eventsNext, dagEvents: dagNext };
                }
              });
            }
          }
        }
      } catch (e: unknown) {
        // AbortError is the canonical "this was deliberate" signal — never
        // surface it to the user. Fires when the effect re-runs (Strict
        // Mode in dev, query/dataset prop change, navigation away) and
        // ctrl.abort() propagates through the in-flight fetch.
        if (e instanceof Error && e.name === "AbortError") return;
        if (!cancelled.current) {
          setState((s) => ({
            ...s,
            phase: "error",
            error: e instanceof Error ? e.message : String(e),
            events: [
              ...s.events,
              {
                ts: Date.now(),
                phase: "error",
                level: "error",
                message: "Stream error",
                detail: e instanceof Error ? e.message : String(e),
              },
            ],
          }));
        }
      }
    })();

    return () => {
      cancelled.current = true;
      ctrl.abort();
    };
  }, [query, dataset, mode]);

  const obsStatus =
    state.phase === "idle"
      ? "idle"
      : state.phase === "done"
        ? "done"
        : state.phase === "error"
          ? "error"
          : "running";

  const phaseDisplayLabel = (() => {
    if (state.phase === "done") return "Verified";
    if (state.phase === "error") return "Error";
    if (state.phase === "idle") return "Awaiting";
    return "In progress";
  })();
  // Status dot color. Good = done, bad = error, warn = running, mute = idle.
  const phaseDot = (() => {
    if (state.phase === "done") return "var(--ds-good)";
    if (state.phase === "error") return "var(--ds-bad)";
    if (state.phase === "idle") return "var(--ds-text-mute)";
    return "var(--ds-warn)";
  })();
  const currentStepObj = state.steps[state.currentStep - 1];
  const currentTool = currentStepObj?.tool ?? null;
  const sourcesCount =
    state.artifacts.length > 0
      ? new Set(state.artifacts.map((a) => a.split("?")[0])).size
      : state.citation
        ? 1
        : 0;

  // Pull standout numbers out of the answer ("by the numbers" pull-out).
  const numbers = state.answer ? extractKeyNumbers(state.answer) : [];

  // Auto-suggest related-angle questions based on which dataset answered this one.
  const relatedAngles = state.citation
    ? buildRelatedAngles(state.citation.dataset_id, query)
    : [];

  // PR #68 / issue #67 — multi-agent surfaces. Pull the reporter composition
  // out of the latest reporter step so the answer card can render the
  // composed article instead of the plain synthesizer answer.
  const reporterStep = [...state.steps]
    .reverse()
    .find((s) => s.agent === "reporter" && isReporterResult(s.resultPayload));
  const reporterPayload = reporterStep?.resultPayload as
    | ReporterResult
    | undefined;

  // The 4-step "How the agent works" poster used to render here. Removed —
  // the right-column DAG tab is the canonical visualization of the loop, and
  // showing the same 4-step linear story on every search felt naive (the
  // multi-agent reality is non-linear: parallel + critic-revision + scout).

  return (
    <div className="grid md:grid-cols-[1fr_420px]">
      {/* Left column — answer-first body, dark surface */}
      <div className="min-w-0 bg-[var(--ds-bg)]">
        {/* Question recap with live status pill */}
        <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
          <div className="px-6 py-7 md:px-10">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
                {state.phase === "done" ? "Answered" : "Asked"}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    obsStatus === "running" ? "animate-pulse" : ""
                  }`}
                  style={{ backgroundColor: phaseDot }}
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ds-text)]">
                  {phaseDisplayLabel}
                </span>
              </div>
            </div>
            <h2 className="mt-3 max-w-[58ch] text-2xl font-normal leading-tight tracking-tight text-[var(--ds-text)] md:text-[28px]">
              {query}
            </h2>
          </div>
        </section>

        {/* ── Answer card — citation aside, white-on-dark CTA ── */}
        {state.phase === "done" && state.answer ? (
          <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
            <div className="px-6 py-10 md:px-10 md:py-12">
              <div className="grid gap-8 md:grid-cols-12 md:gap-10">
                <div className="md:col-span-8">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
                    Insight
                  </p>
                  {/* When the reporter specialist composed a structured
                      article, render that in place of the plain synthesizer
                      paragraph (PR #68). */}
                  {reporterPayload ? (
                    <div className="mt-3">
                      <ReporterComposition result={reporterPayload} />
                    </div>
                  ) : (
                    <p className="mt-3 max-w-[58ch] text-[28px] font-normal leading-snug tracking-tight text-[var(--ds-text)] md:text-[32px]">
                      {state.answer}
                    </p>
                  )}

                  {/* Action row — primary CTA inverted (white on dark) */}
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    {state.citation && (
                      <Link
                        href={`/datasets/${state.citation.dataset_id}`}
                        className="inline-flex items-center rounded-md bg-[var(--ds-text)] px-5 py-2 font-body text-sm font-bold text-[var(--ds-bg)] hover:opacity-90"
                      >
                        Open dataset →
                      </Link>
                    )}
                    {state.citation?.api_url && (
                      <a
                        href={state.citation.api_url}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-5 py-2 font-body text-sm font-bold text-[var(--ds-text)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
                      >
                        API endpoint →
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(state.answer ?? "");
                        }
                      }}
                      className="inline-flex items-center rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-5 py-2 font-body text-sm font-bold text-[var(--ds-text)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
                    >
                      Copy insight
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          typeof navigator !== "undefined" &&
                          navigator.clipboard &&
                          typeof window !== "undefined"
                        ) {
                          navigator.clipboard.writeText(window.location.href);
                        }
                      }}
                      className="inline-flex items-center rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-5 py-2 font-body text-sm font-bold text-[var(--ds-text)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
                    >
                      Share
                    </button>
                  </div>

                  {/* Meta strip — gold insight badges per BRAND §7 */}
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <MetaChip
                      label="Verified"
                      value={
                        state.durationMs !== null
                          ? `${(state.durationMs / 1000).toFixed(1)}s`
                          : "—"
                      }
                    />
                    {state.usageTotal && (
                      <MetaChip label="Tokens" value={state.usageTotal.total.toLocaleString()} />
                    )}
                    <MetaChip label="Sources" value={`${sourcesCount} cited`} />
                    {state.replans.length > 0 && (
                      <MetaChip
                        label="Self-corrections"
                        value={state.replans.length.toString()}
                      />
                    )}
                  </div>

                  {/* By the numbers — standout figures from the answer */}
                  {numbers.length > 0 && (
                    <div className="mt-8 border-t border-[var(--ds-border)] pt-6">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
                        By the numbers
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                        {numbers.slice(0, 3).map((n, i) => (
                          <div
                            key={i}
                            className="pl-3"
                            style={{ borderLeft: "3px solid var(--ds-warn)" }}
                          >
                            <div className="text-[32px] font-normal leading-none tabular-nums text-[var(--ds-text)]">
                              {n.value}
                            </div>
                            <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-mute)]">
                              {n.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Citation aside — Stitch screen 2 pattern: header + name +
                    dataset id + 3 mini text buttons (VIEW SCHEMA / RAW JSON /
                    DOCS) + a primary OPEN DATASET button. */}
                <aside className="md:col-span-4">
                  {state.citation && (
                    <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
                      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
                        Primary source
                      </p>
                      <p className="mt-3 text-[18px] font-bold leading-tight text-[var(--ds-text)]">
                        {state.citation.dataset_name}
                      </p>
                      <p className="mt-1 text-[13px] text-[var(--ds-text-mute)]">
                        {state.citation.portal}
                      </p>
                      <p className="mt-2 font-mono text-[11px] text-[var(--ds-text-dim)]">
                        {state.citation.dataset_id}
                      </p>

                      <Link
                        href={`/datasets/${state.citation.dataset_id}`}
                        className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-[var(--ds-purple)] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:opacity-90"
                      >
                        Open dataset →
                      </Link>

                      <div className="mt-3 grid grid-cols-3 gap-1 border-t border-[var(--ds-border)] pt-3">
                        <Link
                          href={`/datasets/${state.citation.dataset_id}#schema`}
                          className="rounded-sm border border-[var(--ds-border)] px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-mute)] hover:border-[var(--ds-text-dim)] hover:text-[var(--ds-text)]"
                        >
                          View schema
                        </Link>
                        {state.citation.api_url && (
                          <a
                            href={state.citation.api_url}
                            target="_blank"
                            rel="noopener"
                            className="rounded-sm border border-[var(--ds-border)] px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-mute)] hover:border-[var(--ds-text-dim)] hover:text-[var(--ds-text)]"
                          >
                            Raw JSON
                          </a>
                        )}
                        <a
                          href={`https://${state.citation.portal_host}/d/${state.citation.dataset_id}`}
                          target="_blank"
                          rel="noopener"
                          className="rounded-sm border border-[var(--ds-border)] px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-mute)] hover:border-[var(--ds-text-dim)] hover:text-[var(--ds-text)]"
                        >
                          Docs
                        </a>
                      </div>
                    </div>
                  )}
                </aside>
              </div>

              {/* DEEPER ANALYSIS row — Stitch screen 2 pattern. Comparative
                  follow-ups derived from the citation's dataset.            */}
              {state.citation && (
                <div className="mt-10 border-t border-[var(--ds-border)] pt-7">
                  <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-text-dim)]">
                    Deeper analysis
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { label: "Compare to next zip", q: `Compare ${state.citation.dataset_name.toLowerCase()} between this zip and the next-most-active zip` },
                      { label: "Historical trend", q: `Show ${state.citation.dataset_name.toLowerCase()} trend over the last 24 months by quarter` },
                      { label: "Cross-dataset join", q: `Join ${state.citation.dataset_name.toLowerCase()} with code violations by zip for the same period` },
                      { label: "Top outliers", q: `Top 5 outliers in ${state.citation.dataset_name.toLowerCase()} this year` },
                    ].map((a) => (
                      <Link
                        key={a.label}
                        href={`/q?q=${encodeURIComponent(a.q)}&dataset=${state.citation!.dataset_id}`}
                        className="inline-flex items-center rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-text)] hover:border-[var(--ds-accent)]/50 hover:text-[var(--ds-accent)]"
                      >
                        {a.label} →
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* Reasoning trace + Self-corrections moved to right-column tabs.
            User feedback: 'move this to the right column'. The DAG /
            Execution / Telemetry tabs already render this.
            We keep ONLY the SupportChips inline render below the answer
            card so vague-query clarification chips remain visible.        */}
        {false && state.steps.length > 0 && state.phase !== "error" && (
          <section className="border-b border-tx-ink/10 bg-tx-cream">
            <div className="px-6 py-8 md:px-10 md:py-10">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
                Reasoning trace
              </p>
              <h3 className="mt-2 font-display text-2xl font-normal tracking-tight text-tx-navy">
                Tool sequence the agent ran.
              </h3>
              <ol className="mt-6 space-y-3">
                {state.steps.map((s) => {
                  // Replan-origin steps and doom-loop replans get distinct
                  // accent treatments per the brief.
                  const isFailed = s.status === "failed";
                  const isCompleted = s.status === "completed";
                  const isReplan = s.fromReplan === true;
                  // Map this step's index (1-based) to its corresponding
                  // replan record so we can detect doom-loop replans.
                  const replanForStep = state.replans.find(
                    (r) => r.failedStep === s.step,
                  );
                  const isDoomLoop = replanForStep?.reason === "doom_loop";
                  // Card visual: failed = rust-light bg, replan = gold-light
                  // accent on top, completed = cream + sage tick, pending = cream.
                  const cardBg = isFailed ? "var(--tx-rust-light)" : "var(--tx-cream)";
                  const cardBorder = isFailed
                    ? "var(--tx-rust)"
                    : isReplan
                      ? "var(--tx-gold)"
                      : isCompleted
                        ? "var(--tx-sage)"
                        : "var(--tx-border)";
                  const statusColor = isFailed
                    ? "var(--tx-rust)"
                    : isCompleted
                      ? "var(--tx-sage)"
                      : "var(--tx-muted)";
                  return (
                    <li
                      key={s.step}
                      className="rounded-[10px] p-5"
                      style={{
                        background: cardBg,
                        border: `0.5px solid ${cardBorder}`,
                        borderLeftWidth: isFailed || isReplan ? "3px" : "0.5px",
                        borderLeftColor: cardBorder,
                      }}
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-[11px] font-semibold tabular-nums text-tx-muted">
                          {String(s.step).padStart(2, "0")}
                        </span>
                        <span className="font-mono text-sm font-semibold text-tx-navy">
                          {s.tool}
                        </span>
                        {isReplan && !isDoomLoop && (
                          <span
                            className="rounded-full px-3 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]"
                            style={{
                              background: "var(--tx-gold-light)",
                              color: "var(--tx-gold-dark)",
                              border: "0.5px solid rgba(212,139,16,0.3)",
                            }}
                          >
                            Replan
                          </span>
                        )}
                        {isDoomLoop && (
                          <span className="rounded-full bg-tx-rust px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                            DOOM-LOOP
                          </span>
                        )}
                        <span
                          className="ml-auto font-mono text-[10px] uppercase tracking-wider"
                          style={{ color: statusColor }}
                        >
                          {s.status}
                          {typeof s.durationMs === "number" && s.status !== "pending" && (
                            <span className="ml-2 normal-case tracking-normal text-tx-muted">
                              {s.durationMs}ms
                            </span>
                          )}
                        </span>
                      </div>
                      {s.rationale && (
                        <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-tx-ink/80">
                          {s.rationale}
                        </p>
                      )}
                      {s.error && (
                        <p className="mt-2 font-mono text-xs leading-relaxed text-tx-rust">
                          ↳ {s.error}
                        </p>
                      )}
                      {s.preview && !s.error && (
                        <p className="mt-2 max-w-[68ch] font-mono text-xs leading-relaxed text-tx-muted">
                          {s.preview}
                        </p>
                      )}
                      {/* Multi-agent render branches (PR #68 / issue #67):
                          delegate_to specialists ship their full structured
                          envelope on step_done.result_json. Render the
                          matching surface inline below the step card.
                          Reporter's composition replaces the synthesizer
                          answer up top, so we skip it here. */}
                      {s.agent === "support" &&
                        isSupportResult(s.resultPayload) &&
                        Array.isArray(
                          (s.resultPayload as SupportResult).next_actions,
                        ) &&
                        ((s.resultPayload as SupportResult).next_actions
                          ?.length ?? 0) > 0 && (
                          <SupportChips
                            result={s.resultPayload as SupportResult}
                          />
                        )}
                      {s.agent === "data_analyst" &&
                        isAnalystResult(s.resultPayload) && (
                          <AnalystFindings
                            result={s.resultPayload as AnalystResult}
                          />
                        )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        )}

        {/* Self-corrections moved to right-column DAG / Execution tab. */}
        {false && state.replans.length > 0 && (
          <section className="border-b border-tx-ink/10 bg-tx-cream">
            <div className="px-6 py-8 md:px-10 md:py-10">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-gold-dark">
                Self-corrections
              </p>
              <h3 className="mt-2 font-display text-2xl font-normal tracking-tight text-tx-navy">
                Why the agent <span className="italic text-tx-gold">replanned</span>.
              </h3>
              <ol className="mt-5 space-y-3">
                {state.replans.map((r, i) => {
                  const isDoomLoop = r.reason === "doom_loop";
                  return (
                    <li
                      key={i}
                      className="rounded-[10px] p-5"
                      style={{
                        background: isDoomLoop
                          ? "var(--tx-rust-light)"
                          : "var(--tx-gold-light)",
                        border: `0.5px solid ${
                          isDoomLoop
                            ? "var(--tx-rust)"
                            : "rgba(212,139,16,0.35)"
                        }`,
                      }}
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        {isDoomLoop ? (
                          <span className="rounded-full bg-tx-rust px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                            Doom-loop
                          </span>
                        ) : (
                          <span
                            className="rounded-full px-3 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]"
                            style={{
                              background: "rgba(212,139,16,0.18)",
                              color: "var(--tx-gold-dark)",
                              border: "0.5px solid rgba(212,139,16,0.3)",
                            }}
                          >
                            Replan
                          </span>
                        )}
                        <span className="font-mono text-xs font-semibold text-tx-navy">
                          step {r.failedStep} · {r.failedTool}
                        </span>
                      </div>
                      {r.error && (
                        <p
                          className="mt-2 font-mono text-xs leading-relaxed"
                          style={{
                            color: isDoomLoop
                              ? "var(--tx-rust)"
                              : "var(--tx-gold-dark)",
                          }}
                        >
                          error: {r.error}
                        </p>
                      )}
                      {r.diagnosis && (
                        <p
                          className="mt-2 max-w-[70ch] text-sm italic leading-relaxed"
                          style={{
                            color: isDoomLoop
                              ? "var(--tx-rust)"
                              : "var(--tx-gold-dark)",
                          }}
                        >
                          {r.diagnosis}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        )}

        {/* Related angles — only after a successful answer */}
        {state.phase === "done" && state.answer && relatedAngles.length > 0 && (
          <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
            <div className="px-6 py-8 md:px-10 md:py-10">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
                Related angles
              </p>
              <h3 className="mt-2 text-2xl font-normal tracking-tight text-[var(--ds-text)]">
                Other questions this dataset can answer.
              </h3>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {relatedAngles.map((q) => (
                  <Link
                    key={q}
                    href={`/q?q=${encodeURIComponent(q)}`}
                    className="group flex items-center justify-between gap-3 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-4 py-3 text-sm leading-snug text-[var(--ds-text)] transition-colors hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
                  >
                    <span className="line-clamp-2">{q}</span>
                    <span className="font-mono text-[12px] text-[var(--ds-accent)] opacity-0 transition-opacity group-hover:opacity-100">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Error state ── */}
        {state.phase === "error" && (
          <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
            <div className="px-6 py-10 md:px-10 md:py-12">
              <div
                className="rounded-[10px] p-6 bg-[var(--ds-bg-elev)]"
                style={{
                  border: "0.5px solid var(--ds-bad)",
                  borderLeftWidth: "3px",
                  borderLeftColor: "var(--ds-bad)",
                }}
              >
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-bad)]">
                  Agent error
                </p>
                <h3 className="mt-3 text-2xl font-normal tracking-tight text-[var(--ds-text)] md:text-3xl">
                  The agent <span className="italic text-[var(--ds-bad)]">couldn’t finish</span>.
                </h3>
                <p className="mt-3 max-w-[60ch] font-mono text-sm leading-relaxed text-[var(--ds-text)]/85">
                  {state.error}
                </p>
                <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-[var(--ds-text-mute)]">
                  Try a different question or{" "}
                  <Link href="/" className="text-[var(--ds-accent)] underline hover:text-[var(--ds-warm)]">
                    start over
                  </Link>
                  . Detailed telemetry is in the right panel.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center rounded-md bg-[var(--ds-text)] px-5 py-2 font-body text-sm font-bold text-[var(--ds-bg)] hover:opacity-90"
                >
                  ← Home
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Working state — animated dark skeleton ── */}
        {state.phase !== "done" &&
          state.phase !== "error" &&
          state.phase !== "idle" &&
          state.steps.length === 0 && (
            <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
              <div className="px-6 py-10 md:px-10 md:py-12">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
                  Insight
                </p>
                <div className="mt-4 max-w-[58ch] space-y-3">
                  <div className="h-7 w-[90%] animate-pulse rounded bg-[var(--ds-bg-elev)]" />
                  <div className="h-7 w-[78%] animate-pulse rounded bg-[var(--ds-bg-elev)]" />
                  <div className="h-7 w-[60%] animate-pulse rounded bg-[var(--ds-bg-elev)]" />
                </div>
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ds-text-mute)]">
                  {state.phase === "reasoning" && "Codex parsing the question…"}
                  {state.phase === "planning" && "Building the tool sequence…"}
                  {state.phase === "executing" &&
                    `Step ${state.currentStep}/${state.totalSteps}${currentTool ? ` · ${currentTool}` : ""}…`}
                  {state.phase === "replanning" && "Self-correcting after a failure…"}
                  {state.phase === "completing" && "Synthesizing the answer…"}
                </p>
              </div>
            </section>
          )}
      </div>

      {/* Right column — 5-tab agent sidebar (DAG added in #90) */}
      <AgentSidebar
        events={state.events}
        dagEvents={state.dagEvents}
        steps={state.steps}
        replans={state.replans}
        status={obsStatus}
        phase={state.phase}
        currentStep={state.currentStep}
        totalSteps={state.totalSteps}
        currentTool={currentTool}
        durationMs={state.durationMs}
        usageTotal={state.usageTotal}
        citationCount={sourcesCount}
        startedAt={state.startedAt}
      />
    </div>
  );
}

// Type guards for the multi-agent specialist envelopes (PR #68 / issue #67).
// Each one only requires the minimum shape the matching render branch reads,
// so a partially-malformed payload still routes safely (the render branch's
// own optional-chaining handles missing optional fields).
function isSupportResult(v: unknown): v is SupportResult {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { agent?: unknown }).agent === "support"
  );
}
function isAnalystResult(v: unknown): v is AnalystResult {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { agent?: unknown }).agent === "data_analyst"
  );
}
function isReporterResult(v: unknown): v is ReporterResult {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { agent?: unknown }).agent === "reporter"
  );
}

// Insight badge / meta-chip — dark-system version (elev bg, warn accent).
function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] bg-[var(--ds-bg-elev)] border border-[var(--ds-border)]"
    >
      <span className="text-[var(--ds-text-mute)]">{label}</span>
      <span className="tabular-nums text-[var(--ds-text)]">{value}</span>
    </span>
  );
}

// Pull standout numbers from the answer text ("by the numbers" callout).
// Heuristic — finds raw numbers, percentages, dollar amounts, plus the surrounding
// noun-phrase as a label. Caps at 3 and dedupes by formatted value.
type KeyNumber = { value: string; label: string };
function extractKeyNumbers(text: string): KeyNumber[] {
  const out: KeyNumber[] = [];
  const seen = new Set<string>();
  // Order matters — match richer patterns first.
  const patterns: { re: RegExp; format: (m: RegExpExecArray) => KeyNumber }[] = [
    {
      re: /(\d+(?:\.\d+)?)%\s+([a-z]+(?:\s+[a-z]+){0,3})/gi,
      format: (m) => ({ value: `${m[1]}%`, label: m[2] }),
    },
    {
      re: /\$([\d,]+(?:\.\d+)?[KMB]?)\s*(?:in\s+)?([a-z]+(?:\s+[a-z]+){0,2})?/gi,
      format: (m) => ({ value: `$${m[1]}`, label: (m[2] ?? "spend").trim() }),
    },
    {
      re: /([\d,]{2,}(?:\.\d+)?)\s+([a-z]+(?:\s+[a-z]+){0,2})/gi,
      format: (m) => ({ value: m[1], label: m[2] }),
    },
  ];
  for (const { re, format } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null && out.length < 3) {
      const k = format(match);
      const trimmedLabel = k.label
        .replace(/\b(the|a|an|of|in|by|with|and|or|to|from)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!trimmedLabel || trimmedLabel.length < 3) continue;
      const key = k.value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: k.value, label: trimmedLabel.slice(0, 28) });
    }
    if (out.length >= 3) break;
  }
  return out;
}

// Suggest 3 follow-up questions tied to the dataset that just answered.
// Hard-coded per dataset — the agent can only follow up with what it knows.
function buildRelatedAngles(datasetId: string, _query: string): string[] {
  const map: Record<string, string[]> = {
    "3syk-w9eu": [
      "Which permit types are growing fastest year-over-year?",
      "What's the total construction value approved in 2026 so far?",
      "Show me the busiest contractors by zip this year",
    ],
    "ecmv-9xxi": [
      "Which restaurants have multiple failures this year?",
      "Average inspection score by zip — best and worst 5",
      "Trend in failure rate quarter-over-quarter",
    ],
    "xwdj-i9he": [
      "What's the slowest 311 response category in 2026?",
      "Top 5 complaint types in District 3 this year",
      "Compare 311 volume in flood-prone zips vs the city average",
    ],
    "6wtj-zbtb": [
      "Which violation types are closing fastest?",
      "Repeat violators by address this year",
      "Open violations by department — backlog snapshot",
    ],
  };
  return map[datasetId] ?? [];
}
