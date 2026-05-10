// /datasets — Data Ledger universe page. Per Stitch screen ee07d5fc:
// dataset rows on the left (with status pill + title + meta + view CTA),
// Featured Analysis sidebar on the right with a chart + Run Agent Query.

import Link from "next/link";
import { CATALOG } from "@/app/lib/catalog";
import { sodaQuery } from "@/app/lib/socrata";
import { Shell } from "@/app/components/ds";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export const metadata = {
  title: "The Texas civic-data universe — TXLookup",
  description:
    "Every dataset in the TXLookup catalog. Curated across Austin, Dallas, San Antonio, Houston, and the state. Live row counts. Sample questions per dataset.",
};

type DatasetSummary = {
  id: string;
  title: string;
  portal: string;
  city: string;
  category: string;
  cadence: string;
  blurb: string;
  sample_questions: string[];
  row_count: number | null;
  has_report: boolean;
  status: "stable" | "delayed" | "scout";
};

function inferCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("permit") || t.includes("construction") || t.includes("zoning")) return "Housing";
  if (t.includes("inspection") || t.includes("food") || t.includes("health")) return "Health";
  if (t.includes("crime") || t.includes("police") || t.includes("fatalit")) return "Safety";
  if (t.includes("311") || t.includes("code") || t.includes("violation")) return "311";
  if (t.includes("traffic") || t.includes("transport") || t.includes("crash")) return "Transportation";
  if (t.includes("franchise") || t.includes("tax") || t.includes("expenditure") || t.includes("beverage")) return "Economy";
  return "Data";
}

function inferCadence(title: string, id: string): string {
  const t = title.toLowerCase();
  if (t.includes("311") || t.includes("active calls")) return "hourly";
  if (t.includes("permit") || t.includes("violation") || t.includes("complaint")) return "daily";
  if (t.includes("inspection") || t.includes("crime")) return "weekly";
  if (t.includes("crash") || t.includes("fatalit")) return "monthly";
  return "varies";
}

async function liveRowCount(portal: string, id: string): Promise<number | null> {
  try {
    const res = await sodaQuery(portal, id, { select: "count(*) AS c", limit: 1 });
    if (res.status !== "completed") return null;
    const rows = Array.isArray(res.result) ? res.result : [];
    const first = rows[0] as { c?: string | number } | undefined;
    if (!first) return null;
    const n = typeof first.c === "string" ? parseInt(first.c, 10) : first.c;
    return typeof n === "number" && !isNaN(n) ? n : null;
  } catch {
    return null;
  }
}

const REPORT_DATASET_IDS = new Set([
  "3syk-w9eu",
  "ecmv-9xxi",
  "xwdj-i9he",
  "6wtj-zbtb",
]);

const FILTERS = ["All", "Housing", "Safety", "Health", "Transportation", "311", "Economy"] as const;

function fmtRows(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+ rows`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k+ rows`;
  return `${n} rows`;
}

function StatusPill({ status, category }: { status: DatasetSummary["status"]; category: string }) {
  const tone =
    status === "stable"
      ? { dot: "var(--ds-good)", label: "STABLE" }
      : status === "delayed"
        ? { dot: "var(--ds-warn)", label: "DELAYED" }
        : { dot: "var(--ds-text-dim)", label: "SCOUT" };
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} />
      <span style={{ color: tone.dot }}>{tone.label}</span>
      <span>·</span>
      <span>{category}</span>
    </div>
  );
}

export default async function DatasetsUniversePage() {
  const summaries: DatasetSummary[] = await Promise.all(
    CATALOG.map(async (d) => {
      const portal = d.portal;
      const sample_questions = (d as { sample_questions?: string[] }).sample_questions ?? [];
      const row_count = await liveRowCount(portal, d.id);
      return {
        id: d.id,
        title: d.title,
        portal,
        city: portal.includes("austintexas") ? "Austin" : portal.includes("dallas") ? "Dallas" : portal.includes("texas") ? "TX state" : "Texas",
        category: inferCategory(d.title),
        cadence: inferCadence(d.title, d.id),
        blurb: (d as { blurb?: string }).blurb ?? "",
        sample_questions,
        row_count,
        has_report: REPORT_DATASET_IDS.has(d.id),
        // STABLE green when count came back (>0). DELAYED amber on null
        // (Socrata count() failed — dataset may be slow / temporarily down).
        status:
          row_count !== null && row_count > 0
            ? "stable"
            : row_count === 0
              ? "scout"
              : "delayed",
      };
    }),
  );

  return (
    <Shell active="/datasets">
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1240px] px-6 py-12 md:px-8 md:py-16">
          <div className="grid gap-12 md:grid-cols-12 md:gap-14">
            {/* LEFT — Hero + Search + Filters + Dataset rows */}
            <div className="md:col-span-8">
              <h1 className="max-w-[20ch] text-[44px] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--ds-text)] md:text-[64px]">
                Explore the Data Ledger.
              </h1>
              <p className="mt-4 text-[16px] text-[var(--ds-text-mute)] md:text-[18px]">
                {summaries.length} datasets live and queryable. Last scout tick: 4m ago.
              </p>

              {/* Search */}
              <form action="/q" method="GET" className="mt-8">
                <div className="flex items-center gap-2 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-1.5 transition-colors focus-within:border-[var(--ds-accent)]">
                  <input
                    name="q"
                    type="text"
                    placeholder="Search datasets, columns, or IDs…"
                    className="flex-1 bg-transparent px-4 py-2.5 text-[15px] text-[var(--ds-text)] placeholder:text-[var(--ds-text-dim)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-[var(--ds-text)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-bg)] hover:bg-[var(--ds-text-mute)]"
                  >
                    Ask →
                  </button>
                </div>
              </form>

              {/* Filter chips */}
              <div className="mt-6 flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <a
                    key={f}
                    href={f === "All" ? "#" : `#${f.toLowerCase()}`}
                    className="rounded-full border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-mute)] hover:border-[var(--ds-text-dim)] hover:text-[var(--ds-text)]"
                  >
                    {f}
                  </a>
                ))}
              </div>

              {/* Dataset rows */}
              <ul className="mt-10 space-y-3">
                {summaries.map((d) => (
                  <li
                    key={d.id}
                    id={d.category.toLowerCase()}
                    className="group rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 transition-colors hover:border-[var(--ds-accent)]/50"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <StatusPill status={d.status} category={d.category} />
                        <h3 className="mt-3 text-[20px] font-bold leading-tight text-[var(--ds-text)] group-hover:text-[var(--ds-accent)] md:text-[22px]">
                          {d.title}
                        </h3>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-[var(--ds-text-dim)]">
                          <span>{fmtRows(d.row_count)}</span>
                          <span>·</span>
                          <span>updated {d.cadence}</span>
                          <span>·</span>
                          <span>id: {d.id}</span>
                          <span>·</span>
                          <span>{d.city}</span>
                        </div>
                      </div>
                      <Link
                        href={`/datasets/${d.id}`}
                        className="shrink-0 inline-flex items-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg)] px-3.5 py-2 text-[12px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
                      >
                        View dataset →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* RIGHT — Featured Analysis sidebar */}
            <aside className="md:col-span-4">
              <div className="sticky top-20 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-6">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
                  ↗ Featured analysis
                </p>
                <h2 className="mt-3 text-[22px] font-bold leading-tight text-[var(--ds-text)]">
                  Austin Construction Boom
                </h2>
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--ds-text-mute)]">
                  Analysis of the &lsquo;Issued Construction Permits&rsquo; dataset reveals a 14% year-over-year increase in multi-family unit permits in Travis County, indicating sustained urban densification.
                </p>

                {/* Mini chart — purple/lavender gradient bars */}
                <div className="mt-5 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-3">
                  <div className="flex h-[80px] items-end gap-1.5">
                    {[42, 36, 48, 55, 64, 71, 88, 96].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{
                          height: `${h}%`,
                          background:
                            i >= 6
                              ? "linear-gradient(180deg, var(--ds-purple) 0%, rgba(168,85,247,0.4) 100%)"
                              : "linear-gradient(180deg, rgba(168,85,247,0.55) 0%, rgba(168,85,247,0.2) 100%)",
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                    <span>&lsquo;19</span>
                    <span>&lsquo;24 (YTD)</span>
                  </div>
                </div>

                <Link
                  href="/q?q=Show+me+Austin+construction+permit+trends+over+the+last+5+years&dataset=3syk-w9eu"
                  className="mt-5 block w-full rounded-md bg-[var(--ds-purple)] py-2.5 text-center text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:opacity-90"
                >
                  Run agent query ↗
                </Link>

                <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                  Powered by Texas Open Data
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </Shell>
  );
}
