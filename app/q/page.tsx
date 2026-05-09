import Link from "next/link";

import { AgentRunner } from "./AgentRunner";

function CivicHeader() {
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
            <Link href="/" className="hover:text-[#0B5FFF]">
              New search
            </Link>
            <Link href="/#datasets" className="hidden hover:text-[#0B5FFF] md:inline">
              Datasets
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="rounded-sm bg-[#0B2545] px-4 py-2 font-medium text-white hover:bg-[#0B5FFF]"
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>
    </>
  );
}

export default async function QueryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dataset?: string }>;
}) {
  const { q, dataset } = await searchParams;
  const query = q?.trim() || "";

  return (
    <main className="min-h-screen bg-white text-[#1A1F2A] font-body">
      <CivicHeader />

      {/* Question recap + refine search */}
      <section className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
        <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10 md:py-14">
          <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
            Question
          </p>
          <h1 className="mt-3 max-w-[68ch] font-display text-2xl font-extrabold leading-tight tracking-tight text-[#0B2545] md:text-4xl">
            {query || "Type a question on the home page to begin."}
          </h1>
          {dataset && (
            <p className="mt-2 font-mono text-xs uppercase tracking-wider text-[#1A1F2A]/55">
              Scoped to dataset · {dataset}
            </p>
          )}

          <form
            action="/q"
            method="GET"
            className="mt-6 flex max-w-[820px] gap-2 rounded-md border border-[#1A1F2A]/15 bg-white p-2"
          >
            <input
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Refine your question…"
              className="flex-1 rounded-sm bg-white px-3 py-2 text-sm text-[#1A1F2A] placeholder:text-[#1A1F2A]/45 focus:outline-none md:text-base"
            />
            <button
              type="submit"
              className="rounded-sm bg-[#0B5FFF] px-5 py-2 font-display text-sm font-semibold text-white hover:bg-[#0B2545]"
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
        <section className="border-b border-[#1A1F2A]/10 bg-white">
          <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10">
            <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
              No question
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#0B2545] md:text-5xl">
              Type a question on the home page to begin.
            </h2>
            <Link
              href="/"
              className="mt-6 inline-block rounded-sm bg-[#0B5FFF] px-6 py-3 font-display text-sm font-semibold text-white hover:bg-[#0B2545]"
            >
              ← Home
            </Link>
          </div>
        </section>
      )}

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
