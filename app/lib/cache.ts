// SQLite cache layer for Socrata SODA results.
//
// Wraps the live Socrata client with a fallback chain:
//   1. Try local SQLite cache (data/cache.db) — fastest, ~ms response
//   2. On miss / stale, try live Socrata
//   3. On live failure, surface "cache-stale" if anything is in cache (any age)
//   4. On all-fail, surface error envelope with helpful diagnosis
//
// Per-dataset TTL config keeps fast-moving data (permits, 311) fresh
// while letting slow-moving data (traffic fatalities, franchise tax) live
// in cache for days.
//
// Reader uses sql.js (WASM) so it works on Vercel serverless without a
// native binary. Writer (the ingestor) uses better-sqlite3 in CI.

import { createHash } from "crypto";
import path from "path";

// Per-dataset cache TTL in seconds. Defaults to 1 hour.
const TTL: Record<string, number> = {
  "3syk-w9eu": 3600,        // permits — daily updates, 1h cache
  "ecmv-9xxi": 86400,       // food inspections — weekly, 24h cache
  "xwdj-i9he": 3600,        // 311 — high freq, 1h cache
  "6wtj-zbtb": 86400,       // code violations — daily, 24h cache
  "fdj4-gpfu": 86400 * 7,   // crime — weekly, 7d cache
  "y2wy-tgr5": 86400 * 30,  // fatalities — monthly, 30d cache
  "9cir-efmm": 86400 * 7,   // franchise tax — weekly, 7d cache
};
const DEFAULT_TTL = 3600;

// Try multiple paths so this works in dev (cwd = repo root) AND on Vercel
// serverless (cwd = /var/task; data/ is bundled via outputFileTracingIncludes).
const CACHE_DB_CANDIDATES = [
  path.join(process.cwd(), "data", "cache.db"),
  "/var/task/data/cache.db",
  path.resolve(__dirname, "../../data/cache.db"),
];

// better-sqlite3 reader — opened once per cold start in readonly mode.
type BetterDB = {
  prepare: (sql: string) => {
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
  };
  close: () => void;
};

let _db: BetterDB | null | undefined = undefined;

function getDb(): BetterDB | null {
  if (_db !== undefined) return _db;
  try {
    // require so webpack/Next leaves better-sqlite3 as an external native
    // dependency. Configured via serverComponentsExternalPackages in
    // next.config.mjs.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3") as new (
      path: string,
      opts?: { readonly?: boolean; fileMustExist?: boolean },
    ) => BetterDB;

    for (const p of CACHE_DB_CANDIDATES) {
      try {
        const db = new Database(p, { readonly: true, fileMustExist: true });
        _db = db;
        return _db;
      } catch {
        // try next path
      }
    }
    console.warn("[cache] cache.db not found in any candidate path:", CACHE_DB_CANDIDATES);
    _db = null;
    return null;
  } catch (e) {
    console.warn("[cache] better-sqlite3 unavailable:", e instanceof Error ? e.message : e);
    _db = null;
    return null;
  }
}

function normalizeQuery(datasetId: string, params: Record<string, unknown> | undefined): string {
  const ordered: Record<string, unknown> = {};
  if (params) {
    for (const k of Object.keys(params).sort()) ordered[k] = params[k];
  }
  return JSON.stringify({ datasetId, ...ordered });
}

export function hashQuery(datasetId: string, params: Record<string, unknown> | undefined): string {
  return createHash("sha256")
    .update(normalizeQuery(datasetId, params))
    .digest("hex")
    .slice(0, 24);
}

export type CacheLookup<T> = {
  hit: boolean;
  source: "cache" | "stale" | "miss";
  age_seconds: number | null;
  rows: T[];
};

/** Look up a query in the cache. Returns hit=false if missing or stale. */
export async function cacheLookup<T = unknown>(
  datasetId: string,
  params: Record<string, unknown> | undefined,
): Promise<CacheLookup<T>> {
  const db = getDb();
  if (!db) return { hit: false, source: "miss", age_seconds: null, rows: [] };

  const queryHash = hashQuery(datasetId, params);
  try {
    const row = db
      .prepare("SELECT payload, fetched_at, ttl_seconds FROM cache_query WHERE query_hash = ?")
      .get(queryHash) as { payload: string; fetched_at: number; ttl_seconds: number } | undefined;
    if (!row) return { hit: false, source: "miss", age_seconds: null, rows: [] };

    const ageSeconds = Math.floor(Date.now() / 1000) - Number(row.fetched_at);
    const ttl = Number(row.ttl_seconds) || DEFAULT_TTL;
    let rows: T[];
    try {
      rows = JSON.parse(row.payload) as T[];
    } catch {
      return { hit: false, source: "miss", age_seconds: null, rows: [] };
    }
    if (ageSeconds <= ttl) {
      return { hit: true, source: "cache", age_seconds: ageSeconds, rows };
    }
    return { hit: false, source: "stale", age_seconds: ageSeconds, rows };
  } catch (e) {
    console.warn("[cache] lookup error:", e instanceof Error ? e.message : e);
    return { hit: false, source: "miss", age_seconds: null, rows: [] };
  }
}

export async function cacheStats(): Promise<{
  enabled: boolean;
  dataset_count: number;
  total_queries: number;
  oldest_seconds: number | null;
}> {
  const db = getDb();
  if (!db) return { enabled: false, dataset_count: 0, total_queries: 0, oldest_seconds: null };
  try {
    const ds = db.prepare("SELECT COUNT(*) AS c FROM cache_meta").get() as { c: number };
    const q = db
      .prepare("SELECT COUNT(*) AS c, MIN(fetched_at) AS m FROM cache_query")
      .get() as { c: number; m: number | null };
    const oldest =
      q.m !== null ? Math.floor(Date.now() / 1000) - Number(q.m) : null;
    return { enabled: true, dataset_count: ds.c, total_queries: q.c, oldest_seconds: oldest };
  } catch {
    return { enabled: false, dataset_count: 0, total_queries: 0, oldest_seconds: null };
  }
}

/** Wrap a live-fetch promise with the cache + fallback chain.
 *  Order: cache → live → stale-cache → error.                              */
export async function withCacheFallback<T>(
  datasetId: string,
  params: Record<string, unknown> | undefined,
  liveFetch: () => Promise<{ ok: true; rows: T[] } | { ok: false; error: string }>,
): Promise<{
  rows: T[];
  source: "cache" | "live" | "cache-fallback" | "error";
  age_seconds: number | null;
  error?: string;
}> {
  // 1. Cache fresh
  const lookup = await cacheLookup<T>(datasetId, params);
  if (lookup.hit) {
    return { rows: lookup.rows, source: "cache", age_seconds: lookup.age_seconds };
  }
  // 2. Live
  try {
    const live = await liveFetch();
    if (live.ok) {
      return { rows: live.rows, source: "live", age_seconds: 0 };
    }
    // Live failed; fall through.
    // 3. Stale cache (better than nothing)
    if (lookup.source === "stale") {
      return {
        rows: lookup.rows,
        source: "cache-fallback",
        age_seconds: lookup.age_seconds,
        error: live.error,
      };
    }
    return { rows: [], source: "error", age_seconds: null, error: live.error };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (lookup.source === "stale") {
      return { rows: lookup.rows, source: "cache-fallback", age_seconds: lookup.age_seconds, error: msg };
    }
    return { rows: [], source: "error", age_seconds: null, error: msg };
  }
}

export const ttlFor = (datasetId: string): number => TTL[datasetId] ?? DEFAULT_TTL;
