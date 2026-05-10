// ChartBar — inline-SVG horizontal bar chart, no external deps.
// BRAND.md §3 data palette: bars in tx-sky, top (highlight) bar in tx-gold,
// labels in IBM Plex Mono, value in tx-navy. Cream card surface, hairline border.

type Bar = { label: string; value: number };

type Props = {
  label: string;
  bars: Bar[];
  unavailable?: boolean;
  caption?: string;
};

// CSS-var refs map to brand tokens; SVG can't consume Tailwind classes.
// These resolve to tx-sky / tx-gold / tx-navy / tx-ink at the document level.
const SKY = "var(--tx-sky)";
const GOLD = "var(--tx-gold)";
const NAVY = "var(--tx-navy)";
const INK = "var(--tx-ink)";

export function ChartBar({ label, bars, unavailable, caption }: Props) {
  const W = 720;
  const ROW_H = 32;
  const PAD_LEFT = 110;
  const PAD_RIGHT = 64;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const inner = W - PAD_LEFT - PAD_RIGHT;
  const H = bars.length * ROW_H + 16;

  return (
    <figure className="my-8 rounded-[10px] border border-[color:var(--tx-border)] bg-tx-cream p-6">
      <figcaption className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-tx-rust">
        {label}
      </figcaption>
      {unavailable || bars.length === 0 ? (
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
          {bars.map((b, i) => {
            const y = i * ROW_H + 8;
            const w = (b.value / max) * inner;
            // Highlight the top bar (input is sorted DESC by value).
            const isTop = i === 0;
            const fill = isTop ? GOLD : SKY;
            return (
              <g key={`${b.label}-${i}`}>
                <text
                  x={PAD_LEFT - 10}
                  y={y + 16}
                  textAnchor="end"
                  fontSize="12"
                  fontFamily="'IBM Plex Mono', ui-monospace, monospace"
                  fill={INK}
                  fillOpacity="0.75"
                >
                  {b.label}
                </text>
                <rect
                  x={PAD_LEFT}
                  y={y + 4}
                  width={Math.max(2, w)}
                  height={ROW_H - 12}
                  fill={fill}
                  rx="2"
                />
                <text
                  x={PAD_LEFT + w + 8}
                  y={y + 16}
                  fontSize="12"
                  fontFamily="'IBM Plex Mono', ui-monospace, monospace"
                  fontWeight="600"
                  fill={NAVY}
                >
                  {b.value.toLocaleString()}
                </text>
              </g>
            );
          })}
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
