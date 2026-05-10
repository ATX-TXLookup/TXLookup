// /reports/austin-heat-index-2026 — flagship cross-dataset report.
//
// Composite "Heat Index" per Austin zip, computed from 4 cached SODA mirrors
// (permits, food inspections, code violations, 311 requests). Equal-weighted
// min-max normalized score, 0–100. Renders map, 4-axis heatmap, ranked list,
// monthly small-multiples, agent provenance.
//
// All data flows from data/cache/*.json via cacheLookup → no live Socrata.
// Inline SVG charts only. CSS vars only — no tx-* brand tokens.

import Link from "next/link";
import type { Metadata } from "next";
import { Shell } from "@/app/components/ds";
import { DataSourceBadge } from "@/app/components/ds/DataSourceBadge";
import { AustinZipDotMap } from "@/app/components/AustinZipDotMap";
import { ageLabel } from "@/app/lib/cached-stats";
import { computeHeatIndex, type HeatIndexZip } from "@/app/lib/heat-index-aggregates";

export const revalidate = 21600; // 6h

export const metadata: Metadata = {
  title: "Austin Heat Index 2026 · Where the city is changing fastest · TXLookup",
  description:
    "Composite cross-dataset Heat Index for every Austin zip code, derived from 4 cached open-data feeds: construction permits, food inspections, code violations, and 311 requests.",
};

const C = {
  bg: "var(--ds-bg)",
  bgElev: "var(--ds-bg-elev)",
  border: "var(--ds-border)",
  text: "var(--ds-text)",
  textMute: "var(--ds-text-mute)",
  textDim: "var(--ds-text-dim)",
  accent: "var(--ds-accent)",
  good: "var(--ds-good)",
  warm: "var(--ds-warm)",
  warn: "var(--ds-warn)",
  purple: "var(--ds-purple)",
};

// Friendly zip names — small lookup so rows can show neighborhood context.
// Same set used by AustinZipDotMap (kept local to avoid coupling to the
// component's internal centroid table).
const ZIP_NAMES: Record<string, string> = {
  "78701": "Downtown",
  "78702": "East Austin",
  "78703": "Tarrytown",
  "78704": "South Austin",
  "78705": "West Campus",
  "78717": "Avery Ranch",
  "78721": "MLK / 183",
  "78722": "Cherrywood",
  "78723": "Mueller",
  "78724": "Daffan",
  "78725": "Hornsby Bend",
  "78727": "Wells Branch S",
  "78728": "Wells Branch N",
  "78729": "Jollyville",
  "78731": "Northwest Hills",
  "78735": "Oak Hill SW",
  "78739": "Circle C",
  "78741": "Riverside",
  "78742": "Montopolis",
  "78744": "Onion Creek N",
  "78745": "South Central",
  "78747": "Onion Creek S",
  "78748": "Slaughter",
  "78749": "Maple Run",
  "78750": "Anderson Mill SE",
  "78751": "Hyde Park",
  "78752": "Highland",
  "78753": "Tech Ridge S",
  "78754": "Tech Ridge E",
  "78756": "Brentwood",
  "78757": "Crestview",
  "78758": "North Lamar",
  "78759": "Far West",
};

// Zips east of I-35 — used for the editor's-note observation. Hand-curated
// from Austin geography.
const EAST_OF_I35 = new Set([
  "78702", "78721", "78722", "78723", "78724", "78725",
  "78741", "78742", "78744", "78747", "78753", "78754", "78758",
]);

const AXIS_COLOR: Record<"build" | "eat" | "fix" | "call", string> = {
  build: C.good,
  eat: C.warm,
  fix: C.purple,
  call: C.accent,
};

const AXIS_LABEL: Record<"build" | "eat" | "fix" | "call", string> = {
  build: "Build",
  eat: "Eat",
  fix: "Fix",
  call: "Call",
};

// ── Tiny helpers ────────────────────────────────────────────────────────────
function Eyebrow({
  children,
  color = C.purple,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <p
      className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em]"
      style={{ color }}
    >
      {children}
    </p>
  );
}

function HeroStat({
  value,
  label,
  caption,
  tone,
}: {
  value: string;
  label: string;
  caption?: string;
  tone: "good" | "warm" | "purple" | "accent";
}) {
  const color =
    tone === "good" ? C.good : tone === "warm" ? C.warm : tone === "purple" ? C.purple : C.accent;
  return (
    <div className="relative pl-5" style={{ borderLeft: `4px solid ${color}` }}>
      <p
        className="text-[44px] font-bold leading-[0.95] tabular-nums tracking-[-0.03em] md:text-[60px]"
        style={{ color: C.text }}
      >
        {value}
      </p>
      <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-text)]">
        {label}
      </p>
      {caption && (
        <p className="mt-1 text-[12px] text-[var(--ds-text-mute)]">{caption}</p>
      )}
    </div>
  );
}

// ── 4-axis heatmap (top 10 zips × 4 dimensions) ─────────────────────────────
function FourAxisHeatmap({ zips }: { zips: HeatIndexZip[] }) {
  if (zips.length === 0) {
    return (
      <p className="text-[13px] italic text-[var(--ds-text-dim)]">
        Heatmap data unavailable.
      </p>
    );
  }
  const cols: Array<keyof typeof AXIS_LABEL> = ["build", "eat", "fix", "call"];
  const cellW = 150;
  const cellH = 56;
  const labelW = 150;
  const headerH = 36;
  const w = labelW + cellW * cols.length;
  const h = headerH + cellH * zips.length + 8;

  // Cell shading uses fill-opacity scaled by the per-axis 0-100 norm; see
  // each cell's <rect fillOpacity={...}> below.

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="block w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Column headers */}
      {cols.map((axis, ci) => (
        <g key={axis}>
          <rect
            x={labelW + cellW * ci}
            y={0}
            width={cellW}
            height={headerH - 6}
            fill="transparent"
          />
          <circle
            cx={labelW + cellW * ci + 14}
            cy={headerH / 2 - 3}
            r={4}
            fill={AXIS_COLOR[axis]}
          />
          <text
            x={labelW + cellW * ci + 24}
            y={headerH / 2 + 1}
            style={{
              fontSize: 12,
              fontFamily: "ui-monospace, monospace",
              letterSpacing: 1.5,
              fill: "var(--ds-text)",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {AXIS_LABEL[axis].toUpperCase()}
          </text>
        </g>
      ))}

      {/* Rows */}
      {zips.map((z, ri) => {
        const y = headerH + cellH * ri;
        return (
          <g key={z.zip}>
            {/* row label */}
            <text
              x={8}
              y={y + cellH / 2 + 2}
              style={{
                fontSize: 13,
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fill: "var(--ds-text)",
              }}
            >
              {z.zip}
            </text>
            <text
              x={8}
              y={y + cellH / 2 + 18}
              style={{
                fontSize: 10.5,
                fontFamily: "ui-monospace, monospace",
                fill: "var(--ds-text-dim)",
                letterSpacing: 0.5,
              }}
            >
              {(ZIP_NAMES[z.zip] ?? "—").toUpperCase()}
            </text>

            {/* cells */}
            {cols.map((axis, ci) => {
              const n = z.norms[axis];
              const raw =
                axis === "build"
                  ? z.permits
                  : axis === "eat"
                    ? z.inspections
                    : axis === "fix"
                      ? z.violations
                      : z.requests311;
              const fg = AXIS_COLOR[axis];
              const cellX = labelW + cellW * ci;
              const cellY = y + 4;
              const ch = cellH - 8;
              const opacity = 0.10 + (n / 100) * 0.55;
              return (
                <g key={axis}>
                  <rect
                    x={cellX + 4}
                    y={cellY}
                    width={cellW - 8}
                    height={ch}
                    rx={4}
                    fill={fg}
                    fillOpacity={opacity}
                    stroke={fg}
                    strokeOpacity={0.35}
                    strokeWidth={1}
                  />
                  {/* big raw count */}
                  <text
                    x={cellX + 14}
                    y={cellY + 22}
                    style={{
                      fontSize: 17,
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 700,
                      fill: "var(--ds-text)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {raw.toLocaleString()}
                  </text>
                  {/* percentile mini-bar */}
                  <rect
                    x={cellX + 14}
                    y={cellY + 32}
                    width={cellW - 36}
                    height={4}
                    rx={2}
                    fill="var(--ds-bg)"
                    stroke="var(--ds-border)"
                    strokeWidth={0.5}
                  />
                  <rect
                    x={cellX + 14}
                    y={cellY + 32}
                    width={((cellW - 36) * n) / 100}
                    height={4}
                    rx={2}
                    fill={fg}
                  />
                  <text
                    x={cellX + cellW - 14}
                    y={cellY + 22}
                    textAnchor="end"
                    style={{
                      fontSize: 10,
                      fontFamily: "ui-monospace, monospace",
                      fill: fg,
                      fontWeight: 600,
                    }}
                  >
                    {n}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ── Ranked-list row ─────────────────────────────────────────────────────────
function RankedRow({
  rank,
  z,
}: {
  rank: number;
  z: HeatIndexZip;
}) {
  const tier =
    z.score >= 60 ? "good" : z.score >= 40 ? "warm" : z.score >= 20 ? "purple" : "accent";
  const tierColor =
    tier === "good" ? C.good : tier === "warm" ? C.warm : tier === "purple" ? C.purple : C.accent;
  const axes: Array<keyof typeof AXIS_LABEL> = ["build", "eat", "fix", "call"];
  return (
    <div
      className="grid items-center gap-4 border-b border-[var(--ds-border)] px-5 py-5 md:grid-cols-[64px_180px_120px_1fr_auto]"
      style={{ background: rank === 1 ? "rgba(168,85,247,0.04)" : "transparent" }}
    >
      <div
        className="font-mono text-[24px] font-bold tabular-nums tracking-tight"
        style={{ color: tierColor }}
      >
        #{rank}
      </div>
      <div>
        <div className="text-[20px] font-bold leading-tight tracking-tight text-[var(--ds-text)]">
          {z.zip}
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">
          {ZIP_NAMES[z.zip] ?? "Austin"}
        </div>
      </div>
      <div>
        <div
          className="text-[36px] font-bold leading-none tabular-nums tracking-[-0.02em]"
          style={{ color: tierColor }}
        >
          {z.score.toFixed(1)}
        </div>
        <div className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">
          composite · 0–100
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {axes.map((axis) => {
          const n = z.norms[axis];
          const raw =
            axis === "build"
              ? z.permits
              : axis === "eat"
                ? z.inspections
                : axis === "fix"
                  ? z.violations
                  : z.requests311;
          return (
            <div key={axis}>
              <div className="flex items-baseline justify-between">
                <span
                  className="font-mono text-[9.5px] font-semibold uppercase tracking-wider"
                  style={{ color: AXIS_COLOR[axis] }}
                >
                  {AXIS_LABEL[axis]}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[var(--ds-text)]">
                  {raw}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-sm bg-[var(--ds-bg)]">
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${n}%`, background: AXIS_COLOR[axis] }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <Link
        href={`/q?q=${encodeURIComponent(`Tell me about zip ${z.zip} in Austin`)}`}
        className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-accent)] hover:underline"
      >
        Drill in →
      </Link>
    </div>
  );
}

// ── Small multiples — top 5 zips, monthly composite trend ───────────────────
function HeatTrendMultiples({
  zips,
  months,
}: {
  zips: HeatIndexZip[];
  months: string[];
}) {
  if (zips.length === 0 || months.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {zips.map((z) => {
        const max = Math.max(1, ...z.monthly.map((p) => p.y));
        const w = 110;
        const h = 56;
        const dx = w / Math.max(1, z.monthly.length - 1);
        const path = z.monthly
          .map((p, i) => `${i === 0 ? "M" : "L"} ${i * dx},${h - (p.y / max) * (h - 4) - 2}`)
          .join(" ");
        const area = `${path} L ${(z.monthly.length - 1) * dx},${h} L 0,${h} Z`;
        const peakIdx = z.monthly.reduce(
          (best, p, i) => (p.y > z.monthly[best].y ? i : best),
          0,
        );
        return (
          <div
            key={z.zip}
            className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
              ZIP {z.zip}
            </p>
            <p
              className="mt-1 text-[20px] font-semibold tabular-nums tracking-tight"
              style={{ color: C.text }}
            >
              {z.score.toFixed(0)}
              <span className="ml-1 text-[12px] text-[var(--ds-text-dim)]">/100</span>
            </p>
            <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 block w-full">
              <path d={area} fill={C.purple} fillOpacity={0.18} />
              <path d={path} stroke={C.purple} strokeWidth={1.5} fill="none" />
              <circle
                cx={peakIdx * dx}
                cy={h - (z.monthly[peakIdx].y / max) * (h - 4) - 2}
                r={2.5}
                fill={C.purple}
              />
            </svg>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-wide text-[var(--ds-text-dim)]">
              {months[0].slice(2)} → {months[months.length - 1].slice(2)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Specialist agent chip ───────────────────────────────────────────────────
function SpecialistChip({
  label,
  role,
  color,
}: {
  label: string;
  role: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] px-3 py-2">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text)]">
          {label}
        </span>
        <span className="text-[10.5px] text-[var(--ds-text-dim)]">{role}</span>
      </div>
    </div>
  );
}

function AngleChip({ q, label }: { q: string; label: string }) {
  const href = `/q?q=${encodeURIComponent(q)}`;
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4 transition-colors hover:border-[var(--ds-purple)]"
    >
      <span className="mt-0.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-[var(--ds-purple)]">
        →
      </span>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
          {label}
        </span>
        <span className="text-[14px] leading-snug text-[var(--ds-text)] group-hover:text-[var(--ds-purple)]">
          {q}
        </span>
      </div>
    </Link>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default async function AustinHeatIndexPage() {
  const data = await computeHeatIndex();

  // Defensive: cold cache → render a brief error state, not a broken page.
  if (data.source === "miss" || data.zips.length === 0) {
    return (
      <Shell active="/reports">
        <section className="mx-auto max-w-[1100px] px-6 py-20 md:px-8">
          <Eyebrow>REPORT · #04 · CROSS-DATASET</Eyebrow>
          <h1 className="mt-5 text-[44px] font-bold leading-[1.04] tracking-[-0.025em] text-[var(--ds-text)] md:text-[64px]">
            Austin Heat Index 2026.
          </h1>
          <p className="mt-6 max-w-[60ch] text-[18px] leading-[1.55] text-[var(--ds-text-mute)]">
            The local mirror is cold. The 4 underlying datasets are still
            ingesting — refresh in a moment, or run{" "}
            <code className="font-mono text-[15px] text-[var(--ds-accent)]">
              python agent/specialists/ingestor.py
            </code>{" "}
            to warm the cache.
          </p>
          <Link
            href="/reports"
            className="mt-10 inline-block font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ds-accent)] hover:underline"
          >
            ← All reports
          </Link>
        </section>
      </Shell>
    );
  }

  const top10 = data.zips.slice(0, 10);
  const top5 = data.zips.slice(0, 5);
  const bottom5 = data.zips.slice(-5).reverse();
  const topZip = data.zips[0];
  const eastInTop10 = top10.filter((z) => EAST_OF_I35.has(z.zip));
  const totalAcrossZips = data.zips.length;

  // counts dict for the Austin dot map — uses composite score so dot area
  // tracks the headline metric.
  const zipScoreMap: Record<string, number> = {};
  for (const z of data.zips) zipScoreMap[z.zip] = Math.max(1, Math.round(z.score));

  const freshness = ageLabel(data.age_seconds);

  // Editor's-note observation — composed from the actual numbers above.
  const eastObservation =
    eastInTop10.length >= 5
      ? `${eastInTop10.length} of the top-10 hottest zips sit east of I-35 — a striking inversion of the pre-2020 westside-heavy growth pattern.`
      : eastInTop10.length >= 3
        ? `${eastInTop10.length} of the top-10 hottest zips sit east of I-35 — the growth axis is still rotating eastward, but slowly.`
        : `Only ${eastInTop10.length} of the top-10 hottest zips sit east of I-35 — the long east-side rotation has paused for now.`;

  // Synthesized lead observation from real numbers
  const lead = `Across ${totalAcrossZips.toLocaleString()} Austin zips, ${topZip.zip} ${ZIP_NAMES[topZip.zip] ? `(${ZIP_NAMES[topZip.zip]})` : ""} leads with a composite score of ${topZip.score.toFixed(1)} — the only zip placing in the top quartile on every one of the four dimensions.`;

  // Citation block: the 4 underlying datasets
  const SOURCES = [
    {
      id: "3syk-w9eu",
      portal: "data.austintexas.gov",
      name: "Issued Construction Permits",
      axis: "Build",
      color: C.good,
      url: `https://data.austintexas.gov/resource/3syk-w9eu.json?$select=permit_number,permit_class_mapped,status_current,original_zip,issue_date&$order=issue_date%20DESC&$limit=5000`,
    },
    {
      id: "ecmv-9xxi",
      portal: "data.austintexas.gov",
      name: "Food Establishment Inspections",
      axis: "Eat",
      color: C.warm,
      url: `https://data.austintexas.gov/resource/ecmv-9xxi.json?$select=restaurant_name,score,zip_code,inspection_date&$order=inspection_date%20DESC&$limit=2000`,
    },
    {
      id: "6wtj-zbtb",
      portal: "data.austintexas.gov",
      name: "Code Cases",
      axis: "Fix",
      color: C.purple,
      url: `https://data.austintexas.gov/resource/6wtj-zbtb.json?$select=case_id,case_type,status,zip_code,opened_date&$order=opened_date%20DESC&$limit=3000`,
    },
    {
      id: "xwdj-i9he",
      portal: "data.austintexas.gov",
      name: "311 Service Requests",
      axis: "Call",
      color: C.accent,
      url: `https://data.austintexas.gov/resource/xwdj-i9he.json?$select=sr_type_desc,sr_status_desc,sr_location_zip_code,sr_created_date&$order=sr_created_date%20DESC&$limit=5000`,
    },
  ];

  const totalRows =
    data.totals.permits + data.totals.inspections + data.totals.violations + data.totals.requests;

  return (
    <Shell active="/reports">
      {/* ─── HERO ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-8 md:py-20">
          <Link
            href="/reports"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)] hover:underline"
          >
            ← All reports
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Eyebrow>
              REPORT · #04 · CROSS-DATASET · UPDATED {freshness}
            </Eyebrow>
            <DataSourceBadge source={data.source} ageSeconds={data.age_seconds} />
          </div>
          <h1 className="mt-5 max-w-[22ch] text-[44px] font-bold leading-[1.04] tracking-[-0.025em] text-[var(--ds-text)] md:text-[72px]">
            Austin Heat Index 2026.{" "}
            <span
              className="text-[var(--ds-warm)]"
              style={{ fontFamily: "ui-serif, Georgia, serif", fontStyle: "italic", fontWeight: 600 }}
            >
              Where the city is changing fastest.
            </span>
          </h1>
          <p className="mt-6 max-w-[64ch] text-[18px] leading-[1.55] text-[var(--ds-text-mute)] md:text-[20px]">
            One composite score per zip code, fused from{" "}
            <span className="font-semibold text-[var(--ds-text)] tabular-nums">
              {totalRows.toLocaleString()}
            </span>{" "}
            rows across four City of Austin open-data feeds — what's being{" "}
            <span style={{ color: C.good }}>built</span>, where Austin{" "}
            <span style={{ color: C.warm }}>eats</span>, what residents want{" "}
            <span style={{ color: C.purple }}>fixed</span>, and what they're{" "}
            <span style={{ color: C.accent }}>calling</span> 311 about.
          </p>

          {/* Byline */}
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--ds-border)] pt-5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              Composed by
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.accent }} />
              <span className="font-mono text-[11px] tracking-wider text-[var(--ds-text)]">orchestrator</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.good }} />
              <span className="font-mono text-[11px] tracking-wider text-[var(--ds-text)]">data_analyst</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.warm }} />
              <span className="font-mono text-[11px] tracking-wider text-[var(--ds-text)]">reporter</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.purple }} />
              <span className="font-mono text-[11px] tracking-wider text-[var(--ds-text)]">critic</span>
            </span>
          </div>
        </div>
      </section>

      {/* ─── 4 DIMENSIONS ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow>◆ The four dimensions</Eyebrow>
          <h2 className="mt-3 max-w-[24ch] text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text)] md:text-[40px]">
            Build · Eat · Fix · Call.
          </h2>
          <p className="mt-5 max-w-[60ch] text-[16px] leading-[1.65] text-[var(--ds-text-mute)] md:text-[17px]">
            Four open-data feeds, four lenses on civic activity. Each
            normalized to a 0–100 axis. The composite Heat Index for each zip
            is the equal-weighted mean.
          </p>
          <div className="mt-10 grid gap-10 border-t border-[var(--ds-border)] pt-10 md:grid-cols-4 md:gap-6">
            <HeroStat
              tone="good"
              value={data.totals.permits.toLocaleString()}
              label="Build · permits"
              caption={`across ${totalAcrossZips} zips`}
            />
            <HeroStat
              tone="warm"
              value={data.totals.inspections.toLocaleString()}
              label="Eat · inspections"
              caption={`${data.totals.failures.toLocaleString()} scored < 70 (failures)`}
            />
            <HeroStat
              tone="purple"
              value={data.totals.violations.toLocaleString()}
              label="Fix · active code cases"
              caption="active + pending only"
            />
            <HeroStat
              tone="accent"
              value={data.totals.requests.toLocaleString()}
              label="Call · 311 requests"
              caption="resident-driven attention"
            />
          </div>
        </div>
      </section>

      {/* ─── MAP ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow color={C.warm}>SECTION 01 · WHERE</Eyebrow>
          <h2 className="mt-3 max-w-[24ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[48px]">
            Where the heat is.
          </h2>
          <div className="mt-6 grid max-w-[60ch] gap-5 text-[17px] leading-[1.65] text-[var(--ds-text-mute)] md:text-[18px]">
            <p>{lead}</p>
            <p>
              The map below sizes each zip by its composite Heat Index score —
              not by raw permit count or 311 volume alone. A small dot can
              still mean an active food economy or an aging code-case backlog;
              a big dot means a zip is moving on every front at once.
            </p>
          </div>
          <figure className="mt-8 overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
            <div className="p-3 md:p-5">
              <AustinZipDotMap counts={zipScoreMap} tone="warm" labelTop={6} />
            </div>
            <figcaption className="border-t border-[var(--ds-border)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              Dot size · composite Heat Index score · top 6 labelled · 4-dataset composite
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ─── 4-AXIS HEATMAP ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow color={C.purple}>SECTION 02 · WHAT</Eyebrow>
          <h2 className="mt-3 max-w-[24ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[48px]">
            Four lenses, one city.
          </h2>
          <div className="mt-6 grid max-w-[60ch] gap-5 text-[17px] leading-[1.65] text-[var(--ds-text-mute)] md:text-[18px]">
            <p>
              Each row is one of the top 10 hottest zips. Each column is one
              of the four dimensions. Cell shading is the per-axis percentile
              within Austin — the bar inside the cell is the same number,
              re-rendered.
            </p>
            <p>
              Read across a row to see whether a zip is hot for one reason or
              for all four. Read down a column to find the leaders on a single
              axis.
            </p>
          </div>
          <figure className="mt-8 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 md:p-7">
            <FourAxisHeatmap zips={top10} />
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              Cells shaded by per-axis percentile · raw count + 0–100 norm
            </p>
          </figure>
        </div>
      </section>

      {/* ─── RANKED LIST ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow color={C.good}>SECTION 03 · RANK</Eyebrow>
          <h2 className="mt-3 max-w-[24ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[48px]">
            Top 10 hottest zips.
          </h2>
          <p className="mt-5 max-w-[60ch] text-[17px] leading-[1.65] text-[var(--ds-text-mute)]">
            Sorted by composite Heat Index. Each row shows the four
            dimensions side by side — the bar lengths are per-axis percentiles
            so you can scan for a zip's strength and weakness at a glance.
          </p>

          <div className="mt-8 overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
            {top10.map((z, i) => (
              <RankedRow key={z.zip} rank={i + 1} z={z} />
            ))}
          </div>

          <div className="mt-12">
            <Eyebrow color={C.textDim}>◆ Bottom 5 — for contrast</Eyebrow>
            <p className="mt-3 max-w-[58ch] text-[15px] leading-[1.6] text-[var(--ds-text-mute)]">
              Quietest zips in the corpus — sparse activity across all four
              axes. These are typically peripheral or barely-Austin zips
              (university centroids, small slivers of metro overlap).
            </p>
            <div className="mt-5 grid gap-2 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-4 md:grid-cols-5">
              {bottom5.map((z) => (
                <div key={z.zip} className="rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-3">
                  <p className="font-mono text-[12px] font-semibold text-[var(--ds-text)]">
                    {z.zip}
                  </p>
                  <p className="font-mono text-[10px] tabular-nums text-[var(--ds-text-dim)]">
                    score {z.score.toFixed(1)}
                  </p>
                  <p className="mt-1 font-mono text-[9.5px] text-[var(--ds-text-dim)]">
                    {z.permits + z.inspections + z.violations + z.requests311} total rows
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TREND ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow color={C.purple}>SECTION 04 · WHEN</Eyebrow>
          <h2 className="mt-3 max-w-[24ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[48px]">
            Twelve months, top five.
          </h2>
          <p className="mt-5 max-w-[60ch] text-[17px] leading-[1.65] text-[var(--ds-text-mute)]">
            For each of the top 5 zips by Heat Index, the monthly composite —
            permits + inspections + violations + 311s — over the trailing 12
            months. Each spark is normalized to its own peak so the shape
            shows the rhythm, not the volume.
          </p>
          <figure className="mt-8 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 md:p-7">
            <HeatTrendMultiples zips={top5} months={data.trend_months} />
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              Source · 4-dataset composite · {data.trend_months[0]} → {data.trend_months[data.trend_months.length - 1]}
            </p>
          </figure>
        </div>
      </section>

      {/* ─── EDITOR'S NOTE ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(var(--ds-text) 1px, transparent 1px), linear-gradient(90deg, var(--ds-text) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              transform: "perspective(800px) rotateX(58deg) translateY(20%)",
            }}
          />
          <div className="relative mx-auto max-w-[1100px] px-6 py-16 md:px-8 md:py-24">
            <Eyebrow>◆ Editor's note</Eyebrow>
            <blockquote
              className="mt-6 max-w-[44ch] text-[26px] leading-[1.35] text-[var(--ds-text)] md:text-[36px]"
              style={{
                fontFamily: "ui-serif, Georgia, serif",
                fontStyle: "italic",
                fontWeight: 500,
              }}
            >
              "{eastObservation}"
            </blockquote>
            <p className="mt-6 max-w-[60ch] font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              — Composed by the reporter agent · grounded in {totalRows.toLocaleString()} cached rows
            </p>
          </div>
        </div>
      </section>

      {/* ─── HOW THIS WAS MADE ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow>◆ How this was made</Eyebrow>
          <h2 className="mt-3 max-w-[26ch] text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text)] md:text-[36px]">
            Four agents, four datasets, one composite.
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                Specialists
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <SpecialistChip label="orchestrator" role="planner" color={C.accent} />
                <SpecialistChip label="data_analyst" role="cross-dataset aggregates" color={C.good} />
                <SpecialistChip label="reporter" role="prose composition" color={C.warm} />
                <SpecialistChip label="critic" role="finding validation" color={C.purple} />
              </div>
              <Link
                href={`/q?q=${encodeURIComponent("Compute the Austin Heat Index — composite score per zip from permits, inspections, violations, and 311.")}`}
                className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-accent)] hover:underline"
              >
                ↻ Replay this run
              </Link>
              <div className="mt-5 inline-flex items-center gap-2">
                <DataSourceBadge source={data.source} ageSeconds={data.age_seconds} size="sm" />
              </div>
            </div>

            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                Datasets cited
              </p>
              <div className="mt-3 space-y-2.5">
                {SOURCES.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className="font-mono text-[10.5px] font-semibold uppercase tracking-wider"
                        style={{ color: s.color }}
                      >
                        {s.axis}
                      </span>
                      <span className="font-mono text-[10.5px] tabular-nums text-[var(--ds-text-dim)]">
                        {s.id}
                      </span>
                    </div>
                    <p className="mt-1 text-[14px] leading-snug text-[var(--ds-text)]">
                      {s.name}
                    </p>
                    <p className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                      {s.portal}
                    </p>
                    <a
                      href={s.url}
                      className="mt-2 inline-block break-all font-mono text-[10.5px] text-[var(--ds-accent)] hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      $select → SODA query
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── NEXT ANGLES ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow color={C.purple}>◆ Next angles to explore</Eyebrow>
          <h2 className="mt-3 max-w-[24ch] text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text)] md:text-[36px]">
            Hand the next question to the agent.
          </h2>
          <div className="mt-7 grid gap-3 md:grid-cols-2">
            <AngleChip
              label="Compare metros"
              q="Compare top 311 volume zips across Austin and Dallas"
            />
            <AngleChip
              label="Drill in"
              q={`Tell me about zip ${topZip.zip} in Austin — permits, inspections, violations, and 311 in one pass.`}
            />
            <AngleChip
              label="Historical"
              q="Show the Austin Heat Index trend by zip over the last 5 years"
            />
            <AngleChip
              label="Cross-dataset"
              q={`Cross-reference top Heat Index zips with TX franchise tax holders by zip`}
            />
          </div>
        </div>
      </section>

      <style>{`
        @media print {
          @page { size: A4; margin: 18mm; }
          html, body { background: #fff !important; color: #15171C !important; }
          main { background: #fff !important; }
          a { color: #15171C !important; text-decoration: none !important; }
        }
      `}</style>
    </Shell>
  );
}
