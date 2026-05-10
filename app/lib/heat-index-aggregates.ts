// Cross-dataset Austin Heat Index aggregator.
//
// For each Austin zip code, computes a composite "change index" from 4
// dimensions of activity, all derived from the locally cached SODA mirrors
// — no live Socrata calls.
//
//   Build  → 3syk-w9eu (construction permits)              → permits issued
//   Eat    → ecmv-9xxi (food inspections)                   → inspections + failures
//   Fix    → 6wtj-zbtb (code violations)                    → active+pending cases
//   Call   → xwdj-i9he (311 service requests)               → requests filed
//
// Each dimension is min-max normalized 0–100. The composite score is the
// equal-weighted mean of the 4 normalized dimensions. Zip ranks (1 = highest)
// per dimension are returned so the UI can render small percentile bars
// without recomputing.
//
// ZIP normalization: the inspections feed encodes zips as "78753-3461"; we
// strip to the 5-digit prefix. Other feeds are already 5-digit.
//
// Date window: rather than chase wall-clock "last 12 months", we use the
// max date in each cache file and accept rows back N days. This keeps the
// composite stable across cache snapshots taken on different days.

import { cacheLookup } from "./cache";

// Mirrors INGEST_PARAMS in app/lib/cached-stats.ts. Both sides must hash to
// the exact same key for the cacheLookup to register a hit.
const INGEST_PARAMS = {
  permits: {
    select:
      "permit_number,permittype,permit_class_mapped,status_current,original_address1,original_zip,issue_date,total_existing_bldg_sqft",
    order: "issue_date DESC",
    limit: 5000,
  },
  inspections: {
    select:
      "restaurant_name,score,address,zip_code,inspection_date,facility_id",
    order: "inspection_date DESC",
    limit: 2000,
  },
  violations: {
    select:
      "case_id,case_type,status,address,zip_code,opened_date,priority,department",
    order: "opened_date DESC",
    limit: 3000,
  },
  requests: {
    select:
      "sr_type_desc,sr_status_desc,sr_location_zip_code,sr_created_date,sr_department_desc",
    order: "sr_created_date DESC",
    limit: 5000,
  },
} as const;

type PermitRow = {
  original_zip?: string;
  issue_date?: string;
};
type InspectionRow = {
  zip_code?: string;
  inspection_date?: string;
  score?: string | number;
};
type ViolationRow = {
  zip_code?: string;
  status?: string;
  opened_date?: string;
};
type RequestRow = {
  sr_location_zip_code?: string;
  sr_created_date?: string;
};

export type HeatIndexZip = {
  zip: string;
  permits: number;
  inspections: number;
  failures: number;
  violations: number;
  requests311: number;
  /** 0–100 composite (equal-weighted mean of the 4 normalized dimensions). */
  score: number;
  /** Per-axis 1-based rank within the in-scope zip set. 1 = highest. */
  ranks: { build: number; eat: number; fix: number; call: number };
  /** Per-axis 0–100 normalized values (used for cell shading). */
  norms: { build: number; eat: number; fix: number; call: number };
  /** 12-bucket monthly composite series (oldest → newest), 0–100 each. */
  monthly: { x: string; y: number }[];
};

export type HeatIndexResult = {
  zips: HeatIndexZip[];
  totals: {
    permits: number;
    inspections: number;
    failures: number;
    violations: number;
    requests: number;
  };
  /** ISO date the freshest underlying cache was fetched. */
  fetched_at: string;
  /** Age of the oldest contributing cache in seconds. */
  age_seconds: number | null;
  /** "cache" if every dimension hit, else "miss". */
  source: "cache" | "miss";
  /** Months covered by the monthly trend (YYYY-MM, oldest → newest). */
  trend_months: string[];
};

const EMPTY: HeatIndexResult = {
  zips: [],
  totals: { permits: 0, inspections: 0, failures: 0, violations: 0, requests: 0 },
  fetched_at: new Date().toISOString(),
  age_seconds: null,
  source: "miss",
  trend_months: [],
};

function zip5(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(/(\d{5})/);
  return m ? m[1] : null;
}

function ymOf(iso?: string): string | null {
  if (!iso) return null;
  return iso.slice(0, 7); // YYYY-MM
}

function lastNMonthsFrom(latestIso: string, n: number): string[] {
  // latestIso = "YYYY-MM-..." — generate the trailing N months ending at
  // that month, oldest-first.
  const [y, m] = latestIso.slice(0, 7).split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, (m - 1) - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function minMax(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

function norm(v: number, min: number, max: number): number {
  if (!Number.isFinite(v) || max <= min) return 0;
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
}

/** 1-based rank vector — index i = rank of values[i] (1 = highest). Stable on ties. */
function rankDescending(values: number[]): number[] {
  const idx = values.map((_, i) => i).sort((a, b) => values[b] - values[a]);
  const ranks = new Array(values.length).fill(0);
  idx.forEach((origIdx, sortedPos) => {
    ranks[origIdx] = sortedPos + 1;
  });
  return ranks;
}

export async function computeHeatIndex(): Promise<HeatIndexResult> {
  const [permits, inspections, violations, requests] = await Promise.all([
    cacheLookup<PermitRow>("3syk-w9eu", INGEST_PARAMS.permits),
    cacheLookup<InspectionRow>("ecmv-9xxi", INGEST_PARAMS.inspections),
    cacheLookup<ViolationRow>("6wtj-zbtb", INGEST_PARAMS.violations),
    cacheLookup<RequestRow>("xwdj-i9he", INGEST_PARAMS.requests),
  ]);

  const allHit =
    permits.rows.length > 0 &&
    inspections.rows.length > 0 &&
    violations.rows.length > 0 &&
    requests.rows.length > 0;
  if (!allHit) return EMPTY;

  // Find the freshest issue/created/opened date across all 4 feeds — this
  // anchors the monthly trend window. Cache snapshots all share an ingest
  // timestamp, but the underlying record dates can differ.
  let latestIso = "1970-01-01";
  const upd = (iso?: string) => {
    if (iso && iso.slice(0, 10) > latestIso) latestIso = iso.slice(0, 10);
  };
  for (const r of permits.rows) upd(r.issue_date);
  for (const r of inspections.rows) upd(r.inspection_date);
  for (const r of violations.rows) upd(r.opened_date);
  for (const r of requests.rows) upd(r.sr_created_date);

  const months = lastNMonthsFrom(latestIso, 12);
  const monthIdx = new Map(months.map((m, i) => [m, i]));

  // Per-zip accumulators
  type Acc = {
    permits: number;
    inspections: number;
    failures: number;
    violations: number;
    requests311: number;
    monthly: number[]; // raw composite-input counts per month, length = months.length
  };
  const zips = new Map<string, Acc>();
  const ensure = (z: string): Acc => {
    let a = zips.get(z);
    if (!a) {
      a = {
        permits: 0,
        inspections: 0,
        failures: 0,
        violations: 0,
        requests311: 0,
        monthly: Array(months.length).fill(0),
      };
      zips.set(z, a);
    }
    return a;
  };

  // ── Build (permits) ───────────────────────────────────────────────────────
  for (const r of permits.rows) {
    const z = zip5(r.original_zip);
    if (!z) continue;
    const a = ensure(z);
    a.permits++;
    const mi = monthIdx.get(ymOf(r.issue_date) ?? "");
    if (mi !== undefined) a.monthly[mi]++;
  }

  // ── Eat (inspections + failures < 70) ─────────────────────────────────────
  for (const r of inspections.rows) {
    const z = zip5(r.zip_code);
    if (!z) continue;
    const a = ensure(z);
    a.inspections++;
    const score = Number(r.score);
    if (Number.isFinite(score) && score < 70) a.failures++;
    const mi = monthIdx.get(ymOf(r.inspection_date) ?? "");
    if (mi !== undefined) a.monthly[mi]++;
  }

  // ── Fix (active+pending code violations) ──────────────────────────────────
  for (const r of violations.rows) {
    const z = zip5(r.zip_code);
    if (!z) continue;
    const status = String(r.status ?? "").toLowerCase();
    if (status !== "active" && status !== "pending") continue;
    const a = ensure(z);
    a.violations++;
    const mi = monthIdx.get(ymOf(r.opened_date) ?? "");
    if (mi !== undefined) a.monthly[mi]++;
  }

  // ── Call (311 service requests) ───────────────────────────────────────────
  for (const r of requests.rows) {
    const z = zip5(r.sr_location_zip_code);
    if (!z) continue;
    const a = ensure(z);
    a.requests311++;
    const mi = monthIdx.get(ymOf(r.sr_created_date) ?? "");
    if (mi !== undefined) a.monthly[mi]++;
  }

  // Drop zips with zero signal across all axes (defensive — shouldn't happen
  // because every entry was created via a counter increment).
  const entries = [...zips.entries()].filter(
    ([, a]) =>
      a.permits + a.inspections + a.violations + a.requests311 > 0,
  );

  if (entries.length === 0) return EMPTY;

  // Min-max normalize each axis across the in-scope zip set.
  const buildVals = entries.map(([, a]) => a.permits);
  const eatVals = entries.map(([, a]) => a.inspections);
  const fixVals = entries.map(([, a]) => a.violations);
  const callVals = entries.map(([, a]) => a.requests311);

  const buildBounds = minMax(buildVals);
  const eatBounds = minMax(eatVals);
  const fixBounds = minMax(fixVals);
  const callBounds = minMax(callVals);

  const buildNorms = buildVals.map((v) => norm(v, buildBounds.min, buildBounds.max));
  const eatNorms = eatVals.map((v) => norm(v, eatBounds.min, eatBounds.max));
  const fixNorms = fixVals.map((v) => norm(v, fixBounds.min, fixBounds.max));
  const callNorms = callVals.map((v) => norm(v, callBounds.min, callBounds.max));

  const buildRanks = rankDescending(buildVals);
  const eatRanks = rankDescending(eatVals);
  const fixRanks = rankDescending(fixVals);
  const callRanks = rankDescending(callVals);

  const result: HeatIndexZip[] = entries.map(([zip, a], i) => {
    const score = (buildNorms[i] + eatNorms[i] + fixNorms[i] + callNorms[i]) / 4;
    // Monthly trend: same equal-weighted normalization. Each month's raw
    // composite count is normalized against the per-zip monthly max so the
    // line shows shape, not absolute volume.
    const mMax = Math.max(1, ...a.monthly);
    const monthly = a.monthly.map((m, mi) => ({
      x: months[mi],
      y: Math.round((m / mMax) * 100),
    }));
    return {
      zip,
      permits: a.permits,
      inspections: a.inspections,
      failures: a.failures,
      violations: a.violations,
      requests311: a.requests311,
      score: Math.round(score * 10) / 10,
      ranks: {
        build: buildRanks[i],
        eat: eatRanks[i],
        fix: fixRanks[i],
        call: callRanks[i],
      },
      norms: {
        build: Math.round(buildNorms[i]),
        eat: Math.round(eatNorms[i]),
        fix: Math.round(fixNorms[i]),
        call: Math.round(callNorms[i]),
      },
      monthly,
    };
  });

  result.sort((a, b) => b.score - a.score);

  const totals = {
    permits: permits.rows.length,
    inspections: inspections.rows.length,
    failures: result.reduce((s, z) => s + z.failures, 0),
    violations: result.reduce((s, z) => s + z.violations, 0),
    requests: requests.rows.length,
  };

  // Oldest contributing cache anchors the badge.
  const ages = [permits, inspections, violations, requests]
    .map((l) => l.age_seconds)
    .filter((n): n is number => n != null);
  const age_seconds = ages.length ? Math.max(...ages) : null;

  return {
    zips: result,
    totals,
    fetched_at: new Date().toISOString(),
    age_seconds,
    source: "cache",
    trend_months: months,
  };
}
