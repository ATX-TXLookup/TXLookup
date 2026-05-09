// Replay view — re-streams a saved run's SSE flow at realistic timing.
// Reuses the AgentRunner UI by hitting /api/agent with `fallback: true`,
// which returns the saved events from run-archive.

import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentRunner } from "@/app/q/AgentRunner";
import { getRun } from "@/app/lib/run-archive";

export const dynamic = "force-dynamic";

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const run = await getRun(hash);
  if (!run) notFound();

  return (
    <main className="min-h-screen bg-white text-[#1A1F2A] font-body">
      <header className="border-b border-[#1A1F2A]/10 bg-[#0B2545] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-4 md:px-10">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="font-mono text-[11px] uppercase tracking-wider text-white/65 hover:text-white">
              ← Admin
            </Link>
            <span className="font-display text-[16px] font-extrabold tracking-tight">
              Replay · {hash}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/65">
            saved {new Date(run.savedAt).toISOString().slice(0, 19).replace("T", " ")}
          </span>
        </div>
      </header>

      <section className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
        <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10">
          <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
            Question
          </p>
          <h1 className="mt-2 max-w-[68ch] font-display text-2xl font-extrabold leading-tight tracking-tight text-[#0B2545] md:text-3xl">
            {run.query}
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
            status: {run.status} · {run.durationMs}ms · {run.tokenTotal.toLocaleString()} tok
          </p>
        </div>
      </section>

      <AgentRunner query={run.query} mode="fallback" />
    </main>
  );
}
