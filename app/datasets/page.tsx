// /datasets — Data Ledger universe page. Per Stitch screen ee07d5fc:
// dataset rows on the left (with status pill + title + meta + view CTA),
// Featured Analysis sidebar on the right with a chart + Run Agent Query.

import Link from "next/link";
import { CATALOG } from "@/app/lib/catalog";
import { sodaQuery } from "@/app/lib/socrata";
import { Shell } from "@/app/components/ds";
import { loadDiscovery } from "@/app/lib/catalog-discovered";

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
  // Discovery — full list of indexed Texas datasets across 6 portals.
  const discovery = await loadDiscovery();

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
                The Texas civic-data universe.
              </h1>
              <p className="mt-4 max-w-[64ch] text-[15.5px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
                <span className="font-semibold text-[var(--ds-text)]">
                  {discovery.totalKnown.toLocaleString()} datasets indexed
                </span>{" "}
                across {discovery.portals.length || 6} Texas open-data portals — Austin, Austin Hub, Dallas, San Antonio, Houston, TX state. {summaries.length} are deeply curated (full schema, hand-picked SoQL, locally mirrored). The rest are answered on demand: the agent reads catalog metadata, plans a SoQL query, runs it. <span className="text-[var(--ds-good)]">Not a shadow database</span> — a smart layer over the source-of-truth portals.
              </p>

              {/* Per-portal indexed counts */}
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--ds-text-dim)]">
                {discovery.portals.map((p) => (
                  <span key={p.portal}>
                    <span className="text-[var(--ds-text-mute)]">{p.portal.replace(/^www\./, "").replace(".gov", "")}</span>
                    <span className="ml-1 text-[var(--ds-good)]">{p.total_known.toLocaleString()}</span>
                  </span>
                ))}
              </div>

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

              {/* Auto-click question chips — pick one, agent fires immediately */}
              <div className="mt-5">
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                  Or pick a question — agent answers in seconds
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "Where do permits cluster in the last 30 days?",
                    "Restaurants near 78704 with failing inspections this year",
                    "Top 311 complaint types in Austin",
                    "Dallas 311 requests this month vs last",
                    "Active TX franchise tax holders in Travis County",
                    "Open code violations in 78745",
                  ].map((q) => (
                    <Link
                      key={q}
                      href={`/q?q=${encodeURIComponent(q)}`}
                      className="group inline-flex items-center gap-2 rounded-full border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-3.5 py-1.5 text-[12px] text-[var(--ds-text-mute)] transition-colors hover:border-[var(--ds-accent)] hover:bg-[var(--ds-bg)] hover:text-[var(--ds-text)]"
                    >
                      <span>{q}</span>
                      <span className="font-mono text-[10px] text-[var(--ds-accent)] opacity-0 transition-opacity group-hover:opacity-100">→</span>
                    </Link>
                  ))}
                </div>
              </div>

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

              {/* DISCOVERY BROWSER — popular datasets across the universe */}
              {discovery.popular.length > 0 && (
                <div className="mt-14">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-purple)]">
                      Beyond the curated · {discovery.totalKnown.toLocaleString()} indexed total
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                      glossary · titles + tags + categories
                    </p>
                  </div>
                  <h2 className="mt-3 max-w-[36ch] text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text)] md:text-[36px]">
                    Browse the universe.{" "}
                    <span className="text-[var(--ds-text-mute)]">
                      Ask any of these — the agent figures out the rest.
                    </span>
                  </h2>
                  <p className="mt-3 max-w-[64ch] text-[14.5px] leading-relaxed text-[var(--ds-text-mute)]">
                    Catalog metadata for every indexed dataset is stored locally as a searchable corpus — titles, descriptions, tags, categories. When you pick one, the agent reads the schema live, plans a SoQL query, and runs it. The {summaries.length} above are pre-cached for sub-second answers; the rest are answered on demand.
                  </p>
                  <ul className="mt-7 grid gap-2 md:grid-cols-2">
                    {discovery.popular.slice(0, 24).map((d) => (
                      <li key={`${d.portal}-${d.id}`}>
                        <Link
                          href={`/q?q=${encodeURIComponent(`Tell me about ${d.name}`)}&dataset=${encodeURIComponent(d.id)}`}
                          className="group flex h-full flex-col gap-1.5 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-3.5 transition-colors hover:border-[var(--ds-accent)]/60"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="line-clamp-1 text-[14px] font-medium text-[var(--ds-text)] group-hover:text-[var(--ds-accent)]">
                              {d.name || "(untitled)"}
                            </span>
                            <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                              {d.portal.replace(/^www\./, "").split(".")[0]}
                            </span>
                          </div>
                          {d.category && (
                            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                              {d.category}
                            </span>
                          )}
                          {d.description && (
                            <span className="line-clamp-2 text-[12.5px] text-[var(--ds-text-mute)]">
                              {d.description}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 font-mono text-[11px] text-[var(--ds-text-dim)]">
                    Showing top 24 by page views. Many more available — drop a keyword in the search box above and the agent will route to the right one.
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT — Featured Analysis sidebar */}
            <aside className="md:col-span-4">
              <div className="sticky top-20 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-6">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
                  ↗ Featured analysis
                </p>
                <h2 className="mt-3 text-[22px] font-bold leading-tight text-[var(--ds-text)]">
                  Austin Construction in 2026
                </h2>
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--ds-text-mute)]">
                  Live readout from the City of Austin permits feed (3syk-w9eu). Where permits cluster, what is being built, and how cumulative-YTD compares to last year — composed from a 5,000-row local mirror.
                </p>

                <Link
                  href="/reports/austin-construction-2026"
                  className="mt-5 block w-full rounded-md bg-[var(--ds-purple)] py-2.5 text-center text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:opacity-90"
                >
                  Read the report ↗
                </Link>

                <Link
                  href="/q?q=Show+me+Austin+construction+permit+trends+over+the+last+5+years&dataset=3syk-w9eu"
                  className="mt-2 block w-full rounded-md border border-[var(--ds-border-strong)] bg-transparent py-2.5 text-center text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-text)] hover:border-[var(--ds-purple)] hover:text-[var(--ds-purple)]"
                >
                  Run agent query →
                </Link>

                <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                  Cache refreshes every 6h · cited per chart
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </Shell>
  );
}
