// Small badge that surfaces where a stat came from + how fresh it is.
//
// "live"          → accent dot, "live · just now"
// "cache"         → good (green) dot, "mirror · 2h ago"
// "cache-stale"   → warm (amber) dot, "mirror (stale) · 18h ago"
// "miss"          → text-dim dot, "data unavailable"
//
// Used on every visible Socrata-backed stat tile and insight card so the
// resilience layer is a visible trust signal rather than an invisible
// workaround.

import { ageLabel } from "../../lib/cached-stats";

type Source = "cache" | "live" | "cache-stale" | "miss" | string;

export function DataSourceBadge({
  source,
  ageSeconds,
  size = "xs",
}: {
  source: Source;
  ageSeconds: number | null;
  size?: "xs" | "sm";
}) {
  const map: Record<string, { label: string; color: string }> = {
    cache: { label: `Mirror · ${ageLabel(ageSeconds)}`, color: "var(--ds-good)" },
    "cache-stale": { label: `Mirror (stale) · ${ageLabel(ageSeconds)}`, color: "var(--ds-warm)" },
    live: { label: `Live · ${ageLabel(ageSeconds ?? 0)}`, color: "var(--ds-accent)" },
    miss: { label: `Data unavailable`, color: "var(--ds-text-dim)" },
  };
  const m = map[source] ?? map.miss;
  const sz = size === "sm" ? "text-[11px]" : "text-[9.5px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.1em] text-[var(--ds-text-dim)] ${sz}`}
      title={`source: ${source}${ageSeconds !== null ? ` · ${ageSeconds}s old` : ""}`}
    >
      <span
        className="inline-block h-[5px] w-[5px] rounded-full"
        style={{ background: m.color }}
        aria-hidden
      />
      <span>{m.label}</span>
    </span>
  );
}
