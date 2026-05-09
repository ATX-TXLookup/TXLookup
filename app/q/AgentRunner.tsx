"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  trackAgentDone,
  trackAgentError,
  trackAgentStart,
} from "../lib/analytics-events";
import { AgentObservatory, ObsEvent } from "./AgentObservatory";

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

export function AgentRunner({ query, dataset }: { query: string; dataset?: string }) {
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
          body: JSON.stringify({ query, dataset }),
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
  }, [query, dataset]);

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

  return (
    <div className="grid md:grid-cols-[1fr_420px]">
      {/* Left column — user-facing flow */}
      <div className="min-w-0">
        {/* Step trace */}
        <section className="border-b border-[#1A1F2A]/10 bg-white">
          <div className="px-6 py-8 md:px-10">
            <div className="grid grid-cols-4 gap-3">
              {[
                { n: "01", title: "Reason" },
                { n: "02", title: "Plan" },
                { n: "03", title: "Tool" },
                { n: "04", title: "Complete" },
              ].map((s, i) => {
                const active = i <= phaseToActiveStep && state.phase !== "error";
                const isComplete = state.phase === "done" && i === 3;
                const isReplanning = state.phase === "replanning" && i === 2;
                const status =
                  state.phase === "error"
                    ? "Error"
                    : isReplanning
                      ? "Replanning…"
                      : i < phaseToActiveStep
                        ? "Done"
                        : i === phaseToActiveStep
                          ? state.phase === "executing" && i === 2
                            ? `Step ${state.currentStep}/${state.totalSteps}`
                            : "In progress"
                          : "Waiting";
                return (
                  <div
                    key={s.n}
                    className={`rounded-md border px-4 py-4 transition-colors ${
                      isReplanning
                        ? "border-[#A06200]/40 bg-[#FFF3D9]"
                        : isComplete
                          ? "border-[#1E7A47]/40 bg-[#E5F5EC]"
                          : active
                            ? "border-[#0B5FFF]/30 bg-[#F4F6FB]"
                            : "border-[#1A1F2A]/10 bg-white"
                    }`}
                  >
                    <p
                      className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{
                        color: isReplanning
                          ? "#A06200"
                          : isComplete
                            ? "#1E7A47"
                            : active
                              ? "#0B5FFF"
                              : "#1A1F2A",
                      }}
                    >
                      Step {s.n}
                    </p>
                    <h3 className="mt-2 font-display text-lg font-bold tracking-tight text-[#0B2545]">
                      {s.title}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
                      {status}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Agent thinking */}
        {state.thinking && (
          <section className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
            <div className="px-6 py-6 md:px-10">
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                Agent thinking
              </p>
              <p className="mt-2 max-w-[68ch] text-base italic text-[#0B2545] md:text-lg">
                "{state.thinking}"
              </p>
            </div>
          </section>
        )}

        {/* Plan */}
        {state.steps.length > 0 && (
          <section className="border-b border-[#1A1F2A]/10 bg-white">
            <div className="px-6 py-8 md:px-10">
              <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                Plan
              </p>
              <ol className="mt-4 space-y-3">
                {state.steps.map((s) => (
                  <li
                    key={s.step}
                    className={`rounded-md border px-4 py-3 ${
                      s.status === "completed"
                        ? "border-[#1E7A47]/30 bg-[#E5F5EC]"
                        : s.status === "failed"
                          ? "border-[#A0231C]/30 bg-[#FBE9E7]"
                          : s.fromReplan
                            ? "border-[#A06200]/30 bg-[#FFF3D9]"
                            : "border-[#1A1F2A]/10 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-[11px] font-semibold tabular-nums text-[#1A1F2A]/55">
                        {String(s.step).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-mono text-sm font-semibold text-[#0B2545]">
                            {s.tool}
                            {s.fromReplan && (
                              <span className="ml-2 rounded-sm bg-[#A06200] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
                                Replan
                              </span>
                            )}
                          </span>
                          <span
                            className={`font-mono text-[11px] uppercase tracking-wider ${
                              s.status === "completed"
                                ? "text-[#1E7A47]"
                                : s.status === "failed"
                                  ? "text-[#A0231C]"
                                  : "text-[#1A1F2A]/45"
                            }`}
                          >
                            {s.status}
                            {typeof s.durationMs === "number" && s.status !== "pending" && (
                              <span className="ml-2 text-[#1A1F2A]/55 normal-case tracking-normal">
                                {s.durationMs}ms
                              </span>
                            )}
                          </span>
                        </div>
                        {s.rationale && (
                          <p className="mt-1 text-sm italic text-[#1A1F2A]/75">
                            {s.rationale}
                          </p>
                        )}
                        <p className="mt-1 truncate font-mono text-[11px] text-[#1A1F2A]/55">
                          {JSON.stringify(s.args).slice(0, 180)}
                        </p>
                        {s.error && (
                          <p className="mt-2 font-mono text-[11px] text-[#A0231C]">
                            ↳ {s.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* Replan diagnoses */}
        {state.replans.length > 0 && (
          <section className="border-b border-[#1A1F2A]/10 bg-[#FFF3D9]">
            <div className="px-6 py-6 md:px-10">
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A06200]">
                {state.replans.length === 1
                  ? "Agent adjusted course"
                  : `Agent adjusted course (${state.replans.length}×)`}
              </p>
              <ul className="mt-3 space-y-3">
                {state.replans.map((rp, i) => (
                  <li key={i}>
                    <p className="text-sm text-[#0B2545]">
                      {rp.reason === "doom_loop" ? (
                        <>
                          <span className="mr-2 rounded-sm bg-[#A0231C] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
                            Doom-loop
                          </span>
                          Caught looping at step {rp.failedStep}{" "}
                          <span className="font-mono text-xs">{rp.failedTool}</span>:
                        </>
                      ) : (
                        <>
                          Step {rp.failedStep}{" "}
                          <span className="font-mono text-xs">{rp.failedTool}</span>{" "}
                          failed:
                        </>
                      )}
                      <span className="ml-1 font-mono text-xs text-[#A0231C]">
                        {rp.error}
                      </span>
                    </p>
                    {rp.diagnosis && (
                      <p className="mt-1 text-sm italic text-[#0B2545]">
                        Diagnosis: "{rp.diagnosis}"
                      </p>
                    )}
                    {rp.thinking && rp.thinking !== state.thinking && (
                      <p className="mt-1 text-sm italic text-[#A06200]">
                        New approach: "{rp.thinking}"
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Result */}
        {state.phase === "done" && state.answer && (
          <section className="border-b border-[#1A1F2A]/10 bg-white">
            <div className="px-6 py-12 md:px-10 md:py-16">
              <div className="grid gap-10 md:grid-cols-12">
                <div className="md:col-span-8">
                  <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                    Answer
                  </p>
                  <p className="mt-3 max-w-[64ch] text-xl font-medium leading-relaxed text-[#0B2545] md:text-2xl">
                    {state.answer}
                  </p>
                  {(state.durationMs !== null || state.usageTotal) && (
                    <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
                      {state.durationMs !== null &&
                        `${(state.durationMs / 1000).toFixed(1)}s end-to-end`}
                      {state.usageTotal && state.durationMs !== null && " · "}
                      {state.usageTotal &&
                        `${state.usageTotal.total.toLocaleString()} tokens (${state.usageTotal.prompt.toLocaleString()} in / ${state.usageTotal.completion.toLocaleString()} out)`}
                    </p>
                  )}
                </div>

                <aside className="md:col-span-4">
                  {state.citation && (
                    <div className="rounded-md border border-[#1A1F2A]/10 bg-[#F4F6FB] p-5">
                      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                        Citation
                      </p>
                      <p className="mt-3 text-sm">
                        Source:{" "}
                        <span className="font-semibold text-[#0B2545]">
                          {state.citation.portal}
                        </span>{" "}
                        · {state.citation.dataset_name}
                      </p>
                      <p className="mt-1 font-mono text-xs">
                        ({state.citation.dataset_id})
                      </p>
                      <Link
                        href={`/datasets/${state.citation.dataset_id}`}
                        className="mt-4 inline-block text-sm font-medium text-[#0B5FFF] hover:underline"
                      >
                        Open dataset →
                      </Link>
                    </div>
                  )}

                  {state.artifacts.length > 0 && (
                    <div className="mt-5 rounded-md border border-[#1A1F2A]/10 bg-white p-5">
                      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                        Source URLs
                      </p>
                      <ul className="mt-3 space-y-1 font-mono text-[11px]">
                        {state.artifacts.slice(0, 4).map((a, idx) => (
                          <li key={`${a}-${idx}`}>
                            <a
                              href={a}
                              target="_blank"
                              rel="noopener"
                              className="break-all text-[#0B5FFF] hover:underline"
                            >
                              {a.slice(0, 80)}
                              {a.length > 80 ? "…" : ""}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </aside>
              </div>
            </div>
          </section>
        )}

        {state.phase === "error" && (
          <section className="border-b border-[#1A1F2A]/10 bg-white">
            <div className="px-6 py-12 md:px-10">
              <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#A0231C]">
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
                .
              </p>
            </div>
          </section>
        )}

        {state.phase !== "done" && state.phase !== "error" && state.phase !== "idle" && (
          <section className="border-b border-[#1A1F2A]/10 bg-white">
            <div className="px-6 py-6 md:px-10">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#1A1F2A]/55">
                {state.phase === "reasoning" && "Reading the question..."}
                {state.phase === "planning" && "Planning the tool sequence..."}
                {state.phase === "executing" &&
                  `Running step ${state.currentStep} of ${state.totalSteps}...`}
                {state.phase === "replanning" && "Step failed. Adjusting plan..."}
                {state.phase === "completing" && "Synthesizing answer..."}
              </p>
            </div>
          </section>
        )}
      </div>

      {/* Right column — observatory */}
      <AgentObservatory
        events={state.events}
        startedAt={state.startedAt}
        status={obsStatus}
      />
    </div>
  );
}
