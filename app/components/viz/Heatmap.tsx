// Heatmap — 2D grid (e.g. zips × months, districts × complaint types).
// Sequential color ramp from cream → accent at max.

export type HeatmapCell = { label?: string; value: number };
export type HeatmapRow = { label: string; cells: HeatmapCell[] };

export type HeatmapProps = {
  rows: HeatmapRow[];
  colLabels: string[];
  scale?: "rust" | "gold" | "sky" | "navy";
  title?: string;
  source?: string;
  format?: (v: number) => string;
};

const RGB = {
  rust: { r: 196, g: 66, b: 10 },
  gold: { r: 212, g: 139, b: 16 },
  sky: { r: 58, g: 127, b: 190 },
  navy: { r: 13, g: 35, b: 64 },
};

export function Heatmap({ rows, colLabels, scale = "rust", title, source, format }: HeatmapProps) {
  const allValues = rows.flatMap((r) => r.cells.map((c) => c.value));
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const fmt = format ?? ((v: number) => v.toLocaleString());
  const ramp = RGB[scale];

  const colorFor = (v: number) => {
    const t = (v - min) / Math.max(max - min, 1); // 0..1
    // Blend cream (#FAF7F2 = 250,247,242) → ramp
    const r = Math.round(250 + (ramp.r - 250) * t);
    const g = Math.round(247 + (ramp.g - 247) * t);
    const b = Math.round(242 + (ramp.b - 242) * t);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <figure className="bg-white">
      {title && (
        <figcaption className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
          {title}
        </figcaption>
      )}
      <div className="overflow-x-auto">
        <table className="border-collapse text-left">
          <thead>
            <tr>
              <th className="bg-white px-2 py-1" />
              {colLabels.map((c, i) => (
                <th key={i} className="font-mono text-[10px] font-semibold uppercase tracking-wider text-tx-ink/65 px-2 py-1">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                <td className="font-mono text-[11px] uppercase tracking-wider text-tx-ink/75 pr-3 py-1 whitespace-nowrap">
                  {row.label}
                </td>
                {row.cells.map((c, ci) => (
                  <td
                    key={ci}
                    title={`${row.label} × ${colLabels[ci] ?? ""}: ${fmt(c.value)}`}
                    className="font-mono text-[10px] tabular-nums text-tx-navy text-center px-2 py-1"
                    style={{ backgroundColor: colorFor(c.value), minWidth: 44 }}
                  >
                    {fmt(c.value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Scale legend */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-tx-ink/55 font-mono uppercase tracking-wider">
        <span>{fmt(min)}</span>
        <div
          className="h-2 w-32"
          style={{ background: `linear-gradient(90deg, ${colorFor(min)} 0%, ${colorFor(max)} 100%)` }}
        />
        <span>{fmt(max)}</span>
      </div>
      {source && <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-tx-ink/55">Source · {source}</p>}
    </figure>
  );
}
