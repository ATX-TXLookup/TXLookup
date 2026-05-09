"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  trackAgentDone,
  trackAgentError,
  trackAgentStart,
} from "../lib/analytics-events";
import { ObsEvent } from "./AgentObservatory";
import { AgentSidebar } from "./AgentSidebar";

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
                      };
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

  const phaseToActiveStep = (() => {
    if (state.phase === "reasoning") return 0;
    if (state.phase === "planning") return 1;
    if (state.phase === "executing" || state.phase === "replanning") return 2;
    if (state.phase === "completing") return 3;
    if (state.phase === "done") return 3;
    return -1;
  })();

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
  const phaseDot = (() => {
    if (state.phase === "done") return "#1E7A47";
    if (state.phase === "error") return "#A0231C";
    if (state.phase === "idle") return "#1A1F2A";
    return "#A06200";
  })();
  const currentStepObj = state.steps[state.currentStep - 1];
  const currentTool = currentStepObj?.tool ?? null;
  const sourcesCount =
    state.artifacts.length > 0
      ? new Set(state.artifacts.map((a) => a.split("?")[0])).size
      : state.citation
        ? 1
        : 0;

  // Pull standout numbers out of the answer (USAFacts-style "by the numbers" pull-out).
  const numbers = state.answer ? extractKeyNumbers(state.answer) : [];

  // Auto-suggest related-angle questions based on which dataset answered this one.
  const relatedAngles = state.citation
    ? buildRelatedAngles(state.citation.dataset_id, query)
    : [];

  return (
    <div className="grid md:grid-cols-[1fr_420px]">
      {/* Left column — answer-first body */}
      <div className="min-w-0 bg-[#FAFBFD]">
        {/* Question recap with live status pill */}
        <section className="border-b border-[#E1E5EE] bg-white">
          <div className="px-6 py-6 md:px-10">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                {state.phase === "done" ? "Answered" : "Asked"}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    obsStatus === "running" ? "animate-pulse" : ""
                  }`}
                  style={{ backgroundColor: phaseDot }}
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#0B2545]">
                  {phaseDisplayLabel}
                </span>
              </div>
            </div>
            <h1 className="mt-3 max-w-[58ch] font-display text-2xl font-semibold tracking-tight text-[#0B2545] md:text-[28px]">
              {query}
            </h1>
          </div>
        </section>

        {/* Answer card — promoted to top, USAFacts editorial density */}
        {state.phase === "done" && state.answer ? (
          <section className="border-b border-[#E1E5EE] bg-white">
            <div className="relative px-6 py-8 md:px-10 md:py-10">
              {/* Left action-blue accent strip — USAFacts editorial cue */}
              <div
                aria-hidden
                className="absolute left-0 top-8 h-[calc(100%-3rem)] w-[4px] bg-[#0B5FFF] md:top-10"
              />
              <div className="grid gap-8 md:grid-cols-12 md:gap-10">
                <div className="md:col-span-8">
                  <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                    Insight
                  </p>
                  <p className="mt-3 max-w-[58ch] font-display text-2xl font-semibold leading-snug text-[#0B2545] md:text-[30px]">
                    {state.answer}
                  </p>
                  {/* Action row — sellable */}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {state.citation && (
                      <Link
                        href={`/datasets/${state.citation.dataset_id}`}
                        className="inline-flex items-center rounded-md border border-[#0B5FFF] bg-[#0B5FFF] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-[#0a52d6]"
                      >
                        Open dataset →
                      </Link>
                    )}
                    {state.citation?.api_url && (
                      <a
                        href={state.citation.api_url}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center rounded-md border border-[#E1E5EE] bg-white px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0B2545] hover:bg-[#F4F6FB]"
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
                      className="inline-flex items-center rounded-md border border-[#E1E5EE] bg-white px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0B2545] hover:bg-[#F4F6FB]"
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
                      className="inline-flex items-center rounded-md border border-[#E1E5EE] bg-white px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0B2545] hover:bg-[#F4F6FB]"
                    >
                      Share
                    </button>
                  </div>

                  {/* Meta strip — chip style */}
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
                    <MetaChip
                      label="Sources"
                      value={`${sourcesCount} cited`}
                    />
                    {state.replans.length > 0 && (
                      <MetaChip
                        label="Self-corrections"
                        value={state.replans.length.toString()}
                      />
                    )}
                  </div>

                  {/* By the numbers — USAFacts pull-out: standout figures from the answer */}
                  {numbers.length > 0 && (
                    <div className="mt-7 border-t border-[#E1E5EE] pt-5">
                      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                        By the numbers
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                        {numbers.slice(0, 3).map((n, i) => (
                          <div key={i} className="border-l-2 border-[#0B5FFF] pl-3">
                            <div className="font-display text-[28px] font-bold leading-none tabular-nums text-[#0B2545]">
                              {n.value}
                            </div>
                            <div className="mt-1.5 text-[11px] uppercase tracking-wider text-[#1A1F2A]/60">
                              {n.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <aside className="md:col-span-4">
                  {state.citation && (
                    <div className="rounded-md border border-[#E1E5EE] bg-[#F4F6FB] p-5">
                      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                        Primary source
                      </p>
                      <p className="mt-3 text-sm font-semibold text-[#0B2545]">
                        {state.citation.portal}
                      </p>
                      <p className="mt-1 text-sm text-[#0B2545]">
                        {state.citation.dataset_name}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-[#1A1F2A]/55">
                        {state.citation.dataset_id}
                      </p>
                      <div className="mt-4 flex flex-col gap-1.5">
                        <Link
                          href={`/datasets/${state.citation.dataset_id}`}
                          className="text-sm font-semibold text-[#0B5FFF] hover:underline"
                        >
                          Open dataset →
                        </Link>
                        {state.citation.api_url && (
                          <a
                            href={state.citation.api_url}
                            target="_blank"
                            rel="noopener"
                            className="text-sm font-semibold text-[#0B5FFF] hover:underline"
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

        {/* Related angles — only after a successful answer */}
        {state.phase === "done" && state.answer && relatedAngles.length > 0 && (
          <section className="border-b border-[#E1E5EE] bg-[#FAFBFD]">
            <div className="px-6 py-7 md:px-10">
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                Related angles
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {relatedAngles.map((q) => (
                  <Link
                    key={q}
                    href={`/q?q=${encodeURIComponent(q)}`}
                    className="group flex items-center justify-between gap-3 rounded-md border border-[#E1E5EE] bg-white px-4 py-3 text-sm text-[#0B2545] transition-colors hover:border-[#0B5FFF] hover:text-[#0B5FFF]"
                  >
                    <span className="line-clamp-2">{q}</span>
                    <span className="font-mono text-[11px] text-[#0B5FFF] opacity-0 transition-opacity group-hover:opacity-100">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {state.phase === "error" && (
          <section className="border-b border-[#E1E5EE] bg-white">
            <div className="px-6 py-10 md:px-10">
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A0231C]">
                Agent error
              </p>
              <p className="mt-3 max-w-[60ch] font-mono text-sm text-[#1A1F2A]/85">
                {state.error}
              </p>
              <p className="mt-4 text-sm text-[#1A1F2A]/65">
                Try a different question or{" "}
                <Link href="/" className="text-[#0B5FFF] hover:underline">
                  start over
                </Link>
                . Detailed telemetry is in the right panel.
              </p>
            </div>
          </section>
        )}

        {state.phase !== "done" &&
          state.phase !== "error" &&
          state.phase !== "idle" && (
            <section className="border-b border-[#E1E5EE] bg-white">
              <div className="relative px-6 py-8 md:px-10 md:py-10">
                <div
                  aria-hidden
                  className="absolute left-0 top-8 h-[calc(100%-3rem)] w-[4px] bg-[#0B5FFF] md:top-10"
                />
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                  Insight
                </p>
                <div className="mt-3 max-w-[58ch] space-y-3">
                  <div className="h-7 w-[90%] animate-pulse rounded bg-[#F4F6FB]" />
                  <div className="h-7 w-[78%] animate-pulse rounded bg-[#F4F6FB]" />
                  <div className="h-7 w-[60%] animate-pulse rounded bg-[#F4F6FB]" />
                </div>
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-[#1A1F2A]/55">
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

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#E1E5EE] bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-wider">
      <span className="text-[#1A1F2A]/55">{label}</span>
      <span className="font-semibold tabular-nums text-[#0B2545]">{value}</span>
    </span>
  );
}

// Pull standout numbers from the answer text (USAFacts-style "by the numbers" callout).
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
