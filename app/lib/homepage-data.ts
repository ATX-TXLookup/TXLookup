// Live homepage stats — computed at server-render time from real Socrata queries.
// All fetches are revalidated every 5 minutes so the homepage stays fresh
// without hammering the portals.

const REVALIDATE = 300;

type DailyCount = { day: string; count: number };

/** Run a SODA query and return parsed JSON or null on any failure. */
async function soda(url: string): Promise<unknown[] | null> {
  try {
    const r = await fetch(url, { next: { revalidate: REVALIDATE } });
    if (!r.ok) return null;
    return (await r.json()) as unknown[];
  } catch {
    return null;
  }
}

/** Permit count grouped by day for the last 7 days, oldest-first. */
export async function austinPermitsLast7Days(): Promise<DailyCount[]> {
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
  if (!rows) return [];
  return rows.map((r) => {
    const y = String(r.y ?? "0");
    const m = String(r.m ?? "0").padStart(2, "0");
    const d = String(r.d ?? "0").padStart(2, "0");
    return { day: `${y}-${m}-${d}`, count: Number(r.count ?? 0) };
  });
}

/** Total permits last 7d. */
export async function austinPermits7dTotal(): Promise<number> {
  const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const url = `https://data.austintexas.gov/resource/3syk-w9eu.json?$select=count(*) AS count&$where=issue_date >= '${since}'`;
  const rows = (await soda(encodeURI(url))) as { count?: string }[] | null;
  return Number(rows?.[0]?.count ?? 0);
}

/** Recent inspections grouped by zip — top 5 zips by inspection count last 30 days. */
export async function austinInspections30dByZip(): Promise<{ zip: string; count: number }[]> {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const url =
    `https://data.austintexas.gov/resource/ecmv-9xxi.json` +
    `?$select=zip_code AS zip, count(*) AS count` +
    `&$where=inspection_date >= '${since}'` +
    `&$group=zip_code&$order=count DESC&$limit=5`;
  const rows = (await soda(encodeURI(url))) as
    | { zip?: string; count?: string }[]
    | null;
  if (!rows) return [];
  return rows.map((r) => ({
    zip: String(r.zip ?? "—"),
    count: Number(r.count ?? 0),
  }));
}

/** 311 service requests opened in the last 30d (raw count). */
export async function austin311Last30d(): Promise<number> {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const url = `https://data.austintexas.gov/resource/i26j-ai4z.json?$select=count(*) AS count&$where=created_date >= '${since}'`;
  const rows = (await soda(encodeURI(url))) as { count?: string }[] | null;
  return Number(rows?.[0]?.count ?? 0);
}

/** Currently open code-violation cases. */
export async function austinOpenCodeViolations(): Promise<number> {
  const url = `https://data.austintexas.gov/resource/6wtj-zbtb.json?$select=count(*) AS count&$where=case_status='OPEN'`;
  const rows = (await soda(encodeURI(url))) as { count?: string }[] | null;
  return Number(rows?.[0]?.count ?? 0);
}

/** Per-dataset row count + last refresh, fetched live for the dataset cards. */
export async function datasetMetadata(
  portal: string,
  id: string,
): Promise<{ rowCount: number | null; lastRefreshed: string | null }> {
  try {
    const r = await fetch(`https://${portal}/api/views/${id}.json`, {
      next: { revalidate: REVALIDATE },
    });
    if (!r.ok) return { rowCount: null, lastRefreshed: null };
    const meta = (await r.json()) as {
      rowsUpdatedAt?: number;
    };
    return {
      rowCount: null, // not always reliable from /api/views
      lastRefreshed: meta.rowsUpdatedAt
        ? new Date(meta.rowsUpdatedAt * 1000).toISOString().slice(0, 10)
        : null,
    };
  } catch {
    return { rowCount: null, lastRefreshed: null };
  }
}

/** Compact human label like "+372 / +22%" — but with real numbers. */
export function formatTicker(value: number, deltaPct?: number): string {
  if (deltaPct === undefined) return value.toLocaleString();
  const sign = deltaPct >= 0 ? "+" : "−";
  return `${value.toLocaleString()} ${sign}${Math.abs(deltaPct).toFixed(0)}%`;
}
