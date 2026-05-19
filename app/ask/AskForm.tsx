"use client";

import { useRef, useState } from "react";

type Event = { ts: number; phase: string; text: string };

function summarize(ev: Record<string, unknown>): string {
  const phase = String(ev.phase ?? "");
  switch (phase) {
    case "reasoning": return String(ev.message ?? "");
    case "planning": return `plan ${(ev.plan as { steps?: unknown[] } | undefined)?.steps?.length ?? 0} step(s)`;
    case "executing": return `${ev.step}/${ev.total} → ${ev.tool}`;
    case "step_done": return `step ${ev.step} ${ev.status}`;
    case "critique": return `${ev.target}: ${ev.approve ? "approved" : "rejected"}`;
    case "revising": return "revising";
    case "completing": return "synthesizing";
    case "done": return String(ev.answer ?? "").slice(0, 400);
    case "error": return String(ev.error ?? "");
    default: return "";
  }
}

export function AskForm() {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const ctrlRef = useRef<AbortController | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || running) return;
    setEvents([]);
    setAnswer(null);
    setRunning(true);
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    try {
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-txl-byok": "1" },
        body: JSON.stringify({ query: query.trim() }),
        signal: ctrl.signal,
      });
      if (!r.ok || !r.body) {
        setEvents((s) => [...s, { ts: Date.now(), phase: "error", text: `HTTP ${r.status}` }]);
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const blocks = buf.split("\n\n");
        buf = blocks.pop() ?? "";
        for (const block of blocks) {
          for (const line of block.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const ev = JSON.parse(line.slice(6)) as Record<string, unknown>;
              setEvents((s) => [...s, { ts: Date.now(), phase: String(ev.phase ?? "?"), text: summarize(ev) }]);
              if (ev.phase === "done") setAnswer(String(ev.answer ?? ""));
            } catch {}
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        setEvents((s) => [...s, { ts: Date.now(), phase: "error", text: e.message }]);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="mt-8">
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-text-mute)]">
            Your question
          </span>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            placeholder="e.g. How has Austin's permit mix shifted from residential to commercial since 2024?"
            className="mt-2 w-full rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-4 py-3 text-[16px] leading-relaxed text-[var(--ds-text)] placeholder:text-[var(--ds-text-dim)] focus:border-[var(--ds-accent)] focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={running || !query.trim()}
          className="mt-4 rounded-sm bg-[var(--ds-inverse-bg)] px-6 py-2.5 text-[14px] font-semibold text-[var(--ds-inverse-text)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? "Running…" : "Ask →"}
        </button>
      </form>

      {events.length > 0 && (
        <div className="mt-8 rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-accent)]">
            Live trace
          </p>
          <div className="mt-3 max-h-[280px] overflow-auto font-mono text-[11px] leading-relaxed">
            {events.map((ev, i) => (
              <div key={i} className="grid grid-cols-[auto_auto_1fr] gap-2">
                <span className="text-[var(--ds-text-dim)]">{new Date(ev.ts).toISOString().slice(11, 19)}</span>
                <span
                  className={
                    ev.phase === "error" ? "text-[var(--ds-bad)]" :
                    ev.phase === "done" ? "text-[var(--ds-good)]" :
                    ev.phase === "critique" || ev.phase === "revising" ? "text-[var(--ds-warm)]" :
                    "text-[var(--ds-accent)]"
                  }
                >
                  {ev.phase}
                </span>
                <span className="truncate text-[var(--ds-text)]">{ev.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {answer && (
        <div className="mt-8 rounded-sm border border-[var(--ds-good)]/40 bg-[var(--ds-bg-elev)] p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-good)]">
            Answer
          </p>
          <p className="mt-3 text-[16px] leading-[1.6] text-[var(--ds-text)]">{answer}</p>
          <p className="mt-4 font-mono text-[11px] text-[var(--ds-text-dim)]">
            Saved to the public library. View at <a href="/answers" className="text-[var(--ds-accent)] hover:underline">/answers</a>.
          </p>
        </div>
      )}
    </>
  );
}
