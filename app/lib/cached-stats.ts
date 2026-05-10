// Cache-first homepage and dataset-insight aggregates.
//
// Pattern: the ingestor mirrors raw rows into data/cache.db every 6h. The
// readers below pull those rows out of the cache and compute aggregates in
// process — no per-aggregate SODA call, so even at scale the homepage hits
// Socrata zero times after warmup.
//
// Each helper returns { value, source, age_seconds } so the UI can render
// a "Local mirror · Nh ago" badge — turning the cache from a hidden
// workaround into a visible trust signal.
//
// Fallback chain: cache → live → stale-cache → null.

import { cacheLookup } from "./cache";

export type StatSource = "cache" | "live" | "cache-stale" | "miss";

export type StatResult<T> = {
  value: T | null;
  source: StatSource;
  age_seconds: number | null;
};

// The exact ingest-spec params — mirrors INGEST_SPEC in
// agent/specialists/ingestor.py. Both sides hash these for cache lookup.
const INGEST_PARAMS = {
  "3syk-w9eu": {
    select:
      "permit_number,permittype,permit_class_mapped,status_current,original_address1,original_zip,issue_date,total_existing_bldg_sqft",
    order: "issue_date DESC",
    limit: 5000,
  },
  "ecmv-9xxi": {
    select:
      "restaurant_name,score,address,zip_code,inspection_date,facility_id",
    order: "inspection_date DESC",
    limit: 2000,
  },
  "xwdj-i9he": {
    select:
      "sr_type_desc,sr_status_desc,sr_location_zip_code,sr_created_date,sr_department_desc",
    order: "sr_created_date DESC",
    limit: 5000,
  },
  "6wtj-zbtb": {
    select: "case_id,case_type,status,address,zip_code,opened_date,priority,department",
    order: "opened_date DESC",
    limit: 3000,
  },
  "9cir-efmm": {
    select:
      "taxpayer_number,taxpayer_name,taxpayer_city,taxpayer_zip,taxpayer_county_code,responsibility_beginning_date,right_to_transact_business_code",
    order: "responsibility_beginning_date DESC",
    limit: 5000,
  },
  "gc4d-8a49": {
    select: "service_request_number,status,created_date",
    order: "created_date DESC",
    limit: 5000,
  },
} as const;

type DatasetId = keyof typeof INGEST_PARAMS;

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/** Pull cached rows for a dataset. Returns null on cold cache. */
async function getCachedRows<T = Record<string, unknown>>(
  datasetId: DatasetId,
): Promise<{ rows: T[]; age_seconds: number; source: "cache" | "cache-stale" } | null> {
  const lookup = await cacheLookup<T>(datasetId, INGEST_PARAMS[datasetId]);
  if (lookup.source === "miss") return null;
  return {
    rows: lookup.rows,
    age_seconds: lookup.age_seconds ?? 0,
    source: lookup.source === "stale" ? "cache-stale" : "cache",
  };
}

// ── Aggregation helpers (computed from cached rows) ─────────────────────────

/** Permit count grouped by issue_date day, last 7 days. */
export async function austinPermitsLast7Days(): Promise<
  StatResult<{ day: string; count: number }[]>
> {
  const cache = await getCachedRows<{ issue_date?: string }>("3syk-w9eu");
  if (!cache) return { value: null, source: "miss", age_seconds: null };
  const since = isoDaysAgo(7);
  const counts = new Map<string, number>();
  for (const r of cache.rows) {
    const d = (r.issue_date ?? "").slice(0, 10);
    if (!d || d < since) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const value = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));
  return { value, source: cache.source, age_seconds: cache.age_seconds };
}

/** Permit count last 7 days. */
export async function austinPermits7dTotal(): Promise<StatResult<number>> {
  const cache = await getCachedRows<{ issue_date?: string }>("3syk-w9eu");
  if (!cache) return { value: null, source: "miss", age_seconds: null };
  const since = isoDaysAgo(7);
  let n = 0;
  for (const r of cache.rows) {
    const d = (r.issue_date ?? "").slice(0, 10);
    if (d && d >= since) n++;
  }
  return { value: n, source: cache.source, age_seconds: cache.age_seconds };
}

/** Top 5 zips by inspection count, last 30 days. */
export async function austinInspections30dByZip(): Promise<
  StatResult<{ zip: string; count: number }[]>
> {
  const cache = await getCachedRows<{ zip_code?: string; inspection_date?: string }>(
    "ecmv-9xxi",
  );
  if (!cache) return { value: null, source: "miss", age_seconds: null };
  const since = isoDaysAgo(30);
  const counts = new Map<string, number>();
  for (const r of cache.rows) {
    const d = (r.inspection_date ?? "").slice(0, 10);
    if (!d || d < since) continue;
    const zip = String(r.zip_code ?? "—");
    counts.set(zip, (counts.get(zip) ?? 0) + 1);
  }
  const value = [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([zip, count]) => ({ zip, count }));
  return { value, source: cache.source, age_seconds: cache.age_seconds };
}

/** 311 service requests opened in the last 30 days. */
export async function austin311Last30d(): Promise<StatResult<number>> {
  const cache = await getCachedRows<{ sr_created_date?: string }>("xwdj-i9he");
  if (!cache) return { value: null, source: "miss", age_seconds: null };
  const since = isoDaysAgo(30);
  let n = 0;
  for (const r of cache.rows) {
    const d = (r.sr_created_date ?? "").slice(0, 10);
    if (d && d >= since) n++;
  }
  return { value: n, source: cache.source, age_seconds: cache.age_seconds };
}

/** Currently-active code violations. */
export async function austinOpenCodeViolations(): Promise<StatResult<number>> {
  const cache = await getCachedRows<{ status?: string }>("6wtj-zbtb");
  if (!cache) return { value: null, source: "miss", age_seconds: null };
  let n = 0;
  for (const r of cache.rows) {
    const s = String(r.status ?? "").toLowerCase();
    if (s === "active" || s === "pending") n++;
  }
  return { value: n, source: cache.source, age_seconds: cache.age_seconds };
}

/** TX franchise tax — count of taxpayers with right-to-transact = 'Y'. */
export async function texasFranchisePermitsActive(): Promise<StatResult<number>> {
  const cache = await getCachedRows<{ right_to_transact_business_code?: string }>(
    "9cir-efmm",
  );
  if (!cache) return { value: null, source: "miss", age_seconds: null };
  let n = 0;
  for (const r of cache.rows) {
    if (String(r.right_to_transact_business_code ?? "").toUpperCase() === "Y") n++;
  }
  return { value: n, source: cache.source, age_seconds: cache.age_seconds };
}

/** Dallas 311 service requests in the last 30 days. */
export async function dallas311Last30d(): Promise<StatResult<number>> {
  const cache = await getCachedRows<{ created_date?: string }>("gc4d-8a49");
  if (!cache) return { value: null, source: "miss", age_seconds: null };
  const since = isoDaysAgo(30);
  let n = 0;
  for (const r of cache.rows) {
    const d = (r.created_date ?? "").slice(0, 10);
    if (d && d >= since) n++;
  }
  return { value: n, source: cache.source, age_seconds: cache.age_seconds };
}

// ── Per-dataset insights for /datasets/[id] ─────────────────────────────────

export type LiveInsight = {
  value: string;
  label: string;
  delta?: string;
};

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function pctDelta(cur: number, prior: number, suffix = "vs prior period"): string | undefined {
  if (!Number.isFinite(cur) || !Number.isFinite(prior) || prior <= 0) return undefined;
  const pct = ((cur - prior) / prior) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% ${suffix}`;
}

export async function getCachedInsight(datasetId: string): Promise<StatResult<LiveInsight>> {
  if (datasetId === "3syk-w9eu") {
    const cache = await getCachedRows<{ issue_date?: string }>("3syk-w9eu");
    if (!cache) return { value: null, source: "miss", age_seconds: null };
    const a = isoDaysAgo(30);
    const b = isoDaysAgo(60);
    let cur = 0;
    let prior = 0;
    for (const r of cache.rows) {
      const d = (r.issue_date ?? "").slice(0, 10);
      if (!d) continue;
      if (d >= a) cur++;
      else if (d >= b) prior++;
    }
    return {
      value: {
        value: fmt(cur),
        label: "construction permits issued in the last 30 days",
        delta: pctDelta(cur, prior),
      },
      source: cache.source,
      age_seconds: cache.age_seconds,
    };
  }
  if (datasetId === "ecmv-9xxi") {
    const cache = await getCachedRows<{ inspection_date?: string; score?: string | number }>(
      "ecmv-9xxi",
    );
    if (!cache) return { value: null, source: "miss", age_seconds: null };
    const yearStart = `${new Date().getUTCFullYear()}-01-01`;
    const priorYearStart = `${new Date().getUTCFullYear() - 1}-01-01`;
    let cur = 0;
    let prior = 0;
    for (const r of cache.rows) {
      const d = (r.inspection_date ?? "").slice(0, 10);
      const score = Number(r.score ?? 100);
      if (!d || !Number.isFinite(score)) continue;
      if (score >= 70) continue;
      if (d >= yearStart) cur++;
      else if (d >= priorYearStart && d < yearStart) prior++;
    }
    return {
      value: {
        value: fmt(cur),
        label: "failing inspections (score < 70) so far this year",
        delta: pctDelta(cur, prior, "vs same period last year"),
      },
      source: cache.source,
      age_seconds: cache.age_seconds,
    };
  }
  if (datasetId === "xwdj-i9he") {
    const cache = await getCachedRows<{ sr_created_date?: string }>("xwdj-i9he");
    if (!cache) return { value: null, source: "miss", age_seconds: null };
    const a = isoDaysAgo(30);
    const b = isoDaysAgo(60);
    let cur = 0;
    let prior = 0;
    for (const r of cache.rows) {
      const d = (r.sr_created_date ?? "").slice(0, 10);
      if (!d) continue;
      if (d >= a) cur++;
      else if (d >= b) prior++;
    }
    return {
      value: {
        value: fmt(cur),
        label: "311 service requests filed in the last 30 days",
        delta: pctDelta(cur, prior),
      },
      source: cache.source,
      age_seconds: cache.age_seconds,
    };
  }
  return { value: null, source: "miss", age_seconds: null };
}

/** Pretty-print "Nh ago" or "Nm ago" for the badge. */
export function ageLabel(ageSeconds: number | null): string {
  if (ageSeconds === null) return "—";
  if (ageSeconds < 60) return "just now";
  if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)}m ago`;
  if (ageSeconds < 86400) return `${Math.round(ageSeconds / 3600)}h ago`;
  return `${Math.round(ageSeconds / 86400)}d ago`;
}
