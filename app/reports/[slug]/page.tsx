// /reports/[slug] — USAFacts editorial style. Light surface within the dark
// site to signal "this is an article". Narrow column (820px), serif italic
// display title, chart-prose interleave with source per chart.
//
// IMPORTANT: buildReport(slug), notFound, generateStaticParams, VizPayload
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

function renderNonStatQuery(q: QueryResult, key: string, sourceLabel: string) {
  const unavailable = q.status !== "completed" || !q.payload;
  const inner =
    q.viz === "bar" ? (
      <ChartBar
        key={key}
        label={q.label}
        bars={!unavailable && q.payload?.kind === "bar" ? q.payload.bars : []}
        unavailable={unavailable}
      />
    ) : (
      <ChartLine
        key={key}
        label={q.label}
        points={!unavailable && q.payload?.kind === "line" ? q.payload.points : []}
        unavailable={unavailable}
      />
    );
  return (
    <figure key={key} className="my-10 print:my-6">
      {inner}
      <figcaption className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#86827A]">
        Source · TXLookup agent · {sourceLabel}
      </figcaption>
    </figure>
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
  const generatedDate = generatedAt.slice(0, 10);

  const statQueries = queries.filter((q) => q.viz === "stat");
  const otherQueries = queries.filter((q) => q.viz !== "stat");
  const sourceLine = def.dataset_ids.join(" · ");

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

      {/* Hero — narrow column, serif italic title, USAFacts cadence */}
      <article className="mx-auto max-w-[820px] px-6 pt-12 md:px-8 md:pt-20">
        <Link
          href="/reports"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--rep-accent)] hover:underline print:hidden"
        >
          ← All reports
        </Link>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-[#86827A]">
          TXLookup · Report
        </p>
        <h1 className="mt-3 text-[36px] font-bold leading-[1.08] tracking-[-0.02em] text-[var(--rep-text)] md:text-[56px]">
          {def.title}
        </h1>
        <p
          className="mt-4 font-display-serif text-[20px] italic leading-[1.4] text-[var(--rep-text-mute)] md:text-[26px]"
          style={{ fontFamily: "var(--font-serif), serif" }}
        >
          {def.subtitle}
        </p>
        <p className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--rep-border)] pt-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#86827A]">
          <span>By the TXLookup agent</span>
          <span>·</span>
          <span>Auto-refreshed every 6h</span>
          <span>·</span>
          <span>Generated {generatedDate}</span>
        </p>

        {/* Intro paragraph */}
        <p className="mt-10 text-[17px] leading-[1.7] text-[var(--rep-text)] md:text-[19px]">
          {def.intro_paragraph}
        </p>
      </article>

      {/* At-a-glance stat strip */}
      {statQueries.length > 0 && (
        <section className="mt-8 print:mt-6">
          <div className="mx-auto max-w-[820px] px-6 md:px-8">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--rep-accent)]">
              At a glance
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {statQueries.map((q, i) => {
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

      {/* Article body — chart-prose interleave */}
      <article className="mx-auto max-w-[820px] px-6 py-10 md:px-8 md:py-14 print:p-0">
        {otherQueries.map((q, i) =>
          renderNonStatQuery(q, `${slug}-q${i}`, sourceLine),
        )}

        {def.conclusion_paragraph && (
          <>
            <h2 className="mt-14 text-[22px] font-bold tracking-tight text-[var(--rep-text)] md:text-[28px]">
              The takeaway
            </h2>
            <p className="mt-4 text-[17px] leading-[1.7] text-[var(--rep-text)] md:text-[19px]">
              {def.conclusion_paragraph}
            </p>
          </>
        )}

        <div className="mt-12 border-t border-[var(--rep-border)] pt-6">
          <CitationFooter datasetIds={def.dataset_ids} />
        </div>

        <section className="mt-10 rounded-md border border-[var(--rep-border)] bg-white p-6 print:hidden">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--rep-accent)]">
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
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-[#86827A]">
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
