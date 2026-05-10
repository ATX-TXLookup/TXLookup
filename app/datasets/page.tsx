// /datasets — universe page. Lists every catalog entry with live row counts
// and the 6 sample questions per dataset. The corpus index that the dataset
// scout grows over time.

import Link from "next/link";
import { CATALOG } from "@/app/lib/catalog";
import { sodaQuery } from "@/app/lib/socrata";
import { EyebrowLabel, Shell } from "@/app/components/ds";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export const metadata = {
  title: "The Texas civic-data universe — TXLookup",
  description: "Every dataset in the TXLookup catalog. Curated across Austin, Dallas, San Antonio, Houston, and the state. Live row counts. Sample questions per dataset.",
};

type DatasetSummary = {
  id: string;
  title: string;
  portal: string;
  city: string;
  category: string;
  blurb: string;
  sample_questions: string[];
  row_count: number | null;
  has_report: boolean;
};

// Heuristic category mapping until catalog has a `category` field
function inferCategory(title: string, id: string): string {
  const t = title.toLowerCase();
  if (t.includes("permit") || t.includes("construction")) return "Permits & Building";
  if (t.includes("inspection") || t.includes("food")) return "Public Health";
  if (t.includes("crime") || t.includes("police") || t.includes("fatalit")) return "Public Safety";
  if (t.includes("311") || t.includes("code") || t.includes("violation")) return "311 & Code";
  if (t.includes("traffic") || t.includes("transport")) return "Transportation";
  return "Civic Data";
}

function inferCity(portal: string): string {
  if (portal.includes("austintexas")) return "Austin";
  if (portal.includes("dallasopendata") || portal.includes("dallas")) return "Dallas";
  if (portal.includes("sanantonio")) return "San Antonio";
  if (portal.includes("houstontx")) return "Houston";
  if (portal.includes("data.texas") || portal.includes("texas.gov")) return "TX state";
  return "Texas";
}

async function liveRowCount(portal: string, id: string): Promise<number | null> {
  try {
    const res = await sodaQuery(portal, id, {
      select: "count(*) AS c",
      limit: 1,
    });
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

export default async function DatasetsUniversePage() {
  const summaries: DatasetSummary[] = await Promise.all(
    CATALOG.map(async (d) => {
      const portal = d.portal;
      const sample_questions = (d as { sample_questions?: string[] }).sample_questions ?? [];
      const row_count = await liveRowCount(portal, d.id);
      // Cross-ref to /reports — does this dataset have a slug there?
      const has_report = REPORT_DATASET_IDS.has(d.id);
      return {
        id: d.id,
        title: d.title,
        portal,
        city: inferCity(portal),
        category: inferCategory(d.title, d.id),
        blurb: (d as { blurb?: string }).blurb ?? "",
        sample_questions,
        row_count,
        has_report,
      };
    }),
  );

  // Group by city for the section navigation
  const byCity = summaries.reduce<Record<string, DatasetSummary[]>>((acc, d) => {
    (acc[d.city] ??= []).push(d);
    return acc;
  }, {});
  const cityOrder = ["Austin", "Dallas", "San Antonio", "Houston", "TX state", "Texas"];
  const cities = cityOrder.filter((c) => byCity[c]);

  const totalRows = summaries.reduce((sum, d) => sum + (d.row_count ?? 0), 0);

  return (
    <Shell active="/datasets">
      {/* Hero */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 pb-16 pt-12 md:px-8 md:pb-24 md:pt-16">
          <EyebrowLabel tone="accent">The universe</EyebrowLabel>
          <h1 className="mt-4 max-w-[24ch] text-[42px] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--ds-text)] md:text-[64px]">
            Texas civic data,{" "}
            <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
              one corpus.
            </span>
          </h1>
          <p className="mt-6 max-w-[60ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
            Every dataset our agents can query, in one place. Curated across Austin, Dallas, San Antonio, Houston, and the state. Pre-canned questions per dataset. Live counts at request time. Growing every 6 hours via the{" "}
            <Link href="/agents/dataset-scout" className="text-[var(--ds-good)] hover:underline">
              dataset scout
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Stat strip */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10">
          <div className="grid gap-px bg-tx-ink/10 md:grid-cols-4">
            <Tile label="Datasets in catalog" value={summaries.length.toString()} />
            <Tile label="Total live rows" value={totalRows > 0 ? totalRows.toLocaleString() : "—"} />
            <Tile label="Cities covered" value={cities.length.toString()} />
            <Tile label="With /reports article" value={`${summaries.filter((d) => d.has_report).length}`} />
          </div>
        </div>
      </section>

      {/* Filter + jump nav */}
      <section className="sticky top-0 z-10 border-b border-[var(--ds-border)] bg-[var(--ds-bg)]/95 backdrop-blur">
        <div className="mx-auto max-w-[1320px] px-6 py-4 md:px-10">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-text)]/55">
              Jump to
            </p>
            {cities.map((city) => (
              <a
                key={city}
                href={`#${city.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-sm border border-[var(--ds-border-strong)] bg-[var(--ds-bg)] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ds-text)] hover:border-[var(--ds-warm)] hover:text-[var(--ds-warm)]"
              >
                {city} <span className="text-[var(--ds-text)]/55">({byCity[city].length})</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Per-city dataset grids */}
      {cities.map((city) => (
        <section key={city} className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]" id={city.toLowerCase().replace(/\s+/g, "-")}>
          <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
                  {byCity[city].length} dataset{byCity[city].length === 1 ? "" : "s"}
                </p>
                <h2 className="mt-2 font-display-serif text-3xl font-bold text-[var(--ds-text)] md:text-4xl">
                  {city}
                </h2>
              </div>
              <p className="hidden font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text)]/55 md:block">
                {byCity[city].reduce((s, d) => s + (d.row_count ?? 0), 0).toLocaleString()} rows total
              </p>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {byCity[city].map((d) => (
                <article key={d.id} className="border border-[var(--ds-border)] bg-[var(--ds-bg)]">
                  <div className="border-b border-[var(--ds-border)] p-5">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warn)]">
                      {d.category}
                    </p>
                    <h3 className="mt-2 font-display-serif text-lg font-bold text-[var(--ds-text)]">{d.title}</h3>
                    <p className="mt-1 font-mono text-[10px] text-[var(--ds-text)]/55">
                      {d.id} · {d.portal}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    {d.blurb && <p className="text-sm leading-relaxed text-[var(--ds-text)]/85 line-clamp-2">{d.blurb}</p>}
                    <p className="mt-3 font-mono text-[11px] text-[var(--ds-text)]/65">
                      <span className="font-bold text-[var(--ds-text)]">
                        {d.row_count !== null ? d.row_count.toLocaleString() : "—"}
                      </span>{" "}
                      rows live
                    </p>
                  </div>
                  {d.sample_questions.length > 0 && (
                    <div className="border-t border-[var(--ds-border)] px-5 py-4">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-warm)]">
                        What to ask
                      </p>
                      <ul className="mt-2 space-y-1">
                        {d.sample_questions.slice(0, 3).map((q) => (
                          <li key={q}>
                            <Link
                              href={`/q?q=${encodeURIComponent(q)}&dataset=${d.id}`}
                              className="text-sm text-[var(--ds-text)] hover:text-[var(--ds-warm)] hover:underline"
                            >
                              · {q}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-[var(--ds-border)] px-5 py-3">
                    <Link
                      href={`/datasets/${d.id}`}
                      className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ds-warm)] hover:text-[var(--ds-text)]"
                    >
                      Open dataset →
                    </Link>
                    {d.has_report && (
                      <Link
                        href={`/reports`}
                        className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ds-warn)] hover:text-[var(--ds-text)]"
                      >
                        Read report →
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Help-grow CTA */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)] text-white">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warn)]">
            Help us grow
          </p>
          <h2 className="mt-2 max-w-[28ch] font-display-serif text-3xl font-bold tracking-tight text-white md:text-4xl">
            Know a Texas civic dataset we should have?
          </h2>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-white/85">
            The dataset scout finds new datasets every 6 hours. If you know one we missed, file a one-line request and we'll have it in the catalog by Sunday.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/issues/new?labels=area%3Adata%2Cdataset-request&title=Add%20dataset%3A%20"
              className="inline-flex items-center rounded-sm bg-[var(--ds-text)] px-5 py-2.5 text-[13px] font-semibold text-[var(--ds-bg)] hover:bg-[var(--ds-text-mute)]"
            >
              Request a dataset →
            </a>
            <Link
              href="/agents/dataset-scout"
              className="inline-flex items-center rounded-sm border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-5 py-2.5 text-[13px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-text-dim)]"
            >
              How the scout works →
            </Link>
          </div>
        </div>
      </section>

    </Shell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--ds-bg)] px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text)]/55">{label}</p>
      <p className="mt-2 font-display-serif text-2xl font-bold tabular-nums text-[var(--ds-text)]">{value}</p>
    </div>
  );
}

// Static cross-ref of which datasets have a /reports article. Kept in sync
// with config/reports.ts manually (small surface, low churn).
const REPORT_DATASET_IDS = new Set([
  "3syk-w9eu", // austin-construction-2026
  "ecmv-9xxi", // austin-restaurants-watchlist
  "xwdj-i9he", // austin-311-leaderboard
  "6wtj-zbtb", // austin-code-violations-trend
]);
