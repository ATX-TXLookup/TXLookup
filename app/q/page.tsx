import Link from "next/link";

import { AgentRunner } from "./AgentRunner";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";

export default async function QueryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dataset?: string }>;
}) {
  const { q, dataset } = await searchParams;
  const query = q?.trim() || "";

  return (
    <main className="min-h-screen bg-white text-[#1A1F2A] font-body">
      <SiteHeader activePath="/q" />

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

      <SiteFooter />
    </main>
  );
}
