// Flagship "multi-perspective" section for the austin-construction-2026 report.
// Renders 4 chart types from cached permits rows on top of the existing
// stat/bar/line structure: heatmap, small multiples, area chart with YoY
// comparison, status breakdown bars.
//
// All charts are inline SVG, dark-palette, zero chart-library deps. They
// share a single FlagshipAggregates payload computed from cache.

import { DataSourceBadge } from "@/app/components/ds/DataSourceBadge";
import type { FlagshipAggregates } from "@/app/lib/flagship-aggregates";

const C = {
  bg: "var(--ds-bg)",
  border: "var(--ds-border)",
  text: "var(--ds-text)",
  textMute: "var(--ds-text-mute)",
  textDim: "var(--ds-text-dim)",
  accent: "var(--ds-accent)",
  good: "var(--ds-good)",
  warm: "var(--ds-warm)",
  warn: "var(--ds-warn)",
  bad: "var(--ds-bad)",
  purple: "var(--ds-purple)",
};

// ── Heatmap (permit class × month) ───────────────────────────────────────────
function Heatmap({ data }: { data: FlagshipAggregates["heatmap"] }) {
  const { rowLabels, colLabels, values, max } = data;
  if (rowLabels.length === 0) return null;
  const cellW = 38;
  const cellH = 28;
  const labelW = 110;
  const w = labelW + cellW * colLabels.length;
  const h = 24 + cellH * rowLabels.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" preserveAspectRatio="xMidYMid meet">
      {colLabels.map((m, i) => (
        <text
          key={m}
          x={labelW + cellW * i + cellW / 2}
          y={16}
          textAnchor="middle"
          className="fill-current"
          style={{ fontSize: 9, fontFamily: "ui-monospace, monospace", letterSpacing: 0.5, fill: C.textDim }}
        >
          {m.slice(5)}
        </text>
      ))}
      {rowLabels.map((cls, ri) => (
        <text
          key={cls}
          x={labelW - 8}
          y={24 + cellH * ri + cellH / 2 + 4}
          textAnchor="end"
          style={{ fontSize: 11, fill: C.textMute }}
        >
          {cls}
        </text>
      ))}
      {rowLabels.map((_, ri) =>
        colLabels.map((_, ci) => {
          const v = values[ri][ci];
          const t = max > 0 ? v / max : 0;
          // dark-bg ramp: bg → purple
          const r = Math.round(20 + (168 - 20) * t);
          const g = Math.round(22 + (85 - 22) * t);
          const b = Math.round(28 + (247 - 28) * t);
          return (
            <g key={`${ri}-${ci}`}>
              <rect
                x={labelW + cellW * ci + 1}
                y={24 + cellH * ri + 1}
                width={cellW - 2}
                height={cellH - 2}
                fill={`rgb(${r},${g},${b})`}
                rx={2}
              />
              {v > 0 && (
                <text
                  x={labelW + cellW * ci + cellW / 2}
                  y={24 + cellH * ri + cellH / 2 + 4}
                  textAnchor="middle"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    fill: t > 0.45 ? C.text : C.textMute,
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

// ── Small multiples (top 5 zips, monthly trend) ──────────────────────────────
function SmallMultiples({ data }: { data: FlagshipAggregates["smallMultiples"] }) {
  if (data.series.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {data.series.map((s) => {
        const max = Math.max(1, ...s.points.map((p) => p.y));
        const total = s.points.reduce((a, p) => a + p.y, 0);
        const w = 100;
        const h = 38;
        const dx = w / Math.max(1, s.points.length - 1);
        const path = s.points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${i * dx},${h - (p.y / max) * (h - 2)}`)
          .join(" ");
        const area =
          path +
          ` L ${(s.points.length - 1) * dx},${h} L 0,${h} Z`;
        return (
          <div key={s.label} className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
              ZIP {s.label}
            </p>
            <p className="mt-1 text-[18px] font-semibold tabular-nums tracking-tight text-[var(--ds-text)]">
              {total.toLocaleString()}
            </p>
            <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 block w-full">
              <path d={area} fill={C.accent} fillOpacity={0.15} />
              <path d={path} stroke={C.accent} strokeWidth={1.5} fill="none" />
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

// ── Area chart (YTD this year vs prior year, cumulative) ─────────────────────
function AreaChart({ data }: { data: FlagshipAggregates["area"] }) {
  if (data.current.length === 0) return null;
  const w = 600;
  const h = 220;
  const pad = { l: 40, r: 12, t: 18, b: 26 };
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
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
      {/* horizontal grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={pad.l}
          x2={w - pad.r}
          y1={pad.t + iy * (1 - t)}
          y2={pad.t + iy * (1 - t)}
          stroke={C.border}
          strokeWidth={0.5}
        />
      ))}
      {/* prior year (back) */}
      <path d={areaFor(data.prior)} fill={C.textDim} fillOpacity={0.18} />
      <path d={pathFor(data.prior)} stroke={C.textMute} strokeWidth={1.25} strokeDasharray="3,3" fill="none" />
      {/* current year (front) */}
      <path d={areaFor(data.current)} fill={C.accent} fillOpacity={0.22} />
      <path d={pathFor(data.current)} stroke={C.accent} strokeWidth={2} fill="none" />
      {/* x-axis labels */}
      {data.current.map((p, i) => (
        <text
          key={p.x}
          x={pad.l + i * xStep}
          y={h - 8}
          textAnchor="middle"
          style={{ fontSize: 9.5, fill: C.textDim, fontFamily: "ui-monospace, monospace" }}
        >
          {p.x}
        </text>
      ))}
      {/* legend */}
      <g transform={`translate(${pad.l + 4}, ${pad.t + 6})`}>
        <rect width="9" height="9" fill={C.accent} />
        <text x="14" y="9" style={{ fontSize: 11, fill: C.text }}>
          {new Date().getFullYear()} (cumulative)
        </text>
        <rect width="9" height="9" y="14" fill={C.textDim} fillOpacity={0.4} />
        <text x="14" y="23" style={{ fontSize: 11, fill: C.textMute }}>
          {new Date().getFullYear() - 1}
        </text>
      </g>
    </svg>
  );
}

// ── Status breakdown stacked bar ─────────────────────────────────────────────
function StatusBreakdown({ data }: { data: FlagshipAggregates["statusBreakdown"] }) {
  if (data.buckets.length === 0) return null;
  const total = data.buckets.reduce((a, b) => a + b.value, 0);
  const TONE_FILL: Record<string, string> = {
    good: C.good,
    warm: C.warm,
    warn: C.warn,
    neutral: C.textMute,
  };
  return (
    <div>
      <div className="flex h-8 w-full overflow-hidden rounded-md border border-[var(--ds-border)]">
        {data.buckets.map((b) => (
          <div
            key={b.label}
            className="flex items-center justify-center"
            style={{
              width: `${(b.value / Math.max(1, total)) * 100}%`,
              background: TONE_FILL[b.tone] ?? C.textMute,
            }}
            title={`${b.label}: ${b.value.toLocaleString()}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {data.buckets.map((b) => (
          <div key={b.label} className="flex items-baseline gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: TONE_FILL[b.tone] ?? C.textMute }}
            />
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-mute)]">
              {b.label}
            </span>
            <span className="text-[12px] tabular-nums text-[var(--ds-text-dim)]">
              {b.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────
export function FlagshipSection({ data }: { data: FlagshipAggregates }) {
  if (data.heatmap.source !== "cache") return null;
  return (
    <section className="my-14 md:my-20">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
          MULTI-PERSPECTIVE · 4 cuts of the same data
        </p>
        <DataSourceBadge source="cache" ageSeconds={data.age_seconds} />
      </div>
      <h2 className="mt-3 max-w-[24ch] text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text)] md:text-[40px]">
        Where the cranes are. What they're building. How fast.
      </h2>
      <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
        Four views of the same 5,000 most-recent permits, computed locally
        from the mirror. Heatmap is class × month density. Small multiples
        let you compare the top zips on the same scale. Cumulative YTD shows
        whether 2026 is ahead of or behind 2025.
      </p>

      {/* Heatmap */}
      <div className="mt-8 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 md:p-7">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
          A · permit class × month density
        </p>
        <div className="mt-4">
          <Heatmap data={data.heatmap} />
        </div>
      </div>

      {/* Small multiples */}
      <div className="mt-5 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 md:p-7">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
          B · top 5 zips, 12-month trend
        </p>
        <div className="mt-4">
          <SmallMultiples data={data.smallMultiples} />
        </div>
      </div>

      {/* Area + Status side by side */}
      <div className="mt-5 grid gap-5 md:grid-cols-5">
        <div className="md:col-span-3 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 md:p-7">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-good)]">
            C · cumulative permits — this year vs last
          </p>
          <div className="mt-4">
            <AreaChart data={data.area} />
          </div>
        </div>
        <div className="md:col-span-2 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 md:p-7">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
            D · status mix
          </p>
          <div className="mt-4">
            <StatusBreakdown data={data.statusBreakdown} />
          </div>
        </div>
      </div>
    </section>
  );
}
