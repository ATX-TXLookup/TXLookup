"use client";

// UpvoteButton — client-side upvote control for the /wanted queue.
// localStorage remembers which queries this browser already voted for, so
// the button shows a voted state instantly. The server still enforces the
// real one-vote-per-IP rule; localStorage is just the fast-path UX.

import { useEffect, useState } from "react";

const LS_KEY = "txl_upvotes";

function readVoted(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function rememberVoted(query: string) {
  try {
    const set = readVoted();
    set.add(query);
    window.localStorage.setItem(LS_KEY, JSON.stringify([...set]));
  } catch {
    /* localStorage unavailable — server-side dedup still holds */
  }
}

export function UpvoteButton({
  query,
  initialCount,
}: {
  query: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setVoted(readVoted().has(query));
  }, [query]);

  async function handleVote() {
    if (voted || busy) return;
    setBusy(true);
    // Optimistic — the server is the source of truth, but the queue feels
    // dead if the count doesn't move immediately.
    setCount((c) => c + 1);
    setVoted(true);
    rememberVoted(query);
    try {
      const res = await fetch("/api/demand/upvote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = (await res.json()) as { ok?: boolean; upvotes?: number };
      if (data.ok && typeof data.upvotes === "number") {
        setCount(data.upvotes); // reconcile with the real count
      }
    } catch {
      /* keep the optimistic state — a refresh will reconcile */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleVote}
      disabled={voted || busy}
      aria-pressed={voted}
      className={`flex shrink-0 flex-col items-center justify-center rounded-md border px-3 py-2 transition-colors ${
        voted
          ? "border-[var(--ds-accent)] bg-[var(--ds-accent)]/10 text-[var(--ds-accent)]"
          : "border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] text-white hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
      }`}
    >
      <span className="text-[13px] leading-none">{voted ? "▲" : "△"}</span>
      <span className="mt-1 text-[14px] font-semibold tabular-nums leading-none">{count}</span>
    </button>
  );
}
