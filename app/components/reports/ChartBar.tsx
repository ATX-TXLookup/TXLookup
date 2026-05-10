// ChartBar — USAFacts-grade horizontal bar chart. Monochrome neutral bars
// with a single accent (--rep-accent) on the standout (top) bar. Hairline
// baseline only — no card surface, no rounded fills. Sits inside the editorial
// column; the wrapping <figure> in page.tsx supplies the per-chart caption.

type Bar = { label: string; value: number };

type Props = {
  label: string;
  bars: Bar[];
  unavailable?: boolean;
};

const ACCENT = "var(--rep-accent)";
const NEUTRAL = "#C9C7BE"; // muted warm gray, sits on #F8F7F4
const TEXT = "var(--rep-text)";
const MUTE = "#4B4F57";

export function ChartBar({ label, bars, unavailable }: Props) {
  const W = 720;
  const ROW_H = 30;
  const PAD_LEFT = 130;
  const PAD_RIGHT = 70;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const inner = W - PAD_LEFT - PAD_RIGHT;
  const H = bars.length * ROW_H + 28;

  return (
    <div>
      <p className="text-[15px] font-bold tracking-tight text-[var(--rep-text)]">
        {label}
      </p>
      {unavailable || bars.length === 0 ? (
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
          {/* hairline baseline */}
          <line
            x1={PAD_LEFT}
            y1={H - 14}
            x2={W - PAD_RIGHT}
            y2={H - 14}
            stroke={TEXT}
            strokeOpacity="0.15"
          />
          {bars.map((b, i) => {
            const y = i * ROW_H + 8;
            const w = (b.value / max) * inner;
            const isTop = i === 0;
            const fill = isTop ? ACCENT : NEUTRAL;
            return (
              <g key={`${b.label}-${i}`}>
                <text
                  x={PAD_LEFT - 12}
                  y={y + 16}
                  textAnchor="end"
                  fontSize="12"
                  fontFamily="var(--font-geist), ui-sans-serif, system-ui, sans-serif"
                  fill={MUTE}
                >
                  {b.label}
                </text>
                <rect
                  x={PAD_LEFT}
                  y={y + 5}
                  width={Math.max(2, w)}
                  height={ROW_H - 14}
                  fill={fill}
                  rx="0"
                />
                <text
                  x={PAD_LEFT + w + 10}
                  y={y + 16}
                  fontSize="12"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                  fontWeight="600"
                  fill={TEXT}
                >
                  {b.value.toLocaleString()}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
