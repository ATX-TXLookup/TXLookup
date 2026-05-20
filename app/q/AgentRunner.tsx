"use client";

// AgentRunner — the brain of the /q observatory page. Streams Server-Sent
// Events from /api/agent and renders the answer column on the left + the
// observatory sidebar on the right. Visual chrome uses the --ds-* dark
// design tokens (see app/globals.css). Functional logic (SSE handling,
// state machine, prop shapes) is unchanged from prior versions.

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
  const [showTrace, setShowTrace] = useState(true);
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
        // Use absolute URL via window.location.origin so a basic-auth user:pass
        // in window.location.href doesn't leak into the fetch URL (browser
        // rejects "Request cannot be constructed from a URL that includes credentials").
        const r = await fetch(
          (typeof window !== "undefined" ? window.location.origin : "") + "/api/agent",
          {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            dataset,
            fallback: mode === "fallback",
            demo: mode === "demo",
          }),
          signal: ctrl.signal,
          },
        );
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

  // Miro view link — surfaces only when render_to_miro produced an artifact.
  const miroLink = state.artifacts.find((a) => a.includes("miro.com")) ?? null;
  const miroOpenLink = miroLink ? buildMiroBoardUrl(miroLink) : null;
  const miroEmbedLink = miroLink ? buildMiroEmbedUrl(miroLink) : null;

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

  // Latest event message — used by the working-state caption to give the
  // user a live "what's the agent doing right now" line under the spinner.
  const latestEvent =
    state.events.length > 0 ? state.events[state.events.length - 1] : null;

  return (
    <div className="bg-[var(--ds-bg-deep)] px-3 py-4 md:px-5 md:py-6">
      <div className="mx-auto grid max-w-[1340px] gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_388px]">
      {/* Left column — answer-first report body */}
      <div className="min-w-0 overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] shadow-sm">
        {/* Question recap with live status pill */}
        <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
          <div className="px-5 py-5 md:px-8 md:py-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
                User question
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTrace((v) => !v)}
                  className="hidden rounded-md border border-[var(--ds-border)] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ds-text-mute)] transition-colors hover:border-[var(--ds-accent)] hover:text-[var(--ds-text)] lg:inline-flex"
                >
                  {showTrace ? "Hide trace" : "Show trace"}
                </button>
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
            <h2 className="mt-3 max-w-[58ch] text-[24px] font-normal leading-tight tracking-tight text-[var(--ds-text)] md:text-[28px]">
              {query}
            </h2>
          </div>
        </section>

        {/* ── Answer card — citation aside, white-on-dark CTA ── */}
        {state.phase === "done" && state.answer ? (
          <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
            <div className="px-5 py-7 md:px-8 md:py-8">
              <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
                <div className="lg:col-span-12">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
                      Insight
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Copy insight"
                        title="Copy insight"
                        onClick={() => {
                          if (typeof navigator !== "undefined" && navigator.clipboard) {
                            navigator.clipboard.writeText(state.answer ?? "");
                          }
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] text-[var(--ds-text-mute)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <rect x="9" y="9" width="11" height="11" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Share link"
                        title="Share link"
                        onClick={() => {
                          if (
                            typeof navigator !== "undefined" &&
                            navigator.clipboard &&
                            typeof window !== "undefined"
                          ) {
                            navigator.clipboard.writeText(window.location.href);
                          }
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] text-[var(--ds-text-mute)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <path d="m8.6 13.5 6.8 4" />
                          <path d="m15.4 6.5-6.8 4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* When the reporter specialist composed a structured
                      article, render that in place of the plain synthesizer
                      paragraph (PR #68). */}
                  {reporterPayload ? (
                    <div className="mt-3">
                      <ReporterComposition result={reporterPayload} />
                    </div>
                  ) : (
                    <p className="mt-3 max-w-[76ch] text-[16px] font-normal leading-[1.62] tracking-normal text-[var(--ds-text)] md:text-[18px]">
                      {state.answer}
                    </p>
                  )}

                  {state.citation && (
                    <div className="mt-5 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
                          Next actions
                        </p>
                        <div className="flex flex-wrap justify-end gap-2">
                          {!miroLink && state.phase === "done" && (
                            <Link
                              href={`/q?q=${encodeURIComponent(query + " render this to a Miro board")}`}
                              className="inline-flex items-center rounded-md border border-[var(--ds-border)] bg-[color-mix(in_srgb,var(--ds-accent)_8%,var(--ds-bg))] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ds-accent)] hover:border-[var(--ds-accent)] hover:bg-[color-mix(in_srgb,var(--ds-accent)_12%,var(--ds-bg))]"
                            >
                              Visualize in Miro ↗
                            </Link>
                          )}
                          <Link
                            href={`/q?q=${encodeURIComponent("Ask a follow-up about: " + query)}`}
                            className="inline-flex items-center rounded-md border border-[color-mix(in_srgb,var(--ds-accent)_28%,var(--ds-border))] bg-[color-mix(in_srgb,var(--ds-accent)_12%,var(--ds-bg))] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ds-accent)] hover:bg-[color-mix(in_srgb,var(--ds-accent)_16%,var(--ds-bg))]"
                          >
                            Ask follow-up →
                          </Link>
                        </div>
                      </div>
                      <p className="mt-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-text-dim)]">
                        Go deeper
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {[
                          { label: "Compare to next zip", q: `Compare ${state.citation.dataset_name.toLowerCase()} between this zip and the next-most-active zip` },
                          { label: "Historical trend", q: `Show ${state.citation.dataset_name.toLowerCase()} trend over the last 24 months by quarter` },
                          { label: "Cross-dataset join", q: `Join ${state.citation.dataset_name.toLowerCase()} with code violations by zip for the same period` },
                          { label: "Top outliers", q: `Top 5 outliers in ${state.citation.dataset_name.toLowerCase()} this year` },
                        ].map((a) => (
                          <Link
                            key={a.label}
                            href={`/q?q=${encodeURIComponent(a.q)}&dataset=${state.citation!.dataset_id}`}
                            className="group flex min-h-11 items-center justify-between gap-3 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] px-3 py-2 text-[13px] font-medium text-[var(--ds-text-mute)] hover:border-[color-mix(in_srgb,var(--ds-accent)_35%,var(--ds-border))] hover:bg-[color-mix(in_srgb,var(--ds-accent)_6%,var(--ds-bg))] hover:text-[var(--ds-accent)]"
                          >
                            <span>{a.label}</span>
                            <span className="font-mono text-[12px] text-[var(--ds-accent)] opacity-60 group-hover:opacity-100">→</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta strip — gold insight badges per BRAND §7 */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <MetaChip
                      icon="check"
                      label="Took"
                      value={
                        state.durationMs !== null
                          ? `${(state.durationMs / 1000).toFixed(1)}s`
                          : "complete"
                      }
                    />
                    {state.usageTotal && (
                      <MetaChip
                        icon="activity"
                        label="Tokens"
                        value={state.usageTotal.total.toLocaleString()}
                      />
                    )}
                    <MetaChip icon="link" label="Sources" value={`${sourcesCount} cited`} />
                    {state.replans.length > 0 && (
                      <MetaChip
                        icon="refresh"
                        label="Self-corrections"
                        value={state.replans.length.toString()}
                      />
                    )}
                  </div>

                  {/* By the numbers — standout figures from the answer.
                      Hidden when fewer than 2 stats survive filtering, since
                      a lone figure (often a date or duration) looks like a
                      garbage extraction. */}
                  {numbers.length >= 2 && (
                    <div className="mt-7">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
                        By the numbers
                      </p>
                      <ul className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                        {numbers.slice(0, 3).map((n, i) => (
                          <li
                            key={i}
                            className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-4 py-3"
                          >
                            <span className="block text-[22px] font-semibold leading-none tabular-nums text-[var(--ds-text)]">
                              {n.value}
                            </span>
                            <span className="mt-1 block text-[13px] leading-snug text-[var(--ds-text-mute)]">
                              {n.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Citation aside — Stitch screen 2 pattern: header + name +
                    dataset id + 3 mini text buttons (VIEW SCHEMA / RAW JSON /
                    DOCS) + a primary OPEN DATASET button. */}
                {state.citation && (
                <aside className="lg:col-span-12">
                  <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
                      <div>
                        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
                          Primary source
                        </p>
                        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <p className="text-[18px] font-bold leading-tight text-[var(--ds-text)]">
                            {state.citation.dataset_name}
                          </p>
                          <p className="text-[13px] text-[var(--ds-text-mute)]">
                            {state.citation.portal}
                          </p>
                          <p className="font-mono text-[11px] text-[var(--ds-text-dim)]">
                            {state.citation.dataset_id}
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                          <Link
                            href={`/datasets/${state.citation.dataset_id}#schema`}
                            className="hover:text-[var(--ds-text)]"
                          >
                            Schema
                          </Link>
                          {state.citation.api_url && (
                            <>
                              <span aria-hidden>·</span>
                              <a
                                href={state.citation.api_url}
                                target="_blank"
                                rel="noopener"
                                className="hover:text-[var(--ds-text)]"
                              >
                                Raw JSON
                              </a>
                            </>
                          )}
                          <span aria-hidden>·</span>
                          <a
                            href={`https://${state.citation.portal_host}/d/${state.citation.dataset_id}`}
                            target="_blank"
                            rel="noopener"
                            className="hover:text-[var(--ds-text)]"
                          >
                            Docs
                          </a>
                        </div>
                      </div>

                      <Link
                        href={`/datasets/${state.citation.dataset_id}`}
                        className="inline-flex w-full items-center justify-center rounded-md bg-[var(--ds-inverse-bg)] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-inverse-text)] hover:opacity-90"
                      >
                        Open dataset →
                      </Link>
                    </div>
                  </div>
                </aside>
                )}
              </div>

            </div>
          </section>
        ) : null}

        {/* Reasoning trace + Self-corrections live in the right-column DAG /
            Steps / Telemetry tabs. SupportChips / AnalystFindings /
            ReporterComposition render inline above where applicable. */}

        {/* Live Miro board — only when render_to_miro produced a board link. */}
        {state.phase === "done" && miroLink && miroEmbedLink && (
          <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
            <div className="min-w-0 px-5 py-6 md:px-8 md:py-8">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-purple)]">
                  Miro board
                </p>
                <a
                  href={miroOpenLink ?? miroLink}
                  target="_blank"
                  rel="noopener"
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-purple)] hover:underline"
                >
                  Open ↗
                </a>
              </div>
              <div className="mt-3 w-full max-w-full overflow-hidden rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)]">
                <iframe
                  src={miroEmbedLink}
                  title="TXLookup Miro board"
                  loading="lazy"
                  allow="fullscreen; clipboard-read; clipboard-write"
                  allowFullScreen
                  className="block aspect-[16/9] h-auto min-h-[300px] w-full max-w-full border-0 md:min-h-[420px]"
                />
              </div>
            </div>
          </section>
        )}

        {/* Related angles — only after a successful answer */}
        {state.phase === "done" && state.answer && relatedAngles.length > 0 && (
          <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
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
                  The agent <span className="text-[var(--ds-bad)]">couldn’t finish</span>.
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
                  className="mt-5 inline-flex items-center rounded-md bg-[var(--ds-inverse-bg)] px-5 py-2 text-[13px] font-semibold text-[var(--ds-inverse-text)] hover:opacity-90"
                >
                  ← Home
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Working state — spinner + phase + latest-event caption + skeleton.
            Renders for the entire run-to-completion window (not just before the
            first step lands), so the body is never visually empty during the
            ~5-10s the agent is thinking. Disappears once the answer renders. */}
        {state.phase !== "done" &&
          state.phase !== "error" &&
          state.phase !== "idle" && (
            <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
              <div className="px-6 py-10 md:px-10 md:py-12">
                <div className="flex items-center gap-3">
                  {/* Spinner — inline SVG, brand-tinted, rotates via CSS animation.
                      No new chart libs — pure SVG + tailwind animate-spin. */}
                  <svg
                    className="h-4 w-4 animate-spin text-[var(--ds-accent)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
                    {state.phase === "reasoning" && "Reasoning"}
                    {state.phase === "planning" && "Planning"}
                    {state.phase === "executing" && "Executing"}
                    {state.phase === "replanning" && "Replanning"}
                    {state.phase === "completing" && "Composing"}
                  </p>
                  {state.phase === "executing" && state.totalSteps > 0 && (
                    <span className="font-mono text-[11px] tabular-nums text-[var(--ds-text-mute)]">
                      step {state.currentStep}/{state.totalSteps}
                      {currentTool ? ` · ${currentTool}` : ""}
                    </span>
                  )}
                </div>

                {/* Latest SSE event — one-line caption so the user can see
                    what the agent is doing right now without opening Telemetry. */}
                {latestEvent && (
                  <p className="mt-3 max-w-[68ch] truncate font-mono text-[12px] leading-relaxed text-[var(--ds-text-mute)]">
                    {latestEvent.message}
                  </p>
                )}

                {/* Answer-shape skeleton — same vertical rhythm as the final
                    answer card so layout doesn't jump on completion. */}
                <div className="mt-7 max-w-[58ch] space-y-3">
                  <div className="h-8 w-[92%] animate-pulse rounded bg-[var(--ds-bg-elev)]" />
                  <div className="h-8 w-[80%] animate-pulse rounded bg-[var(--ds-bg-elev)]" />
                  <div className="h-8 w-[64%] animate-pulse rounded bg-[var(--ds-bg-elev)]" />
                </div>

                {/* Action-row + meta-strip skeleton — matches the final layout. */}
                <div className="mt-7 flex flex-wrap items-center gap-2">
                  <div className="h-9 w-32 animate-pulse rounded-md bg-[var(--ds-bg-elev)]" />
                  <div className="h-9 w-28 animate-pulse rounded-md bg-[var(--ds-bg-elev)]" />
                  <div className="h-9 w-24 animate-pulse rounded-md bg-[var(--ds-bg-elev)]" />
                </div>
              </div>
            </section>
          )}
      </div>

      {/* Right column — fixed partition. Hide/show collapses the rail content,
          but never lets the answer body expand to full width. */}
      <div className="min-w-0 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-92px)]">
        {showTrace ? (
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
        ) : (
          <aside
            className="overflow-hidden rounded-md border border-white/10 text-tx-cream shadow-sm"
            style={{
              background: "var(--tx-navy-dark)",
              backgroundImage:
                "radial-gradient(circle at 80% 10%, rgba(58,127,190,0.14) 0%, transparent 55%), radial-gradient(circle at 10% 90%, rgba(196,66,10,0.10) 0%, transparent 50%)",
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.18em] text-tx-gold">
                  Agent trace
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-tx-cream/70">
                  Hidden. The answer layout stays fixed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTrace(true)}
                className="shrink-0 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-tx-cream transition-colors hover:border-tx-gold hover:text-tx-gold"
              >
                Show
              </button>
            </div>
          </aside>
        )}
      </div>
      </div>
    </div>
  );
}

// Type guard for the reporter specialist envelope (PR #68 / issue #67).
// Only the minimum shape the matching render branch reads is required, so a
// partially-malformed payload still routes safely.
function isReporterResult(v: unknown): v is ReporterResult {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { agent?: unknown }).agent === "reporter"
  );
}

function buildMiroEmbedUrl(link: string): string {
  try {
    const url = new URL(link);
    url.pathname = url.pathname.replace("/app/board/", "/app/live-embed/");
    // Cached runs may point at a specific Miro frame/widget. If that item is
    // later cleaned up in Miro, the embed opens to "item moved". The board
    // itself is the stable artifact, so use that for embeds.
    url.searchParams.delete("moveToWidget");
    url.searchParams.delete("moveToViewport");
    url.searchParams.set("embedMode", "view_only_without_ui");
    url.searchParams.set("embedId", "txlookup-q");
    return url.toString();
  } catch {
    const [base, query = ""] = link.split("?");
    const params = new URLSearchParams(query);
    params.delete("moveToWidget");
    params.delete("moveToViewport");
    params.set("embedMode", "view_only_without_ui");
    params.set("embedId", "txlookup-q");
    return `${base.replace("/app/board/", "/app/live-embed/")}?${params.toString()}`;
  }
}

function buildMiroBoardUrl(link: string): string {
  try {
    const url = new URL(link);
    url.searchParams.delete("moveToWidget");
    url.searchParams.delete("moveToViewport");
    url.searchParams.delete("embedMode");
    url.searchParams.delete("embedId");
    return url.toString();
  } catch {
    return link.split("?")[0] ?? link;
  }
}

// Insight badge / meta-chip — dark-system version (elev bg, warn accent).
function MetaChip({
  icon,
  label,
  value,
}: {
  icon: "check" | "activity" | "link" | "refresh";
  label: string;
  value: string;
}) {
  const path = (() => {
    switch (icon) {
      case "activity":
        return <path d="M22 12h-4l-3 7L9 5l-3 7H2" />;
      case "link":
        return (
          <>
            <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
            <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" />
          </>
        );
      case "refresh":
        return (
          <>
            <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
            <path d="M3 21v-5h5" />
            <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" />
            <path d="M21 3v5h-5" />
          </>
        );
      default:
        return <path d="m5 12 4 4L19 6" />;
    }
  })();

  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--ds-text-dim)]"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3 text-[var(--ds-text-dim)]"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        aria-hidden
      >
        {path}
      </svg>
      <span>{label}</span>
      <span className="tabular-nums text-[var(--ds-text-mute)]">{value}</span>
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
  // Track labels we've already taken — prevents "3,699 permits / 1,784
  // violations / 3,564 permits" repeating the same label twice.
  const seenLabel = new Set<string>();

  // Allow-list of count-nouns the figure must label. Anything else (dates,
  // street addresses, IH 35, "involving rear") is rejected to avoid dressing
  // up incidental numbers as metrics.
  const COUNT_WORDS = new Set([
    "permits","permit","violations","violation","complaints","complaint",
    "cases","case","calls","call","incidents","incident","records","record",
    "rows","row","tickets","ticket","inspections","inspection","filings",
    "filing","reports","report","collisions","collision","crashes","crash",
    "datasets","dataset","stops","stop","arrests","arrest","accidents",
    "accident","injuries","injury","fatalities","fatality","deaths","death",
    "applications","application","requests","request","alerts","alert",
    "events","event","entries","entry","items","item","results","result",
    "responses","response","citations","citation","fines","fine","points",
    "point","sources","source","matches","match","hits","hit","pages","page",
  ]);
  // Things that indicate the trailing word is NOT a count noun.
  const MONTHS =
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;

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
    // Bare numbers — require either a comma (clear thousands) OR a known
    // count-noun follower. Plain "35 on April" no longer qualifies.
    {
      re: /(\d{1,3}(?:,\d{3})+|\d{2,})\s+([a-z]+(?:\s+[a-z]+){0,2})/gi,
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
      // Reject month-words, year-like 4-digit values, and labels whose first
      // word isn't a count noun (and the value isn't a comma-thousands or %).
      const numericRaw = k.value.replace(/[$,%KMB]/gi, "");
      const numericVal = Number(numericRaw);
      if (
        Number.isFinite(numericVal) &&
        numericVal >= 1900 &&
        numericVal <= 2099 &&
        !k.value.includes(",") &&
        !k.value.includes("%")
      ) {
        // Looks like a year. Skip.
        continue;
      }
      if (MONTHS.test(trimmedLabel)) continue;
      const firstWord = trimmedLabel.split(/\s+/)[0]?.toLowerCase() ?? "";
      const isPercent = k.value.includes("%");
      const isMoney = k.value.startsWith("$");
      const isThousands = /\d,\d/.test(k.value);
      if (!isPercent && !isMoney && !isThousands && !COUNT_WORDS.has(firstWord)) {
        continue;
      }
      const key = k.value.toLowerCase();
      if (seen.has(key)) continue;
      const labelKey = trimmedLabel.toLowerCase();
      if (seenLabel.has(labelKey)) continue;
      seen.add(key);
      seenLabel.add(labelKey);
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
