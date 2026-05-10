"use client";

// AgentObservatory — the dark-navy SSE event log panel for /q.
// Visual chrome is brand-faithful per BRAND.md (brand-guide/BRAND.md): the
// dark-hero pattern from §7 (tx-navy bg with subtle radial-glow), tx-cream
// foreground text, tx-gold accent for the agent state, tx-sky for info,
// tx-rust for errors, IBM Plex Mono for every event row.
//
// IMPORTANT: only the `aside` and its children are styled here. The
// `ObsEvent` type, prop shape, ts/level/phase semantics, and the
// auto-tail behavior are byte-identical to the pre-restyle version.

import { useEffect, useRef } from "react";

export type ObsEvent = {
  ts: number; // ms since epoch
  phase: string;
  level: "info" | "warn" | "error" | "ok";
  message: string;
  detail?: string; // mono-formatted detail line (URL, args, error)
};

// Phase → CSS-var color. Sky for info phases, sage for completion, gold for
// replan/warn, rust for errors. All values resolve to tokens defined in
// app/globals.css (BRAND.md §3).
const phaseColor: Record<string, string> = {
  reasoning:  "var(--tx-sky)",
  planning:   "var(--tx-sky)",
  executing:  "var(--tx-sky)",
  step_done:  "var(--tx-sage)",
  failed:     "var(--tx-rust)",
  doom_loop:  "var(--tx-rust)",
  replanning: "var(--tx-gold)",
  replanned:  "var(--tx-gold)",
  completing: "var(--tx-sky)",
  done:       "var(--tx-sage)",
  error:      "var(--tx-rust)",
};

const levelDot: Record<string, string> = {
  ok:    "var(--tx-sage)",
  info:  "var(--tx-sky)",
  warn:  "var(--tx-gold)",
  error: "var(--tx-rust)",
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

  // Status pill color — gold (running) / sage (done) / rust (error) / muted (idle).
  const statusColor =
    status === "running"
      ? "var(--tx-gold)"
      : status === "done"
        ? "var(--tx-sage)"
        : status === "error"
          ? "var(--tx-rust)"
          : "rgba(250,247,242,0.45)";

  return (
    <aside
      className="sticky top-0 h-screen border-l border-white/10 text-tx-cream"
      style={{
        background: "var(--tx-navy-dark)",
        backgroundImage:
          "radial-gradient(circle at 80% 10%, rgba(58,127,190,0.16) 0%, transparent 50%), radial-gradient(circle at 10% 90%, rgba(196,66,10,0.10) 0%, transparent 50%)",
      }}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-gold">
              Agent observatory
            </p>
            <span
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider"
              style={{ color: statusColor }}
            >
              <span
                className={`block h-2 w-2 rounded-full ${
                  status === "running" ? "animate-pulse" : ""
                }`}
                style={{ backgroundColor: statusColor }}
              />
              {status}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-tx-cream/55">
            Live trace of every event the agent emits — Codex calls, SoQL
            queries, replans, citations. Mono-formatted, timestamped, append-only.
          </p>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-3 font-mono text-[11px] leading-[1.45]"
        >
          {events.length === 0 ? (
            <div className="py-10 text-center text-tx-cream/40">
              waiting for the agent to start…
            </div>
          ) : (
            <ol className="space-y-2">
              {events.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: levelDot[e.level] || "var(--tx-sky)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className="font-semibold uppercase tracking-wider"
                        style={{ color: phaseColor[e.phase] || "var(--tx-sky)" }}
                      >
                        {e.phase}
                      </span>
                      <span className="text-[10px] text-tx-cream/40">
                        {fmtTime(e.ts, start)}
                      </span>
                    </div>
                    <p className="mt-0.5 break-words text-tx-cream/85">{e.message}</p>
                    {e.detail && (
                      <pre
                        className="mt-1 max-h-32 overflow-x-auto whitespace-pre-wrap break-all rounded px-2 py-1.5 text-[10px]"
                        style={{
                          background: "rgba(7,21,42,0.7)",
                          color: "var(--tx-sky-light)",
                          border: "0.5px solid rgba(58,127,190,0.18)",
                        }}
                      >
                        {e.detail}
                      </pre>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="border-t border-white/10 px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-tx-cream/45">
          {events.length} event{events.length === 1 ? "" : "s"} ·{" "}
          {startedAt
            ? `${((Date.now() - startedAt) / 1000).toFixed(1)}s elapsed`
            : "—"}
        </div>
      </div>
    </aside>
  );
}
