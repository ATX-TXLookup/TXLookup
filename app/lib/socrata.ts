// Bounded Socrata SODA client (TS, server-side).
// Mirrors agent/tools/data.py contract — same envelope, same hard limits.
//
// Cache fallback: on HTTP 429 (rate limit) or network failure, attempts to
// pull recent rows for the same dataset from the local SQLite mirror
// (data/cache.db). The agent loop downstream sees rows + a `cache_fallback`
// flag in the result so it can include a caveat in the synthesized answer.
// This makes the multi-agent loop demo-resilient when the upstream portal
// throttles us.

import { cacheLookup } from "./cache";

const HARD_LIMIT = 5000;
const TIMEOUT_MS = 30_000;

// The exact ingest spec — must match agent/specialists/ingestor.py INGEST_SPEC.
// Used to look up the headline cache entry per dataset.
const INGEST_PARAMS: Record<string, { select: string; order: string; limit: number }> = {
  "3syk-w9eu": {
    select:
      "permit_number,permittype,permit_class_mapped,status_current,original_address1,original_zip,issue_date,total_existing_bldg_sqft",
    order: "issue_date DESC",
    limit: 5000,
  },
  "ecmv-9xxi": {
    select: "restaurant_name,score,address,zip_code,inspection_date,facility_id",
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
};

/**
 * Build auth headers for Socrata.
 *
 * SOCRATA_KEY_ID + SOCRATA_KEY_SECRET → HTTP Basic auth. Gets the highest
 * rate limit and works on every Socrata-hosted portal. Unset → unauthenticated
 * (shared public rate limit, only useful for one-off probes).
 */
function socrataHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const id = process.env.SOCRATA_KEY_ID;
  const secret = process.env.SOCRATA_KEY_SECRET;
  if (id && secret) {
    const b = typeof Buffer !== "undefined" ? Buffer.from(`${id}:${secret}`).toString("base64") : btoa(`${id}:${secret}`);
    headers["Authorization"] = `Basic ${b}`;
  }
  return headers;
}

export type SodaResult = {
  status: "completed" | "failed";
  result: {
    records: Record<string, unknown>[];
    url: string;
    count: number;
    /** Set when records came from data/cache.db instead of live Socrata. */
    cache_fallback?: boolean;
    /** Age in seconds of the cached rows when cache_fallback is true. */
    cache_age_seconds?: number;
  } | null;
  error: string | null;
};

/** Try to recover from a Socrata failure by pulling cached rows. */
async function cacheRecover(
  datasetId: string,
  url: string,
  liveError: string,
): Promise<SodaResult> {
  const params = INGEST_PARAMS[datasetId];
  if (!params) {
    return { status: "failed", result: null, error: liveError };
  }
  try {
    const c = await cacheLookup<Record<string, unknown>>(datasetId, params);
    if ((c.source === "cache" || c.source === "stale") && c.rows.length > 0) {
      return {
        status: "completed",
        result: {
          records: c.rows,
          url,
          count: c.rows.length,
          cache_fallback: true,
          cache_age_seconds: c.age_seconds ?? 0,
        },
        error: null,
      };
    }
  } catch {
    // fall through
  }
  return { status: "failed", result: null, error: liveError };
}

type Params = {
  where?: string;
  select?: string;
  group?: string;
  order?: string;
  limit?: number;
};

function buildUrl(portal: string, datasetId: string, p: Params): string {
  const u = new URL(`https://${portal}/resource/${datasetId}.json`);
  if (p.where) u.searchParams.set("$where", p.where);
  if (p.select) u.searchParams.set("$select", p.select);
  if (p.group) u.searchParams.set("$group", p.group);
  if (p.order) u.searchParams.set("$order", p.order);
  u.searchParams.set("$limit", String(Math.min(p.limit ?? 1000, HARD_LIMIT)));
  return u.toString();
}

export async function sodaQuery(
  portal: string,
  datasetId: string,
  params: Params = {},
): Promise<SodaResult> {
  if ((params.limit ?? 0) > HARD_LIMIT) {
    return {
      status: "failed",
      result: null,
      error: `limit=${params.limit} exceeds hard cap of ${HARD_LIMIT}`,
    };
  }
  const url = buildUrl(portal, datasetId, params);
  const headers = socrataHeaders();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers,
      signal: ctrl.signal,
      next: { revalidate: 60 },
    });
    if (!r.ok) {
      const liveErr = `HTTP ${r.status} on ${url}`;
      // Rate-limited or upstream 5xx → try the local mirror.
      if (r.status === 429 || r.status >= 500) {
        return cacheRecover(datasetId, url, liveErr);
      }
      return { status: "failed", result: null, error: liveErr };
    }
    const records = (await r.json()) as Record<string, unknown>[];
    return {
      status: "completed",
      result: { records, url, count: records.length },
      error: null,
    };
  } catch (e: unknown) {
    // Network failure / abort / timeout — try the local mirror.
    const msg = e instanceof Error ? e.message : String(e);
    return cacheRecover(datasetId, url, msg);
  } finally {
    clearTimeout(t);
  }
}

// Schema metadata via Socrata's /api/views endpoint.
export type SchemaResult = {
  status: "completed" | "failed";
  result: {
    columns: { name: string; field_name: string; type?: string }[];
    rowCount: number | null;
    lastUpdated: string | null; // ISO
    sampleRows: Record<string, unknown>[];
  } | null;
  error: string | null;
};

export async function describeDataset(
  portal: string,
  datasetId: string,
): Promise<SchemaResult> {
  const metaUrl = `https://${portal}/api/views/${datasetId}.json`;
  const headers = socrataHeaders();
  try {
    const [metaR, sampleR] = await Promise.all([
      fetch(metaUrl, { headers, next: { revalidate: 600 } }),
      fetch(`https://${portal}/resource/${datasetId}.json?$limit=3`, {
        headers,
        next: { revalidate: 600 },
      }),
    ]);
    if (!metaR.ok) {
      return { status: "failed", result: null, error: `meta HTTP ${metaR.status}` };
    }
    const meta = (await metaR.json()) as {
      rowsUpdatedAt?: number;
      columns?: { name: string; fieldName: string; dataTypeName?: string }[];
    };
    const sample = sampleR.ok
      ? ((await sampleR.json()) as Record<string, unknown>[])
      : [];
    return {
      status: "completed",
      result: {
        columns: (meta.columns ?? []).slice(0, 60).map((c) => ({
          name: c.name,
          field_name: c.fieldName,
          type: c.dataTypeName,
        })),
        rowCount: null,
        lastUpdated: meta.rowsUpdatedAt
          ? new Date(meta.rowsUpdatedAt * 1000).toISOString()
          : null,
        sampleRows: sample,
      },
      error: null,
    };
  } catch (e: unknown) {
    return {
      status: "failed",
      result: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
