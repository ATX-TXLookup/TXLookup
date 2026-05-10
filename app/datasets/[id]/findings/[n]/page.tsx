import Link from "next/link";
import { notFound } from "next/navigation";
import { getInsights } from "../../../../lib/insights";
import { sodaQuery } from "../../../../lib/socrata";
import { findById } from "../../../../lib/catalog";

// BRAND.md §3 — Primary UI pairing: Navy bg + Cream text + Gold accent
// BRAND.md §3 — Light UI pairing:   Cream bg + Navy text + Rust CTA
// BRAND.md §7 — Dark Hero: navy bg, sky glow at 80% 30%, rust glow at 10% 80%

export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────────────

function isNumericVal(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "" && !isNaN(Number(v));
}

function detectNumericCol(rows: Record<string, unknown>[]): string | null {
  if (rows.length === 0) return null;
  const cols = Object.keys(rows[0]);
  const hints = ["cnt", "count", "total", "amount", "deaths", "crashes", "injuries", "sum", "receipts"];
  for (const hint of hints) {
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
  if (soql.where) lines.push("WHERE   " + soql.where);
  if (soql.group) lines.push("GROUP BY " + soql.group);
  if (soql.order) lines.push("ORDER BY " + soql.order);
  if (soql.limit) lines.push("LIMIT   " + soql.limit);
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

// ── stat grid (single-row aggregate) ─────────────────────────────────────────
// BRAND: cream surface, navy numbers, muted labels — §3 Light UI pairing

function SingleStatGrid({ row }: { row: Record<string, unknown> }) {
  const entries = Object.entries(row).filter(([, v]) => v !== null && v !== undefined && v !== "");
  const cols = entries.length >= 3 ? 3 : entries.length;
  return (
    <div
      className="overflow-hidden rounded-[10px]"
      style={{ border: "0.5px solid rgba(26,21,16,0.10)" }}
    >
      <div className={`grid gap-px bg-[rgba(26,21,16,0.08)] md:grid-cols-${cols}`}>
        {entries.map(([col, val]) => (
          <div key={col} className="flex flex-col gap-2 px-8 py-8" style={{ background: "#FAF7F2" }}>
            <p
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "#6B6660" }}
            >
              {labelify(col)}
            </p>
            <p
              className="font-display text-5xl font-extrabold leading-none tracking-tight md:text-6xl"
              style={{ color: "#0D2340" }}
            >
              {isNumericVal(val) ? fmt(val) : String(val)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ranked list (multi-row with numeric column) ───────────────────────────────
// BRAND: cream rows, navy text, gold bar accent, muted labels — §3 Light + §3 gold accent

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
    <div
      className="overflow-hidden rounded-[10px]"
      style={{ border: "0.5px solid rgba(26,21,16,0.10)" }}
    >
      {/* header row */}
      <div
        className="grid px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em]"
        style={{
          background: "#F0EDEC",
          color: "#6B6660",
          gridTemplateColumns: labelCol ? "1fr 140px" : "1fr",
        }}
      >
        <span>{labelCol ? labelify(labelCol) : "Item"}</span>
        <span className="text-right">{labelify(numericCol)}</span>
      </div>

      {rows.map((row, i) => {
        const numVal = Number(row[numericCol]) || 0;
        const pct = maxVal > 0 ? (numVal / maxVal) * 100 : 0;
        const label = labelCol ? String(row[labelCol] ?? "—") : String(i + 1);
        const extra = otherCols.map(c => row[c]).filter(Boolean);

        return (
          <div
            key={i}
            className="group relative border-t"
            style={{
              borderColor: "rgba(26,21,16,0.08)",
              background: i % 2 === 0 ? "#FAF7F2" : "#FFFFFF",
            }}
          >
            {/* proportional bar background */}
            <div
              className="absolute inset-y-0 left-0"
              style={{ width: `${pct}%`, background: "rgba(212,139,16,0.08)" }}
            />
            <div
              className="relative grid items-center gap-4 px-6 py-4"
              style={{ gridTemplateColumns: "1fr 140px" }}
            >
              <div className="flex items-baseline gap-3 min-w-0">
                <span
                  className="w-6 shrink-0 font-mono text-[10px] font-bold tabular-nums"
                  style={{ color: "#D48B10" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <span
                    className="block truncate font-body text-sm font-medium"
                    style={{ color: "#1A1510" }}
                  >
                    {label}
                  </span>
                  {extra.length > 0 && (
                    <span className="font-mono text-[10px]" style={{ color: "#6B6660" }}>
                      {extra.map(v => String(v)).join(" · ")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span
                  className="font-mono text-sm font-bold tabular-nums"
                  style={{ color: "#0D2340" }}
                >
                  {fmt(numVal)}
                </span>
                <span
                  className="h-1.5 rounded-full shrink-0"
                  style={{
                    width: `${Math.max(pct * 0.5, 3)}px`,
                    background: "#D48B10",
                    opacity: 0.65,
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
    <main className="min-h-screen font-body" style={{ background: "#FAF7F2", color: "#1A1510" }}>

      {/* ── Dark hero — BRAND.md §7 Dark Hero Section ── */}
      {/* navy bg, sky glow at 80%/30%, rust glow at 10%/80% */}
      <section
        style={{
          background: "#0D2340",
          backgroundImage:
            "radial-gradient(circle at 80% 30%, rgba(58,127,190,0.18) 0%, transparent 55%), " +
            "radial-gradient(circle at 10% 80%, rgba(196,66,10,0.12) 0%, transparent 50%)",
        }}
      >
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">

          {/* Breadcrumb — IBM Plex Mono, muted cream */}
          <nav
            className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em]"
            style={{ color: "rgba(250,247,242,0.40)" }}
          >
            <Link href="/" style={{ color: "rgba(250,247,242,0.40)" }} className="hover:text-[#FAF7F2]">
              TXLookup
            </Link>
            <span>/</span>
            <Link href={`/datasets/${id}`} style={{ color: "rgba(250,247,242,0.40)" }} className="hover:text-[#FAF7F2]">
              {ds.title}
            </Link>
            <span>/</span>
            {/* gold accent for current location — BRAND §3 gold = accents */}
            <span style={{ color: "#D48B10" }}>Finding {String(idx + 1).padStart(2, "0")}</span>
          </nav>

          {/* Label — Rust, IBM Plex Mono, BRAND §4 Label style */}
          <p
            className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "#C4420A" }}
          >
            Live data finding · {ds.cadence} refresh
          </p>

          {/* H1 — DM Serif Display, cream, BRAND §4 H1 = 40–48px white/navy on hero */}
          <h1
            className="mt-3 max-w-[820px] font-display text-4xl font-extrabold leading-tight tracking-tight md:text-5xl"
            style={{ color: "#FAF7F2" }}
          >
            {insight.headline}
          </h1>

          {/* Body — Syne 400, cream 65%, BRAND §4 body = Syne 400 16px lh 1.7 */}
          <p
            className="mt-5 max-w-[640px] text-base leading-[1.7] md:text-lg"
            style={{ color: "rgba(250,247,242,0.65)" }}
          >
            {insight.detail}
          </p>
        </div>
      </section>

      {/* ── Live data results — BRAND.md §3 Light UI pairing: cream + navy + gold ── */}
      <section
        className="border-b"
        style={{ borderColor: "rgba(26,21,16,0.10)", background: "#FAF7F2" }}
      >
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">

          {/* Section label — BRAND §4 Label style */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "#C4420A" }}
              >
                Live Socrata data · refreshed on load
              </p>
              <h2
                className="mt-2 font-display text-2xl font-extrabold tracking-tight md:text-3xl"
                style={{ color: "#0D2340" }}
              >
                {insight.valueLabel
                  ? insight.valueLabel.charAt(0).toUpperCase() + insight.valueLabel.slice(1)
                  : "Results"}
              </h2>
            </div>
            {rows.length > 0 && (
              <span
                className="font-mono text-[11px] uppercase tracking-wider"
                style={{ color: "#6B6660" }}
              >
                {rows.length} {rows.length === 1 ? "row" : "rows"} returned
              </span>
            )}
          </div>

          {/* Error state */}
          {result.status === "failed" && (
            <div
              className="rounded-[10px] px-8 py-10 text-center"
              style={{ background: "#F0EDEC", border: "0.5px solid rgba(26,21,16,0.10)" }}
            >
              <p className="font-mono text-sm" style={{ color: "#6B6660" }}>
                Could not fetch live data — Socrata may be temporarily unavailable.
              </p>
            </div>
          )}

          {/* Empty state */}
          {result.status === "completed" && rows.length === 0 && (
            <div
              className="rounded-[10px] px-8 py-10 text-center"
              style={{ background: "#F0EDEC", border: "0.5px solid rgba(26,21,16,0.10)" }}
            >
              <p className="font-mono text-sm" style={{ color: "#6B6660" }}>
                Query returned no rows. Try expanding the date range.
              </p>
            </div>
          )}

          {isSingleStat && rows[0] && <SingleStatGrid row={rows[0]} />}

          {isRanked && numericCol && (
            <RankedList rows={rows} numericCol={numericCol} labelCol={labelCol} />
          )}

          {!isSingleStat && !isRanked && rows.length > 0 && (
            <div
              className="overflow-x-auto rounded-[10px]"
              style={{ border: "0.5px solid rgba(26,21,16,0.10)" }}
            >
              <table className="w-full text-left text-sm">
                <thead style={{ background: "#F0EDEC" }}>
                  <tr
                    className="font-mono text-[10px] uppercase tracking-wider"
                    style={{ color: "#6B6660" }}
                  >
                    {Object.keys(rows[0]).map(col => (
                      <th key={col} className="whitespace-nowrap px-5 py-3 font-semibold">
                        {labelify(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-t hover:bg-[#F0EDEC]"
                      style={{ borderColor: "rgba(26,21,16,0.08)", background: "#FAF7F2" }}
                    >
                      {Object.values(row).map((v, j) => (
                        <td
                          key={j}
                          className="whitespace-nowrap px-5 py-3 font-mono text-xs"
                          style={{ color: "#1A1510" }}
                        >
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

      {/* ── Query block — cream section, navy query input per §7 Query Input ── */}
      <section
        className="border-b"
        style={{ borderColor: "rgba(26,21,16,0.10)", background: "#FAF7F2" }}
      >
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-14">
          <p
            className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "#6B6660" }}
          >
            SoQL query used
          </p>

          {/* BRAND §7 Query Input: navy bg, cream text, sky border */}
          <div
            className="overflow-x-auto rounded-[8px]"
            style={{
              background: "#0D2340",
              border: "0.5px solid rgba(58,127,190,0.40)",
            }}
          >
            <div
              className="flex items-center justify-between border-b px-5 py-2"
              style={{ borderColor: "rgba(58,127,190,0.20)" }}
            >
              <span
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: "#3A7FBE" }}
              >
                Socrata SODA API · {insight.portal}
              </span>
              <span
                className="font-mono text-[10px] uppercase tracking-wider"
                style={{ color: "rgba(250,247,242,0.30)" }}
              >
                dataset {insight.datasetId}
              </span>
            </div>
            <pre
              className="overflow-x-auto px-5 py-5 font-mono text-[13px] font-semibold leading-relaxed"
              style={{ color: "#FAF7F2", background: "transparent" }}
            >
              {buildSoqlDisplay(insight.soql as Record<string, unknown>)}
            </pre>
          </div>
        </div>
      </section>

      {/* ── CTA — BRAND §3 Light UI: cream bg + navy text + rust CTA ── */}
      <section style={{ background: "#FAF7F2" }}>
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-16">

          {/* Primary CTA card */}
          <div
            className="flex flex-col items-start gap-6 rounded-[10px] px-8 py-10 md:flex-row md:items-center md:justify-between"
            style={{
              background: "#FFFFFF",
              border: "0.5px solid rgba(26,21,16,0.10)",
            }}
          >
            <div>
              <p
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "#6B6660" }}
              >
                Go deeper
              </p>
              <p
                className="mt-2 font-display text-xl font-extrabold tracking-tight md:text-2xl"
                style={{ color: "#0D2340" }}
              >
                Ask a follow-up question
              </p>
              <p className="mt-1 text-sm leading-[1.7]" style={{ color: "#6B6660" }}>
                The agent queries live Socrata data and cites every number.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              {/* Primary button — BRAND §7 Primary Button: rust bg, Syne 700, radius 8px */}
              <Link
                href={`/q?q=${encodeURIComponent(di.questions[idx % di.questions.length] ?? insight.headline)}`}
                style={{
                  background: "#C4420A",
                  color: "#FFFFFF",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontFamily: "var(--font-inter, Syne, sans-serif)",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Ask the agent →
              </Link>
              <Link
                href={`/datasets/${id}`}
                style={{
                  border: "0.5px solid rgba(26,21,16,0.15)",
                  color: "#0D2340",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontWeight: 600,
                  fontSize: "14px",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                ← Back to dataset
              </Link>
            </div>
          </div>

          {/* Suggested questions — BRAND §7 Dataset Insight Badge adapted for chips */}
          {di.questions.length > 0 && (
            <div className="mt-8">
              <p
                className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "#6B6660" }}
              >
                Try one of these
              </p>
              <div className="flex flex-wrap gap-2">
                {di.questions.map(q => (
                  <Link
                    key={q}
                    href={`/q?q=${encodeURIComponent(q)}`}
                    style={{
                      background: "rgba(58,127,190,0.09)",
                      border: "0.5px solid rgba(58,127,190,0.28)",
                      color: "#3A7FBE",
                      borderRadius: "100px",
                      padding: "6px 14px",
                      fontFamily: "monospace",
                      fontSize: "12px",
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

      {/* ── Footer — navy, BRAND §3 Primary pairing ── */}
      <footer style={{ background: "#0D2340", color: "rgba(250,247,242,0.60)" }}>
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">
          <p>All data sourced from public Texas open-data portals · Attribution enforced</p>
          <Link href="/" style={{ color: "rgba(250,247,242,0.60)" }} className="hover:text-[#FAF7F2]">
            ← Back to TXLookup
          </Link>
        </div>
      </footer>
    </main>
  );
}
