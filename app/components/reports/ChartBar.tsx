// ChartBar — inline-SVG horizontal bar chart, no external deps.
// Stays under 80 LoC, civic-portal palette.

type Bar = { label: string; value: number };

type Props = {
  label: string;
  bars: Bar[];
  unavailable?: boolean;
  caption?: string;
};

export function ChartBar({ label, bars, unavailable, caption }: Props) {
  const W = 720;
  const ROW_H = 28;
  const PAD_LEFT = 110;
  const PAD_RIGHT = 60;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const inner = W - PAD_LEFT - PAD_RIGHT;
  const H = bars.length * ROW_H + 16;

  return (
    <figure className="my-8 border border-[#1A1F2A]/10 bg-white p-6">
      <figcaption className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
        {label}
      </figcaption>
      {unavailable || bars.length === 0 ? (
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
          {bars.map((b, i) => {
            const y = i * ROW_H + 8;
            const w = (b.value / max) * inner;
            return (
              <g key={`${b.label}-${i}`}>
                <text
                  x={PAD_LEFT - 8}
                  y={y + 14}
                  textAnchor="end"
                  fontSize="12"
                  fontFamily="ui-monospace, monospace"
                  fill="#1A1F2A"
                >
                  {b.label}
                </text>
                <rect
                  x={PAD_LEFT}
                  y={y + 4}
                  width={Math.max(2, w)}
                  height={ROW_H - 12}
                  fill="#0B5FFF"
                />
                <text
                  x={PAD_LEFT + w + 6}
                  y={y + 14}
                  fontSize="12"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="600"
                  fill="#0B2545"
                >
                  {b.value.toLocaleString()}
                </text>
              </g>
            );
          })}
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
