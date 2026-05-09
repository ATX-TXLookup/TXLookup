// Report builder — given a slug, run the report's Socrata queries and return
// a structured ReportData object. ISR cached at 6h.
//
// Errors per-query degrade gracefully: a failed query returns
// `{ status: "failed", ... }` and the page renders a "data temporarily
// unavailable" cell instead of crashing.

import { findReport, type ReportDef, type ReportQuery, type Viz } from "@/config/reports";
import { sodaQuery } from "./socrata";

export const REPORT_REVALIDATE = 21_600; // 6 hours

export type StatPayload = { kind: "stat"; value: number };
export type BarPayload = { kind: "bar"; bars: { label: string; value: number }[] };
export type LinePayload = { kind: "line"; points: { x: string; y: number }[] };
export type VizPayload = StatPayload | BarPayload | LinePayload;

export type QueryResult = {
  label: string;
  viz: Viz;
  status: "completed" | "failed";
  payload: VizPayload | null;
  error: string | null;
  url: string | null;
};

export type ReportData = {
  def: ReportDef;
  queries: QueryResult[];
  generatedAt: string; // ISO
};

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function renderTemplate(s: string | undefined): string | undefined {
  if (!s) return s;
  return s
    .replace(/\$\{ISO_DATE_30D\}/g, isoDaysAgo(30))
    .replace(/\$\{ISO_DATE_90D\}/g, isoDaysAgo(90))
    .replace(/\$\{ISO_DATE_365D\}/g, isoDaysAgo(365));
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function shape(
  viz: Viz,
  records: Record<string, unknown>[],
): VizPayload | null {
  if (viz === "stat") {
    const r = records[0] ?? {};
    const v = r.count ?? r.value ?? Object.values(r)[0];
    return { kind: "stat", value: num(v) };
  }
  if (viz === "bar") {
    const bars = records.map((r) => {
      // Prefer common label fields; fall back to first non-count value.
      const label =
        (r.zip as string | undefined) ??
        (r.label as string | undefined) ??
        (r.y && r.m ? `${r.y}-${String(r.m).padStart(2, "0")}` : undefined) ??
        String(Object.values(r).find((v) => v !== r.count) ?? "—");
      return { label: String(label ?? "—"), value: num(r.count) };
    });
    return { kind: "bar", bars };
  }
  if (viz === "line") {
    const points = records.map((r) => {
      const x =
        (r.day as string | undefined) ??
        (r.y && r.m ? `${r.y}-${String(r.m).padStart(2, "0")}` : "—");
      return { x: String(x), y: num(r.count) };
    });
    return { kind: "line", points };
  }
  return null;
}

async function runQuery(q: ReportQuery): Promise<QueryResult> {
  const where = renderTemplate(q.params.where_template);
  const res = await sodaQuery(q.portal, q.dataset_id, {
    select: q.params.select,
    where,
    group: q.params.group,
    order: q.params.order,
    limit: q.params.limit ?? (q.viz === "stat" ? 1 : 100),
  });
  if (res.status === "failed" || !res.result) {
    return {
      label: q.label,
      viz: q.viz,
      status: "failed",
      payload: null,
      error: res.error,
      url: null,
    };
  }
  return {
    label: q.label,
    viz: q.viz,
    status: "completed",
    payload: shape(q.viz, res.result.records),
    error: null,
    url: res.result.url,
  };
}

export async function buildReport(slug: string): Promise<ReportData | null> {
  const def = findReport(slug);
  if (!def) return null;
  const queries = await Promise.all(def.socrata_queries.map(runQuery));
  return { def, queries, generatedAt: new Date().toISOString() };
}
