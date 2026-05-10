// JSON-file-backed cache reader for the local Socrata mirror.
//
// The ingestor (agent/specialists/ingestor.py) writes one JSON file per
// dataset to data/cache/<datasetId>.json. The reader here uses fs.readFile
// — zero native deps, zero WASM, works on every Node platform including
// Vercel serverless functions.
//
// Why not SQLite? sql.js needs WASM that Vercel doesn't trace; better-sqlite3
// has prebuilt N-API bindings whose ABI didn't match Vercel's Node runtime
// ('Module did not self-register' on every cold start). JSON files have none
// of those failure modes — the ingestor is the only writer, the reader is
// stateless and pure-JS.
//
// Each cached dataset file:
//   { dataset_id, params, fetched_at, ttl_seconds, row_count, rows: [...] }
// Cache lookups by hashed query envelope. Today the only query the reader
// asks for IS the headline ingest envelope, so cache hits are 100%
// deterministic post-warmup.

import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

// Per-dataset cache TTL in seconds. Defaults to 1 hour. Used as override
// when the cached file's stored ttl_seconds is missing.
const TTL: Record<string, number> = {
  "3syk-w9eu": 3600,
  "ecmv-9xxi": 86400,
  "xwdj-i9he": 3600,
  "6wtj-zbtb": 86400,
  "fdj4-gpfu": 86400 * 7,
  "y2wy-tgr5": 86400 * 30,
  "9cir-efmm": 86400 * 7,
  "gc4d-8a49": 3600,
};
const DEFAULT_TTL = 3600;

// Try multiple paths so this works in dev (cwd = repo root) AND on Vercel
// serverless (cwd = /var/task; data/ is bundled via outputFileTracingIncludes).
const CACHE_DIR_CANDIDATES = [
  path.join(process.cwd(), "data", "cache"),
  "/var/task/data/cache",
];

type CachedFile<T> = {
  dataset_id: string;
  params: Record<string, unknown>;
  fetched_at: number;
  ttl_seconds: number;
  row_count: number;
  rows: T[];
};

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

async function readCachedFile<T>(datasetId: string): Promise<CachedFile<T> | null> {
  for (const dir of CACHE_DIR_CANDIDATES) {
    try {
      const buf = await fs.readFile(path.join(dir, `${datasetId}.json`), "utf8");
      return JSON.parse(buf) as CachedFile<T>;
    } catch {
      // try next dir
    }
  }
  return null;
}

/** Look up a query in the cache. Returns hit=false if missing or stale. */
export async function cacheLookup<T = unknown>(
  datasetId: string,
  params: Record<string, unknown> | undefined,
): Promise<CacheLookup<T>> {
  const file = await readCachedFile<T>(datasetId);
  if (!file) return { hit: false, source: "miss", age_seconds: null, rows: [] };

  // Verify the requested params match what was ingested. If they don't,
  // we don't actually have an answer for this exact query — treat as miss.
  const requestHash = hashQuery(datasetId, params);
  const cachedHash = hashQuery(datasetId, file.params);
  if (requestHash !== cachedHash) {
    // Caller is asking for a different envelope than what the ingestor
    // pre-computed. Return the rows anyway as 'stale' so cache-recovery
    // paths can still serve something on a 429.
    const ageSeconds = Math.floor(Date.now() / 1000) - Number(file.fetched_at);
    return { hit: false, source: "stale", age_seconds: ageSeconds, rows: file.rows };
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - Number(file.fetched_at);
  const ttl = Number(file.ttl_seconds) || DEFAULT_TTL;
  if (ageSeconds <= ttl) {
    return { hit: true, source: "cache", age_seconds: ageSeconds, rows: file.rows };
  }
  return { hit: false, source: "stale", age_seconds: ageSeconds, rows: file.rows };
}

export async function cacheStats(): Promise<{
  enabled: boolean;
  dataset_count: number;
  total_queries: number;
  oldest_seconds: number | null;
}> {
  for (const dir of CACHE_DIR_CANDIDATES) {
    try {
      const buf = await fs.readFile(path.join(dir, "index.json"), "utf8");
      const idx = JSON.parse(buf) as {
        datasets: { dataset_id: string; row_count: number; fetched_at: number }[];
      };
      const ts = idx.datasets.map((d) => d.fetched_at).filter((t) => Number.isFinite(t));
      const oldest = ts.length > 0 ? Math.floor(Date.now() / 1000) - Math.min(...ts) : null;
      return {
        enabled: true,
        dataset_count: idx.datasets.length,
        total_queries: idx.datasets.length,
        oldest_seconds: oldest,
      };
    } catch {
      // try next
    }
  }
  return { enabled: false, dataset_count: 0, total_queries: 0, oldest_seconds: null };
}

/** Wrap a live-fetch promise with the cache + fallback chain.
 *  Order: cache → live → stale-cache → error. */
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
  const lookup = await cacheLookup<T>(datasetId, params);
  if (lookup.hit) {
    return { rows: lookup.rows, source: "cache", age_seconds: lookup.age_seconds };
  }
  try {
    const live = await liveFetch();
    if (live.ok) {
      return { rows: live.rows, source: "live", age_seconds: 0 };
    }
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
