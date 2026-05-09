import Link from "next/link";
import { notFound } from "next/navigation";

type Dataset = {
  id: string;
  title: string;
  city: string;
  portal: string;
  cadence: string;
  blurb: string;
};

const CATALOG: Record<string, Dataset> = {
  "3syk-w9eu": {
    id: "3syk-w9eu",
    title: "Issued Construction Permits",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "Daily",
    blurb:
      "Every construction permit issued by the City of Austin since the 1980s — type, address, contractor, status, value.",
  },
  "ecmv-9xxi": {
    id: "ecmv-9xxi",
    title: "Food Establishment Inspection Scores",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "Weekly",
    blurb:
      "Health-inspection scores and violations for Austin restaurants, food trucks, and grocery stores.",
  },
  "i26j-ai4z": {
    id: "i26j-ai4z",
    title: "311 Service Requests",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "Daily",
    blurb:
      "Every non-emergency 311 call logged in Austin — pothole, graffiti, animal services, code complaints.",
  },
  "6wtj-zbtb": {
    id: "6wtj-zbtb",
    title: "Code Violation Cases",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "Daily",
    blurb:
      "Open and closed building, zoning, and short-term-rental violations.",
  },
  "fdj4-gpfu": {
    id: "fdj4-gpfu",
    title: "Crime Reports",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "Weekly",
    blurb: "Reported crimes by type, location, and time. APD case-level data.",
  },
  "y2wy-tgr5": {
    id: "y2wy-tgr5",
    title: "Traffic Fatalities",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "Monthly",
    blurb: "Fatal traffic crashes — location, mode, year. Vision Zero data.",
  },
};

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
  const ds = CATALOG[id];
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
    <main className="min-h-screen bg-white text-black">
      <header className="border-b-4 border-black bg-[#002868] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-extrabold uppercase tracking-tight">
              TXLookup
            </span>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 md:inline">
              public data, cited
            </span>
          </Link>
          <nav className="flex items-center gap-7 font-display text-sm font-bold uppercase tracking-wider">
            <Link href="/#datasets" className="hover:underline">
              All datasets
            </Link>
            <a
              href={`https://${ds.portal}/d/${ds.id}`}
              className="border-2 border-white bg-white px-3 py-1.5 text-[#002868] hover:bg-[#FFD93D]"
            >
              View on {ds.portal} ↗
            </a>
          </nav>
        </div>
      </header>

      {/* Title block */}
      <section className="border-b-4 border-black bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
          <div className="flex flex-wrap items-center gap-3">
            <span className="border-2 border-black bg-[#FFD93D] px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
              {ds.city.toUpperCase()}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-black/65">
              {ds.cadence.toUpperCase()} · {ds.id}
            </span>
          </div>
          <h1 className="mt-5 font-display text-4xl font-extrabold uppercase leading-[1] tracking-tight md:text-6xl">
            {ds.title}
          </h1>
          <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-black/80 md:text-lg">
            {ds.blurb}
          </p>

          <form
            action="/q"
            method="GET"
            className="mt-8 flex flex-col gap-3 md:flex-row md:items-stretch"
          >
            <input type="hidden" name="dataset" value={ds.id} />
            <input
              name="q"
              type="text"
              placeholder={`Ask about ${ds.title.toLowerCase()} in this dataset…`}
              className="flex-1 border-4 border-black bg-white px-5 py-4 text-base font-medium shadow-[6px_6px_0_0_#000] placeholder:text-black/55 focus:bg-[#FFD93D] focus:outline-none focus:shadow-[3px_3px_0_0_#000] focus:translate-x-[3px] focus:translate-y-[3px]"
            />
            <button
              type="submit"
              className="border-4 border-black bg-[#BF0A30] px-7 py-4 font-display text-base font-extrabold uppercase tracking-wider text-white shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px]"
            >
              Ask
            </button>
          </form>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b-4 border-black bg-[#FFD93D]">
        <div className="mx-auto grid max-w-[1320px] grid-cols-2 divide-x-4 divide-black px-6 py-8 md:grid-cols-4 md:px-10">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-black/75">
              Source portal
            </p>
            <p className="mt-2 font-mono text-sm font-bold">{ds.portal}</p>
          </div>
          <div className="pl-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-black/75">
              Refresh cadence
            </p>
            <p className="mt-2 font-mono text-sm font-bold uppercase">
              {ds.cadence}
            </p>
          </div>
          <div className="pl-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-black/75">
              Columns shown
            </p>
            <p className="mt-2 font-mono text-sm font-bold">
              {meta?.columns?.length ?? "—"}
            </p>
          </div>
          <div className="pl-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-black/75">
              Last refresh
            </p>
            <p className="mt-2 font-mono text-sm font-bold">{lastRefreshed}</p>
          </div>
        </div>
      </section>

      {/* Schema + sample rows — live */}
      <section className="border-b-4 border-black bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
            Schema
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-tight md:text-5xl">
            What's in this dataset.
          </h2>

          <div className="mt-8 border-4 border-black bg-white shadow-[8px_8px_0_0_#002868]">
            <table className="w-full text-left text-sm">
              <thead className="border-b-4 border-black bg-black text-white">
                <tr className="font-mono text-[11px] uppercase tracking-[0.22em]">
                  <th className="px-5 py-3 font-bold">FIELD</th>
                  <th className="px-5 py-3 font-bold">DISPLAY NAME</th>
                  <th className="px-5 py-3 font-bold">TYPE</th>
                </tr>
              </thead>
              <tbody>
                {(meta?.columns ?? []).map((c, i) => (
                  <tr
                    key={c.fieldName + i}
                    className={`border-b-2 border-black last:border-b-0 ${
                      i % 2 === 0 ? "bg-white" : "bg-[#F5F5F0]"
                    }`}
                  >
                    <td className="px-5 py-4 font-mono text-xs">
                      {c.fieldName}
                    </td>
                    <td className="px-5 py-4 font-medium">{c.name}</td>
                    <td className="px-5 py-4 font-mono text-xs uppercase text-black/70">
                      {c.dataTypeName || "—"}
                    </td>
                  </tr>
                ))}
                {(meta?.columns ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-8 text-center font-mono text-xs uppercase tracking-wider text-black/60"
                    >
                      Schema unavailable. The portal may be rate-limited; try
                      again in a minute.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mx-auto max-w-[1320px] px-6 pb-16 md:px-10">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
            Sample rows · live
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-tight md:text-5xl">
            Five rows, fresh.
          </h2>

          <div className="mt-8 overflow-x-auto border-4 border-black bg-white shadow-[8px_8px_0_0_#BF0A30]">
            <table className="w-full text-left text-sm">
              <thead className="border-b-4 border-black bg-black text-white">
                <tr className="font-mono text-[11px] uppercase tracking-[0.22em]">
                  {sampleColumns.map((c) => (
                    <th key={c} className="whitespace-nowrap px-4 py-3 font-bold">
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
                    className={`border-b-2 border-black last:border-b-0 ${
                      i % 2 === 0 ? "bg-white" : "bg-[#F5F5F0]"
                    }`}
                  >
                    {sampleColumns.map((c) => (
                      <td
                        key={c}
                        className="whitespace-nowrap px-4 py-3 font-mono text-xs"
                      >
                        {String(row[c] ?? "—").slice(0, 64)}
                      </td>
                    ))}
                  </tr>
                ))}
                {sample.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center font-mono text-xs uppercase tracking-wider text-black/60">
                      No sample rows fetched. Live SODA may be temporarily
                      unavailable.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-black/65">
            Source · {ds.portal} · dataset {ds.id} · last refresh {lastRefreshed}
          </p>
        </div>
      </section>

      <footer className="bg-[#BF0A30] text-white">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">
          <p className="font-mono uppercase tracking-wider">
            All data sourced from public Texas open-data portals · attribution enforced
          </p>
          <Link href="/" className="font-mono uppercase tracking-wider hover:underline">
            ← Back to TXLookup
          </Link>
        </div>
      </footer>
    </main>
  );
}
