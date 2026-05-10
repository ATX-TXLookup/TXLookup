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
import { promises as fs } from "fs";
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

const CACHE_DB_PATH = path.join(process.cwd(), "data", "cache.db");

// sql.js initializer — one-shot per cold start.
type SqlJsDB = {
  exec: (sql: string) => Array<{ columns: string[]; values: unknown[][] }>;
  prepare: (sql: string) => SqlJsStatement;
};
type SqlJsStatement = {
  bind: (params: unknown[]) => boolean;
  step: () => boolean;
  getAsObject: () => Record<string, unknown>;
  free: () => void;
};

let _dbPromise: Promise<SqlJsDB | null> | null = null;

function getDb(): Promise<SqlJsDB | null> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = (async () => {
    try {
      // Hide from webpack's static analyzer so the build doesn't fail when
      // sql.js isn't installed in dev. Cast through unknown to avoid TS noise.
      const dynamicImport = new Function("s", "return import(s)") as (s: string) => Promise<unknown>;
      const sqlJs = (await dynamicImport("sql.js")) as { default: (config?: unknown) => Promise<{ Database: new (data?: Uint8Array) => SqlJsDB }> };
      const SQL = await sqlJs.default({
        locateFile: (file: string) => `/_next/static/${file}`,
      });
      // Try to read the bundled cache.db; if it doesn't exist, return null
      // (cache disabled gracefully — falls through to live Socrata).
      let buf: Uint8Array | undefined;
      try {
        const bytes = await fs.readFile(CACHE_DB_PATH);
        buf = new Uint8Array(bytes);
      } catch {
        // No cache file yet. Return an empty DB so writes work but reads
        // always miss. The ingestor commits a real cache.db later.
      }
      const db = new SQL.Database(buf);
      // Initialize schema on a fresh DB.
      db.exec(`
        CREATE TABLE IF NOT EXISTS cache_meta (
          dataset_id TEXT PRIMARY KEY,
          last_ingested INTEGER NOT NULL,
          row_count INTEGER NOT NULL,
          schema_hash TEXT
        );
        CREATE TABLE IF NOT EXISTS cache_query (
          query_hash TEXT PRIMARY KEY,
          dataset_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          row_count INTEGER NOT NULL,
          fetched_at INTEGER NOT NULL,
          ttl_seconds INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_cache_query_ds ON cache_query(dataset_id);
      `);
      return db;
    } catch (e) {
      console.warn("[cache] sql.js unavailable — cache disabled, falling through to live:", e instanceof Error ? e.message : e);
      return null;
    }
  })();
  return _dbPromise;
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
  const db = await getDb();
  if (!db) return { hit: false, source: "miss", age_seconds: null, rows: [] };

  const queryHash = hashQuery(datasetId, params);
  const stmt = db.prepare("SELECT payload, fetched_at, ttl_seconds FROM cache_query WHERE query_hash = ?");
  try {
    stmt.bind([queryHash]);
    if (!stmt.step()) {
      stmt.free();
      return { hit: false, source: "miss", age_seconds: null, rows: [] };
    }
    const row = stmt.getAsObject() as { payload: string; fetched_at: number; ttl_seconds: number };
    stmt.free();
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
    // Stale — return rows but signal source: stale so caller can decide
    // whether to refresh in background.
    return { hit: false, source: "stale", age_seconds: ageSeconds, rows };
  } catch (e) {
    console.warn("[cache] lookup error:", e instanceof Error ? e.message : e);
    try { stmt.free(); } catch {}
    return { hit: false, source: "miss", age_seconds: null, rows: [] };
  }
}

export async function cacheStats(): Promise<{
  enabled: boolean;
  dataset_count: number;
  total_queries: number;
  oldest_seconds: number | null;
}> {
  const db = await getDb();
  if (!db) return { enabled: false, dataset_count: 0, total_queries: 0, oldest_seconds: null };
  try {
    const rDs = db.exec("SELECT COUNT(*) FROM cache_meta");
    const rQ = db.exec("SELECT COUNT(*), MIN(fetched_at) FROM cache_query");
    const dsCount = (rDs[0]?.values[0]?.[0] as number) ?? 0;
    const qCount = (rQ[0]?.values[0]?.[0] as number) ?? 0;
    const minFetched = (rQ[0]?.values[0]?.[1] as number) ?? null;
    const oldest = minFetched !== null ? Math.floor(Date.now() / 1000) - Number(minFetched) : null;
    return { enabled: true, dataset_count: dsCount, total_queries: qCount, oldest_seconds: oldest };
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
