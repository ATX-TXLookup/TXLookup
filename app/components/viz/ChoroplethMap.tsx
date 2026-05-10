// ChoroplethMap — TX choropleth from a simplified region path file at data/geo/tx-counties-simplified.json.
// Renders inline SVG with cells colored by value. Used in /explore/map and /reports for geo storytelling.

import txCounties from "@/data/geo/tx-counties-simplified.json";

export type Region = { id: string; value: number; label?: string };

export type ChoroplethMapProps = {
  regions: Region[];
  bounds?: "texas-counties";
  scale?: "rust" | "gold" | "sky" | "navy";
  title?: string;
  source?: string;
  format?: (v: number) => string;
  height?: number;
};

const RGB = {
  rust: { r: 196, g: 66, b: 10 },
  gold: { r: 212, g: 139, b: 16 },
  sky: { r: 58, g: 127, b: 190 },
  navy: { r: 13, g: 35, b: 64 },
};

type GeoFile = {
  viewBox: string;
  regions: { id: string; name: string; path: string }[];
};

export function ChoroplethMap({
  regions,
  bounds = "texas-counties",
  scale = "rust",
  title,
  source,
  format,
  height = 380,
}: ChoroplethMapProps) {
  const geo = txCounties as GeoFile;
  const valuesById = Object.fromEntries(regions.map((r) => [r.id.toUpperCase(), r] as const));
  const allValues = regions.map((r) => r.value);
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const ramp = RGB[scale];
  const fmt = format ?? ((v: number) => v.toLocaleString());

  const colorFor = (v: number) => {
    const t = (v - min) / Math.max(max - min, 1);
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
      <div style={{ height }} className="w-full">
        <svg viewBox={geo.viewBox} className="w-full h-full" aria-hidden>
          {geo.regions.map((reg) => {
            const datum = valuesById[reg.id.toUpperCase()];
            const fill = datum ? colorFor(datum.value) : "#FAF7F2";
            return (
              <path
                key={reg.id}
                d={reg.path}
                fill={fill}
                stroke="#0D2340"
                strokeWidth={0.4}
                strokeOpacity={0.4}
              >
                <title>
                  {reg.name}
                  {datum ? `: ${fmt(datum.value)}` : ""}
                </title>
              </path>
            );
          })}
        </svg>
      </div>
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
