// Bounded Socrata SODA client (TS, server-side).
// Mirrors agent/tools/data.py contract — same envelope, same hard limits.

const HARD_LIMIT = 5000;
const TIMEOUT_MS = 30_000;

/**
 * Build auth headers for Socrata.
 *
 * Two supported auth modes (in priority order):
 *   1. SOCRATA_KEY_ID + SOCRATA_KEY_SECRET → HTTP Basic auth (preferred,
 *      gets the highest rate limit and works on every Socrata-hosted portal)
 *   2. SOCRATA_APP_TOKEN → X-App-Token header (legacy, lower rate limit)
 *
 * Unset → unauthenticated (shared public rate limit).
 */
function socrataHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const id = process.env.SOCRATA_KEY_ID;
  const secret = process.env.SOCRATA_KEY_SECRET;
  if (id && secret) {
    const b = typeof Buffer !== "undefined" ? Buffer.from(`${id}:${secret}`).toString("base64") : btoa(`${id}:${secret}`);
    headers["Authorization"] = `Basic ${b}`;
  } else if (process.env.SOCRATA_APP_TOKEN) {
    headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
  }
  return headers;
}

export type SodaResult = {
  status: "completed" | "failed";
  result: {
    records: Record<string, unknown>[];
    url: string;
    count: number;
  } | null;
  error: string | null;
};

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
      return {
        status: "failed",
        result: null,
        error: `HTTP ${r.status} on ${url}`,
      };
    }
    const records = (await r.json()) as Record<string, unknown>[];
    return {
      status: "completed",
      result: { records, url, count: records.length },
      error: null,
    };
  } catch (e: unknown) {
    return {
      status: "failed",
      result: null,
      error: e instanceof Error ? e.message : String(e),
    };
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
