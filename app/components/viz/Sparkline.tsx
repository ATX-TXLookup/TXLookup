// Sparkline — small inline trend line, no axis labels. USAFacts inline / hero stat companion.

export type SparklinePoint = { x: number | string; y: number };

export type SparklineProps = {
  points: SparklinePoint[];
  accent?: "rust" | "gold" | "sky" | "navy";
  width?: number;
  height?: number;
  showDots?: boolean;
};

const STROKE = {
  rust: "#C4420A",
  gold: "#D48B10",
  sky: "#3A7FBE",
  navy: "#0D2340",
};

const FILL = {
  rust: "#C4420A22",
  gold: "#D48B1022",
  sky: "#3A7FBE22",
  navy: "#0D234022",
};

export function Sparkline({
  points,
  accent = "rust",
  width = 120,
  height = 32,
  showDots = false,
}: SparklineProps) {
  if (points.length < 2) {
    return <div style={{ width, height }} className="bg-tx-cream" />;
  }
  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: height - 2 - ((p.y - minY) / range) * (height - 4),
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)} ${height} L0 ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={areaPath} fill={FILL[accent]} />
      <path d={linePath} fill="none" stroke={STROKE[accent]} strokeWidth={1.5} strokeLinejoin="round" />
      {showDots && coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={1.6} fill={STROKE[accent]} />
      ))}
    </svg>
  );
}
