"use client";

// ChatRoom — conversational client for /api/chat.
// Maintains turn history client-side (no server session). Posts the latest
// user message + last 10 turns of history each turn so the support
// specialist can reference what came before.

import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string; chips?: { label: string; query: string }[] };

const STARTERS = [
  "What datasets do you have?",
  "How does the agent work?",
  "Can you query Dallas?",
  "What does original_zip mean?",
];

export default function ChatRoom() {
  const [history, setHistory] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, loading]);

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setInput("");
    const next = [...history, { role: "user" as const, content: trimmed }];
    setHistory(next);
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });
      const json = (await r.json()) as {
        reply?: string;
        next_actions?: { label: string; query: string }[];
        status?: string;
      };
      const reply = json.reply ?? "(no reply)";
      setHistory((h) => [...h, { role: "assistant", content: reply, chips: json.next_actions ?? [] }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setHistory((h) => [...h, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
      {/* Conversation */}
      <div className="min-h-[360px] max-h-[560px] overflow-y-auto p-5 md:p-6">
        {history.length === 0 ? (
          <div className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ds-text-dim)]">
              Try a starter
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-[var(--ds-border)] bg-[var(--ds-bg)] px-3.5 py-1.5 text-[12.5px] text-[var(--ds-text-mute)] transition-colors hover:border-[var(--ds-accent)] hover:text-[var(--ds-text)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((t, i) => (
              <div
                key={i}
                className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-md px-4 py-3 text-[14px] leading-[1.55] ${
                    t.role === "user"
                      ? "bg-[var(--ds-accent)] text-[var(--ds-bg)]"
                      : "border border-[var(--ds-border)] bg-[var(--ds-bg)] text-[var(--ds-text)]"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{t.content}</div>
                  {t.chips && t.chips.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.chips.map((c) => (
                        <button
                          key={c.label + c.query}
                          onClick={() => send(c.query)}
                          className="rounded-full border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-3 py-1 font-mono text-[10.5px] uppercase tracking-wide text-[var(--ds-text-mute)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-text)]"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ds-purple)]" />
                    support agent thinking
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>
      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-[var(--ds-border)] p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about TXLookup, datasets, columns…"
          className="flex-1 bg-transparent px-3 py-2 text-[14px] text-[var(--ds-text)] placeholder:text-[var(--ds-text-dim)] focus:outline-none"
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="rounded-md bg-[var(--ds-text)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-bg)] hover:bg-[var(--ds-text-mute)] disabled:opacity-40"
        >
          Send →
        </button>
      </form>
    </div>
  );
}
