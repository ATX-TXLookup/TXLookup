// Dataset detail page — brand-faithful per BRAND.md (brand-guide/BRAND.md is
// the single source of truth for all design decisions):
//   Colors:  navy #0D2340  ·  rust CTA #C4420A  ·  gold accent #D48B10
//            sky link #3A7FBE  ·  cream surface #FAF7F2  ·  ink #1A1510
//   Fonts:   DM Serif Display (h1/h2)  ·  Syne (UI/body)  ·  IBM Plex Mono (queries/code)
//   Tokens are in tailwind.config.ts (tx-navy, tx-rust, ...). CSS vars in
//   app/globals.css (--tx-navy, --tx-rust, ...) for inline styles only.
//
// Functional logic (fetchMetadata, fetchSample, findById, notFound, the
// Promise<{id}> param shape) is unchanged from the prior implementation.

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { findById, type CatalogDataset } from "../../lib/catalog";

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
    <main className="min-h-screen bg-tx-cream text-tx-ink font-body">

      {/* ── Top utility bar — mirrors homepage chrome ── */}
      <div className="bg-tx-navy text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-2 text-[13px] md:px-10">
          <span>An open-source agent for Texas public data. Live counts on this page are computed from Socrata at request time.</span>
          <span className="hidden font-mono text-[11px] uppercase tracking-wider text-white/70 md:inline">
            v2 · beta
          </span>
        </div>
      </div>

      {/* ── Header — mirrors homepage chrome ── */}
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
            <Link href="/#search" className="hover:text-tx-rust">
              Search
            </Link>
            <Link href="/#datasets" className="hidden hover:text-tx-rust md:inline">
              Datasets
            </Link>
            <Link href="/#topics" className="hidden hover:text-tx-rust md:inline">
              Topics
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
              className="hidden hover:text-tx-rust md:inline"
            >
              Use as a tool
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="rounded-sm bg-tx-navy px-4 py-2 font-medium text-white hover:bg-tx-rust"
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero / title block + scoped search ── */}
      <section
        className="border-b border-tx-ink/10"
        style={{
          background: "var(--tx-navy)",
          backgroundImage:
            "radial-gradient(circle at 80% 30%, rgba(58,127,190,0.18) 0%, transparent 55%), radial-gradient(circle at 10% 80%, rgba(196,66,10,0.12) 0%, transparent 50%)",
        }}
      >
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="rounded-full font-mono text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{
                background: "var(--tx-gold-light)",
                color: "var(--tx-gold)",
                border: "0.5px solid rgba(212,139,16,0.3)",
                padding: "3px 12px",
              }}
            >
              {ds.city}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-tx-cream/60">
              {capitalize(ds.cadence)} · {ds.id}
            </span>
          </div>

          {/* BRAND.md: DM Serif Display 40-48px on navy, italic for emphasis */}
          <h1 className="mt-5 max-w-[28ch] font-display text-[40px] font-normal leading-[1.05] tracking-tight text-tx-cream md:text-[56px]">
            {ds.title}
          </h1>
          <p className="mt-3 font-display text-base italic text-tx-gold md:text-lg">
            {ds.agency}
          </p>
          <p className="mt-6 max-w-[68ch] text-base leading-relaxed text-tx-cream/75 md:text-lg">
            {ds.blurb}
          </p>

          {/* Scoped search — IBM Plex Mono input on navy, gold caret, rust CTA */}
          <form
            action="/q"
            method="GET"
            className="mt-9 flex max-w-[820px] gap-2 rounded-md p-2"
            style={{
              background: "rgba(13,35,64,0.6)",
              border: "0.5px solid rgba(58,127,190,0.35)",
              boxShadow: "0 2px 24px -8px rgba(13,35,64,0.5)",
              backdropFilter: "blur(8px)",
            }}
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
              className="flex-1 rounded-sm bg-transparent px-4 py-3 font-mono text-sm text-tx-cream placeholder:text-tx-cream/40 focus:outline-none md:text-base"
              style={{ caretColor: "var(--tx-gold)" }}
            />
            <button
              type="submit"
              className="rounded-sm bg-tx-rust px-6 py-3 font-display text-sm font-semibold text-white hover:bg-tx-rust-dark md:text-base"
            >
              Ask
            </button>
          </form>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="border-b border-tx-ink/10 bg-tx-cream">
        <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10 md:py-10">
          <div className="grid gap-px border border-tx-ink/10 bg-tx-ink/10 grid-cols-2 md:grid-cols-4">
            <div className="bg-tx-cream px-5 py-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-tx-muted">
                Source portal
              </p>
              <p className="mt-2 font-mono text-sm font-semibold text-tx-navy">
                {ds.portal}
              </p>
            </div>
            <div className="bg-tx-cream px-5 py-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-tx-muted">
                Refresh cadence
              </p>
              <p className="mt-2 font-display text-sm font-semibold text-tx-navy">
                {capitalize(ds.cadence)}
              </p>
            </div>
            <div className="bg-tx-cream px-5 py-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-tx-muted">
                Columns shown
              </p>
              <p className="mt-2 font-mono text-sm font-semibold text-tx-navy">
                {meta?.columns?.length ?? "—"}
              </p>
            </div>
            <div className="bg-tx-cream px-5 py-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-tx-muted">
                Last refresh
              </p>
              <p className="mt-2 font-mono text-sm font-semibold text-tx-navy">
                {lastRefreshed}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Schema ── */}
      <section className="border-b border-tx-ink/10 bg-tx-cream">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
            Schema
          </p>
          <h2 className="mt-2 font-display text-[28px] font-normal tracking-tight text-tx-navy md:text-[32px]">
            What's in this dataset.
          </h2>

          <div className="mt-6 overflow-x-auto rounded-[10px] border border-tx-ink/10 bg-tx-cream">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-tx-ink/10 bg-tx-navy">
                <tr className="font-mono text-[11px] uppercase tracking-[0.12em] text-tx-cream">
                  <th className="px-4 py-3 font-semibold">Field</th>
                  <th className="px-4 py-3 font-semibold">Display name</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody>
                {(meta?.columns ?? []).map((c, i) => (
                  <tr
                    key={c.fieldName + i}
                    className="border-b border-tx-ink/10 last:border-b-0 hover:bg-tx-gold-light/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-tx-rust">
                      {c.fieldName}
                    </td>
                    <td className="px-4 py-3 font-medium text-tx-navy">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-tx-muted">
                      {c.dataTypeName || "—"}
                    </td>
                  </tr>
                ))}
                {(meta?.columns ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center font-mono text-xs uppercase tracking-[0.12em] text-tx-muted"
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

      {/* ── Sample rows ── */}
      <section className="border-b border-tx-ink/10 bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-tx-sky">
            Sample rows · live
          </p>
          <h2 className="mt-2 font-display text-[28px] font-normal tracking-tight text-tx-navy md:text-[32px]">
            Five rows, fresh.
          </h2>

          <div className="mt-6 overflow-x-auto rounded-[10px] border border-tx-ink/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-tx-ink/10 bg-tx-navy">
                <tr className="font-mono text-[11px] uppercase tracking-[0.12em] text-tx-cream">
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
                    className="border-b border-tx-ink/10 last:border-b-0 hover:bg-tx-sky-light/30"
                  >
                    {sampleColumns.map((c) => (
                      <td
                        key={c}
                        className="whitespace-nowrap px-4 py-3 font-mono text-xs text-tx-ink/85"
                      >
                        {String(row[c] ?? "—").slice(0, 64)}
                      </td>
                    ))}
                  </tr>
                ))}
                {sample.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center font-mono text-xs uppercase tracking-[0.12em] text-tx-muted">
                      No sample rows fetched. Live SODA may be temporarily unavailable.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-tx-muted">
            Source · {ds.portal} · dataset {ds.id} · last refresh {lastRefreshed}
          </p>
          <p className="mt-3 text-sm">
            <a
              href={`https://${ds.portal}/resource/${ds.id}.json`}
              className="font-display font-semibold text-tx-rust hover:text-tx-rust-dark hover:underline"
            >
              Open dataset →
            </a>
          </p>
        </div>
      </section>

      {/* ── Footer — mirrors homepage chrome ── */}
      <footer className="bg-tx-navy-dark text-white/85">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-14">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <Image
                src="/txlookup-logo-dark.svg"
                alt="TXLookup"
                width={200}
                height={67}
                className="h-10 w-auto opacity-90"
              />
              <p className="mt-4 max-w-[42ch] text-sm leading-relaxed">
                An open-source agent for Texas public data. Built on the
                Socrata SODA API, FastMCP, and structured outputs. MIT
                licensed.
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Use it
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li><Link href="/#search" className="hover:text-white">Search</Link></li>
                <li><Link href="/#datasets" className="hover:text-white">Datasets</Link></li>
                <li><Link href="/#topics" className="hover:text-white">Topics</Link></li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Build
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <a href="https://github.com/ATX-TXLookup/TXLookup" className="hover:text-white">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://github.com/ATX-TXLookup/TXLookup/issues" className="hover:text-white">
                    Issues
                  </a>
                </li>
              </ul>
            </div>
            <div className="md:col-span-3">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Integrate
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
                    className="hover:text-white"
                  >
                    Agent skill (MCP)
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
                    className="hover:text-white"
                  >
                    Integration guide
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-wrap gap-y-2 border-t border-white/10 pt-5 text-[12px] text-white/55">
            <span className="mr-6">All data sourced from public Texas open-data portals.</span>
            <span className="mr-6">Attribution enforced.</span>
            <span>Set in DM Serif Display + Syne + IBM Plex Mono · 2026</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
