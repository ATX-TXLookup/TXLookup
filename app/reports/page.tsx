// /reports — index of newsletter-style reports.
// Server-rendered. Each report is statically known via config/reports.ts;
// last-updated is computed at request time so the index reflects the freshest run.
//
// Brand-faithful per brand-guide/BRAND.md (single source of truth):
//   Colors: navy, rust CTA, gold accent, cream surface (token names only)
//   Fonts:  DM Serif Display (h1/h2) · Syne (UI/body) · IBM Plex Mono (labels)
// Tokens come from tailwind.config.ts (tx-navy, tx-rust, ...) and CSS vars in
// app/globals.css (--tx-navy, ...). No hardcoded hex colors.
//
// Visual treatment: feels like a magazine cover grid. Each report card is the
// BRAND.md §7 card pattern with a category-style insight badge above the
// DM Serif headline.

import Link from "next/link";
import Image from "next/image";
import { REPORTS } from "@/config/reports";
import { REPORT_REVALIDATE } from "@/app/lib/report-builder";

export const revalidate = REPORT_REVALIDATE;

// Lightweight category tag derived from the slug — purely cosmetic.
function categoryFor(slug: string): string {
  if (slug.includes("construction") || slug.includes("permits")) return "Construction";
  if (slug.includes("restaurant")) return "Public Health";
  if (slug.includes("311")) return "311 & Service";
  if (slug.includes("code")) return "Code Enforcement";
  return "Civic Data";
}

export default function ReportsIndex() {
  const updated = new Date().toISOString().slice(0, 10);
  return (
    <main className="min-h-screen bg-tx-cream text-tx-ink font-body">
      {/* ── Top utility bar ── */}
      <div className="bg-tx-navy text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-2 text-[13px] md:px-10">
          <span>An open-source agent for Texas public data. Reports auto-refresh every six hours.</span>
          <span className="hidden font-mono text-[11px] uppercase tracking-wider text-white/70 md:inline">
            v2 · beta
          </span>
        </div>
      </div>

      {/* ── Header ── */}
      <header className="border-b border-tx-ink/10 bg-tx-cream">
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
        className="border-b border-tx-ink/10"
        style={{
          background: "var(--tx-navy)",
          backgroundImage:
            "radial-gradient(circle at 80% 30%, rgba(58,127,190,0.18) 0%, transparent 55%), radial-gradient(circle at 10% 80%, rgba(196,66,10,0.12) 0%, transparent 50%)",
        }}
      >
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <div className="mx-auto max-w-[860px]">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-tx-sky">
              The TXLookup Reports Desk
            </p>
            <h1 className="mt-4 font-display text-[40px] font-normal leading-[1.05] tracking-tight text-tx-cream md:text-[56px]">
              Newsletter-style reports,
              <br />
              <span className="italic text-tx-gold">generated from live Texas data.</span>
            </h1>
            <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-tx-cream/75 md:text-lg">
              Each report is built by the TXLookup agent at request time —
              bounded SoQL queries against public Socrata feeds, every number
              cited to the source dataset. Auto-refreshed every six hours.
            </p>
          </div>
        </div>
      </section>

      {/* ── Magazine-cover grid ── */}
      <section className="bg-tx-cream">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
              Latest issues
            </p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-tx-muted">
              {REPORTS.length} {REPORTS.length === 1 ? "report" : "reports"} · last refreshed {updated}
            </p>
          </div>

          <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {REPORTS.map((r) => {
              const category = categoryFor(r.slug);
              return (
                <li key={r.slug}>
                  <Link
                    href={`/reports/${r.slug}`}
                    className="group flex h-full flex-col rounded-[10px] border border-[color:var(--tx-border)] bg-tx-cream p-6 transition-all hover:border-tx-rust hover:shadow-[0_8px_24px_-12px_rgba(196,66,10,0.18)]"
                  >
                    {/* BRAND.md §7 insight-badge style category tag */}
                    <span
                      className="self-start rounded-full font-mono text-[11px] font-semibold uppercase tracking-[0.08em]"
                      style={{
                        background: "var(--tx-gold-light)",
                        color: "var(--tx-gold)",
                        border: "0.5px solid rgba(212,139,16,0.3)",
                        padding: "4px 12px",
                      }}
                    >
                      {category}
                    </span>
                    <h2 className="mt-5 font-display text-2xl font-normal leading-[1.15] tracking-tight text-tx-navy group-hover:text-tx-rust md:text-[26px]">
                      {r.title}
                    </h2>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-tx-ink/75">
                      {r.subtitle}
                    </p>
                    <div className="mt-6 flex items-baseline justify-between border-t border-tx-ink/10 pt-3">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-tx-muted">
                        Refreshed {updated}
                      </span>
                      <span className="font-display text-sm font-semibold text-tx-rust">
                        Read →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-tx-navy-dark text-white/85">
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
            <Link href="/" className="font-display text-sm hover:text-tx-gold">
              ← Back to TXLookup
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-y-2 border-t border-white/10 pt-5 text-[12px] text-white/55">
            <span className="mr-6">All data sourced from public Texas open-data portals.</span>
            <span className="mr-6">Attribution enforced.</span>
            <span>Set in DM Serif Display + Syne + IBM Plex Mono · 2026</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
