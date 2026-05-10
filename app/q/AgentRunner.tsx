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
    | "error";
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
  mode?: "live" | "fallback";
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
    });

    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, dataset, fallback: mode === "fallback" }),
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
                switch (ev.phase) {
                  case "reasoning":
                    return { ...s, phase: "reasoning", events: eventsNext };
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
                      events: eventsNext,
                    };
                  case "executing":
                    return {
                      ...s,
                      phase: "executing",
                      currentStep: ev.step ?? s.currentStep,
                      totalSteps: ev.total ?? s.totalSteps,
                      events: eventsNext,
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
                    return { ...s, steps: next, events: eventsNext };
                  }
                  case "doom_loop":
                    // The corrective replan event will follow; just log here.
                    return { ...s, events: eventsNext };
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
                      events: eventsNext,
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
                      events: eventsNext,
                    };
                  }
                  case "completing":
                    return { ...s, phase: "completing", events: eventsNext };
                  case "done":
                    return {
                      ...s,
                      phase: "done",
                      answer: ev.answer ?? null,
                      citation: ev.citation ?? null,
                      artifacts: ev.artifacts ?? [],
                      usageTotal: ev.usage_total ?? null,
                      durationMs: ev.duration_ms ?? null,
                      events: eventsNext,
                    };
                  case "error":
                    return {
                      ...s,
                      phase: "error",
                      error: ev.error ?? "unknown error",
                      events: eventsNext,
                    };
                  default:
                    return s;
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
  // Brand-aligned status dot color. Sage = done, rust = error, gold = running,
  // navy = idle (BRAND.md §3 signal mapping).
  const phaseDot = (() => {
    if (state.phase === "done") return "var(--tx-sage)";
    if (state.phase === "error") return "var(--tx-rust)";
    if (state.phase === "idle") return "var(--tx-navy)";
    return "var(--tx-gold)";
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

  // Brand step-indicator data (Reason · Plan · Tool · Complete).
  const phaseToActiveStep = (() => {
    if (state.phase === "reasoning") return 0;
    if (state.phase === "planning") return 1;
    if (state.phase === "executing" || state.phase === "replanning") return 2;
    if (state.phase === "completing") return 3;
    if (state.phase === "done") return 3;
    return -1;
  })();
  const stepLabels = [
    { n: "01", title: "Reason" },
    { n: "02", title: "Plan" },
    { n: "03", title: "Tool" },
    { n: "04", title: "Complete" },
  ];

  return (
    <div className="grid md:grid-cols-[1fr_420px]">
      {/* Left column — answer-first body, cream surface */}
      <div className="min-w-0 bg-tx-cream">
        {/* Question recap with live status pill */}
        <section className="border-b border-tx-ink/10 bg-tx-cream">
          <div className="px-6 py-7 md:px-10">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
                {state.phase === "done" ? "Answered" : "Asked"}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    obsStatus === "running" ? "animate-pulse" : ""
                  }`}
                  style={{ backgroundColor: phaseDot }}
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-tx-navy">
                  {phaseDisplayLabel}
                </span>
              </div>
            </div>
            <h2 className="mt-3 max-w-[58ch] font-display text-2xl font-normal leading-tight tracking-tight text-tx-navy md:text-[28px]">
              {query}
            </h2>
          </div>
        </section>

        {/* ── 4-step indicator (Reason · Plan · Tool · Complete) ── */}
        <section className="border-b border-tx-ink/10 bg-tx-cream">
          <div className="px-6 py-6 md:px-10">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
              How the agent works
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {stepLabels.map((s, i) => {
                const isDone =
                  state.phase === "done"
                    ? true
                    : i < phaseToActiveStep;
                const isActive =
                  i === phaseToActiveStep && state.phase !== "done" && state.phase !== "error";
                const isReplanning = isActive && state.phase === "replanning";
                // Color tokens per brief: sage=done, rust=active, gold=replan,
                // navy/muted=upcoming. Card body stays cream for hierarchy.
                const accent = isReplanning
                  ? "var(--tx-gold)"
                  : isActive
                    ? "var(--tx-rust)"
                    : isDone
                      ? "var(--tx-sage)"
                      : "var(--tx-border)";
                const numberColor = isReplanning
                  ? "var(--tx-gold)"
                  : isActive
                    ? "var(--tx-rust)"
                    : isDone
                      ? "var(--tx-sage)"
                      : "var(--tx-muted)";
                return (
                  <div
                    key={s.n}
                    className="rounded-[10px] bg-tx-cream p-4 transition-colors"
                    style={{
                      border: `0.5px solid ${accent}`,
                      borderLeftWidth: isActive || isReplanning ? "4px" : "0.5px",
                      borderLeftColor: accent,
                    }}
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-mono text-[11px] font-semibold tracking-[0.18em]"
                        style={{ color: numberColor }}
                      >
                        STEP {s.n}
                      </span>
                      {isActive && (
                        <span
                          className="ml-auto inline-flex h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: accent,
                            animation: "pulse 1.4s ease-in-out infinite",
                          }}
                        />
                      )}
                      {isDone && !isActive && (
                        <span
                          className="ml-auto font-mono text-[10px] uppercase tracking-wider"
                          style={{ color: "var(--tx-sage)" }}
                        >
                          ✓ done
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-2 font-display text-xl font-normal leading-tight tracking-tight"
                      style={{ color: isActive || isDone ? "var(--tx-navy)" : "var(--tx-muted)" }}
                    >
                      {s.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Answer card — DM Serif headline, citation aside, rust CTA ── */}
        {state.phase === "done" && state.answer ? (
          <section className="border-b border-tx-ink/10 bg-tx-cream">
            <div className="px-6 py-10 md:px-10 md:py-12">
              <div className="grid gap-8 md:grid-cols-12 md:gap-10">
                <div className="md:col-span-8">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
                    Insight
                  </p>
                  {/* When the reporter specialist composed a structured
                      article, render that in place of the plain synthesizer
                      paragraph (PR #68). Otherwise fall back to the simple
                      DM Serif headline. */}
                  {reporterPayload ? (
                    <div className="mt-3">
                      <ReporterComposition result={reporterPayload} />
                    </div>
                  ) : (
                    <p className="mt-3 max-w-[58ch] font-display text-[28px] font-normal leading-snug tracking-tight text-tx-navy md:text-[32px]">
                      {state.answer}
                    </p>
                  )}

                  {/* Action row — primary CTA in rust per BRAND §7 */}
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    {state.citation && (
                      <Link
                        href={`/datasets/${state.citation.dataset_id}`}
                        className="inline-flex items-center rounded-md bg-tx-rust px-5 py-2 font-body text-sm font-bold text-white hover:bg-tx-rust-dark"
                      >
                        Open dataset →
                      </Link>
                    )}
                    {state.citation?.api_url && (
                      <a
                        href={state.citation.api_url}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center rounded-md border border-tx-ink/15 bg-tx-cream px-5 py-2 font-body text-sm font-bold text-tx-navy hover:border-tx-rust hover:text-tx-rust"
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
                      className="inline-flex items-center rounded-md border border-tx-ink/15 bg-tx-cream px-5 py-2 font-body text-sm font-bold text-tx-navy hover:border-tx-rust hover:text-tx-rust"
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
                      className="inline-flex items-center rounded-md border border-tx-ink/15 bg-tx-cream px-5 py-2 font-body text-sm font-bold text-tx-navy hover:border-tx-rust hover:text-tx-rust"
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
                    <div className="mt-8 border-t border-tx-ink/10 pt-6">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
                        By the numbers
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                        {numbers.slice(0, 3).map((n, i) => (
                          <div
                            key={i}
                            className="pl-3"
                            style={{ borderLeft: "3px solid var(--tx-gold)" }}
                          >
                            <div className="font-display text-[32px] font-normal leading-none tabular-nums text-tx-navy">
                              {n.value}
                            </div>
                            <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-tx-muted">
                              {n.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Citation aside — BRAND.md card pattern */}
                <aside className="md:col-span-4">
                  {state.citation && (
                    <div
                      className="rounded-[10px] bg-tx-cream p-5"
                      style={{ border: "0.5px solid var(--tx-border)" }}
                    >
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
                        Primary source
                      </p>
                      <p className="mt-3 text-sm font-bold text-tx-navy">
                        {state.citation.portal}
                      </p>
                      <p className="mt-1 font-display text-lg font-normal leading-tight text-tx-navy">
                        {state.citation.dataset_name}
                      </p>
                      <p className="mt-2 font-mono text-[11px] text-tx-muted">
                        {state.citation.dataset_id}
                      </p>
                      <div className="mt-5 flex flex-col gap-2">
                        <Link
                          href={`/datasets/${state.citation.dataset_id}`}
                          className="inline-flex items-center rounded-md bg-tx-rust px-4 py-2 font-body text-sm font-bold text-white hover:bg-tx-rust-dark"
                        >
                          Open dataset →
                        </Link>
                        {state.citation.api_url && (
                          <a
                            href={state.citation.api_url}
                            target="_blank"
                            rel="noopener"
                            className="text-sm font-bold text-tx-sky hover:text-tx-rust"
                          >
                            API endpoint →
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Plan-step list — visible during execution + after ── */}
        {state.steps.length > 0 && state.phase !== "error" && (
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

        {/* ── Replan-diagnoses panel — gold-light surface with rust-light for doom-loop ── */}
        {state.replans.length > 0 && (
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
          <section className="border-b border-tx-ink/10 bg-tx-cream">
            <div className="px-6 py-8 md:px-10 md:py-10">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
                Related angles
              </p>
              <h3 className="mt-2 font-display text-2xl font-normal tracking-tight text-tx-navy">
                Other questions this dataset can answer.
              </h3>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {relatedAngles.map((q) => (
                  <Link
                    key={q}
                    href={`/q?q=${encodeURIComponent(q)}`}
                    className="group flex items-center justify-between gap-3 rounded-[10px] border border-tx-ink/10 bg-tx-cream px-4 py-3 text-sm leading-snug text-tx-navy transition-colors hover:border-tx-rust hover:text-tx-rust"
                  >
                    <span className="line-clamp-2">{q}</span>
                    <span className="font-mono text-[12px] text-tx-rust opacity-0 transition-opacity group-hover:opacity-100">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Error state — rust-light surface, rust CTA back home ── */}
        {state.phase === "error" && (
          <section className="border-b border-tx-ink/10 bg-tx-cream">
            <div className="px-6 py-10 md:px-10 md:py-12">
              <div
                className="rounded-[10px] p-6"
                style={{
                  background: "var(--tx-rust-light)",
                  border: "0.5px solid var(--tx-rust)",
                  borderLeftWidth: "3px",
                  borderLeftColor: "var(--tx-rust)",
                }}
              >
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
                  Agent error
                </p>
                <h3 className="mt-3 font-display text-2xl font-normal tracking-tight text-tx-navy md:text-3xl">
                  The agent <span className="italic text-tx-rust">couldn’t finish</span>.
                </h3>
                <p className="mt-3 max-w-[60ch] font-mono text-sm leading-relaxed text-tx-navy/85">
                  {state.error}
                </p>
                <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-tx-ink/75">
                  Try a different question or{" "}
                  <Link href="/" className="text-tx-rust underline hover:text-tx-rust-dark">
                    start over
                  </Link>
                  . Detailed telemetry is in the right panel.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center rounded-md bg-tx-rust px-5 py-2 font-body text-sm font-bold text-white hover:bg-tx-rust-dark"
                >
                  ← Home
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Working state — animated cream skeleton with mono progress line ── */}
        {state.phase !== "done" &&
          state.phase !== "error" &&
          state.phase !== "idle" &&
          state.steps.length === 0 && (
            <section className="border-b border-tx-ink/10 bg-tx-cream">
              <div className="px-6 py-10 md:px-10 md:py-12">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
                  Insight
                </p>
                <div className="mt-4 max-w-[58ch] space-y-3">
                  <div className="h-7 w-[90%] animate-pulse rounded bg-tx-ink/5" />
                  <div className="h-7 w-[78%] animate-pulse rounded bg-tx-ink/5" />
                  <div className="h-7 w-[60%] animate-pulse rounded bg-tx-ink/5" />
                </div>
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-tx-muted">
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

      {/* Right column — 4-tab agent sidebar */}
      <AgentSidebar
        events={state.events}
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

// Insight badge / meta-chip — BRAND.md §7 (gold-light bg, gold mono text).
function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={{
        background: "var(--tx-gold-light)",
        color: "var(--tx-gold-dark)",
        border: "0.5px solid rgba(212,139,16,0.3)",
      }}
    >
      <span className="text-tx-gold-dark/70">{label}</span>
      <span className="tabular-nums text-tx-navy">{value}</span>
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
