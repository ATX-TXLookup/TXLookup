import Link from "next/link";
import { notFound } from "next/navigation";
import { findById, type CatalogDataset } from "../../lib/catalog";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";

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
      <SiteHeader activePath="/datasets" />

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
          <p className="mt-3 text-sm">
            <a
              href={`https://${ds.portal}/resource/${ds.id}.json`}
              className="font-display font-semibold text-[#0B5FFF] hover:underline"
            >
              Open dataset →
            </a>
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
