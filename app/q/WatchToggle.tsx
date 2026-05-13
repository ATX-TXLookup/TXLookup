"use client";

// Watchlist primitive — store followed investigations in localStorage today,
// upgrade to email/account-backed in a later branch.
// The point per the post-mortem: build the returning-user primitive even
// before it's wired to actual notifications.

import { useEffect, useState } from "react";

const KEY = "txl.watchlist.v1";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(Array.from(new Set(list))));
}

export function WatchToggle({ slug, query }: { slug: string; query: string }) {
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    setWatched(read().includes(slug));
  }, [slug]);

  function toggle() {
    const list = read();
    if (list.includes(slug)) {
      write(list.filter((s) => s !== slug));
      setWatched(false);
    } else {
      write([slug, ...list]);
      setWatched(true);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-5 py-4">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ds-text-mute)]">
          Watch this investigation
        </p>
        <p className="mt-1 text-sm text-[var(--ds-text)]">
          {watched
            ? "Tracking — we'll surface re-runs and material changes here."
            : "Get notified when the underlying data shifts or this answer is re-run."}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        className={`shrink-0 rounded-sm border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
          watched
            ? "border-[var(--ds-good)] bg-[var(--ds-good)]/10 text-[var(--ds-good)]"
            : "border-[var(--ds-border)] bg-[var(--ds-bg)] text-[var(--ds-text)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
        }`}
      >
        {watched ? "✓ Watching" : "+ Watch"}
      </button>
    </div>
  );
}
