import Link from "next/link";
import { notFound } from "next/navigation";
import { findById, type CatalogDataset } from "../../lib/catalog";
import { getInsights, type DatasetInsights } from "../../lib/insights";

type Dataset = CatalogDataset;

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

type Column = {
  fieldName: string;
  name: string;
  dataTypeName?: string;
};

type Metadata = {
  rowsUpdatedAt?: number;
  columns?: Column[];
  rowCount?: number;
};

async function fetchMetadata(
  portal: string,
  id: string,
): Promise<Metadata | null> {
  try {
    const res = await fetch(`https://${portal}/api/views/${id}.json`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Metadata;
    return {
      rowsUpdatedAt: json.rowsUpdatedAt,
      columns: (json.columns || []).slice(0, 24),
    };
  } catch {
    return null;
  }
}

async function fetchSample(
  portal: string,
  id: string,
): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(
      `https://${portal}/resource/${id}.json?$limit=5`,
      { next: { revalidate: 600 } },
    );
    if (!res.ok) return [];
    return (await res.json()) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

function CivicHeader({ ds }: { ds: Dataset }) {
  return (
    <>
      <div className="bg-[#0B2545] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-2 text-[13px] md:px-10">
          <span>An open-source agent for Texas public data.</span>
          <span className="hidden font-mono text-[11px] uppercase tracking-wider text-white/70 md:inline">
            v0.1 · alpha
          </span>
        </div>
      </div>
      <header className="border-b border-[#1A1F2A]/10 bg-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-5 md:px-10 md:py-6">
          <Link href="/" className="flex items-center gap-3">
            <span aria-hidden="true" className="block h-8 w-8 rounded-sm bg-[#0B2545]" />
            <div className="flex flex-col leading-tight">
              <span className="font-display text-[22px] font-extrabold tracking-tight text-[#0B2545]">
                TXLookup
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#1A1F2A]/55">
                Texas open data · cited
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-7 font-display text-sm font-semibold">
            <Link href="/#datasets" className="hover:text-[#0B5FFF]">
              All datasets
            </Link>
            <a
              href={`https://${ds.portal}/d/${ds.id}`}
              className="rounded-sm bg-[#0B2545] px-4 py-2 font-medium text-white hover:bg-[#0B5FFF]"
            >
              Source portal ↗
            </a>
          </nav>
        </div>
      </header>
    </>
  );
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ds = findById(id);
  if (!ds) notFound();

  const [meta, sample] = await Promise.all([
    fetchMetadata(ds.portal, ds.id),
    fetchSample(ds.portal, ds.id),
  ]);

  const lastRefreshed = meta?.rowsUpdatedAt
    ? new Date(meta.rowsUpdatedAt * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "—";

  const sampleColumns: string[] =
    sample.length > 0 ? Object.keys(sample[0]).slice(0, 6) : [];

  return (
    <main className="min-h-screen bg-white text-[#1A1F2A] font-body">
      <CivicHeader ds={ds} />

      {/* Title block + scoped search */}
      <section className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-sm bg-[#0B2545] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
              {ds.city}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
              {capitalize(ds.cadence)} · {ds.id}
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-[#0B2545] md:text-5xl">
            {ds.title}
          </h1>
          <p className="mt-2 font-display text-base font-medium text-[#1A1F2A]/70">
            {ds.agency}
          </p>
          <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-[#1A1F2A]/80 md:text-lg">
            {ds.blurb}
          </p>

          <form
            action="/q"
            method="GET"
            className="mt-8 flex max-w-[820px] gap-2 rounded-md border border-[#1A1F2A]/15 bg-white p-2"
          >
            <input type="hidden" name="dataset" value={ds.id} />
            <input
              name="q"
              type="text"
              placeholder={`Ask about ${ds.title.toLowerCase()} in this dataset…`}
              className="flex-1 rounded-sm bg-white px-3 py-2 text-sm text-[#1A1F2A] placeholder:text-[#1A1F2A]/45 focus:outline-none md:text-base"
            />
            <button
              type="submit"
              className="rounded-sm bg-[#0B5FFF] px-5 py-2 font-display text-sm font-semibold text-white hover:bg-[#0B2545]"
            >
              Ask
            </button>
          </form>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-[#1A1F2A]/10 bg-white">
        <div className="mx-auto grid max-w-[1320px] grid-cols-2 divide-x divide-[#1A1F2A]/10 px-6 py-8 md:grid-cols-4 md:px-10">
          <div className="pr-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1A1F2A]/55">
              Source portal
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-[#0B2545]">{ds.portal}</p>
          </div>
          <div className="px-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1A1F2A]/55">
              Refresh cadence
            </p>
            <p className="mt-2 font-display text-sm font-semibold text-[#0B2545]">{capitalize(ds.cadence)}</p>
          </div>
          <div className="px-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1A1F2A]/55">
              Columns shown
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-[#0B2545]">
              {meta?.columns?.length ?? "—"}
            </p>
          </div>
          <div className="pl-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1A1F2A]/55">
              Last refresh
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-[#0B2545]">
              {lastRefreshed}
            </p>
          </div>
        </div>
      </section>

      {/* ── Insights panel ── */}
      {(() => {
        const di: DatasetInsights | null = getInsights(ds.id);
        if (!di) return null;
        return (
          <>
            {/* What we found */}
            <section
              className="border-b border-[#1A1510]/10"
              style={{
                background: "#0D2340",
                backgroundImage:
                  "radial-gradient(circle at 90% 20%, rgba(212,139,16,0.12) 0%, transparent 55%), radial-gradient(circle at 5% 80%, rgba(58,127,190,0.10) 0%, transparent 50%)",
              }}
            >
              <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
                {/* Section header */}
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p
                      className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: "#C4420A" }}
                    >
                      Pre-harvested · live Socrata data
                    </p>
                    <h2
                      className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl"
                      style={{ color: "#FAF7F2" }}
                    >
                      What we found.
                    </h2>
                  </div>
                  <span
                    className="font-mono text-[11px] uppercase tracking-wider"
                    style={{ color: "rgba(250,247,242,0.4)" }}
                  >
                    {di.insights.length} insights · updated {ds.cadence}
                  </span>
                </div>

                {/* Insight cards grid */}
                <style>{`
                  .insight-card {
                    background: rgba(250,247,242,0.04);
                    border: 0.5px solid rgba(212,139,16,0.20);
                    border-left: 2px solid rgba(212,139,16,0.45);
                    backdrop-filter: blur(4px);
                    transition: background 0.15s ease, border-color 0.15s ease;
                  }
                  .insight-card:hover {
                    background: rgba(250,247,242,0.09);
                    border-color: rgba(212,139,16,0.65);
                    border-left-color: #D48B10;
                  }
                  .insight-card:hover .insight-action {
                    opacity: 1;
                    transform: translateX(0);
                  }
                  .question-chip {
                    background: rgba(58,127,190,0.10);
                    border: 0.5px solid rgba(58,127,190,0.30);
                    color: #3A7FBE;
                    transition: background 0.15s ease, border-color 0.15s ease;
                  }
                  .question-chip:hover {
                    background: rgba(58,127,190,0.20);
                    border-color: rgba(58,127,190,0.60);
                  }
                `}</style>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {di.insights.map((ins, i) => (
                    <a
                      key={i}
                      href={`/datasets/${ds.id}/findings/${i}`}
                      className="insight-card flex flex-col gap-3 rounded-xl p-6"
                    >
                      {/* Number + action row */}
                      <div className="flex items-center justify-between">
                        <span
                          className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
                          style={{ color: "#D48B10" }}
                        >
                          Finding {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="insight-action font-mono text-[10px] uppercase tracking-wider"
                          style={{
                            color: "#3A7FBE",
                            opacity: 0,
                            transform: "translateX(-4px)",
                            transition: "opacity 0.15s, transform 0.15s",
                          }}
                        >
                          Explore live data →
                        </span>
                      </div>

                      {/* Headline */}
                      <p
                        className="font-display text-lg font-bold leading-snug tracking-tight"
                        style={{ color: "#FAF7F2" }}
                      >
                        {ins.headline}
                      </p>

                      {/* Detail */}
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "rgba(250,247,242,0.60)" }}
                      >
                        {ins.detail}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            </section>

            {/* Try asking */}
            <section
              className="border-b border-[#1A1510]/10"
              style={{ background: "#FDF3DC" }}
            >
              <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="shrink-0">
                    <p
                      className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: "#C4420A" }}
                    >
                      Suggested queries
                    </p>
                    <p
                      className="mt-1 font-display text-base font-bold"
                      style={{ color: "#0D2340" }}
                    >
                      Try asking →
                    </p>
                  </div>
                  <div className="flex flex-1 flex-wrap gap-2">
                    {di.questions.map((q) => (
                      <a
                        key={q}
                        href={`/q?q=${encodeURIComponent(q)}`}
                        className="question-chip rounded-full font-mono text-[12px]"
                        style={{
                          padding: "7px 16px",
                          textDecoration: "none",
                          display: "inline-block",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {q}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        );
      })()}

      {/* Schema */}
      <section className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
          <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
            Schema
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-[#0B2545] md:text-4xl">
            What's in this dataset.
          </h2>

          <div className="mt-6 overflow-x-auto rounded-md border border-[#1A1F2A]/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
                <tr className="font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/65">
                  <th className="px-4 py-3 font-semibold">Field</th>
                  <th className="px-4 py-3 font-semibold">Display name</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody>
                {(meta?.columns ?? []).map((c, i) => (
                  <tr
                    key={c.fieldName + i}
                    className="border-b border-[#1A1F2A]/10 last:border-b-0 hover:bg-[#F4F6FB]"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[#0B2545]">
                      {c.fieldName}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#0B2545]">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#1A1F2A]/70">
                      {c.dataTypeName || "—"}
                    </td>
                  </tr>
                ))}
                {(meta?.columns ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center font-mono text-xs uppercase tracking-wider text-[#1A1F2A]/55"
                    >
                      Schema unavailable. Try again in a minute.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Sample rows */}
      <section className="border-b border-[#1A1F2A]/10 bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
          <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
            Sample rows · live
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-[#0B2545] md:text-4xl">
            Five rows, fresh.
          </h2>

          <div className="mt-6 overflow-x-auto rounded-md border border-[#1A1F2A]/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
                <tr className="font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/65">
                  {sampleColumns.map((c) => (
                    <th key={c} className="whitespace-nowrap px-4 py-3 font-semibold">
                      {c}
                    </th>
                  ))}
                  {sampleColumns.length === 0 && (
                    <th className="px-4 py-3">—</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sample.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#1A1F2A]/10 last:border-b-0 hover:bg-[#F4F6FB]"
                  >
                    {sampleColumns.map((c) => (
                      <td
                        key={c}
                        className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#1A1F2A]/85"
                      >
                        {String(row[c] ?? "—").slice(0, 64)}
                      </td>
                    ))}
                  </tr>
                ))}
                {sample.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center font-mono text-xs uppercase tracking-wider text-[#1A1F2A]/55">
                      No sample rows fetched. Live SODA may be temporarily unavailable.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/65">
            Source · {ds.portal} · dataset {ds.id} · last refresh {lastRefreshed}
          </p>
        </div>
      </section>

      <footer className="bg-[#06182F] text-white/85">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">
          <p>All data sourced from public Texas open-data portals · Attribution enforced</p>
          <Link href="/" className="hover:text-white">
            ← Back to TXLookup
          </Link>
        </div>
      </footer>
    </main>
  );
}
