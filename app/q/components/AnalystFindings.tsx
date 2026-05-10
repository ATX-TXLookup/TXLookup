"use client";

// AnalystFindings — renders the data_analyst specialist's findings list +
// inline chart from its `viz_spec`. Reuses the report-page chart components
// (ChartBar / ChartLine) so the visual treatment matches the rest of the app.
//
// Input shape (see app/lib/specialists.ts dataAnalyst result):
//   {
//     agent: "data_analyst",
//     query, dataset: {id, title},
//     mode: "delta" | "single_window",
//     findings: [{ text, value, baseline?, pct_change?, share_pct? }],
//     viz_spec: { kind: "bar" | "line", x, y, series: [{name, data: [[k,v]]}] },
//     confidence?: number,
//     caveats?: string[],
//   }
//
// Brand:
//   - Card surface: cream with hairline border (BRAND.md §7).
//   - Insight badge: gold-light bg, gold-dark text, "FINDINGS" label
//     (BRAND.md §7 dataset insight badge pattern).
//   - Findings bullets in body (Syne 16px); value + pct_change callouts in
//     IBM Plex Mono per the brief.

import { ChartBar } from "../../components/reports/ChartBar";
import { ChartLine } from "../../components/reports/ChartLine";

type VizSeries = { name: string; data: Array<[string, number]> };
type VizSpec = {
  kind?: string;
  x?: string;
  y?: string;
  series?: VizSeries[];
};

export type AnalystFinding = {
  text?: string;
  value?: number | string;
  baseline?: number | string;
  pct_change?: number;
  share_pct?: number;
  unit?: string;
};

export type AnalystResult = {
  agent: "data_analyst";
  query?: string;
  dataset?: { id?: string; title?: string };
  mode?: "delta" | "single_window";
  findings?: AnalystFinding[];
  viz_spec?: VizSpec;
  confidence?: number;
  caveats?: string[];
};

function fmtPct(p: number | undefined): string | null {
  if (p === undefined || p === null || Number.isNaN(p)) return null;
  const sign = p >= 0 ? "+" : "";
  return `${sign}${p.toFixed(1)}%`;
}

function fmtNum(v: number | string | undefined): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

// Convert viz_spec.series[].data: [[key, value]] into the bar/line component
// shape. For bar charts with multiple series (delta mode), pick the "current"
// series so the chart shows the latest snapshot; the prose findings convey
// the baseline + delta. For single_window, there's only one series anyway.
function vizToBars(spec: VizSpec): Array<{ label: string; value: number }> {
  const series = Array.isArray(spec.series) ? spec.series : [];
  if (series.length === 0) return [];
  const pick =
    series.find((s) => s.name === "current") ??
    series.find((s) => s.name === "delta") ??
    series[0];
  const data = Array.isArray(pick.data) ? pick.data : [];
  return data
    .filter(
      (row): row is [string, number] =>
        Array.isArray(row) &&
        row.length === 2 &&
        typeof row[1] === "number" &&
        Number.isFinite(row[1]),
    )
    .map(([label, value]) => ({ label: String(label), value }))
    .sort((a, b) => b.value - a.value);
}

function vizToPoints(spec: VizSpec): Array<{ x: string; y: number }> {
  const series = Array.isArray(spec.series) ? spec.series : [];
  if (series.length === 0) return [];
  const data = Array.isArray(series[0].data) ? series[0].data : [];
  return data
    .filter(
      (row): row is [string, number] =>
        Array.isArray(row) &&
        row.length === 2 &&
        typeof row[1] === "number" &&
        Number.isFinite(row[1]),
    )
    .map(([x, y]) => ({ x: String(x), y }));
}

export function AnalystFindings({ result }: { result: AnalystResult }) {
  const findings = Array.isArray(result.findings) ? result.findings : [];
  const viz = result.viz_spec ?? {};
  const isLine = viz.kind === "line";
  const isBar = viz.kind === "bar";

  const chartLabel =
    [result.dataset?.title, result.mode === "delta" ? "delta" : "snapshot"]
      .filter(Boolean)
      .join(" · ") || "Findings";

  return (
    <div
      className="mt-4 rounded-[10px] bg-tx-cream p-5 md:p-6"
      style={{ border: "0.5px solid var(--tx-border)" }}
    >
      {/* Insight badge — BRAND.md §7 dataset-insight pattern */}
      <span
        className="inline-flex items-center rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]"
        style={{
          background: "var(--tx-gold-light)",
          color: "var(--tx-gold-dark)",
          border: "0.5px solid rgba(212,139,16,0.3)",
        }}
      >
        Findings
      </span>
      {result.dataset?.title && (
        <p className="mt-3 font-display text-xl font-normal leading-tight tracking-tight text-tx-navy">
          {result.dataset.title}
        </p>
      )}

      {/* Inline chart from viz_spec — bar or line */}
      {isBar && (
        <ChartBar
          label={chartLabel}
          bars={vizToBars(viz)}
          unavailable={vizToBars(viz).length === 0}
        />
      )}
      {isLine && (
        <ChartLine
          label={chartLabel}
          points={vizToPoints(viz)}
          unavailable={vizToPoints(viz).length === 0}
        />
      )}

      {/* Findings bullets — body in Syne, value/pct in IBM Plex Mono */}
      {findings.length > 0 && (
        <ul className="mt-5 space-y-3">
          {findings.map((f, i) => {
            const pct = fmtPct(f.pct_change);
            const val = fmtNum(f.value);
            const baseline = fmtNum(f.baseline);
            const sharePct =
              typeof f.share_pct === "number"
                ? `${f.share_pct.toFixed(1)}% share`
                : null;
            return (
              <li
                key={i}
                className="pl-3"
                style={{ borderLeft: "3px solid var(--tx-gold)" }}
              >
                {f.text && (
                  <p className="text-sm leading-relaxed text-tx-ink/85 md:text-base">
                    {f.text}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[12px]">
                  {val !== null && (
                    <span className="font-semibold tabular-nums text-tx-navy">
                      {val}
                      {f.unit ? (
                        <span className="ml-1 font-normal text-tx-muted">
                          {f.unit}
                        </span>
                      ) : null}
                    </span>
                  )}
                  {baseline !== null && (
                    <span className="text-tx-muted">
                      from <span className="tabular-nums">{baseline}</span>
                    </span>
                  )}
                  {pct !== null && (
                    <span
                      className="font-semibold tabular-nums"
                      style={{
                        color:
                          (f.pct_change ?? 0) >= 0
                            ? "var(--tx-sage)"
                            : "var(--tx-rust)",
                      }}
                    >
                      {pct}
                    </span>
                  )}
                  {sharePct && (
                    <span className="tabular-nums text-tx-sky">{sharePct}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Caveats + confidence footer — IBM Plex Mono muted */}
      {(Array.isArray(result.caveats) && result.caveats.length > 0) ||
      typeof result.confidence === "number" ? (
        <div className="mt-5 border-t border-tx-ink/10 pt-3 font-mono text-[11px] leading-relaxed text-tx-muted">
          {typeof result.confidence === "number" && (
            <p>
              <span className="uppercase tracking-[0.12em] text-tx-rust">
                Confidence
              </span>{" "}
              <span className="tabular-nums text-tx-navy">
                {(result.confidence * 100).toFixed(0)}%
              </span>
            </p>
          )}
          {Array.isArray(result.caveats) &&
            result.caveats.map((c, i) => (
              <p key={i} className="mt-1">
                ↳ {c}
              </p>
            ))}
        </div>
      ) : null}
    </div>
  );
}
