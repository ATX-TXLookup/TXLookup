"use client";

import { useEffect, useRef } from "react";

export type ObsEvent = {
  ts: number; // ms since epoch
  phase: string;
  level: "info" | "warn" | "error" | "ok";
  message: string;
  detail?: string; // mono-formatted detail line (URL, args, error)
};

const phaseColor: Record<string, string> = {
  reasoning: "#0B5FFF",
  planning: "#0B5FFF",
  executing: "#0B5FFF",
  step_done: "#1E7A47",
  failed: "#A0231C",
  doom_loop: "#A0231C",
  replanning: "#A06200",
  replanned: "#A06200",
  completing: "#0B5FFF",
  done: "#1E7A47",
  error: "#A0231C",
};

const levelDot: Record<string, string> = {
  ok: "#1E7A47",
  info: "#0B5FFF",
  warn: "#A06200",
  error: "#A0231C",
};

function fmtTime(ts: number, start: number): string {
  const sinceStart = ts - start;
  const s = Math.floor(sinceStart / 1000);
  const ms = sinceStart % 1000;
  const date = new Date(ts);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}.${String(date.getMilliseconds()).padStart(3, "0")}  +${s}.${String(ms).padStart(3, "0")}s`;
}

export function AgentObservatory({
  events,
  startedAt,
  status,
}: {
  events: ObsEvent[];
  startedAt: number | null;
  status: "idle" | "running" | "done" | "error";
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-tail to the bottom on each new event.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  const start = startedAt ?? events[0]?.ts ?? Date.now();

  return (
    <aside className="sticky top-0 h-screen border-l border-[#1A1F2A]/10 bg-[#06182F] text-[#D6E4FF]">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7BA8FF]">
              Agent observatory
            </p>
            <span
              className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider ${
                status === "running"
                  ? "text-[#FFD93D]"
                  : status === "done"
                    ? "text-[#9DDFB6]"
                    : status === "error"
                      ? "text-[#FF8A8A]"
                      : "text-white/45"
              }`}
            >
              <span
                className={`block h-2 w-2 rounded-full ${
                  status === "running"
                    ? "animate-pulse bg-[#FFD93D]"
                    : status === "done"
                      ? "bg-[#9DDFB6]"
                      : status === "error"
                        ? "bg-[#FF8A8A]"
                        : "bg-white/30"
                }`}
              />
              {status}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-white/55">
            Live trace of every event the agent emits — Codex calls, SoQL
            queries, replans, citations. Mono-formatted, timestamped, append-only.
          </p>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-3 font-mono text-[11px] leading-[1.45]"
        >
          {events.length === 0 ? (
            <div className="py-10 text-center text-white/40">
              waiting for the agent to start…
            </div>
          ) : (
            <ol className="space-y-2">
              {events.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: levelDot[e.level] || "#7BA8FF" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className="font-semibold uppercase tracking-wider"
                        style={{ color: phaseColor[e.phase] || "#7BA8FF" }}
                      >
                        {e.phase}
                      </span>
                      <span className="text-[10px] text-white/40">
                        {fmtTime(e.ts, start)}
                      </span>
                    </div>
                    <p className="mt-0.5 break-words text-white/85">{e.message}</p>
                    {e.detail && (
                      <pre className="mt-1 max-h-32 overflow-x-auto whitespace-pre-wrap break-all rounded bg-black/40 px-2 py-1.5 text-[10px] text-[#9DDFB6]">
                        {e.detail}
                      </pre>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="border-t border-white/10 px-5 py-3 text-[10px] text-white/45">
          {events.length} event{events.length === 1 ? "" : "s"} ·{" "}
          {startedAt
            ? `${((Date.now() - startedAt) / 1000).toFixed(1)}s elapsed`
            : "—"}
        </div>
      </div>
    </aside>
  );
}
