// /reports — index of newsletter-style reports.
// Server-rendered. Each report is statically known via config/reports.ts;
// last-updated is computed at request time so the index reflects the freshest run.

import Link from "next/link";
import { REPORTS } from "@/config/reports";
import { REPORT_REVALIDATE } from "@/app/lib/report-builder";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";

export const revalidate = REPORT_REVALIDATE;

export default function ReportsIndex() {
  const updated = new Date().toISOString().slice(0, 10);
  return (
    <main className="min-h-screen bg-[#F4F6FB] text-[#1A1F2A] font-body">
      <SiteHeader activePath="/reports" />

      <section className="mx-auto max-w-[800px] px-6 py-14 md:py-20">
        <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
          Reports
        </p>
        <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-[#0B2545] md:text-5xl">
          Newsletter-style reports, generated from live Texas data.
        </h1>
        <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-[#1A1F2A]/75">
          Each report is built by the TXLookup agent at request time, citing
          the source datasets. Auto-refreshed every six hours.
        </p>

        <ul className="mt-12 grid gap-4">
          {REPORTS.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/reports/${r.slug}`}
                className="group flex flex-col rounded-md border border-[#1A1F2A]/10 bg-white p-6 transition-all hover:border-[#0B5FFF]"
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                  Report · auto-refreshed every 6h
                </span>
                <h2 className="mt-2 font-display text-2xl font-bold text-[#0B2545] group-hover:text-[#0B5FFF]">
                  {r.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#1A1F2A]/75">
                  {r.subtitle}
                </p>
                <div className="mt-4 flex items-baseline justify-between border-t border-[#1A1F2A]/10 pt-3">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
                    Last refreshed {updated}
                  </span>
                  <span className="font-display text-xs font-semibold text-[#0B5FFF]">
                    Read →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <SiteFooter />
    </main>
  );
}
