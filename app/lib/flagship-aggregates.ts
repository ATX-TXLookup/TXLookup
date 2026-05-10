// Compute multi-perspective aggregates over cached permits rows for the
// austin-construction-2026 flagship report. Cache → all aggregates derived
// in-process, no extra Socrata calls.

import { cacheLookup } from "./cache";

const INGEST_PARAMS = {
  select:
    "permit_number,permittype,permit_class_mapped,status_current,original_address1,original_zip,issue_date,total_existing_bldg_sqft",
  order: "issue_date DESC",
  limit: 5000,
};

type PermitRow = {
  permit_number?: string;
  permittype?: string;
  permit_class_mapped?: string;
  status_current?: string;
  original_zip?: string;
  issue_date?: string;
};

export type HeatmapPayload = {
  rowLabels: string[];   // permit classes
  colLabels: string[];   // months (YYYY-MM, oldest → newest)
  values: number[][];    // values[row][col]
  max: number;
  source: "cache" | "miss";
};

export type SmallMultiplesPayload = {
  series: { label: string; points: { x: string; y: number }[] }[]; // per zip
  source: "cache" | "miss";
};

export type AreaPayload = {
  current: { x: string; y: number }[];   // cumulative permits this year by month
  prior: { x: string; y: number }[];     // cumulative permits last year by month
  source: "cache" | "miss";
};

export type StatusBreakdown = {
  buckets: { label: string; value: number; tone: "good" | "warm" | "warn" | "neutral" }[];
  source: "cache" | "miss";
};

export type FlagshipAggregates = {
  heatmap: HeatmapPayload;
  smallMultiples: SmallMultiplesPayload;
  area: AreaPayload;
  statusBreakdown: StatusBreakdown;
  age_seconds: number | null;
};

const EMPTY: FlagshipAggregates = {
  heatmap: { rowLabels: [], colLabels: [], values: [], max: 0, source: "miss" },
  smallMultiples: { series: [], source: "miss" },
  area: { current: [], prior: [], source: "miss" },
  statusBreakdown: { buckets: [], source: "miss" },
  age_seconds: null,
};

function ymOf(iso?: string): string | null {
  if (!iso) return null;
  return iso.slice(0, 7); // YYYY-MM
}

function lastNMonths(n: number): string[] {
  const d = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export async function computeFlagshipAggregates(): Promise<FlagshipAggregates> {
  const lookup = await cacheLookup<PermitRow>("3syk-w9eu", INGEST_PARAMS);
  const rows = lookup.rows ?? [];
  if (rows.length === 0) return EMPTY;

  const months = lastNMonths(12);
  const monthIdx = new Map(months.map((m, i) => [m, i]));

  // ── Heatmap: permit class × month ──────────────────────────────────────────
  const classCounts = new Map<string, number>();
  for (const r of rows) {
    const c = (r.permit_class_mapped ?? "—").trim() || "—";
    classCounts.set(c, (classCounts.get(c) ?? 0) + 1);
  }
  const topClasses = [...classCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([c]) => c);

  const heatValues: number[][] = topClasses.map(() => Array(months.length).fill(0));
  for (const r of rows) {
    const c = (r.permit_class_mapped ?? "—").trim() || "—";
    const mi = monthIdx.get(ymOf(r.issue_date) ?? "");
    if (mi === undefined) continue;
    const ri = topClasses.indexOf(c);
    if (ri < 0) continue;
    heatValues[ri][mi]++;
  }
  const heatMax = Math.max(0, ...heatValues.flat());

  // ── Small multiples: top 5 zips, monthly trendline (last 12 months) ────────
  const zipCounts = new Map<string, number>();
  for (const r of rows) {
    const z = String(r.original_zip ?? "").trim();
    if (!z) continue;
    zipCounts.set(z, (zipCounts.get(z) ?? 0) + 1);
  }
  const topZips = [...zipCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([z]) => z);

  const series = topZips.map((zip) => {
    const points: { x: string; y: number }[] = months.map((m) => ({ x: m, y: 0 }));
    for (const r of rows) {
      if ((r.original_zip ?? "").trim() !== zip) continue;
      const mi = monthIdx.get(ymOf(r.issue_date) ?? "");
      if (mi === undefined) continue;
      points[mi].y++;
    }
    return { label: zip, points };
  });

  // ── Area chart: cumulative YTD this year vs prior year (by month) ──────────
  const thisYear = new Date().getFullYear();
  const lastYear = thisYear - 1;
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const thisCounts = Array(12).fill(0);
  const lastCounts = Array(12).fill(0);
  for (const r of rows) {
    if (!r.issue_date) continue;
    const y = Number(r.issue_date.slice(0, 4));
    const m = Number(r.issue_date.slice(5, 7)) - 1;
    if (m < 0 || m > 11) continue;
    if (y === thisYear) thisCounts[m]++;
    else if (y === lastYear) lastCounts[m]++;
  }
  let cThis = 0;
  let cLast = 0;
  const current = monthLabels.map((label, i) => {
    cThis += thisCounts[i];
    return { x: label, y: cThis };
  });
  const prior = monthLabels.map((label, i) => {
    cLast += lastCounts[i];
    return { x: label, y: cLast };
  });

  // ── Status breakdown buckets ───────────────────────────────────────────────
  const status = new Map<string, number>();
  for (const r of rows) {
    const s = (r.status_current ?? "—").trim() || "—";
    status.set(s, (status.get(s) ?? 0) + 1);
  }
  const TONE_FOR: Record<string, "good" | "warm" | "warn" | "neutral"> = {
    Active: "good",
    Final: "good",
    Issued: "good",
    Expired: "warm",
    Withdrawn: "warm",
    Cancelled: "warn",
    Hold: "warn",
  };
  const buckets = [...status.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([label, value]) => ({ label, value, tone: TONE_FOR[label] ?? "neutral" }));

  return {
    heatmap: {
      rowLabels: topClasses,
      colLabels: months,
      values: heatValues,
      max: heatMax,
      source: "cache",
    },
    smallMultiples: { series, source: "cache" },
    area: { current, prior, source: "cache" },
    statusBreakdown: { buckets, source: "cache" },
    age_seconds: lookup.age_seconds,
  };
}
