"use client";

// Star toggle per lookup card. localStorage-backed returning-user primitive
// per the Atlas TX post-mortem ("watchlists / saved investigations would
// have brought users back"). Aria-pressed on the button so it reads cleanly
// for keyboard users.

import { useEffect, useState } from "react";

const KEY = "txl.watchlist.v1";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(Array.from(new Set(list))));
}

export function WatchStar({ slug }: { slug: string }) {
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    setWatching(read().includes(slug));
  }, [slug]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const list = read();
    if (list.includes(slug)) {
      write(list.filter((s) => s !== slug));
      setWatching(false);
    } else {
      write([slug, ...list]);
      setWatching(true);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={watching}
      aria-label={watching ? "Stop watching" : "Watch this lookup"}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[14px] transition-colors ${
        watching
          ? "border-[var(--ds-warm)] bg-[var(--ds-warm)]/10 text-[var(--ds-warm)]"
          : "border-[var(--ds-border)] text-[var(--ds-text-dim)] hover:border-[var(--ds-warm)] hover:text-[var(--ds-warm)]"
      }`}
    >
      {watching ? "★" : "☆"}
    </button>
  );
}
