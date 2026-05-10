// SmallMultiples — 2x2 / 4-up matrix of mini-charts for compare-across-N views.
// USAFacts often uses this for "same chart, different region" comparisons.

import { BarChart, type Bar } from "./BarChart";
import { Sparkline, type SparklinePoint } from "./Sparkline";
import { StatTile, type StatTileProps } from "./StatTile";

export type MultipleSpec =
  | { kind: "bar"; title: string; bars: Bar[] }
  | { kind: "sparkline"; title: string; points: SparklinePoint[]; accent?: "rust" | "gold" | "sky" | "navy"; current?: string }
  | { kind: "stat"; title: string; tile: Omit<StatTileProps, "label"> };

export type SmallMultiplesProps = {
  charts: MultipleSpec[];
  cols?: 2 | 3 | 4;
  title?: string;
  source?: string;
};

export function SmallMultiples({ charts, cols = 4, title, source }: SmallMultiplesProps) {
  const colsClass = cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4";
  return (
    <figure className="bg-white">
      {title && (
        <figcaption className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
          {title}
        </figcaption>
      )}
      <div className={`grid ${colsClass} gap-4`}>
        {charts.map((c, i) => (
          <div key={i} className="border border-tx-ink/10 p-3">
            {c.kind === "bar" && <BarChart title={c.title} bars={c.bars.slice(0, 5)} />}
            {c.kind === "sparkline" && (
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-tx-ink/65 mb-1">
                  {c.title}
                </p>
                <Sparkline points={c.points} accent={c.accent ?? "rust"} width={160} height={36} />
                {c.current && (
                  <p className="mt-1 text-base font-bold tabular-nums text-tx-navy">{c.current}</p>
                )}
              </div>
            )}
            {c.kind === "stat" && <StatTile {...c.tile} label={c.title} size="md" />}
          </div>
        ))}
      </div>
      {source && <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-tx-ink/55">Source · {source}</p>}
    </figure>
  );
}
