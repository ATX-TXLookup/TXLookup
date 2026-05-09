"use client";

// Client side of the admin console: question form + run-archive list.
// Streams /api/agent line-by-line into a compact log; mark good/bad + replay.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { SavedRun } from "@/app/lib/run-archive";

function pill(status: SavedRun["status"]): string {
  if (status === "good") return "bg-[#E5F5EC] text-[#1E7A47] border-[#1E7A47]/30";
  if (status === "bad") return "bg-[#FBE9E7] text-[#A0231C] border-[#A0231C]/30";
  return "bg-[#F4F6FB] text-[#1A1F2A]/65 border-[#1A1F2A]/15";
}

function timeAgo(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

function summarize(ev: Record<string, unknown>): string {
  const phase = String(ev.phase ?? "");
  const plan = ev.plan as { steps?: unknown[] } | undefined;
  switch (phase) {
    case "reasoning": return String(ev.message ?? "");
    case "planning": return `plan ${plan?.steps?.length ?? 0} step(s)`;
    case "executing": return `${ev.step}/${ev.total} → ${ev.tool}`;
    case "step_done": return `step ${ev.step} ${ev.status}${ev.error ? ` (${ev.error})` : ""}`;
    case "doom_loop": return `${ev.kind}: ${ev.detail}`;
    case "replanning": return `step ${ev.failedStep} failed: ${ev.error ?? ""}`;
    case "replanned": return `new plan ${plan?.steps?.length ?? 0} step(s)`;
    case "completing": return "synthesizing";
    case "done": {
      const u = ev.usage_total as { total?: number } | undefined;
      return `${ev.duration_ms}ms · ${u?.total ?? 0} tok`;
    }
    case "error": return String(ev.error ?? "");
    default: return JSON.stringify(ev).slice(0, 120);
  }
}

type LiveEvent = { ts: number; phase: string; text: string };

export function AdminConsole({ runs: initialRuns }: { runs: SavedRun[] }) {
  const [query, setQuery] = useState("");
  const [fallback, setFallback] = useState(false);
  const [live, setLive] = useState<LiveEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<SavedRun[]>(initialRuns);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  async function refresh() {
    try {
      const r = await fetch("/api/admin/runs?limit=50");
      if (r.ok) setRuns(((await r.json()) as { runs: SavedRun[] }).runs ?? []);
    } catch {}
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || running) return;
    setLive([]);
    setRunning(true);
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    try {
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), fallback }),
        signal: ctrl.signal,
      });
      const mode = r.headers.get("x-txlookup-mode");
      if (mode) setLive((s) => [...s, { ts: Date.now(), phase: "mode", text: `mode: ${mode}` }]);
      if (!r.ok || !r.body) {
        setLive((s) => [...s, { ts: Date.now(), phase: "error", text: `HTTP ${r.status}` }]);
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
              setLive((s) => [...s, { ts: Date.now(), phase: String(ev.phase ?? "?"), text: summarize(ev) }]);
            } catch {}
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        setLive((s) => [...s, { ts: Date.now(), phase: "error", text: e.message }]);
      }
    } finally {
      setRunning(false);
      setTimeout(refresh, 250);
    }
  }

  async function mark(hash: string, status: "good" | "bad") {
    try {
      const r = await fetch("/api/admin/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, status }),
      });
      if (r.ok) {
        const updated = (await r.json()) as SavedRun;
        setRuns((s) => s.map((x) => (x.hash === hash ? updated : x)));
      }
    } catch {}
  }

  const phaseColor = (p: string) =>
    p === "error" ? "text-[#A0231C]"
      : p === "done" ? "text-[#1E7A47]"
      : p === "replanning" || p === "doom_loop" ? "text-[#A06200]"
      : "text-[#0B5FFF]";

  return (
    <>
      <section className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
        <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10">
          <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">Run a question</p>
          <form onSubmit={run} className="mt-3 flex flex-col gap-3 md:flex-row md:items-start">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. How many active food inspection violations in 78704?"
              className="flex-1 rounded-sm border border-[#1A1F2A]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0B5FFF]"
            />
            <label className="flex items-center gap-2 text-sm text-[#1A1F2A]/75">
              <input type="checkbox" checked={fallback} onChange={(e) => setFallback(e.target.checked)} />
              <span className="font-mono text-[11px] uppercase tracking-wider">fallback</span>
            </label>
            <button
              type="submit"
              disabled={running || !query.trim()}
              className="rounded-sm bg-[#0B5FFF] px-5 py-2 font-display text-sm font-semibold text-white hover:bg-[#0B2545] disabled:cursor-not-allowed disabled:bg-[#1A1F2A]/30"
            >
              {running ? "Running…" : "Run"}
            </button>
          </form>
          {live.length > 0 && (
            <div className="mt-4 max-h-[260px] overflow-auto rounded-sm border border-[#1A1F2A]/15 bg-white p-3 font-mono text-[11px] leading-relaxed text-[#1A1F2A]/85">
              {live.map((ev, i) => (
                <div key={i} className="grid grid-cols-[auto_auto_1fr] gap-2">
                  <span className="text-[#1A1F2A]/45">{new Date(ev.ts).toISOString().slice(11, 19)}</span>
                  <span className={phaseColor(ev.phase)}>{ev.phase}</span>
                  <span className="truncate">{ev.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">Run archive · {runs.length}</p>
            <button onClick={refresh} className="font-mono text-[10px] uppercase tracking-wider text-[#0B5FFF] hover:underline">refresh</button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="border-b border-[#1A1F2A]/15 bg-[#F4F6FB]">
                <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/65">
                  <th className="px-3 py-2 font-semibold">query</th>
                  <th className="px-3 py-2 font-semibold">status</th>
                  <th className="px-3 py-2 font-semibold">when</th>
                  <th className="px-3 py-2 text-right font-semibold">tok</th>
                  <th className="px-3 py-2 text-right font-semibold">ms</th>
                  <th className="px-3 py-2 font-semibold">actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-[#1A1F2A]/55">No runs yet — submit a question above.</td></tr>
                )}
                {runs.map((r) => (
                  <tr key={r.hash} className="border-b border-[#1A1F2A]/10 align-top">
                    <td className="max-w-[420px] px-3 py-2">
                      <div className="truncate text-[#0B2545]" title={r.query}>{r.query}</div>
                      <div className="font-mono text-[10px] text-[#1A1F2A]/45">{r.hash}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-sm border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${pill(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[#1A1F2A]/65">{timeAgo(r.savedAt)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{r.tokenTotal.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{r.durationMs}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Link href={`/admin/replay/${r.hash}`} className="text-[#0B5FFF] hover:underline">replay</Link>
                        <span className="text-[#1A1F2A]/30">·</span>
                        <button onClick={() => mark(r.hash, "good")} className="text-[#1E7A47] hover:underline">good</button>
                        <span className="text-[#1A1F2A]/30">·</span>
                        <button onClick={() => mark(r.hash, "bad")} className="text-[#A0231C] hover:underline">bad</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
