// Homepage stats — cache-first with live fallback.
//
// Each helper:
//   1. tries the local SQLite mirror (fast, ~ms, refreshed every 6h by cron)
//   2. on cache miss, falls through to live Socrata
//   3. on live failure with a stale cache present, returns the stale value
//
// Returns { value, source, age_seconds } so the UI can render a "Local
// mirror · Nh ago" or "Live" badge per stat tile. This makes the resilience
// layer a visible trust signal rather than a hidden workaround.

import {
  austin311Last30d as cached311,
  austinInspections30dByZip as cachedInspections,
  austinOpenCodeViolations as cachedViolations,
  austinPermits7dTotal as cachedPermits7dTotal,
  austinPermitsLast7Days as cachedPermits7dDaily,
  dallas311Last30d as cachedDallas311,
  texasFranchisePermitsActive as cachedFranchise,
  type StatResult,
} from "./cached-stats";

const REVALIDATE = 300;

export type DailyCount = { day: string; count: number };

function socrataHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const id = process.env.SOCRATA_KEY_ID;
  const secret = process.env.SOCRATA_KEY_SECRET;
  if (id && secret) {
    const b =
      typeof Buffer !== "undefined"
        ? Buffer.from(`${id}:${secret}`).toString("base64")
        : btoa(`${id}:${secret}`);
    headers["Authorization"] = `Basic ${b}`;
  }
  return headers;
}

async function soda(url: string): Promise<unknown[] | null> {
  try {
    const r = await fetch(url, {
      headers: socrataHeaders(),
      next: { revalidate: REVALIDATE },
    });
    if (!r.ok) return null;
    return (await r.json()) as unknown[];
  } catch {
    return null;
  }
}

/** Generic cache→live wrapper: try cache, fall through to live, fall back to stale. */
async function cacheFirst<T>(
  cached: () => Promise<StatResult<T>>,
  live: () => Promise<T | null>,
): Promise<StatResult<T>> {
  const c = await cached();
  if (c.value !== null && c.source === "cache") return c;
  try {
    const v = await live();
    if (v !== null) return { value: v, source: "live", age_seconds: 0 };
  } catch {
    // swallow
  }
  if (c.value !== null) {
    return { value: c.value, source: c.source === "cache-stale" ? "cache-stale" : "cache", age_seconds: c.age_seconds };
  }
  return { value: null, source: "miss", age_seconds: null };
}

// ── Austin permits ───────────────────────────────────────────────────────────

export async function austinPermitsLast7Days(): Promise<StatResult<DailyCount[]>> {
  return cacheFirst(cachedPermits7dDaily, async () => {
    const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    const url =
      `https://data.austintexas.gov/resource/3syk-w9eu.json` +
      `?$select=date_extract_y(issue_date) AS y,` +
      `date_extract_m(issue_date) AS m,` +
      `date_extract_d(issue_date) AS d,` +
      `count(*) AS count` +
      `&$where=issue_date >= '${since}'` +
      `&$group=y,m,d&$order=y,m,d&$limit=14`;
    const rows = (await soda(encodeURI(url))) as
      | { y?: string; m?: string; d?: string; count?: string }[]
      | null;
    if (!rows) return null;
    return rows.map((r) => {
      const y = String(r.y ?? "0");
      const m = String(r.m ?? "0").padStart(2, "0");
      const d = String(r.d ?? "0").padStart(2, "0");
      return { day: `${y}-${m}-${d}`, count: Number(r.count ?? 0) };
    });
  });
}

export async function austinPermits7dTotal(): Promise<StatResult<number>> {
  return cacheFirst(cachedPermits7dTotal, async () => {
    const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    const url = `https://data.austintexas.gov/resource/3syk-w9eu.json?$select=count(*) AS count&$where=issue_date >= '${since}'`;
    const rows = (await soda(encodeURI(url))) as { count?: string }[] | null;
    if (!rows) return null;
    return Number(rows[0]?.count ?? 0);
  });
}

// ── Austin inspections ───────────────────────────────────────────────────────

export async function austinInspections30dByZip(): Promise<StatResult<{ zip: string; count: number }[]>> {
  return cacheFirst(cachedInspections, async () => {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const url =
      `https://data.austintexas.gov/resource/ecmv-9xxi.json` +
      `?$select=zip_code AS zip, count(*) AS count` +
      `&$where=inspection_date >= '${since}'` +
      `&$group=zip_code&$order=count DESC&$limit=5`;
    const rows = (await soda(encodeURI(url))) as { zip?: string; count?: string }[] | null;
    if (!rows) return null;
    return rows.map((r) => ({ zip: String(r.zip ?? "—"), count: Number(r.count ?? 0) }));
  });
}

// ── Austin 311 ───────────────────────────────────────────────────────────────

export async function austin311Last30d(): Promise<StatResult<number>> {
  return cacheFirst(cached311, async () => {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const url = `https://datahub.austintexas.gov/resource/xwdj-i9he.json?$select=count(*) AS count&$where=sr_created_date >= '${since}'`;
    const rows = (await soda(encodeURI(url))) as { count?: string }[] | null;
    if (!rows) return null;
    return Number(rows[0]?.count ?? 0);
  });
}

// ── Austin code violations ───────────────────────────────────────────────────

export async function austinOpenCodeViolations(): Promise<StatResult<number>> {
  return cacheFirst(cachedViolations, async () => {
    const url = `https://data.austintexas.gov/resource/6wtj-zbtb.json?$select=count(*) AS count&$where=status in('Active','Pending')`;
    const rows = (await soda(encodeURI(url))) as { count?: string }[] | null;
    if (!rows) return null;
    return Number(rows[0]?.count ?? 0);
  });
}

// ── TX state franchise tax ───────────────────────────────────────────────────

export async function texasFranchisePermitsActive(): Promise<StatResult<number>> {
  return cacheFirst(cachedFranchise, async () => {
    const url = `https://data.texas.gov/resource/9cir-efmm.json?$select=count(*) AS count&$where=right_to_transact_business_code='Y'`;
    const rows = (await soda(encodeURI(url))) as { count?: string }[] | null;
    if (!rows) return null;
    return Number(rows[0]?.count ?? 0);
  });
}

// ── Dallas 311 ───────────────────────────────────────────────────────────────

export async function dallas311Last30d(): Promise<StatResult<number>> {
  return cacheFirst(cachedDallas311, async () => {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const url = `https://www.dallasopendata.com/resource/gc4d-8a49.json?$select=count(*) AS count&$where=created_date >= '${since}'`;
    const rows = (await soda(encodeURI(url))) as { count?: string }[] | null;
    if (!rows) return null;
    return Number(rows[0]?.count ?? 0);
  });
}

// ── Dallas police active calls (no cache today — pure live) ──────────────────

export async function dallasPoliceActiveCalls(): Promise<StatResult<number>> {
  try {
    const url = `https://www.dallasopendata.com/resource/9fxf-t2tr.json?$select=count(*) AS count`;
    const rows = (await soda(encodeURI(url))) as { count?: string }[] | null;
    if (!rows) return { value: null, source: "miss", age_seconds: null };
    return { value: Number(rows[0]?.count ?? 0), source: "live", age_seconds: 0 };
  } catch {
    return { value: null, source: "miss", age_seconds: null };
  }
}

// ── /api/views metadata (lightweight, no cache) ─────────────────────────────

export async function datasetMetadata(
  portal: string,
  id: string,
): Promise<{ rowCount: number | null; lastRefreshed: string | null }> {
  try {
    const r = await fetch(`https://${portal}/api/views/${id}.json`, {
      next: { revalidate: REVALIDATE },
    });
    if (!r.ok) return { rowCount: null, lastRefreshed: null };
    const meta = (await r.json()) as { rowsUpdatedAt?: number };
    return {
      rowCount: null,
      lastRefreshed: meta.rowsUpdatedAt
        ? new Date(meta.rowsUpdatedAt * 1000).toISOString().slice(0, 10)
        : null,
    };
  } catch {
    return { rowCount: null, lastRefreshed: null };
  }
}

export function formatTicker(value: number, deltaPct?: number): string {
  if (deltaPct === undefined) return value.toLocaleString();
  const sign = deltaPct >= 0 ? "+" : "−";
  return `${value.toLocaleString()} ${sign}${Math.abs(deltaPct).toFixed(0)}%`;
}
