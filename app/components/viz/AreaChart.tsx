// AreaChart — stacked area for time series. USAFacts-style trend with composition.

export type AreaSeries = {
  label: string;
  values: number[];
  accent?: "rust" | "gold" | "sky" | "navy" | "sage";
};

export type AreaChartProps = {
  xLabels: string[];
  series: AreaSeries[];
  stacked?: boolean;
  title?: string;
  source?: string;
  height?: number;
};

const STROKE = {
  rust: "#C4420A",
  gold: "#D48B10",
  sky: "#3A7FBE",
  navy: "#0D2340",
  sage: "#3B6D3B",
};
const FILL = {
  rust: "#C4420A66",
  gold: "#D48B1066",
  sky: "#3A7FBE66",
  navy: "#0D234066",
  sage: "#3B6D3B66",
};

export function AreaChart({ xLabels, series, stacked = false, title, source, height = 220 }: AreaChartProps) {
  const margin = { top: 16, right: 12, bottom: 28, left: 36 };
  const width = 720;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  if (xLabels.length === 0 || series.length === 0) return null;

  // Compute stacked or overlay values
  const stack = stacked
    ? series.map((s, i) => {
        const below = series.slice(0, i).reduce((acc, prior) => acc.map((v, j) => v + prior.values[j]), new Array(xLabels.length).fill(0));
        return { ...s, baseline: below, top: below.map((v, j) => v + s.values[j]) };
      })
    : series.map((s) => ({ ...s, baseline: new Array(xLabels.length).fill(0), top: s.values }));

  const yMax = Math.max(...stack.map((s) => Math.max(...s.top))) * 1.1;
  const stepX = innerW / Math.max(xLabels.length - 1, 1);
  const yPos = (v: number) => innerH - (v / Math.max(yMax, 1)) * innerH;

  return (
    <figure className="bg-white">
      {title && (
        <figcaption className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
          {title}
        </figcaption>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" aria-hidden>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <line key={i} x1={0} x2={innerW} y1={innerH * t} y2={innerH * t} stroke="#1A1510" strokeOpacity={0.08} />
          ))}
          {stack.map((s, idx) => {
            const accent = s.accent ?? "navy";
            const topPath = s.top.map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)} ${yPos(v).toFixed(1)}`).join(" ");
            const reverseBase = [...s.baseline].reverse().map((v, i) => `L${((s.baseline.length - 1 - i) * stepX).toFixed(1)} ${yPos(v).toFixed(1)}`).join(" ");
            const closedPath = `${topPath} ${reverseBase} Z`;
            return (
              <g key={idx}>
                <path d={closedPath} fill={FILL[accent]} stroke={STROKE[accent]} strokeWidth={1.5} />
              </g>
            );
          })}
          {xLabels.map((x, i) => (
            <text key={i} x={i * stepX} y={innerH + 16} textAnchor="middle" fontSize={10} fill="#1A1510" fillOpacity={0.6} fontFamily="JetBrains Mono, monospace">
              {x}
            </text>
          ))}
        </g>
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tx-ink/75">
        {series.map((s, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2" style={{ backgroundColor: STROKE[s.accent ?? "navy"] }} />
            {s.label}
          </li>
        ))}
      </ul>
      {source && <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-tx-ink/55">Source · {source}</p>}
    </figure>
  );
}
