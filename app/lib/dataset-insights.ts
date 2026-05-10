// Per-dataset live insight helpers.
//
// Each helper hits Socrata at request time, computes a small "what's
// happening right now" stat (and a YoY/30d delta where we have one), and
// returns null on any failure so the dataset page degrades gracefully.

import { sodaQuery } from "./socrata";

export type LiveInsight = {
  value: string;
  label: string;
  delta?: string;
};

// ── date helpers ─────────────────────────────────────────────────────────────
function isoNDaysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function isoYearsAgo(n: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear() - n, now.getMonth(), now.getDate());
  return d.toISOString().slice(0, 10);
}

function isoYearStart(yearOffset = 0): string {
  const y = new Date().getUTCFullYear() - yearOffset;
  return `${y}-01-01`;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function pctDelta(current: number, prior: number): string | undefined {
  if (!Number.isFinite(current) || !Number.isFinite(prior) || prior <= 0) {
    return undefined;
  }
  const pct = ((current - prior) / prior) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% vs prior period`;
}

// Pull the first count(*) value out of a Socrata aggregate response.
function readCount(records: Record<string, unknown>[] | undefined): number {
  if (!records || records.length === 0) return 0;
  const r = records[0];
  const raw = r.count ?? r.COUNT ?? r["count"] ?? Object.values(r)[0];
  const n = typeof raw === "string" ? parseFloat(raw) : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

async function countWhere(
  portal: string,
  datasetId: string,
  where: string,
): Promise<number | null> {
  try {
    const res = await sodaQuery(portal, datasetId, {
      select: "count(*) AS count",
      where,
    });
    if (res.status !== "completed" || !res.result) return null;
    return readCount(res.result.records);
  } catch {
    return null;
  }
}

// ── per-dataset implementations ──────────────────────────────────────────────

async function permitsLast30d(): Promise<LiveInsight | null> {
  const portal = "data.austintexas.gov";
  const id = "3syk-w9eu";
  const cur = await countWhere(portal, id, `issue_date >= '${isoNDaysAgo(30)}'`);
  if (cur == null) return null;
  const prior = await countWhere(
    portal,
    id,
    `issue_date >= '${isoNDaysAgo(60)}' AND issue_date < '${isoNDaysAgo(30)}'`,
  );
  return {
    value: fmt(cur),
    label: "construction permits issued in the last 30 days",
    delta: prior != null ? pctDelta(cur, prior) : undefined,
  };
}

async function failingInspectionsYTD(): Promise<LiveInsight | null> {
  const portal = "data.austintexas.gov";
  const id = "ecmv-9xxi";
  const cur = await countWhere(
    portal,
    id,
    `score < 70 AND inspection_date >= '${isoYearStart(0)}'`,
  );
  if (cur == null) return null;
  const priorYearStart = isoYearStart(1);
  const priorYearEnd = isoYearStart(0);
  const prior = await countWhere(
    portal,
    id,
    `score < 70 AND inspection_date >= '${priorYearStart}' AND inspection_date < '${priorYearEnd}'`,
  );
  return {
    value: fmt(cur),
    label: "failing inspections (score < 70) so far this year",
    delta:
      prior != null
        ? pctDelta(cur, prior)?.replace("prior period", "same period last year")
        : undefined,
  };
}

async function calls311Last30d(): Promise<LiveInsight | null> {
  const portal = "datahub.austintexas.gov";
  const id = "xwdj-i9he";
  const cur = await countWhere(
    portal,
    id,
    `sr_created_date >= '${isoNDaysAgo(30)}'`,
  );
  if (cur == null) return null;
  const prior = await countWhere(
    portal,
    id,
    `sr_created_date >= '${isoNDaysAgo(60)}' AND sr_created_date < '${isoNDaysAgo(30)}'`,
  );
  return {
    value: fmt(cur),
    label: "311 service requests filed in the last 30 days",
    delta: prior != null ? pctDelta(cur, prior) : undefined,
  };
}

// ── public entrypoint ────────────────────────────────────────────────────────

export async function getLiveInsight(
  datasetId: string,
): Promise<LiveInsight | null> {
  try {
    switch (datasetId) {
      case "3syk-w9eu":
        return await permitsLast30d();
      case "ecmv-9xxi":
        return await failingInspectionsYTD();
      case "xwdj-i9he":
        return await calls311Last30d();
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// Keep `isoYearsAgo` exported for future per-dataset windows (e.g. 24-month
// fatality stat). Marked used here to avoid the unused-export lint.
export const _internals = { isoYearsAgo };
