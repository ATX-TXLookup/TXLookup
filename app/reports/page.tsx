// /reports — index of newsletter-style reports.
// Server-rendered. Each report is statically known via config/reports.ts;
// last-updated is computed at request time so the index reflects the freshest run.
//
// Chrome: shared <Shell active="/reports"> for header + footer parity with the
// rest of the site (homepage is the canonical example). The card grid below
// adapts to the dark Shell surface using --ds-* tokens.

import Link from "next/link";
import { REPORTS } from "@/config/reports";
import { REPORT_REVALIDATE } from "@/app/lib/report-builder";
import { Shell } from "@/app/components/ds";

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
    <Shell active="/reports">
      {/* ── Hero ── */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-[860px]">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
              The TXLookup Reports Desk
            </p>
            <h1 className="mt-4 text-[40px] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--ds-text)] md:text-[56px]">
              Newsletter-style reports,
              <br />
              <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
                generated from live Texas data.
              </span>
            </h1>
            <p className="mt-6 max-w-[60ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
              Each report is built by the TXLookup agent at request time —
              bounded SoQL queries against public Socrata feeds, every number
              cited to the source dataset. Auto-refreshed every six hours.
            </p>
          </div>
        </div>
      </section>

      {/* ── Magazine-cover grid ── */}
      <section className="bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
              Latest issues
            </p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-dim)]">
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
                    className="group flex h-full flex-col rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-6 transition-all hover:border-[var(--ds-warm)] hover:shadow-[0_8px_24px_-12px_rgba(249,115,22,0.25)]"
                  >
                    <span className="self-start rounded-full border border-[var(--ds-warm)]/40 bg-[rgba(249,115,22,0.10)] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ds-warm)]">
                      {category}
                    </span>
                    <h2 className="mt-5 text-[22px] font-bold leading-[1.15] tracking-[-0.015em] text-[var(--ds-text)] group-hover:text-[var(--ds-warm)] md:text-[26px]">
                      {r.title}
                    </h2>
                    <p className="mt-3 flex-1 text-[14px] leading-relaxed text-[var(--ds-text-mute)]">
                      {r.subtitle}
                    </p>
                    <div className="mt-6 flex items-baseline justify-between border-t border-[var(--ds-border)] pt-3">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                        Refreshed {updated}
                      </span>
                      <span className="text-[13px] font-semibold text-[var(--ds-warm)]">
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
    </Shell>
  );
}
