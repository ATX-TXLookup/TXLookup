"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  status: "pending" | "completed" | "failed";
  preview?: string;
  error?: string | null;
};

type AgentState = {
  phase: "idle" | "reasoning" | "planning" | "executing" | "completing" | "done" | "error";
  totalSteps: number;
  currentStep: number;
  steps: StepLog[];
  answer: string | null;
  citation: Citation | null;
  artifacts: string[];
  error: string | null;
};

const initial: AgentState = {
  phase: "idle",
  totalSteps: 4,
  currentStep: 0,
  steps: [],
  answer: null,
  citation: null,
  artifacts: [],
  error: null,
};

function parseSseLine(line: string): unknown | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch {
    return null;
  }
}

export function AgentRunner({ query, dataset }: { query: string; dataset?: string }) {
  const [state, setState] = useState<AgentState>(initial);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (!query.trim()) return;

    setState({ ...initial, phase: "reasoning" });

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
          setState((s) => ({ ...s, phase: "error", error: `HTTP ${r.status}` }));
          return;
        }
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (!cancelled.current) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n\n");
          buf = lines.pop() ?? "";
          for (const block of lines) {
            for (const line of block.split("\n")) {
              const ev = parseSseLine(line.trim()) as
                | {
                    phase: AgentState["phase"];
                    message?: string;
                    plan?: { steps?: { tool: string; args: unknown }[] };
                    step?: number;
                    total?: number;
                    tool?: string;
                    args?: unknown;
                    status?: "completed" | "failed";
                    preview?: string;
                    error?: string | null;
                    answer?: string;
                    citation?: Citation | null;
                    artifacts?: string[];
                  }
                | null;
              if (!ev) continue;
              setState((s) => {
                switch (ev.phase) {
                  case "reasoning":
                    return { ...s, phase: "reasoning" };
                  case "planning":
                    return {
                      ...s,
                      phase: "planning",
                      totalSteps: ev.plan?.steps?.length ?? s.totalSteps,
                      steps: (ev.plan?.steps ?? []).map((p, i) => ({
                        step: i + 1,
                        tool: p.tool,
                        args: p.args,
                        status: "pending",
                      })),
                    };
                  case "executing":
                    return {
                      ...s,
                      phase: "executing",
                      currentStep: ev.step ?? s.currentStep,
                      totalSteps: ev.total ?? s.totalSteps,
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
                      };
                    }
                    return { ...s, steps: next };
                  }
                  case "completing":
                    return { ...s, phase: "completing" };
                  case "done":
                    return {
                      ...s,
                      phase: "done",
                      answer: ev.answer ?? null,
                      citation: ev.citation ?? null,
                      artifacts: ev.artifacts ?? [],
                    };
                  case "error":
                    return { ...s, phase: "error", error: ev.error ?? "unknown error" };
                  default:
                    return s;
                }
              });
            }
          }
        }
      } catch (e: unknown) {
        if (!cancelled.current) {
          setState((s) => ({
            ...s,
            phase: "error",
            error: e instanceof Error ? e.message : String(e),
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
    if (state.phase === "executing") return 2;
    if (state.phase === "completing") return 3;
    if (state.phase === "done") return 3;
    return -1;
  })();

  return (
    <>
      {/* Step trace */}
      <section className="border-b border-[#1A1F2A]/10 bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10">
          <div className="grid grid-cols-4 gap-3">
            {[
              { n: "01", title: "Reason" },
              { n: "02", title: "Plan" },
              { n: "03", title: "Tool" },
              { n: "04", title: "Complete" },
            ].map((s, i) => {
              const active = i <= phaseToActiveStep && state.phase !== "error";
              const done = i < phaseToActiveStep || state.phase === "done";
              const isComplete = state.phase === "done" && i === 3;
              const status =
                state.phase === "error"
                  ? "Error"
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
                    isComplete
                      ? "border-[#1E7A47]/40 bg-[#E5F5EC]"
                      : active
                        ? "border-[#0B5FFF]/30 bg-[#F4F6FB]"
                        : "border-[#1A1F2A]/10 bg-white"
                  }`}
                >
                  <p
                    className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{
                      color: isComplete
                        ? "#1E7A47"
                        : done
                          ? "#0B5FFF"
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

      {/* Plan + step preview */}
      {state.steps.length > 0 && (
        <section className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
          <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10">
            <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
              Plan
            </p>
            <ol className="mt-3 space-y-1 font-mono text-xs text-[#1A1F2A]">
              {state.steps.map((s) => (
                <li key={s.step} className="flex gap-3">
                  <span className="text-[#1A1F2A]/55">{String(s.step).padStart(2, "0")}</span>
                  <span className="font-semibold text-[#0B2545]">{s.tool}</span>
                  <span className="truncate text-[#1A1F2A]/65">
                    {JSON.stringify(s.args).slice(0, 140)}
                  </span>
                  <span
                    className={`ml-auto ${
                      s.status === "completed"
                        ? "text-[#1E7A47]"
                        : s.status === "failed"
                          ? "text-[#A0231C]"
                          : "text-[#1A1F2A]/45"
                    }`}
                  >
                    {s.status}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Result */}
      {state.phase === "done" && state.answer && (
        <section className="border-b border-[#1A1F2A]/10 bg-white">
          <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
            <div className="grid gap-10 md:grid-cols-12">
              <div className="md:col-span-8">
                <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                  Answer
                </p>
                <p className="mt-3 max-w-[64ch] text-xl font-medium leading-relaxed text-[#0B2545] md:text-2xl">
                  {state.answer}
                </p>
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
                    <p className="mt-1 font-mono text-xs">({state.citation.dataset_id})</p>
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
                      {state.artifacts.slice(0, 4).map((a) => (
                        <li key={a}>
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
          <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10">
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
          <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#1A1F2A]/55">
              {state.phase === "reasoning" && "Reading the question..."}
              {state.phase === "planning" && "Planning the tool sequence..."}
              {state.phase === "executing" &&
                `Running step ${state.currentStep} of ${state.totalSteps}...`}
              {state.phase === "completing" && "Synthesizing answer..."}
            </p>
          </div>
        </section>
      )}
    </>
  );
}
