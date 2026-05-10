// LineChart — multi-series line chart with optional event annotations.
// USAFacts-style timeline (e.g. cost-by-decade with renovation event annotations).

export type LineSeries = {
  label: string;
  points: { x: number | string; y: number }[];
  accent?: "rust" | "gold" | "sky" | "navy";
};

export type LineAnnotation = {
  x: number | string;
  label: string;
};

export type LineChartProps = {
  series: LineSeries[];
  annotations?: LineAnnotation[];
  xLabel?: string;
  yLabel?: string;
  title?: string;
  source?: string;
  height?: number;
};

const STROKE = {
  rust: "#C4420A",
  gold: "#D48B10",
  sky: "#3A7FBE",
  navy: "#0D2340",
};

export function LineChart({
  series,
  annotations = [],
  xLabel,
  yLabel,
  title,
  source,
  height = 220,
}: LineChartProps) {
  const margin = { top: 16, right: 12, bottom: 28, left: 36 };
  const width = 720;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Combine all points to get x and y domains
  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) return null;

  const xs = allPoints.map((p) => (typeof p.x === "number" ? p.x : 0));
  const ys = allPoints.map((p) => p.y);
  const xUseLabels = typeof allPoints[0].x === "string";
  const xDomain = xUseLabels
    ? series[0].points.map((p) => p.x as string)
    : [Math.min(...xs), Math.max(...xs)];
  const yMin = 0;
  const yMax = Math.max(...ys) * 1.1;

  const xPos = (x: number | string) => {
    if (xUseLabels) {
      const idx = (xDomain as string[]).indexOf(x as string);
      return idx === -1 ? 0 : (idx / Math.max((xDomain as string[]).length - 1, 1)) * innerW;
    }
    const [lo, hi] = xDomain as [number, number];
    return ((Number(x) - lo) / Math.max(hi - lo, 1)) * innerW;
  };

  const yPos = (y: number) => innerH - ((y - yMin) / Math.max(yMax - yMin, 1)) * innerH;

  return (
    <figure className="bg-white">
      {title && (
        <figcaption className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
          {title}
        </figcaption>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" aria-hidden>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Y axis grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <g key={i}>
              <line
                x1={0}
                x2={innerW}
                y1={innerH * t}
                y2={innerH * t}
                stroke="#1A1510"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text x={-6} y={innerH * t + 3} textAnchor="end" fontSize={10} fill="#1A1510" fillOpacity={0.55} fontFamily="JetBrains Mono, monospace">
                {Math.round(yMax * (1 - t)).toLocaleString()}
              </text>
            </g>
          ))}
          {/* Annotations as vertical dotted rules */}
          {annotations.map((a, i) => (
            <g key={`ann-${i}`}>
              <line x1={xPos(a.x)} x2={xPos(a.x)} y1={0} y2={innerH} stroke="#D48B10" strokeWidth={1} strokeDasharray="3 3" />
              <text x={xPos(a.x) + 4} y={12} fontSize={10} fill="#D48B10" fontFamily="JetBrains Mono, monospace">
                {a.label}
              </text>
            </g>
          ))}
          {/* Series lines */}
          {series.map((s, idx) => {
            const accent = s.accent ?? "navy";
            const path = s.points
              .map((p, i) => `${i === 0 ? "M" : "L"}${xPos(p.x).toFixed(1)} ${yPos(p.y).toFixed(1)}`)
              .join(" ");
            return (
              <g key={`s-${idx}`}>
                <path d={path} fill="none" stroke={STROKE[accent]} strokeWidth={2} strokeLinejoin="round" />
                {s.points.map((p, j) => (
                  <circle key={j} cx={xPos(p.x)} cy={yPos(p.y)} r={2.5} fill={STROKE[accent]} />
                ))}
              </g>
            );
          })}
          {/* X axis labels */}
          {xUseLabels &&
            (xDomain as string[]).map((x, i) => (
              <text
                key={`xl-${i}`}
                x={xPos(x)}
                y={innerH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#1A1510"
                fillOpacity={0.6}
                fontFamily="JetBrains Mono, monospace"
              >
                {x}
              </text>
            ))}
          {xLabel && (
            <text x={innerW / 2} y={innerH + 26} textAnchor="middle" fontSize={10} fill="#1A1510" fillOpacity={0.65} fontFamily="JetBrains Mono, monospace">
              {xLabel}
            </text>
          )}
          {yLabel && (
            <text x={-innerH / 2} y={-26} textAnchor="middle" transform="rotate(-90)" fontSize={10} fill="#1A1510" fillOpacity={0.65} fontFamily="JetBrains Mono, monospace">
              {yLabel}
            </text>
          )}
        </g>
      </svg>
      {/* Legend if multi-series */}
      {series.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tx-ink/75">
          {series.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STROKE[s.accent ?? "navy"] }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      {source && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-tx-ink/55">
          Source · {source}
        </p>
      )}
    </figure>
  );
}
