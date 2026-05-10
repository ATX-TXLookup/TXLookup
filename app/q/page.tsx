// TXLookup agent observatory page (/q). Brand-faithful per BRAND.md
// (brand-guide/BRAND.md is the single source of truth for design):
//   Colors:  navy #0D2340  ·  rust CTA #C4420A  ·  gold accent #D48B10
//            sky link #3A7FBE  ·  cream surface #FAF7F2  ·  ink #1A1510
//   Fonts:   DM Serif Display (h1/h2)  ·  Syne (UI/body)  ·  IBM Plex Mono (queries/code)
//   Tokens are in tailwind.config.ts (tx-navy, tx-rust, ...). CSS vars in
//   app/globals.css (--tx-navy, --tx-rust, ...) for inline styles.
//
// This page is the live demo path users land on after submitting a question
// from /. It mirrors the homepage chrome (utility bar + header logo + footer)
// so the cross-page experience feels of a piece, then hands the body off to
// the AgentRunner (left answer column + right observatory column).

import Link from "next/link";
import Image from "next/image";

import { AgentRunner } from "./AgentRunner";

export default async function QueryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dataset?: string }>;
}) {
  const { q, dataset } = await searchParams;
  const query = q?.trim() || "";

  return (
    <main className="min-h-screen bg-tx-cream text-tx-ink font-body">
      {/* ── Top utility bar — mirrors homepage ── */}
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
            <Link href="/" className="hover:text-tx-rust">
              New search
            </Link>
            <Link href="/#datasets" className="hidden hover:text-tx-rust md:inline">
              Datasets
            </Link>
            <Link href="/reports" className="hidden hover:text-tx-rust md:inline">
              Reports
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="rounded-sm bg-tx-navy px-4 py-2 font-medium text-white hover:bg-tx-rust"
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>

      {/* ── Question recap + refine — dark hero treatment per BRAND §7 ── */}
      <section
        className="border-b border-tx-ink/10"
        style={{
          background: "var(--tx-navy)",
          backgroundImage:
            "radial-gradient(circle at 80% 30%, rgba(58,127,190,0.18) 0%, transparent 55%), radial-gradient(circle at 10% 80%, rgba(196,66,10,0.12) 0%, transparent 50%)",
        }}
      >
        <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10 md:py-14">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-tx-sky">
            Question
          </p>
          <h1 className="mt-3 max-w-[68ch] font-display text-[32px] font-normal leading-tight tracking-tight text-tx-cream md:text-[44px]">
            {query || (
              <>
                Type a question on the home page to <span className="italic text-tx-gold">begin</span>.
              </>
            )}
          </h1>
          {dataset && (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-tx-cream/60">
              Scoped to dataset · <span className="text-tx-gold">{dataset}</span>
            </p>
          )}

          {/* Refine search — IBM Plex Mono on navy, rust CTA, gold caret */}
          <form
            action="/q"
            method="GET"
            className="mt-7 flex max-w-[820px] gap-2 rounded-md p-2"
            style={{
              background: "rgba(13,35,64,0.6)",
              border: "0.5px solid rgba(58,127,190,0.35)",
              boxShadow: "0 2px 24px -8px rgba(13,35,64,0.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            <label htmlFor="q" className="sr-only">
              Refine your question
            </label>
            <input
              id="q"
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Refine your question…"
              className="flex-1 rounded-sm bg-transparent px-4 py-3 font-mono text-sm text-tx-cream placeholder:text-tx-cream/40 focus:outline-none md:text-base"
              style={{ caretColor: "var(--tx-gold)" }}
            />
            <button
              type="submit"
              className="rounded-sm bg-tx-rust px-6 py-3 font-display text-sm font-semibold text-white hover:bg-tx-rust-dark md:text-base"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Live agent runner — calls /api/agent and streams events */}
      {query ? (
        <AgentRunner query={query} dataset={dataset} />
      ) : (
        <section className="border-b border-tx-ink/10 bg-tx-cream">
          <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
              No question
            </p>
            <h2 className="mt-3 font-display text-3xl font-normal tracking-tight text-tx-navy md:text-5xl">
              Type a question on the home page to <span className="italic text-tx-gold">begin</span>.
            </h2>
            <Link
              href="/"
              className="mt-7 inline-block rounded-md bg-tx-rust px-6 py-3 font-display text-sm font-semibold text-white hover:bg-tx-rust-dark"
            >
              ← Home
            </Link>
          </div>
        </section>
      )}

      {/* ── Footer — mirrors homepage navy-dark variant ── */}
      <footer className="bg-tx-navy-dark text-white/85">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">
          <p>
            All data sourced from public Texas open-data portals · Attribution
            enforced.
          </p>
          <Link href="/" className="hover:text-white">
            ← Back to TXLookup
          </Link>
        </div>
      </footer>
    </main>
  );
}
