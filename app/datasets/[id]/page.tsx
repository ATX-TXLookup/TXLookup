// Dataset detail page — uses the shared dark Shell + --ds-* design tokens.
// Schema, sample rows, and last-refresh timestamp are pulled from the source
// portal's metadata endpoint and cached for 600s. The insight card below the
// schema renders cached aggregates if available, falling back to live SODA.

import Link from "next/link";
import { notFound } from "next/navigation";
import { findById, type CatalogDataset } from "../../lib/catalog";
import DatasetInsightCard from "../../components/DatasetInsightCard";
import { getCachedInsight } from "../../lib/cached-stats";
import { getLiveInsight } from "../../lib/dataset-insights";
import { REPORTS } from "../../../config/reports";
import { Shell } from "@/app/components/ds";

function findReportSlugForDataset(datasetId: string): string | null {
  const r = REPORTS.find((r) => r.dataset_ids.includes(datasetId));
  return r ? r.slug : null;
}

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

  // Cache-first insight: try the local mirror, fall through to live Socrata.
  const [meta, sample, cachedInsightRes] = await Promise.all([
    fetchMetadata(ds.portal, ds.id),
    fetchSample(ds.portal, ds.id),
    getCachedInsight(ds.id),
  ]);
  const liveInsight =
    cachedInsightRes.value ?? (await getLiveInsight(ds.id));
  const reportSlug = findReportSlugForDataset(ds.id);

  const lastRefreshed = meta?.rowsUpdatedAt
    ? new Date(meta.rowsUpdatedAt * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "—";

  const sampleColumns: string[] =
    sample.length > 0 ? Object.keys(sample[0]).slice(0, 6) : [];

  return (
    <Shell active="/datasets">
      {/* ── Hero / title block + scoped search ── */}
      <section
        className="border-b border-[var(--ds-border)]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 30%, rgba(91,141,239,0.10) 0%, transparent 55%), radial-gradient(circle at 10% 80%, rgba(249,115,22,0.08) 0%, transparent 50%)",
        }}
      >
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <div className="mb-5">
            <Link
              href="/datasets"
              className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-mute)] hover:text-[var(--ds-text)]"
            >
              ← All datasets
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="rounded-full border border-[var(--ds-warn)]/40 bg-[rgba(234,179,8,0.10)] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ds-warn)]"
            >
              {ds.city}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ds-text-dim)]">
              {capitalize(ds.cadence)} · {ds.id}
            </span>
          </div>

          <h1 className="mt-5 max-w-[28ch] text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--ds-text)] md:text-[56px]">
            <span className="font-display-serif font-normal">{ds.title}</span>
          </h1>
          <p className="mt-3 font-display-serif text-base italic text-[var(--ds-warn)] md:text-lg">
            {ds.agency}
          </p>
          <p className="mt-6 max-w-[68ch] text-base leading-relaxed text-[var(--ds-text-mute)] md:text-lg">
            {ds.blurb}
          </p>

          {/* Scoped search */}
          <form
            action="/q"
            method="GET"
            className="mt-9 flex max-w-[820px] gap-2 rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] p-2"
          >
            <input type="hidden" name="dataset" value={ds.id} />
            <label htmlFor="dataset-q" className="sr-only">
              Ask a question scoped to this dataset
            </label>
            <input
              id="dataset-q"
              name="q"
              type="text"
              placeholder={`Ask about ${ds.title.toLowerCase()} in this dataset…`}
              className="flex-1 rounded-sm bg-transparent px-4 py-3 font-mono text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-dim)] focus:outline-none md:text-base"
              style={{ caretColor: "var(--ds-warn)" }}
            />
            <button
              type="submit"
              className="rounded-sm bg-[var(--ds-purple)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 md:text-base"
            >
              Ask
            </button>
          </form>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-8 md:px-8 md:py-10">
          <div className="grid gap-px border border-[var(--ds-border)] bg-[var(--ds-border)] grid-cols-2 md:grid-cols-4">
            <div className="bg-[var(--ds-bg-elev)] px-5 py-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-dim)]">
                Source portal
              </p>
              <p className="mt-2 font-mono text-sm font-semibold text-[var(--ds-text)]">
                {ds.portal}
              </p>
            </div>
            <div className="bg-[var(--ds-bg-elev)] px-5 py-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-dim)]">
                Refresh cadence
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--ds-text)]">
                {capitalize(ds.cadence)}
              </p>
            </div>
            <div className="bg-[var(--ds-bg-elev)] px-5 py-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-dim)]">
                Columns shown
              </p>
              <p className="mt-2 font-mono text-sm font-semibold text-[var(--ds-text)]">
                {meta?.columns?.length ?? "—"}
              </p>
            </div>
            <div className="bg-[var(--ds-bg-elev)] px-5 py-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-dim)]">
                Last refresh
              </p>
              <p className="mt-2 font-mono text-sm font-semibold text-[var(--ds-text)]">
                {lastRefreshed}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Schema ── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <h2 className="text-[28px] font-bold tracking-tight text-[var(--ds-text)] md:text-[32px]">
            What&rsquo;s in this dataset.
          </h2>

          <div className="mt-6 overflow-x-auto rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
                <tr className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--ds-text-mute)]">
                  <th className="px-4 py-3 font-semibold">Field</th>
                  <th className="px-4 py-3 font-semibold">Display name</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody>
                {(meta?.columns ?? []).map((c, i) => (
                  <tr
                    key={c.fieldName + i}
                    className="border-b border-[var(--ds-border)] last:border-b-0 hover:bg-[var(--ds-bg)]"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--ds-warm)]">
                      {c.fieldName}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--ds-text)]">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--ds-text-dim)]">
                      {c.dataTypeName || "—"}
                    </td>
                  </tr>
                ))}
                {(meta?.columns ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center font-mono text-xs uppercase tracking-[0.12em] text-[var(--ds-text-dim)]"
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

      {/* ── Per-dataset insight card (issue #88) ── */}
      <DatasetInsightCard
        datasetId={ds.id}
        title={ds.title}
        portal={ds.portal}
        sampleQuestions={ds.sample_questions}
        liveInsight={liveInsight}
        reportSlug={reportSlug}
      />

      {/* ── Sample rows ── */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <h2 className="text-[28px] font-bold tracking-tight text-[var(--ds-text)] md:text-[32px]">
            Five rows,{" "}
            <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">fresh.</span>
          </h2>

          <div className="mt-6 overflow-x-auto rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
                <tr className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--ds-text-mute)]">
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
                    className="border-b border-[var(--ds-border)] last:border-b-0 hover:bg-[var(--ds-bg)]"
                  >
                    {sampleColumns.map((c) => (
                      <td
                        key={c}
                        className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--ds-text-mute)]"
                      >
                        {String(row[c] ?? "—").slice(0, 64)}
                      </td>
                    ))}
                  </tr>
                ))}
                {sample.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center font-mono text-xs uppercase tracking-[0.12em] text-[var(--ds-text-dim)]">
                      No sample rows fetched. Live SODA may be temporarily unavailable.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--ds-text-dim)]">
            Source · {ds.portal} · dataset {ds.id} · last refresh {lastRefreshed}
          </p>
          <p className="mt-3 text-sm">
            <a
              href={`https://${ds.portal}/resource/${ds.id}.json`}
              className="font-semibold text-[var(--ds-warm)] hover:text-[var(--ds-text)] hover:underline"
            >
              Open dataset →
            </a>
          </p>
        </div>
      </section>
    </Shell>
  );
}
