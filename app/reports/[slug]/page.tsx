// /reports/[slug] — dynamic newsletter-style report.
// Brand-faithful per brand-guide/BRAND.md (single source of truth):
//   Hero on tx-navy with the §7 radial-glow pattern. White DM Serif headline,
//   gold italic emphasis. Body sections alternate cream/white surfaces.
//   Hero stats split out so every "stat" viz becomes a card up top; bar/line
//   charts render inline in the article column.
//
// IMPORTANT — visual restyle only. buildReport(slug), notFound(), the
// VizPayload shapes, and the generateStaticParams ISR cache are byte-identical
// to before this change.

import Link from "next/link";
import Image from "next/image";
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

// Renders a non-stat viz (bar/line) inline in the article column.
function renderNonStatQuery(q: QueryResult, key: string) {
  const unavailable = q.status !== "completed" || !q.payload;
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

  // Split hero stats (small, prominent) from the rest of the viz blocks.
  const statQueries = queries.filter((q) => q.viz === "stat");
  const otherQueries = queries.filter((q) => q.viz !== "stat");

  return (
    <main className="min-h-screen bg-tx-cream text-tx-ink font-body">
      {/* ── Top utility bar (hidden on print) ── */}
      <div className="bg-tx-navy text-white print:hidden">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-2 text-[13px] md:px-10">
          <span>An open-source agent for Texas public data. Reports auto-refresh every six hours.</span>
          <span className="hidden font-mono text-[11px] uppercase tracking-wider text-white/70 md:inline">
            v2 · beta
          </span>
        </div>
      </div>

      {/* ── Header (hidden on print) ── */}
      <header className="border-b border-tx-ink/10 bg-tx-cream print:hidden">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-4 md:px-10 md:py-5">
          <Link href="/" className="flex items-center">
            <Image
              src="/txlookup-logo-light.svg"
              alt="TXLookup"
              width={200}
              height={67}
              priority
              className="h-10 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-7 font-display text-sm font-semibold">
            <Link href="/" className="hidden hover:text-tx-rust md:inline">
              New search
            </Link>
            <Link href="/#datasets" className="hidden hover:text-tx-rust md:inline">
              Datasets
            </Link>
            <Link href="/reports" className="text-tx-rust">
              Reports
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="rounded-sm bg-tx-navy px-4 py-2 font-medium text-white hover:bg-tx-rust"
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="border-b border-tx-ink/10 print:border-none print:bg-transparent"
        style={{
          background: "var(--tx-navy)",
          backgroundImage:
            "radial-gradient(circle at 80% 30%, rgba(58,127,190,0.18) 0%, transparent 55%), radial-gradient(circle at 10% 80%, rgba(196,66,10,0.12) 0%, transparent 50%)",
        }}
      >
        <div className="mx-auto max-w-[920px] px-6 py-14 md:px-10 md:py-20">
          <Link
            href="/reports"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-sky hover:text-tx-gold print:hidden"
          >
            ← All reports
          </Link>
          <p className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-gold">
            TXLookup Report
          </p>
          <h1 className="mt-3 font-display text-[40px] font-normal leading-[1.05] tracking-tight text-tx-cream md:text-[56px]">
            {def.title}
          </h1>
          <p className="mt-5 max-w-[58ch] font-display text-xl italic text-tx-gold md:text-2xl">
            {def.subtitle}
          </p>
          <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.18em] text-tx-cream/60">
            By the TXLookup agent · auto-refreshed every 6h · generated {generatedDate}
          </p>
        </div>
      </section>

      {/* ── Hero stat cards (only when at least one stat viz) ── */}
      {statQueries.length > 0 && (
        <section className="border-b border-tx-ink/10 bg-tx-cream print:border-none">
          <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-10 md:py-14">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
              At a glance
            </p>
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
                    caption="Live from Socrata · refreshed every 6h"
                    unavailable={unavailable}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Article: intro · viz blocks · conclusion ── */}
      <section className="bg-white print:bg-transparent">
        <article className="mx-auto max-w-[800px] px-6 py-12 md:py-16 print:px-0 print:py-0">
          <p className="text-base leading-[1.7] text-tx-ink/85 md:text-lg">
            {def.intro_paragraph}
          </p>

          {otherQueries.map((q, i) =>
            renderNonStatQuery(q, `${slug}-q${i}`),
          )}

          {def.conclusion_paragraph && (
            <>
              <h2 className="mt-12 font-display text-2xl font-normal tracking-tight text-tx-navy md:text-[28px]">
                The takeaway
              </h2>
              <p className="mt-4 text-base leading-[1.7] text-tx-ink/85 md:text-lg">
                {def.conclusion_paragraph}
              </p>
            </>
          )}

          <CitationFooter datasetIds={def.dataset_ids} />

          <section className="mt-10 border-t border-tx-ink/15 pt-6">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
              How this was made
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-tx-ink/75">
              The TXLookup agent generated this report from live Socrata data —
              no hand-tuning, no cached numbers. Each section above is the
              result of a bounded SoQL query against the cited datasets, run at
              request time and revalidated every six hours. See the{" "}
              <Link href="/architecture" className="text-tx-sky hover:text-tx-rust hover:underline">
                architecture page
              </Link>{" "}
              for the full pipeline.
            </p>
          </section>
        </article>
      </section>

      {/* ── Footer (hidden on print) ── */}
      <footer className="bg-tx-navy-dark text-white/85 print:hidden">
        <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10 md:py-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/txlookup-logo-dark.svg"
                alt="TXLookup"
                width={160}
                height={54}
                className="h-9 w-auto opacity-90"
              />
              <p className="font-mono text-[11px] uppercase tracking-wider text-white/55">
                Texas public data · cited
              </p>
            </div>
            <Link href="/reports" className="font-display text-sm hover:text-tx-gold">
              ← All reports
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-y-2 border-t border-white/10 pt-5 text-[12px] text-white/55">
            <span className="mr-6">All data sourced from public Texas open-data portals.</span>
            <span className="mr-6">Attribution enforced.</span>
            <span>Set in DM Serif Display + Syne + IBM Plex Mono · 2026</span>
          </div>
        </div>
      </footer>

      {/* Print stylesheet — A4-friendly, no nav/footer chrome */}
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm; }
          html, body { background: #fff !important; }
          main { min-height: 0 !important; background: #fff !important; }
          article { max-width: 100% !important; padding: 0 !important; }
          a { color: var(--tx-navy) !important; text-decoration: none !important; }
        }
      `}</style>
    </main>
  );
}
