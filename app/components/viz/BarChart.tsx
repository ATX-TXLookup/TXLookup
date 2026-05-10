// BarChart — labeled horizontal bars with values at end, optional accent override per bar.
// USAFacts-style: monochrome base with single accent on the standout bar.

export type Bar = {
  label: string;
  value: number;
  accent?: "rust" | "gold" | "sky" | "navy" | "neutral";
  caption?: string;
};

export type BarChartProps = {
  bars: Bar[];
  title?: string;
  unit?: string;
  maxValue?: number;
  format?: (v: number) => string;
  source?: string;
};

const FILL = {
  navy: "bg-tx-navy",
  rust: "bg-tx-rust",
  gold: "bg-tx-gold",
  sky: "bg-tx-sky",
  neutral: "bg-tx-ink/30",
};

export function BarChart({ bars, title, unit, maxValue, format, source }: BarChartProps) {
  const max = maxValue ?? Math.max(...bars.map((b) => b.value), 1);
  const fmt = format ?? ((v: number) => v.toLocaleString());

  return (
    <figure className="bg-white">
      {title && (
        <figcaption className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
          {title}
          {unit && <span className="ml-1.5 normal-case tracking-normal text-tx-ink/55">({unit})</span>}
        </figcaption>
      )}
      <ul className="space-y-2">
        {bars.map((b, i) => {
          const pct = (b.value / max) * 100;
          const accent = b.accent ?? "navy";
          return (
            <li key={`${b.label}-${i}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-tx-ink/75 min-w-[80px]">
                {b.label}
              </span>
              <div className="h-5 bg-tx-cream relative">
                <div
                  className={`h-full ${FILL[accent]} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
                {b.caption && (
                  <span className="absolute left-2 top-0 bottom-0 flex items-center font-mono text-[10px] text-white/85 mix-blend-difference">
                    {b.caption}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums text-tx-navy min-w-[60px] text-right">
                {fmt(b.value)}
              </span>
            </li>
          );
        })}
      </ul>
      {source && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-tx-ink/55">
          Source · {source}
        </p>
      )}
    </figure>
  );
}
