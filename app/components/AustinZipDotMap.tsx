"use client";

// Austin zip-code dot map — inline SVG, dark palette.
// Interactive: hover a dot for a tooltip card with the zip + name + count.
// Click a dot to navigate to /q with a question scoped to that zip.
// Used in /reports/austin-permits-heatmap (and reusable elsewhere).
//
// Centroids are hand-picked approximate lat/lng for ~30 Austin metro zips
// converted to viewBox coordinates. Not survey-grade — good enough for a
// "where are the dots clustered" visual at hackathon scale.
//
// Pass `counts` as { [zip]: number }. The dot radius is proportional to
// sqrt(count) so visual area = count. Top zips get labels, others get
// hover tooltips only.

const C = {
  bg: "var(--ds-bg-elev)",
  border: "var(--ds-border-strong)",
  text: "var(--ds-text)",
  textMute: "var(--ds-text-mute)",
  textDim: "var(--ds-text-dim)",
  accent: "var(--ds-accent)",
  good: "var(--ds-good)",
  warm: "var(--ds-warm)",
  purple: "var(--ds-purple)",
};

// Austin metro zip centroids → viewBox 0..720 × 0..540.
// Origin (0,0) is northwest corner. Approx mapping: longitude west→east,
// latitude north→south. Hand-tuned so downtown ends up near (430, 290).
const ZIP_CENTROIDS: Record<string, { x: number; y: number; name: string }> = {
  "78701": { x: 430, y: 290, name: "Downtown" },
  "78702": { x: 470, y: 295, name: "East Austin" },
  "78703": { x: 405, y: 265, name: "Tarrytown" },
  "78704": { x: 415, y: 335, name: "South Austin" },
  "78705": { x: 415, y: 250, name: "West Campus" },
  "78717": { x: 365, y: 110, name: "Avery Ranch" },
  "78721": { x: 510, y: 290, name: "MLK / 183" },
  "78722": { x: 460, y: 270, name: "Cherrywood" },
  "78723": { x: 510, y: 250, name: "Mueller" },
  "78724": { x: 555, y: 245, name: "Daffan" },
  "78725": { x: 580, y: 285, name: "Hornsby Bend" },
  "78726": { x: 290, y: 195, name: "Anderson Mill" },
  "78727": { x: 415, y: 165, name: "Wells Branch S" },
  "78728": { x: 460, y: 145, name: "Wells Branch N" },
  "78729": { x: 365, y: 175, name: "Jollyville" },
  "78730": { x: 305, y: 245, name: "River Place" },
  "78731": { x: 365, y: 235, name: "Northwest Hills" },
  "78732": { x: 270, y: 275, name: "Steiner Ranch" },
  "78733": { x: 285, y: 305, name: "Bee Cave / Ridge" },
  "78734": { x: 230, y: 275, name: "Lakeway / Lk Travis" },
  "78735": { x: 340, y: 365, name: "Oak Hill SW" },
  "78736": { x: 290, y: 365, name: "Bear Creek" },
  "78737": { x: 285, y: 405, name: "Buda / 290" },
  "78738": { x: 215, y: 320, name: "Hudson Bend" },
  "78739": { x: 345, y: 415, name: "Circle C" },
  "78741": { x: 470, y: 335, name: "Riverside" },
  "78742": { x: 540, y: 330, name: "Montopolis" },
  "78744": { x: 460, y: 380, name: "Onion Creek N" },
  "78745": { x: 400, y: 385, name: "South Central" },
  "78747": { x: 470, y: 430, name: "Onion Creek S" },
  "78748": { x: 415, y: 430, name: "Slaughter" },
  "78749": { x: 365, y: 395, name: "Maple Run" },
  "78750": { x: 340, y: 175, name: "Anderson Mill SE" },
  "78751": { x: 445, y: 245, name: "Hyde Park" },
  "78752": { x: 460, y: 215, name: "Highland" },
  "78753": { x: 480, y: 175, name: "Tech Ridge S" },
  "78754": { x: 525, y: 195, name: "Tech Ridge E" },
  "78756": { x: 425, y: 230, name: "Brentwood" },
  "78757": { x: 425, y: 200, name: "Crestview" },
  "78758": { x: 445, y: 175, name: "North Lamar" },
  "78759": { x: 405, y: 180, name: "Far West" },
};

export type AustinZipDotMapProps = {
  counts: Record<string, number>;
  /** Color tone for the dots. */
  tone?: "accent" | "good" | "warm" | "purple";
  /** How many top zips to label inline. Default 6. */
  labelTop?: number;
  height?: number;
  /** Default click handler asks the agent about the zip. Override to swap behavior. */
  onZipClick?: (zip: string) => void;
  /** Question to fire on click. {zip} is replaced. Default "Tell me about {zip} in Austin". */
  questionTemplate?: string;
  /** Singular word that follows the count in the tooltip. Default "permits". */
  unit?: string;
};

const TONE_FILL: Record<NonNullable<AustinZipDotMapProps["tone"]>, string> = {
  accent: C.accent,
  good: C.good,
  warm: C.warm,
  purple: C.purple,
};

// Hooks must come AFTER the "use client" directive (already at top of file).
import { useState } from "react";

export function AustinZipDotMap({
  counts,
  tone = "accent",
  labelTop = 6,
  height,
  onZipClick,
  questionTemplate = "Tell me about {zip} in Austin",
  unit = "permits",
}: AustinZipDotMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const ranked = Object.entries(counts)
    .filter(([z]) => ZIP_CENTROIDS[z])
    .sort(([, a], [, b]) => b - a);
  const max = Math.max(1, ...ranked.map(([, n]) => n));
  const min = Math.min(...ranked.map(([, n]) => n).filter((n) => n > 0), 1);
  const tops = new Set(ranked.slice(0, labelTop).map(([z]) => z));
  const fill = TONE_FILL[tone];
  const totalDots = ranked.length;
  const totalRows = ranked.reduce((s, [, n]) => s + n, 0);

  const handleClick = (zip: string) => {
    if (onZipClick) onZipClick(zip);
    else {
      const q = questionTemplate.replace("{zip}", zip);
      if (typeof window !== "undefined") window.location.assign(`/q?q=${encodeURIComponent(q)}`);
    }
  };

  // Radius range — visually map area to count: r = sqrt(t) * (20 - 4) + 4
  const radiusFor = (n: number): number => {
    if (n <= 0) return 3;
    const t = (n - min) / Math.max(max - min, 1);
    return 4 + Math.sqrt(t) * 16;
  };

  return (
    <div className="relative">
    <svg
      viewBox="0 0 720 540"
      className="block w-full"
      style={{ height: height ? `${height}px` : "auto" }}
      role="img"
      aria-label="Austin zip code permit density map · interactive · click a dot to ask the agent"
    >
      <defs>
        <radialGradient id="austin-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={fill} stopOpacity="0.18" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </radialGradient>
        <filter id="austin-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Background glow centered on downtown */}
      <ellipse cx="430" cy="290" rx="240" ry="180" fill="url(#austin-glow)" />

      {/* Subtle Austin-metro outline (oblong polygon following I-35 corridor) */}
      <path
        d="M 200 130 Q 320 100, 450 110 Q 580 125, 620 220 Q 640 320, 580 420 Q 480 480, 380 470 Q 280 460, 220 400 Q 170 320, 180 240 Q 185 175, 200 130 Z"
        fill={C.bg}
        stroke={C.border}
        strokeWidth={1}
      />

      {/* I-35 spine (vertical-ish reference line) */}
      <line
        x1="450"
        y1="120"
        x2="460"
        y2="460"
        stroke={C.border}
        strokeWidth={0.6}
        strokeDasharray="3,4"
      />
      <text x="465" y="126" fontSize="9" fontFamily="ui-monospace, monospace" fill={C.textDim}>
        I-35
      </text>

      {/* Lake Austin / Colorado River wave */}
      <path
        d="M 200 280 Q 280 270, 360 295 Q 430 315, 510 305 Q 580 298, 620 318"
        stroke={C.accent}
        strokeOpacity={0.18}
        strokeWidth={3}
        fill="none"
      />

      {/* Downtown crosshair */}
      <circle cx={430} cy={290} r={2} fill={C.textDim} />
      <text
        x={415}
        y={282}
        fontSize="9"
        fontFamily="ui-monospace, monospace"
        fill={C.textDim}
      >
        downtown
      </text>

      {/* Dots */}
      {ranked.map(([zip, n]) => {
        const c = ZIP_CENTROIDS[zip];
        if (!c) return null;
        const r = radiusFor(n);
        const isTop = tops.has(zip);
        const isHovered = hovered === zip;
        return (
          <g
            key={zip}
            onMouseEnter={() => setHovered(zip)}
            onMouseLeave={() => setHovered((h) => (h === zip ? null : h))}
            onClick={() => handleClick(zip)}
            style={{ cursor: "pointer" }}
          >
            {isTop && (
              <circle
                cx={c.x}
                cy={c.y}
                r={r * 1.6}
                fill={fill}
                opacity={0.18}
                filter="url(#austin-soft)"
              >
                <animate
                  attributeName="r"
                  values={`${r * 1.4};${r * 2.2};${r * 1.4}`}
                  dur="2.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.30;0.06;0.30"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            {isHovered && (
              <circle
                cx={c.x}
                cy={c.y}
                r={r + 6}
                fill="none"
                stroke={fill}
                strokeWidth={1.5}
                opacity={0.7}
              />
            )}
            {/* Hit-target — invisible but generously large for click ergonomics */}
            <circle cx={c.x} cy={c.y} r={Math.max(r + 6, 12)} fill="transparent" />
            <circle cx={c.x} cy={c.y} r={r} fill={fill} stroke={isHovered ? C.text : C.bg} strokeWidth={isTop || isHovered ? 2 : 1}>
              <title>{`${zip} · ${c.name} · ${n.toLocaleString()} ${unit} · click to ask the agent`}</title>
            </circle>
            {isTop && (
              <g>
                <text
                  x={c.x + r + 5}
                  y={c.y - 1}
                  fontSize="11"
                  fontFamily="Inter, sans-serif"
                  fontWeight={600}
                  fill={C.text}
                >
                  {zip}
                </text>
                <text
                  x={c.x + r + 5}
                  y={c.y + 12}
                  fontSize="9"
                  fontFamily="ui-monospace, monospace"
                  fill={C.textMute}
                >
                  {n.toLocaleString()} permits
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Legend / corpus tile bottom-left */}
      <g transform="translate(20, 460)">
        <rect width={170} height={62} rx={6} fill={C.bg} stroke={C.border} strokeWidth={1} />
        <text
          x={12}
          y={18}
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fill={C.textMute}
          letterSpacing="1.5"
        >
          AUSTIN · BY ZIP
        </text>
        <text
          x={12}
          y={40}
          fontSize="20"
          fontFamily="Inter, sans-serif"
          fontWeight={700}
          fill={C.text}
        >
          {totalDots}
        </text>
        <text x={42} y={40} fontSize="11" fontFamily="ui-monospace, monospace" fill={C.textDim}>
          zips with permits
        </text>
        <text
          x={12}
          y={54}
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fill={fill}
        >
          ● {totalRows.toLocaleString()} permit total · top 6 labelled
        </text>
      </g>

      {/* Compass */}
      <g transform="translate(680, 50)">
        <circle r={14} fill="none" stroke={C.border} strokeWidth={1} />
        <text textAnchor="middle" y={-18} fontSize="9" fontFamily="ui-monospace, monospace" fill={C.textMute}>
          N
        </text>
        <line x1={0} y1={-10} x2={0} y2={10} stroke={C.textDim} strokeWidth={0.8} />
        <line x1={-10} y1={0} x2={10} y2={0} stroke={C.textDim} strokeWidth={0.8} />
      </g>
    </svg>

    {/* Floating hover tooltip — positioned by zip centroid as % of viewBox */}
    {(() => {
      if (!hovered) return null;
      const c = ZIP_CENTROIDS[hovered];
      const n = counts[hovered] ?? 0;
      if (!c) return null;
      // Position the card at the dot, clamping to the right edge.
      const xPct = Math.min(c.x / 720, 0.65) * 100;
      const yPct = Math.min(c.y / 540, 0.85) * 100;
      return (
        <div
          className="pointer-events-none absolute"
          style={{ left: `${xPct}%`, top: `${yPct}%`, transform: "translate(8px, -50%)" }}
        >
          <div className="rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg)] px-3 py-2 shadow-lg">
            <p className="text-[12px] font-bold tabular-nums text-[var(--ds-text)]">{hovered}</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-mute)]">
              {c.name}
            </p>
            <p className="mt-1 text-[11px] tabular-nums" style={{ color: fill }}>
              {n.toLocaleString()} {unit}
            </p>
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--ds-text-dim)]">
              click to ask agent →
            </p>
          </div>
        </div>
      );
    })()}

    {/* Status footer */}
    <div className="mt-2 flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
      <span>● Hover a dot for detail · click to ask the agent</span>
      <span>{totalDots} zips · {totalRows.toLocaleString()} {unit}</span>
    </div>
    </div>
  );
}
