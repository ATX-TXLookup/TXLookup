// /reports/[slug] — dynamic newsletter-style report.
// 800px single column, navy/action-blue, inline-SVG charts only.

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

function renderQuery(q: QueryResult, key: string) {
  const unavailable = q.status !== "completed" || !q.payload;
  if (q.viz === "stat") {
    const value =
      !unavailable && q.payload?.kind === "stat" ? q.payload.value : null;
    return (
      <StatBlock
        key={key}
        label={q.label}
        value={value}
        caption="Live from Socrata · refreshed every 6h"
        unavailable={unavailable}
      />
    );
  }
  if (q.viz === "bar") {
    const bars =
      !unavailable && q.payload?.kind === "bar" ? q.payload.bars : [];
    return (
      <ChartBar
        key={key}
        label={q.label}
        bars={bars}
        unavailable={unavailable}
      />
    );
  }
  const points =
    !unavailable && q.payload?.kind === "line" ? q.payload.points : [];
  return (
    <ChartLine
      key={key}
      label={q.label}
      points={points}
      unavailable={unavailable}
    />
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

  return (
    <main className="min-h-screen bg-white text-[#1A1F2A] font-body">
      {/* Header (hidden on print) */}
      <header className="border-b border-[#1A1F2A]/10 bg-white print:hidden">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-5 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span aria-hidden="true" className="block h-8 w-8 rounded-sm bg-[#0B2545]" />
            <span className="font-display text-[22px] font-extrabold tracking-tight text-[#0B2545]">
              TXLookup
            </span>
          </Link>
          <nav className="flex items-center gap-7 font-display text-sm font-semibold">
            <Link href="/" className="hover:text-[#0B5FFF]">Home</Link>
            <Link href="/#datasets" className="hover:text-[#0B5FFF]">Datasets</Link>
            <Link href="/reports" className="text-[#0B5FFF]">Reports</Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="rounded-sm bg-[#0B2545] px-4 py-2 font-medium text-white hover:bg-[#0B5FFF]"
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-[800px] px-6 py-12 print:px-0 print:py-0">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
          Report
        </p>
        <h1 className="mt-3 font-display text-4xl font-black leading-[1.1] tracking-tight text-[#0B2545] md:text-5xl">
          {def.title}
        </h1>
        <p className="mt-4 font-display text-xl text-[#1A1F2A]/75">
          {def.subtitle}
        </p>
        <p className="mt-4 border-y border-[#1A1F2A]/10 py-3 font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
          By the TXLookup agent · auto-refreshed every 6h · generated {generatedDate}
        </p>

        <p className="mt-8 text-base leading-relaxed text-[#1A1F2A]/85 md:text-lg">
          {def.intro_paragraph}
        </p>

        {queries.map((q, i) => renderQuery(q, `${slug}-q${i}`))}

        {def.conclusion_paragraph && (
          <p className="mt-10 text-base leading-relaxed text-[#1A1F2A]/85 md:text-lg">
            {def.conclusion_paragraph}
          </p>
        )}

        <CitationFooter datasetIds={def.dataset_ids} />

        <section className="mt-10 border-t border-[#1A1F2A]/15 pt-6">
          <h2 className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
            How this was made
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#1A1F2A]/75">
            The TXLookup agent generated this report from live Socrata data —
            no hand-tuning, no cached numbers. Each section above is the
            result of a bounded SoQL query against the cited datasets, run at
            request time and revalidated every six hours. See the{" "}
            <Link href="/architecture" className="text-[#0B5FFF] hover:underline">
              architecture page
            </Link>{" "}
            for the full pipeline.
          </p>
        </section>
      </article>

      {/* Print stylesheet — A4-friendly, no nav/footer chrome */}
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm; }
          html, body { background: #fff !important; }
          main { min-height: 0 !important; }
          article { max-width: 100% !important; padding: 0 !important; }
          a { color: #0B2545 !important; text-decoration: none !important; }
        }
      `}</style>
    </main>
  );
}
