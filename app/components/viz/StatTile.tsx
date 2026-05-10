// StatTile — USAFacts-style hero stat. Big tabular value, label, optional delta + caption.
// Used in /reports hero sections, /datasets cards, agent operations center.

import type { ReactNode } from "react";

export type DeltaTone = "up" | "down" | "flat";

export type StatTileProps = {
  value: ReactNode;
  label: string;
  delta?: { value: string; tone: DeltaTone; vs?: string };
  caption?: string;
  size?: "md" | "lg" | "xl";
  accent?: "navy" | "rust" | "gold" | "sky";
};

const SIZE = {
  md: { value: "text-3xl", label: "text-[10px]", delta: "text-[11px]" },
  lg: { value: "text-4xl md:text-5xl", label: "text-[11px]", delta: "text-xs" },
  xl: { value: "text-5xl md:text-6xl", label: "text-xs", delta: "text-sm" },
};

const ACCENT_BORDER = {
  navy: "border-l-tx-navy",
  rust: "border-l-tx-rust",
  gold: "border-l-tx-gold",
  sky: "border-l-tx-sky",
};

const TONE = {
  up: { color: "text-tx-sage", glyph: "▲" },
  down: { color: "text-tx-rust", glyph: "▼" },
  flat: { color: "text-tx-ink/60", glyph: "—" },
};

export function StatTile({ value, label, delta, caption, size = "lg", accent = "navy" }: StatTileProps) {
  const s = SIZE[size];
  return (
    <div
      className={`border-l-[3px] ${ACCENT_BORDER[accent]} bg-white pl-4 pr-3 py-3`}
    >
      <div className={`${s.value} font-bold leading-none tabular-nums text-tx-navy`}>
        {value}
      </div>
      <div className={`mt-1.5 font-mono ${s.label} font-semibold uppercase tracking-[0.16em] text-tx-ink/65`}>
        {label}
      </div>
      {delta && (
        <div className={`mt-1.5 font-mono ${s.delta} ${TONE[delta.tone].color}`}>
          <span className="mr-1">{TONE[delta.tone].glyph}</span>
          <span className="font-semibold tabular-nums">{delta.value}</span>
          {delta.vs && <span className="ml-1 text-tx-ink/55">{delta.vs}</span>}
        </div>
      )}
      {caption && (
        <p className="mt-2 text-[11px] leading-snug text-tx-ink/60">{caption}</p>
      )}
    </div>
  );
}
