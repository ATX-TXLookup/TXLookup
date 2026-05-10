import Link from "next/link";
import { notFound } from "next/navigation";
import { getInsights } from "../../../../lib/insights";
import { sodaQuery } from "../../../../lib/socrata";
import { findById } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────────────

function isNumericVal(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "" && !isNaN(Number(v));
}

function detectNumericCol(rows: Record<string, unknown>[]): string | null {
  if (rows.length === 0) return null;
  const cols = Object.keys(rows[0]);
  const aggHints = ["cnt", "count", "total", "amount", "deaths", "crashes", "injuries", "sum", "receipts"];
  for (const hint of aggHints) {
    const col = cols.find(c => c.toLowerCase().includes(hint));
    if (col && rows.every(r => isNumericVal(r[col]))) return col;
  }
  return cols.slice().reverse().find(c => rows.every(r => isNumericVal(r[c]))) ?? null;
}

function detectLabelCol(rows: Record<string, unknown>[], skipCol: string): string | null {
  if (rows.length === 0) return null;
  return Object.keys(rows[0]).find(c => c !== skipCol) ?? null;
}

function fmt(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return String(v ?? "—");
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 10_000) return Math.round(n).toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function buildSoqlDisplay(soql: Record<string, unknown>): string {
  const lines: string[] = ["SELECT " + (soql.select ?? "*")];
  if (soql.where) lines.push("WHERE " + soql.where);
  if (soql.group) lines.push("GROUP BY " + soql.group);
  if (soql.order) lines.push("ORDER BY " + soql.order);
  if (soql.limit) lines.push("LIMIT " + soql.limit);
  return lines.join("\n");
}

function labelify(col: string): string {
  return col
    .replace(/_/g, " ")
    .replace(/\bcnt\b/i, "count")
    .replace(/\bamt\b/i, "amount")
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── sub-components ────────────────────────────────────────────────────────────

function HeroSection({
  headline,
  detail,
  findingNum,
  datasetTitle,
  datasetId,
}: {
  headline: string;
  detail: string;
  findingNum: number;
  datasetTitle: string;
  datasetId: string;
}) {
  return (
    <section
      style={{
        background: "#0D2340",
        backgroundImage:
          "radial-gradient(circle at 85% 15%, rgba(212,139,16,0.14) 0%, transparent 50%), radial-gradient(circle at 10% 85%, rgba(58,127,190,0.12) 0%, transparent 45%)",
      }}
    >
      <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider" style={{ color: "rgba(250,247,242,0.45)" }}>
          <Link href="/" style={{ color: "rgba(250,247,242,0.45)" }} className="hover:text-[#FAF7F2]">
            TXLookup
          </Link>
          <span>/</span>
          <Link href={`/datasets/${datasetId}`} style={{ color: "rgba(250,247,242,0.45)" }} className="hover:text-[#FAF7F2]">
            {datasetTitle}
          </Link>
          <span>/</span>
          <span style={{ color: "#D48B10" }}>Finding {String(findingNum).padStart(2, "0")}</span>
        </div>

        {/* Heading */}
        <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-[0.20em]" style={{ color: "#C4420A" }}>
          Live data finding
        </p>
        <h1 className="mt-3 max-w-[820px] font-display text-3xl font-extrabold leading-tight tracking-tight md:text-5xl" style={{ color: "#FAF7F2" }}>
          {headline}
        </h1>
        <p className="mt-5 max-w-[640px] text-base leading-relaxed md:text-lg" style={{ color: "rgba(250,247,242,0.65)" }}>
          {detail}
        </p>
      </div>
    </section>
  );
}

function SingleStatGrid({ row }: { row: Record<string, unknown> }) {
  const entries = Object.entries(row).filter(([, v]) => v !== null && v !== undefined && v !== "");
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-[#1A1510]/10" style={{ background: "#E5E2E1" }}>
      <div className={`grid ${entries.length >= 3 ? "md:grid-cols-3" : entries.length === 2 ? "md:grid-cols-2" : "grid-cols-1"} gap-px`}>
        {entries.map(([col, val]) => (
          <div key={col} className="flex flex-col items-start gap-2 px-8 py-8" style={{ background: "#FAF7F2" }}>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#6B6660" }}>
              {labelify(col)}
            </p>
            <p className="font-display text-5xl font-extrabold leading-none tracking-tight md:text-6xl" style={{ color: "#0D2340" }}>
              {isNumericVal(val) ? fmt(val) : String(val)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankedList({
  rows,
  numericCol,
  labelCol,
}: {
  rows: Record<string, unknown>[];
  numericCol: string;
  labelCol: string | null;
}) {
  const maxVal = Math.max(...rows.map(r => Number(r[numericCol]) || 0));
  const otherCols = Object.keys(rows[0]).filter(c => c !== numericCol && c !== labelCol);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1A1510]/10">
      {/* header */}
      <div
        className="grid px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em]"
        style={{
          background: "#F0EDEC",
          color: "#8C7166",
          gridTemplateColumns: labelCol ? "1fr 160px" : "1fr",
        }}
      >
        <span>{labelCol ? labelify(labelCol) : "Item"}</span>
        <span className="text-right">{labelify(numericCol)}</span>
      </div>

      {/* rows */}
      {rows.map((row, i) => {
        const numVal = Number(row[numericCol]) || 0;
        const pct = maxVal > 0 ? (numVal / maxVal) * 100 : 0;
        const label = labelCol ? String(row[labelCol] ?? "—") : String(i + 1);
        const extra = otherCols.map(c => row[c]).filter(Boolean);

        return (
          <div
            key={i}
            className="group relative border-b border-[#1A1510]/08 last:border-b-0"
            style={{ background: i % 2 === 0 ? "#FAF7F2" : "#FFFFFF" }}
          >
            {/* bar fill */}
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${pct}%`,
                background: "rgba(212,139,16,0.07)",
                transition: "width 0.3s ease",
              }}
            />

            <div
              className="relative grid items-center gap-4 px-6 py-4"
              style={{ gridTemplateColumns: labelCol ? "1fr 160px" : "1fr" }}
            >
              <div className="flex items-baseline gap-3">
                <span
                  className="w-6 shrink-0 font-mono text-[10px] font-bold tabular-nums"
                  style={{ color: "#D48B10" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <span className="font-body text-sm font-medium" style={{ color: "#1C1B1B" }}>
                    {label}
                  </span>
                  {extra.length > 0 && (
                    <span className="ml-2 font-mono text-[10px]" style={{ color: "#8C7166" }}>
                      {extra.map(v => String(v)).join(" · ")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="font-mono text-sm font-bold tabular-nums" style={{ color: "#0D2340" }}>
                  {fmt(numVal)}
                </span>
                <span
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${Math.max(pct * 0.6, 4)}px`,
                    background: "#D48B10",
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QueryBlock({ soql }: { soql: Record<string, unknown> }) {
  const display = buildSoqlDisplay(soql);
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: "#0D2340" }}>
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#D48B10" }}>
          SoQL query
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "rgba(250,247,242,0.35)" }}>
          Socrata SODA API
        </span>
      </div>
      <pre
        className="overflow-x-auto px-6 py-5 font-mono text-sm leading-relaxed"
        style={{ color: "#FAF7F2", background: "transparent" }}
      >
        {display}
      </pre>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function FindingsPage({
  params,
}: {
  params: Promise<{ id: string; n: string }>;
}) {
  const { id, n } = await params;

  const ds = findById(id);
  if (!ds) notFound();

  const di = getInsights(id);
  if (!di) notFound();

  const idx = parseInt(n, 10);
  if (isNaN(idx) || idx < 0 || idx >= di.insights.length) notFound();

  const insight = di.insights[idx];
  const result = await sodaQuery(insight.portal, insight.datasetId, insight.soql);
  const rows = result.result?.records ?? [];

  const numericCol = detectNumericCol(rows);
  const labelCol = numericCol ? detectLabelCol(rows, numericCol) : null;
  const isSingleStat = rows.length === 1;
  const isRanked = rows.length > 1 && numericCol !== null;

  return (
    <main className="min-h-screen font-body" style={{ background: "#FAF7F2", color: "#1C1B1B" }}>
      {/* Utility bar */}
      <div style={{ background: "#0D2340", color: "rgba(250,247,242,0.75)" }}>
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-2 font-mono text-[12px] md:px-10">
          <span>TXLookup · Texas open data · cited</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-wider md:inline" style={{ color: "rgba(250,247,242,0.40)" }}>
            live Socrata data
          </span>
        </div>
      </div>

      {/* Hero */}
      <HeroSection
        headline={insight.headline}
        detail={insight.detail}
        findingNum={idx + 1}
        datasetTitle={ds.title}
        datasetId={id}
      />

      {/* Live results */}
      <section className="border-b border-[#1A1510]/10">
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          {/* Section label */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#C4420A" }}>
                Live data · refreshed on page load
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight md:text-3xl" style={{ color: "#0D2340" }}>
                {insight.valueLabel ? insight.valueLabel.charAt(0).toUpperCase() + insight.valueLabel.slice(1) : "Results"}
              </h2>
            </div>
            {rows.length > 0 && (
              <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: "#8C7166" }}>
                {rows.length} {rows.length === 1 ? "row" : "rows"} returned
              </span>
            )}
          </div>

          {/* Results rendering */}
          {result.status === "failed" && (
            <div className="rounded-2xl border border-[#1A1510]/10 px-8 py-10 text-center" style={{ background: "#F0EDEC" }}>
              <p className="font-mono text-sm" style={{ color: "#8C7166" }}>
                Could not fetch live data — Socrata may be temporarily unavailable.
              </p>
            </div>
          )}

          {result.status === "completed" && rows.length === 0 && (
            <div className="rounded-2xl border border-[#1A1510]/10 px-8 py-10 text-center" style={{ background: "#F0EDEC" }}>
              <p className="font-mono text-sm" style={{ color: "#8C7166" }}>
                Query returned no rows. Try expanding the date range.
              </p>
            </div>
          )}

          {isSingleStat && rows[0] && <SingleStatGrid row={rows[0]} />}

          {isRanked && numericCol && (
            <RankedList rows={rows} numericCol={numericCol} labelCol={labelCol} />
          )}

          {!isSingleStat && !isRanked && rows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-[#1A1510]/10">
              <table className="w-full text-left text-sm">
                <thead style={{ background: "#F0EDEC" }}>
                  <tr className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "#8C7166" }}>
                    {Object.keys(rows[0]).map(col => (
                      <th key={col} className="whitespace-nowrap px-5 py-3 font-semibold">{labelify(col)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t border-[#1A1510]/08 hover:bg-[#F0EDEC]" style={{ background: "#FAF7F2" }}>
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="whitespace-nowrap px-5 py-3 font-mono text-xs" style={{ color: "#1C1B1B" }}>
                          {String(v ?? "—").slice(0, 80)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Query used */}
      <section className="border-b border-[#1A1510]/10" style={{ background: "#0D2340" }}>
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-16">
          <p className="mb-6 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#D48B10" }}>
            How we queried it
          </p>
          <QueryBlock soql={insight.soql as Record<string, unknown>} />
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider" style={{ color: "rgba(250,247,242,0.35)" }}>
            {insight.portal} · dataset {insight.datasetId}
          </p>
        </div>
      </section>

      {/* Ask a follow-up */}
      <section style={{ background: "#FAF7F2" }}>
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-16">
          <div className="flex flex-col items-start gap-6 rounded-2xl border border-[#1A1510]/10 px-8 py-10 md:flex-row md:items-center md:justify-between" style={{ background: "#FFFFFF" }}>
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#C4420A" }}>
                Go deeper
              </p>
              <p className="mt-2 font-display text-xl font-bold tracking-tight md:text-2xl" style={{ color: "#0D2340" }}>
                Ask a follow-up question
              </p>
              <p className="mt-1 text-sm" style={{ color: "#8C7166" }}>
                The agent will query live Socrata data and cite every number.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href={`/q?q=${encodeURIComponent(di.questions[idx % di.questions.length] ?? insight.headline)}`}
                style={{
                  background: "#C4420A",
                  color: "#FAF7F2",
                  borderRadius: "10px",
                  padding: "12px 24px",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Ask the agent →
              </Link>
              <Link
                href={`/datasets/${id}`}
                style={{
                  border: "1px solid rgba(26,21,16,0.15)",
                  color: "#0D2340",
                  borderRadius: "10px",
                  padding: "12px 24px",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                ← Back to dataset
              </Link>
            </div>
          </div>

          {/* Suggested questions */}
          {di.questions.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#8C7166" }}>
                Try one of these
              </p>
              <div className="flex flex-wrap gap-2">
                {di.questions.map((q) => (
                  <Link
                    key={q}
                    href={`/q?q=${encodeURIComponent(q)}`}
                    style={{
                      background: "rgba(58,127,190,0.09)",
                      border: "0.5px solid rgba(58,127,190,0.28)",
                      color: "#3A7FBE",
                      borderRadius: "100px",
                      padding: "7px 16px",
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      textDecoration: "none",
                      display: "inline-block",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {q}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#0D2340", color: "rgba(250,247,242,0.65)" }}>
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">
          <p>All data sourced from public Texas open-data portals · Attribution enforced</p>
          <Link href="/" style={{ color: "rgba(250,247,242,0.65)" }} className="hover:text-[#FAF7F2]">
            ← Back to TXLookup
          </Link>
        </div>
      </footer>
    </main>
  );
}
