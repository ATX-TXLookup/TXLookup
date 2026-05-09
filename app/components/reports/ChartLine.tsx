// ChartLine — inline-SVG line chart, no external deps. Under 80 LoC.

type Point = { x: string; y: number };

type Props = {
  label: string;
  points: Point[];
  unavailable?: boolean;
  caption?: string;
};

export function ChartLine({ label, points, unavailable, caption }: Props) {
  const W = 720;
  const H = 220;
  const PAD = { l: 40, r: 16, t: 16, b: 28 };
  const max = Math.max(1, ...points.map((p) => p.y));
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const path = points
    .map((p, i) => {
      const x =
        PAD.l + (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW);
      const y = PAD.t + innerH - (p.y / max) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <figure className="my-8 border border-[#1A1F2A]/10 bg-white p-6">
      <figcaption className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
        {label}
      </figcaption>
      {unavailable || points.length === 0 ? (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
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
            stroke="#1A1F2A"
            strokeOpacity="0.15"
          />
          <path d={path} fill="none" stroke="#0B5FFF" strokeWidth="2" />
          {points.length > 0 && (
            <>
              <text
                x={PAD.l}
                y={H - 8}
                fontSize="11"
                fontFamily="ui-monospace, monospace"
                fill="#1A1F2A"
                opacity="0.6"
              >
                {points[0].x}
              </text>
              <text
                x={W - PAD.r}
                y={H - 8}
                fontSize="11"
                fontFamily="ui-monospace, monospace"
                fill="#1A1F2A"
                opacity="0.6"
                textAnchor="end"
              >
                {points[points.length - 1].x}
              </text>
            </>
          )}
        </svg>
      )}
      {caption && !unavailable && (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
          {caption}
        </p>
      )}
    </figure>
  );
}
