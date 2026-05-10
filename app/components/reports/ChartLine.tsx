// ChartLine — USAFacts-grade thin line chart. Single accent stroke
// (--rep-accent), no fill, no card surface. Small annotation chips mark the
// first, last, and peak points so readers can scan the shape. Page-level
// <figure> supplies the source caption.

type Point = { x: string; y: number };

type Props = {
  label: string;
  points: Point[];
  unavailable?: boolean;
};

const ACCENT = "var(--rep-accent)";
const TEXT = "var(--rep-text)";
const MUTE = "#4B4F57";

export function ChartLine({ label, points, unavailable }: Props) {
  const W = 720;
  const H = 240;
  const PAD = { l: 48, r: 24, t: 28, b: 36 };
  const max = Math.max(1, ...points.map((p) => p.y));
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const coords = points.map((p, i) => {
    const x =
      PAD.l + (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW);
    const y = PAD.t + innerH - (p.y / max) * innerH;
    return { x, y, raw: p };
  });
  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  // Find peak for annotation.
  let peakIdx = 0;
  for (let i = 1; i < coords.length; i++) {
    if (coords[i].raw.y > coords[peakIdx].raw.y) peakIdx = i;
  }

  return (
    <div>
      <p className="text-[15px] font-bold tracking-tight text-[var(--rep-text)]">
        {label}
      </p>
      {unavailable || points.length === 0 ? (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#86827A]">
          Data temporarily unavailable
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={label}
          className="mt-4"
        >
          {/* baseline */}
          <line
            x1={PAD.l}
            y1={PAD.t + innerH}
            x2={W - PAD.r}
            y2={PAD.t + innerH}
            stroke={TEXT}
            strokeOpacity="0.15"
          />
          {/* the line */}
          <path
            d={linePath}
            fill="none"
            stroke={ACCENT}
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* peak annotation chip */}
          {coords.length > 2 &&
            peakIdx > 0 &&
            peakIdx < coords.length - 1 && (
              <g>
                <circle
                  cx={coords[peakIdx].x}
                  cy={coords[peakIdx].y}
                  r="3"
                  fill={ACCENT}
                />
                <text
                  x={coords[peakIdx].x}
                  y={coords[peakIdx].y - 10}
                  fontSize="11"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                  fontWeight="600"
                  fill={TEXT}
                  textAnchor="middle"
                >
                  Peak {coords[peakIdx].raw.y.toLocaleString()}
                </text>
              </g>
            )}
          {/* endpoint dots */}
          {coords.length > 0 && (
            <>
              <circle
                cx={coords[0].x}
                cy={coords[0].y}
                r="2.5"
                fill={ACCENT}
              />
              <circle
                cx={coords[coords.length - 1].x}
                cy={coords[coords.length - 1].y}
                r="2.5"
                fill={ACCENT}
              />
              <text
                x={PAD.l}
                y={H - 12}
                fontSize="10.5"
                fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                fill={MUTE}
                style={{ letterSpacing: "0.08em" }}
              >
                {points[0].x.toUpperCase()}
              </text>
              <text
                x={W - PAD.r}
                y={H - 12}
                fontSize="10.5"
                fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                fill={MUTE}
                textAnchor="end"
                style={{ letterSpacing: "0.08em" }}
              >
                {points[points.length - 1].x.toUpperCase()}
              </text>
            </>
          )}
        </svg>
      )}
    </div>
  );
}
