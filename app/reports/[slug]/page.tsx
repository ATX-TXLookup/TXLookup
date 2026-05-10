// /reports/[slug] — USAFacts editorial style. Light surface within the dark
// site to signal "this is an article". Narrow editorial column (720px), bold
// sans display headline, italic serif dek, byline strip, chart-prose interleave
// with a per-figure source line, and mid-article stat pull-quotes that break up
// long passages of charts the way USAFacts breaks up paragraphs.
//
// IMPORTANT: buildReport(slug), notFound, generateStaticParams, QueryResult
// shapes, and ISR cache are byte-identical to before. Visual restyle only.

import Link from "next/link";
import { notFound } from "next/navigation";
import { REPORTS } from "@/config/reports";
import {
  buildReport,
  REPORT_REVALIDATE,
  type QueryResult,
} from "@/app/lib/report-builder";
import { StatBlock } from "@/app/components/reports/StatBlock";
import { ChartBar } from "@/app/components/reports/ChartBar";
import { ChartLine } from "@/app/components/reports/ChartLine";
import { CitationFooter } from "@/app/components/reports/CitationFooter";

export const revalidate = REPORT_REVALIDATE;

export async function generateStaticParams() {
  return REPORTS.map((r) => ({ slug: r.slug }));
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatHumanDate(iso: string): string {
  // ISO yyyy-mm-dd → "DD MMM YYYY"
  const [y, m, d] = iso.slice(0, 10).split("-");
  const mi = Math.max(0, Math.min(11, Number(m) - 1));
  return `${d} ${MONTHS[mi]} ${y}`;
}

function chartFigcaption(q: QueryResult, datasetIds: string[], date: string) {
  // Per-figure source line — Source · {dataset_id} · TXLookup agent · {date}
  const dsId = datasetIds[0] ?? "";
  return `Source · ${dsId} · TXLookup agent · ${date}`;
}

function NonStatFigure({
  q,
  datasetIds,
  date,
}: {
  q: QueryResult;
  datasetIds: string[];
  date: string;
}) {
  const unavailable = q.status !== "completed" || !q.payload;
  const inner =
    q.viz === "bar" ? (
      <ChartBar
        label={q.label}
        bars={!unavailable && q.payload?.kind === "bar" ? q.payload.bars : []}
        unavailable={unavailable}
      />
    ) : (
      <ChartLine
        label={q.label}
        points={!unavailable && q.payload?.kind === "line" ? q.payload.points : []}
        unavailable={unavailable}
      />
    );
  return (
    <figure className="my-12 print:my-6">
      {inner}
      <figcaption className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#86827A]">
        {chartFigcaption(q, datasetIds, date)}
      </figcaption>
    </figure>
  );
}

function PullQuoteStat({
  q,
  datasetIds,
}: {
  q: QueryResult;
  datasetIds: string[];
}) {
  // Mid-article stat callout. Big serif italic numeral, 1-line caption.
  const unavailable = q.status !== "completed" || !q.payload;
  const value =
    !unavailable && q.payload?.kind === "stat" ? q.payload.value : null;
  const display =
    unavailable || value === null
      ? "—"
      : typeof value === "number"
        ? value.toLocaleString()
        : value;
  return (
    <aside
      className="my-12 border-l-2 pl-6 print:my-6"
      style={{ borderColor: "var(--rep-accent)" }}
    >
      <div
        className="text-[56px] font-normal italic leading-[1.0] tracking-[-0.02em] tabular-nums text-[var(--rep-text)] md:text-[72px]"
        style={{
          fontFamily: "var(--font-serif), ui-serif, Georgia, serif",
          fontFeatureSettings: '"tnum" 1, "lnum" 1',
        }}
      >
        {display}
      </div>
      <p className="mt-3 max-w-[42ch] text-[15px] leading-snug text-[var(--rep-text)]">
        {q.label}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#86827A]">
        Source · {datasetIds[0] ?? ""} · TXLookup agent
      </p>
    </aside>
  );
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await buildReport(slug);
  if (!data) notFound();
  const { def, queries, generatedAt } = data;
  const generatedISO = generatedAt.slice(0, 10);
  const generatedHuman = formatHumanDate(generatedISO);

  const statQueries = queries.filter((q) => q.viz === "stat");
  const otherQueries = queries.filter((q) => q.viz !== "stat");

  // Interleave a stat pull-quote between charts roughly every 2 figures.
  // This breaks up long chart runs the way USAFacts breaks paragraphs.
  // Stat #0 is reserved for the "at a glance" strip; the rest become
  // mid-article pull-quotes.
  const pullQuoteStats = statQueries.slice(1);
  const interleaved: Array<
    | { kind: "chart"; q: QueryResult; key: string }
    | { kind: "pull"; q: QueryResult; key: string }
  > = [];
  let pullIdx = 0;
  otherQueries.forEach((q, i) => {
    interleaved.push({ kind: "chart", q, key: `chart-${i}` });
    // After every 2nd chart, drop in a pull-quote if we have one left.
    if ((i + 1) % 2 === 0 && pullIdx < pullQuoteStats.length) {
      interleaved.push({
        kind: "pull",
        q: pullQuoteStats[pullIdx],
        key: `pull-${pullIdx}`,
      });
      pullIdx++;
    }
  });
  // Any pull-quotes still unused → append before the conclusion.
  while (pullIdx < pullQuoteStats.length) {
    interleaved.push({
      kind: "pull",
      q: pullQuoteStats[pullIdx],
      key: `pull-${pullIdx}`,
    });
    pullIdx++;
  }

  return (
    <main
      className="min-h-screen antialiased"
      style={{
        background: "var(--rep-bg)",
        color: "var(--rep-text)",
        fontFamily: "var(--font-geist), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Header — minimal, light */}
      <header className="border-b border-[var(--rep-border)] print:hidden">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-4 md:px-8">
          <Link href="/" className="text-[15px] font-bold tracking-tight text-[var(--rep-text)]">
            TXLookup
          </Link>
          <nav className="flex items-center gap-5 text-[12px] text-[var(--rep-text-mute)]">
            <Link href="/q" className="hover:text-[var(--rep-text)]">Ask</Link>
            <Link href="/datasets" className="hover:text-[var(--rep-text)]">Datasets</Link>
            <Link href="/reports" className="text-[var(--rep-text)]">Reports</Link>
            <Link href="/agents" className="hover:text-[var(--rep-text)]">Agents</Link>
            <a href="https://github.com/ATX-TXLookup/TXLookup" className="hover:text-[var(--rep-text)]">GitHub ↗</a>
          </nav>
        </div>
      </header>

      {/* Hero — narrow editorial column, bold sans display, serif italic dek */}
      <article className="mx-auto max-w-[720px] px-6 pt-10 md:px-8 md:pt-16">
        <Link
          href="/reports"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--rep-accent)] hover:underline print:hidden"
        >
          ← All reports
        </Link>
        <p className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#86827A]">
          TXLookup · Report
        </p>
        <h1 className="mt-3 text-[40px] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--rep-text)] md:text-[56px]">
          {def.title}
        </h1>
        <p
          className="mt-5 text-[22px] italic leading-[1.4] text-[var(--rep-text-mute)] md:text-[26px]"
          style={{ fontFamily: "var(--font-serif), ui-serif, Georgia, serif" }}
        >
          {def.subtitle}
        </p>
        {/* Single-line byline strip, mono small-caps */}
        <p className="mt-7 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#86827A]">
          By the TXLookup agent · {generatedHuman} · auto-refreshed every 6h
        </p>

        {/* Intro paragraph */}
        <p className="mt-10 text-[19px] leading-[1.7] text-[var(--rep-text)]">
          {def.intro_paragraph}
        </p>
      </article>

      {/* At-a-glance stat strip — uses the FIRST stat query as the lead figure */}
      {statQueries.length > 0 && (
        <section className="mt-2 print:mt-2">
          <div className="mx-auto max-w-[720px] px-6 md:px-8">
            <div className="mt-12 grid gap-x-10 gap-y-8 border-t border-[var(--rep-border)] pt-10 sm:grid-cols-3">
              {statQueries.slice(0, 3).map((q, i) => {
                const unavailable = q.status !== "completed" || !q.payload;
                const value =
                  !unavailable && q.payload?.kind === "stat"
                    ? q.payload.value
                    : null;
                return (
                  <StatBlock
                    key={`${slug}-stat-${i}`}
                    label={q.label}
                    value={value}
                    caption={`Source · ${def.dataset_ids[0] ?? ""}`}
                    unavailable={unavailable}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Article body — chart-prose interleave with mid-article pull-quotes */}
      <article className="mx-auto max-w-[720px] px-6 py-10 md:px-8 md:py-14 print:p-0">
        {interleaved.map((item) =>
          item.kind === "chart" ? (
            <NonStatFigure
              key={item.key}
              q={item.q}
              datasetIds={def.dataset_ids}
              date={generatedHuman}
            />
          ) : (
            <PullQuoteStat
              key={item.key}
              q={item.q}
              datasetIds={def.dataset_ids}
            />
          ),
        )}

        {def.conclusion_paragraph && (
          <>
            <h2 className="mt-16 text-[24px] font-bold tracking-tight text-[var(--rep-text)] md:text-[30px]">
              The takeaway
            </h2>
            <p className="mt-4 text-[19px] leading-[1.7] text-[var(--rep-text)]">
              {def.conclusion_paragraph}
            </p>
          </>
        )}

        {/* Subtle source roll-call — sources are now per-chart inline */}
        <div className="mt-16 border-t border-[var(--rep-border)] pt-6">
          <CitationFooter datasetIds={def.dataset_ids} />
        </div>

        {/* "How this was made" — subtle, no card, no CTA chrome */}
        <section className="mt-10 border-t border-[var(--rep-border)] pt-6 print:hidden">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#86827A]">
            How this was made
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--rep-text-mute)]">
            The TXLookup agent generated this report from live Socrata data —
            no hand-tuning, no cached numbers. Each section above is the
            result of a bounded SoQL query against the cited datasets, run at
            request time and revalidated every six hours. The full multi-agent
            chain is available at{" "}
            <Link href="/agents" className="text-[var(--rep-accent)] hover:underline">
              /agents
            </Link>
            {" "}and replayable per-run via /admin/replay.
          </p>
        </section>
      </article>

      {/* Footer — minimal */}
      <footer className="border-t border-[var(--rep-border)] print:hidden">
        <div className="mx-auto max-w-[1100px] px-6 py-8 md:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="text-[13px] font-bold text-[var(--rep-text)]">TXLookup</p>
            <nav className="flex items-center gap-5 text-[12px] text-[var(--rep-text-mute)]">
              <Link href="/" className="hover:text-[var(--rep-text)]">Home</Link>
              <Link href="/datasets" className="hover:text-[var(--rep-text)]">Datasets</Link>
              <Link href="/reports" className="hover:text-[var(--rep-text)]">Reports</Link>
              <Link href="/agents" className="hover:text-[var(--rep-text)]">Agents</Link>
              <a href="https://github.com/ATX-TXLookup/TXLookup" className="hover:text-[var(--rep-text)]">GitHub ↗</a>
            </nav>
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-[#86827A]">
            All data sourced from public Texas open-data portals · Attribution enforced
          </p>
        </div>
      </footer>

      <style>{`
        @media print {
          @page { size: A4; margin: 18mm; }
          html, body { background: #fff !important; }
          main { min-height: 0 !important; background: #fff !important; }
          article { max-width: 100% !important; padding: 0 !important; }
          a { color: var(--rep-text) !important; text-decoration: none !important; }
        }
      `}</style>
    </main>
  );
}
