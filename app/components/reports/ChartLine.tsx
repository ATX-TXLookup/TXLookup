// ChartLine — inline-SVG line/sparkline, no external deps.
// BRAND.md §3 data palette: tx-sky stroke, low-opacity tx-sky-light fill,
// IBM Plex Mono x-axis labels. Cream card surface to match StatBlock/ChartBar.

type Point = { x: string; y: number };

type Props = {
  label: string;
  points: Point[];
  unavailable?: boolean;
  caption?: string;
};

// CSS-var refs map to brand tokens; SVG can't consume Tailwind classes.
const SKY = "var(--tx-sky)";
const SKY_LIGHT = "var(--tx-sky-light)";
const INK = "var(--tx-ink)";

export function ChartLine({ label, points, unavailable, caption }: Props) {
  const W = 720;
  const H = 220;
  const PAD = { l: 40, r: 16, t: 16, b: 28 };
  const max = Math.max(1, ...points.map((p) => p.y));
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  // Build the stroke path and a closed area path for the soft fill.
  const coords = points.map((p, i) => {
    const x =
      PAD.l + (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW);
    const y = PAD.t + innerH - (p.y / max) * innerH;
    return { x, y };
  });
  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(PAD.t + innerH).toFixed(1)} L${coords[0].x.toFixed(1)},${(PAD.t + innerH).toFixed(1)} Z`
      : "";

  return (
    <figure className="my-8 rounded-[10px] border border-[color:var(--tx-border)] bg-tx-cream p-6">
      <figcaption className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-tx-rust">
        {label}
      </figcaption>
      {unavailable || points.length === 0 ? (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-tx-muted">
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
          <line
            x1={PAD.l}
            y1={PAD.t + innerH}
            x2={W - PAD.r}
            y2={PAD.t + innerH}
            stroke={INK}
            strokeOpacity="0.15"
          />
          {areaPath && (
            <path d={areaPath} fill={SKY_LIGHT} fillOpacity="0.55" />
          )}
          <path
            d={linePath}
            fill="none"
            stroke={SKY}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.length > 0 && (
            <>
              <text
                x={PAD.l}
                y={H - 8}
                fontSize="11"
                fontFamily="'IBM Plex Mono', ui-monospace, monospace"
                fill={INK}
                opacity="0.55"
              >
                {points[0].x}
              </text>
              <text
                x={W - PAD.r}
                y={H - 8}
                fontSize="11"
                fontFamily="'IBM Plex Mono', ui-monospace, monospace"
                fill={INK}
                opacity="0.55"
                textAnchor="end"
              >
                {points[points.length - 1].x}
              </text>
            </>
          )}
        </svg>
      )}
      {caption && !unavailable && (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-tx-muted">
          {caption}
        </p>
      )}
    </figure>
  );
}
