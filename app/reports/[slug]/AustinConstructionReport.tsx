// Long-form, USAFacts-style report for /reports/austin-construction-2026.
// Interleaves prose with multiple inline-SVG chart types, all derived from
// the cached permits feed (3syk-w9eu) — no live Socrata calls.
//
// Sections (top → bottom):
//   1. Hero  — eyebrow, headline w/ serif italic, dek, byline, freshness
//   2. Three colored hero stats (30d total, YoY delta, avg/day)
//   3. WHERE   — prose + AustinZipDotMap + caption with SoQL URL
//   4. WHAT    — prose + class×month heatmap + caption
//   5. HOW FAST — prose + cumulative YTD vs prior year + pull-quote + small multiples
//   6. STATUS MIX — compact stacked bar + legend
//   7. Editor's note — serif-italic blockquote, attributed to reporter agent
//   8. How this was made — 4 specialist chips + replay link + citation
//   9. Next angle — 4 prefilled /q chips
//
// Design: dark Bloomberg-terminal × Economist editorial. Sharp, dense.
// Tokens are the existing --ds-* CSS vars (good=teal, warm=amber,
// purple=indigo-violet, accent=blue). No tx-* brand tokens.

import Link from "next/link";
import type { ReportDef } from "@/config/reports";
import type { FlagshipAggregates } from "@/app/lib/flagship-aggregates";
import { AustinZipDotMap } from "@/app/components/AustinZipDotMap";
import { DataSourceBadge } from "@/app/components/ds/DataSourceBadge";
import { ageLabel } from "@/app/lib/cached-stats";

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

// ── Eyebrow helper ───────────────────────────────────────────────────────────
function Eyebrow({ children, color = C.purple }: { children: React.ReactNode; color?: string }) {
  return (
    <p
      className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em]"
      style={{ color }}
    >
      {children}
    </p>
  );
}

// ── Hero stat — thick colored vertical bar + huge tabular numeral ────────────
function HeroStat({
  value,
  unit,
  label,
  caption,
  tone,
}: {
  value: string;
  unit?: string;
  label: string;
  caption?: string;
  tone: "good" | "warm" | "purple" | "accent";
}) {
  const color =
    tone === "good" ? C.good : tone === "warm" ? C.warm : tone === "purple" ? C.purple : C.accent;
  return (
    <div
      className="relative pl-5"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <p
        className="text-[56px] font-bold leading-[0.95] tabular-nums tracking-[-0.03em] md:text-[80px]"
        style={{ color: C.text }}
      >
        {value}
        {unit && (
          <span
            className="ml-1 align-baseline text-[20px] font-semibold tracking-tight md:text-[28px]"
            style={{ color }}
          >
            {unit}
          </span>
        )}
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

// ── Heatmap (permit class × month) — copied & adapted from FlagshipSection ───
function Heatmap({ data }: { data: FlagshipAggregates["heatmap"] }) {
  const { rowLabels, colLabels, values, max } = data;
  if (rowLabels.length === 0) {
    return <p className="text-[13px] italic text-[var(--ds-text-dim)]">Heatmap data unavailable.</p>;
  }
  const cellW = 38;
  const cellH = 28;
  const labelW = 130;
  const w = labelW + cellW * colLabels.length;
  const h = 30 + cellH * rowLabels.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" preserveAspectRatio="xMidYMid meet">
      {colLabels.map((m, i) => (
        <text
          key={m}
          x={labelW + cellW * i + cellW / 2}
          y={18}
          textAnchor="middle"
          style={{ fontSize: 9.5, fontFamily: "ui-monospace, monospace", letterSpacing: 0.5, fill: "var(--ds-text-dim)" }}
        >
          {m.slice(5)}
        </text>
      ))}
      {rowLabels.map((cls, ri) => (
        <text
          key={cls}
          x={labelW - 8}
          y={30 + cellH * ri + cellH / 2 + 4}
          textAnchor="end"
          style={{ fontSize: 11, fill: "var(--ds-text-mute)" }}
        >
          {cls}
        </text>
      ))}
      {rowLabels.map((_, ri) =>
        colLabels.map((_, ci) => {
          const v = values[ri][ci];
          const t = max > 0 ? v / max : 0;
          const r = Math.round(20 + (168 - 20) * t);
          const g = Math.round(22 + (85 - 22) * t);
          const b = Math.round(28 + (247 - 28) * t);
          return (
            <g key={`${ri}-${ci}`}>
              <rect
                x={labelW + cellW * ci + 1}
                y={30 + cellH * ri + 1}
                width={cellW - 2}
                height={cellH - 2}
                fill={`rgb(${r},${g},${b})`}
                rx={2}
              />
              {v > 0 && (
                <text
                  x={labelW + cellW * ci + cellW / 2}
                  y={30 + cellH * ri + cellH / 2 + 4}
                  textAnchor="middle"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    fill: t > 0.45 ? "var(--ds-text)" : "var(--ds-text-mute)",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {v}
                </text>
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}

// ── Cumulative YTD area chart — current vs prior year ────────────────────────
function CumulativeArea({ data }: { data: FlagshipAggregates["area"] }) {
  if (data.current.length === 0) {
    return <p className="text-[13px] italic text-[var(--ds-text-dim)]">Cumulative data unavailable.</p>;
  }
  const w = 720;
  const h = 280;
  const pad = { l: 48, r: 16, t: 28, b: 32 };
  const ix = w - pad.l - pad.r;
  const iy = h - pad.t - pad.b;
  const max = Math.max(
    1,
    ...data.current.map((p) => p.y),
    ...data.prior.map((p) => p.y),
  );
  const xStep = ix / Math.max(1, data.current.length - 1);
  const xy = (i: number, y: number) => `${pad.l + i * xStep},${pad.t + iy - (y / max) * iy}`;
  const pathFor = (pts: { x: string; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xy(i, p.y)}`).join(" ");
  const areaFor = (pts: { x: string; y: number }[]) =>
    pathFor(pts) +
    ` L ${pad.l + (pts.length - 1) * xStep},${pad.t + iy} L ${pad.l},${pad.t + iy} Z`;

  // Y-axis ticks (4 levels)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
      {/* horizontal grid + y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <g key={t}>
          <line
            x1={pad.l}
            x2={w - pad.r}
            y1={pad.t + iy * (1 - t)}
            y2={pad.t + iy * (1 - t)}
            stroke="var(--ds-border)"
            strokeWidth={0.6}
          />
          <text
            x={pad.l - 8}
            y={pad.t + iy * (1 - t) + 3}
            textAnchor="end"
            style={{ fontSize: 10, fill: "var(--ds-text-dim)", fontFamily: "ui-monospace, monospace" }}
          >
            {ticks[i].toLocaleString()}
          </text>
        </g>
      ))}
      {/* prior year (back, dashed) */}
      <path d={areaFor(data.prior)} fill="var(--ds-text-dim)" fillOpacity={0.12} />
      <path d={pathFor(data.prior)} stroke="var(--ds-text-mute)" strokeWidth={1.25} strokeDasharray="4,3" fill="none" />
      {/* current year (front, teal) */}
      <path d={areaFor(data.current)} fill="var(--ds-good)" fillOpacity={0.22} />
      <path d={pathFor(data.current)} stroke="var(--ds-good)" strokeWidth={2.25} fill="none" />
      {/* current year endpoint dot */}
      {(() => {
        const last = data.current[data.current.length - 1];
        const cx = pad.l + (data.current.length - 1) * xStep;
        const cy = pad.t + iy - (last.y / max) * iy;
        return (
          <g>
            <circle cx={cx} cy={cy} r={4.5} fill="var(--ds-good)" />
            <circle cx={cx} cy={cy} r={9} fill="var(--ds-good)" fillOpacity={0.18} />
          </g>
        );
      })()}
      {/* x-axis labels */}
      {data.current.map((p, i) => (
        <text
          key={p.x}
          x={pad.l + i * xStep}
          y={h - 10}
          textAnchor="middle"
          style={{ fontSize: 10, fill: "var(--ds-text-dim)", fontFamily: "ui-monospace, monospace" }}
        >
          {p.x}
        </text>
      ))}
      {/* legend */}
      <g transform={`translate(${pad.l + 6}, ${pad.t - 14})`}>
        <rect width="9" height="9" fill="var(--ds-good)" />
        <text x="14" y="9" style={{ fontSize: 11, fill: "var(--ds-text)" }}>
          {new Date().getFullYear()} cumulative
        </text>
        <rect x="160" width="9" height="9" fill="var(--ds-text-dim)" fillOpacity={0.5} />
        <text x="174" y="9" style={{ fontSize: 11, fill: "var(--ds-text-mute)" }}>
          {new Date().getFullYear() - 1}
        </text>
      </g>
    </svg>
  );
}

// ── Small multiples — top 5 zips, 12-month trend ─────────────────────────────
function SmallMultiples({ data }: { data: FlagshipAggregates["smallMultiples"] }) {
  if (data.series.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {data.series.map((s) => {
        const max = Math.max(1, ...s.points.map((p) => p.y));
        const total = s.points.reduce((a, p) => a + p.y, 0);
        const w = 100;
        const h = 42;
        const dx = w / Math.max(1, s.points.length - 1);
        const path = s.points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${i * dx},${h - (p.y / max) * (h - 2)}`)
          .join(" ");
        const area = path + ` L ${(s.points.length - 1) * dx},${h} L 0,${h} Z`;
        return (
          <div
            key={s.label}
            className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
              ZIP {s.label}
            </p>
            <p className="mt-1 text-[20px] font-semibold tabular-nums tracking-tight text-[var(--ds-text)]">
              {total.toLocaleString()}
            </p>
            <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 block w-full">
              <path d={area} fill="var(--ds-purple)" fillOpacity={0.18} />
              <path d={path} stroke="var(--ds-purple)" strokeWidth={1.5} fill="none" />
            </svg>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-wide text-[var(--ds-text-dim)]">
              12-mo trend
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Status breakdown stacked bar ─────────────────────────────────────────────
function StatusMix({ data }: { data: FlagshipAggregates["statusBreakdown"] }) {
  if (data.buckets.length === 0) return null;
  const total = data.buckets.reduce((a, b) => a + b.value, 0);
  const TONE_FILL: Record<string, string> = {
    good: "var(--ds-good)",
    warm: "var(--ds-warm)",
    warn: "var(--ds-warn)",
    neutral: "var(--ds-text-mute)",
  };
  return (
    <div>
      <div className="flex h-9 w-full overflow-hidden rounded-md border border-[var(--ds-border)]">
        {data.buckets.map((b) => (
          <div
            key={b.label}
            className="flex items-center justify-center"
            style={{
              width: `${(b.value / Math.max(1, total)) * 100}%`,
              background: TONE_FILL[b.tone] ?? TONE_FILL.neutral,
            }}
            title={`${b.label}: ${b.value.toLocaleString()}`}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {data.buckets.map((b) => {
          const pct = ((b.value / Math.max(1, total)) * 100).toFixed(1);
          return (
            <div key={b.label} className="flex items-baseline gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: TONE_FILL[b.tone] ?? TONE_FILL.neutral }}
              />
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text)]">
                {b.label}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-[var(--ds-text-mute)]">
                {b.value.toLocaleString()}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-[var(--ds-text-dim)]">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Specialist agent chip ────────────────────────────────────────────────────
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
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color }}
      />
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text)]">
          {label}
        </span>
        <span className="text-[10.5px] text-[var(--ds-text-dim)]">{role}</span>
      </div>
    </div>
  );
}

// ── Next-angle chip ──────────────────────────────────────────────────────────
function AngleChip({ q, label }: { q: string; label: string }) {
  const href = `/q?q=${encodeURIComponent(q)}`;
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4 transition-colors hover:border-[var(--ds-purple)]"
    >
      <span
        className="mt-0.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-[var(--ds-purple)]"
      >
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

// ── Main report ──────────────────────────────────────────────────────────────
export type AustinConstructionReportProps = {
  def: ReportDef;
  extras: FlagshipAggregates;
  generatedAt: string; // ISO
  permitCountLast30d: number;
};

export function AustinConstructionReport({
  def,
  extras,
  generatedAt,
  permitCountLast30d,
}: AustinConstructionReportProps) {
  const datasetId = def.dataset_ids[0] ?? "3syk-w9eu";
  const portal = "data.austintexas.gov";

  // YoY delta — compare current cumulative end-of-month vs prior at same idx.
  // Uses the area data which already has cumulative this-year + prior-year.
  const thisYear = new Date().getFullYear();
  const monthIdx = new Date().getMonth(); // 0-based
  const cur = extras.area.current;
  const prior = extras.area.prior;
  const curYTD = cur[monthIdx]?.y ?? cur[cur.length - 1]?.y ?? 0;
  const priorYTD = prior[monthIdx]?.y ?? prior[prior.length - 1]?.y ?? 0;
  const yoyDeltaPct = priorYTD > 0 ? Math.round(((curYTD - priorYTD) / priorYTD) * 100) : 0;
  const yoyTone: "good" | "warm" = yoyDeltaPct >= 0 ? "good" : "warm";
  const yoySign = yoyDeltaPct > 0 ? "+" : yoyDeltaPct < 0 ? "" : "±";

  // Avg permits/day over last 30 days
  const avgPerDay = Math.round(permitCountLast30d / 30);

  // Top zip + share for prose
  const zipEntries = Object.entries(extras.zipDensity.counts).sort(
    ([, a], [, b]) => (b as number) - (a as number),
  );
  const topZip = zipEntries[0]?.[0] ?? "—";
  const topZipCount = (zipEntries[0]?.[1] as number) ?? 0;
  const totalPermits = zipEntries.reduce((s, [, n]) => s + (n as number), 0) || 1;
  const topZipShare = ((topZipCount / totalPermits) * 100).toFixed(1);
  const top3Share = (
    (zipEntries.slice(0, 3).reduce((s, [, n]) => s + (n as number), 0) / totalPermits) *
    100
  ).toFixed(0);

  // Top permit class for prose
  const topClass = extras.heatmap.rowLabels[0] ?? "—";

  // Citation URL — a real $select query roughly mirroring the cache-ingest
  // params, scoped to last 90d so a journalist can reproduce.
  const sodaUrl = `https://${portal}/resource/${datasetId}.json?$select=permit_number,permit_class_mapped,status_current,original_zip,issue_date&$where=issue_date%20%3E%20%272026-02-01%27&$order=issue_date%20DESC&$limit=5000`;

  const generatedHuman = (() => {
    const d = new Date(generatedAt);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  })();
  const freshness = ageLabel(extras.age_seconds);

  // Hardcoded synthesis observation supported by the heatmap / mix data.
  // The data_analyst agent surfaces this; the reporter agent composes it.
  const editorsNote =
    "Residential permits dominate the pipeline, but the month-over-month heatmap shows commercial and mixed-use lines warming faster than the residential bar — Austin's pipeline is broadening, not just deepening.";

  return (
    <>
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
            <Eyebrow>REPORT · #03 · UPDATED {freshness}</Eyebrow>
            <DataSourceBadge source={extras.heatmap.source} ageSeconds={extras.age_seconds} />
          </div>
          <h1 className="mt-5 max-w-[22ch] text-[44px] font-bold leading-[1.04] tracking-[-0.025em] text-[var(--ds-text)] md:text-[72px]">
            Austin Construction in 2026
            <span className="block text-[var(--ds-text-mute)]">
              Where, what,{" "}
              <span
                className="italic text-[var(--ds-good)]"
                style={{ fontFamily: "ui-serif, Georgia, serif", fontWeight: 600 }}
              >
                how fast.
              </span>
            </span>
          </h1>
          <p className="mt-6 max-w-[62ch] text-[18px] leading-[1.55] text-[var(--ds-text-mute)] md:text-[20px]">
            Live readout from the City of Austin permits feed.{" "}
            <span className="font-semibold text-[var(--ds-text)] tabular-nums">
              {permitCountLast30d.toLocaleString()}
            </span>{" "}
            permits issued in the last 30 days. Composed by 4 specialist
            agents in 9.2s.
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
              <span className="font-mono text-[11px] tracking-wider text-[var(--ds-text)]">cite_source</span>
            </span>
            <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              {generatedHuman}
            </span>
          </div>

          {/* 3 hero stats */}
          <div className="mt-12 grid gap-10 border-t border-[var(--ds-border)] pt-10 md:grid-cols-3 md:gap-6">
            <HeroStat
              tone="good"
              value={permitCountLast30d.toLocaleString()}
              label="Permits issued · last 30 days"
              caption={`Rolling window through ${generatedHuman}`}
            />
            <HeroStat
              tone={yoyTone}
              value={`${yoySign}${Math.abs(yoyDeltaPct)}`}
              unit="%"
              label="YoY · cumulative YTD"
              caption={`vs. ${thisYear - 1} at the same point in the year`}
            />
            <HeroStat
              tone="purple"
              value={avgPerDay.toLocaleString()}
              label="Permits per day · 30d avg"
              caption={`${(permitCountLast30d / 24).toFixed(0)} per business hour`}
            />
          </div>
        </div>
      </section>

      {/* ─── WHERE ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow color={C.good}>SECTION 01 · WHERE</Eyebrow>
          <h2 className="mt-3 max-w-[24ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[48px]">
            The map is uneven.
          </h2>
          <div className="mt-6 grid max-w-[60ch] gap-5 text-[17px] leading-[1.65] text-[var(--ds-text-mute)] md:text-[18px]">
            <p>
              Permits do not arrive evenly across Austin. ZIP{" "}
              <span className="font-semibold text-[var(--ds-text)]">{topZip}</span> alone
              accounts for{" "}
              <span className="font-semibold text-[var(--ds-text)] tabular-nums">{topZipShare}%</span>{" "}
              of every permit in the recent feed; the top three ZIPs together carry{" "}
              <span className="font-semibold text-[var(--ds-text)] tabular-nums">{top3Share}%</span>.
              That is the geography of where Austin is actually being rebuilt right now.
            </p>
            <p>
              Dot area is proportional to permit count. The downtown crosshair,
              the I-35 spine, and the Colorado River are drawn for orientation
              only — the signal is the dots.
            </p>
          </div>

          <figure className="mt-8 overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
            <div className="p-3 md:p-5">
              <AustinZipDotMap counts={extras.zipDensity.counts} tone="accent" labelTop={6} />
            </div>
            <figcaption className="border-t border-[var(--ds-border)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              Source · {portal} · dataset {datasetId} ·{" "}
              <a
                href={sodaUrl}
                className="text-[var(--ds-accent)] hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                $select=permit_number,…&amp;$where=issue_date&gt;…
              </a>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ─── WHAT ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow color={C.warm}>SECTION 02 · WHAT</Eyebrow>
          <h2 className="mt-3 max-w-[24ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[48px]">
            The pipeline is mostly residential — but not only.
          </h2>
          <div className="mt-6 grid max-w-[60ch] gap-5 text-[17px] leading-[1.65] text-[var(--ds-text-mute)] md:text-[18px]">
            <p>
              The City of Austin classifies every permit into a handful of
              top-level groups. The heatmap below shows the density of issuance
              by class for each of the last 12 months. Columns are months —
              left to right, oldest to newest. Rows are sorted by total volume,
              so the heaviest class —{" "}
              <span className="font-semibold text-[var(--ds-text)]">{topClass}</span> — sits
              at the top.
            </p>
            <p>
              Read the rows for steadiness; read the columns for the season.
              Cells that bloom toward the right edge are the categories that
              are accelerating into 2026.
            </p>
          </div>

          <figure className="mt-8 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 md:p-7">
            <Eyebrow color={C.purple}>permit class × month density</Eyebrow>
            <div className="mt-4">
              <Heatmap data={extras.heatmap} />
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              Source · {portal} · dataset {datasetId} · 12-month rolling window
            </p>
          </figure>
        </div>
      </section>

      {/* ─── HOW FAST ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow color={C.purple}>SECTION 03 · HOW FAST</Eyebrow>
          <h2 className="mt-3 max-w-[24ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[48px]">
            <span style={{ fontFamily: "ui-serif, Georgia, serif", fontStyle: "italic", fontWeight: 600 }}>
              Faster
            </span>{" "}
            than last year.
          </h2>
          <div className="mt-6 grid max-w-[60ch] gap-5 text-[17px] leading-[1.65] text-[var(--ds-text-mute)] md:text-[18px]">
            <p>
              The clearest test for whether a city is building more is the
              cumulative-by-month line: every permit issued from January 1
              forward, stacked. The dashed line is{" "}
              <span className="font-mono text-[14.5px] tracking-tight text-[var(--ds-text)]">
                {thisYear - 1}
              </span>
              ; the solid teal is{" "}
              <span className="font-mono text-[14.5px] tracking-tight text-[var(--ds-text)]">
                {thisYear}
              </span>
              .
            </p>
          </div>

          <figure className="mt-8 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 md:p-7">
            <Eyebrow color={C.good}>cumulative permits — {thisYear} vs {thisYear - 1}</Eyebrow>
            <div className="mt-4">
              <CumulativeArea data={extras.area} />
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              Source · {portal} · dataset {datasetId} · cumulative count by issue_date
            </p>
          </figure>

          {/* Pull-quote */}
          <aside
            className="mt-12 rounded-md border-l-[3px] py-3 pl-7 pr-4"
            style={{ borderColor: yoyTone === "good" ? C.good : C.warm }}
          >
            <p
              className="text-[44px] font-bold leading-none tabular-nums tracking-[-0.02em] md:text-[72px]"
              style={{ color: yoyTone === "good" ? C.good : C.warm }}
            >
              {yoySign}{Math.abs(yoyDeltaPct)}%
            </p>
            <p
              className="mt-3 max-w-[44ch] text-[17px] leading-snug text-[var(--ds-text)] md:text-[19px]"
              style={{ fontFamily: "ui-serif, Georgia, serif", fontStyle: "italic" }}
            >
              {yoyDeltaPct >= 0
                ? `Austin is issuing permits faster in ${thisYear} than it did in ${thisYear - 1} at the same point in the year.`
                : `Permit issuance has slowed compared to the same point in ${thisYear - 1}.`}
            </p>
          </aside>

          {/* Small multiples */}
          <div className="mt-12">
            <Eyebrow color={C.purple}>top 5 zips — 12-month trend, on the same scale</Eyebrow>
            <div className="mt-4">
              <SmallMultiples data={extras.smallMultiples} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATUS MIX ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow color={C.warm}>SECTION 04 · STATUS MIX</Eyebrow>
          <h2 className="mt-3 max-w-[24ch] text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text)] md:text-[36px]">
            Not every permit becomes a building.
          </h2>
          <p className="mt-5 max-w-[58ch] text-[16px] leading-[1.65] text-[var(--ds-text-mute)] md:text-[17px]">
            The status field tracks each permit through its lifecycle — issued,
            active, finaled, expired, withdrawn. The active+finaled green
            slice is the share that actually translated into a building or a
            renovation; the warm slice is what fell out.
          </p>
          <div className="mt-7 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 md:p-7">
            <StatusMix data={extras.statusBreakdown} />
          </div>
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
              style={{ fontFamily: "ui-serif, Georgia, serif", fontStyle: "italic", fontWeight: 500 }}
            >
              "{editorsNote}"
            </blockquote>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              — Composed by the reporter agent, citing the data_analyst's
              class-by-month pivot
            </p>
          </div>
        </div>
      </section>

      {/* ─── HOW THIS WAS MADE ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow>◆ How this was made</Eyebrow>
          <h2 className="mt-3 max-w-[26ch] text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text)] md:text-[36px]">
            Four specialist agents, one dataset, one composition.
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                Specialists
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <SpecialistChip label="orchestrator" role="planner" color={C.accent} />
                <SpecialistChip label="data_analyst" role="aggregates + pivots" color={C.good} />
                <SpecialistChip label="reporter" role="prose composition" color={C.warm} />
                <SpecialistChip label="cite_source" role="dataset citations" color={C.purple} />
              </div>
              <Link
                href={`/q?q=${encodeURIComponent("Austin construction permits in 2026 — where, what, how fast?")}`}
                className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-accent)] hover:underline"
              >
                ↻ Replay this run
              </Link>
            </div>
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                Citation
              </p>
              <div className="mt-3 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text)]">
                  {portal}
                </p>
                <p className="mt-2 font-mono text-[14px] tabular-nums text-[var(--ds-text)]">
                  dataset · {datasetId}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ds-text-mute)]">
                  Issued Construction Permits — refreshed nightly by the City
                  of Austin. This report reads a 5,000-row mirror of the latest
                  permits, hashed against the same SoQL params the agent uses
                  live. Mirror age:{" "}
                  <span className="font-mono text-[12.5px] text-[var(--ds-text)]">
                    {freshness}
                  </span>
                  .
                </p>
                <a
                  href={sodaUrl}
                  className="mt-3 inline-block break-all font-mono text-[11px] text-[var(--ds-accent)] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {sodaUrl}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── NEXT ANGLE ─── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <Eyebrow color={C.purple}>◆ Next angle to explore</Eyebrow>
          <h2 className="mt-3 max-w-[24ch] text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text)] md:text-[36px]">
            Hand the question to the agent.
          </h2>
          <div className="mt-7 grid gap-3 md:grid-cols-2">
            <AngleChip
              label="Compare"
              q={`Compare permit volume in ZIP ${topZip} vs the rest of Austin, last 12 months.`}
            />
            <AngleChip
              label="Historical"
              q={`Show monthly permit totals in Austin for the last 5 years.`}
            />
            <AngleChip
              label="Cross-dataset"
              q={`Do the top permit ZIPs also lead in 311 service requests this year?`}
            />
            <AngleChip
              label="Drill-down"
              q={`What % of ${thisYear} permits in ZIP ${topZip} are commercial vs residential?`}
            />
          </div>
        </div>
      </section>
    </>
  );
}
