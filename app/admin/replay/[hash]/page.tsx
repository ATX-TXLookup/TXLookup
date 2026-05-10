// Replay view — re-streams a saved run's SSE flow at realistic timing.
// Reuses the AgentRunner UI by hitting /api/agent with `fallback: true`,
// which returns the saved events from run-archive.

import { notFound } from "next/navigation";

import { Shell } from "@/app/components/ds";
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
    <Shell active="/admin">
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-accent)]">
            Replay · {hash}
          </p>
          <h1 className="mt-2 max-w-[68ch] text-2xl font-extrabold leading-tight tracking-tight text-[var(--ds-text)] md:text-3xl">
            {run.query}
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-mute)]">
            saved {new Date(run.savedAt).toISOString().slice(0, 19).replace("T", " ")} · status: {run.status} · {run.durationMs}ms · {run.tokenTotal.toLocaleString()} tok
          </p>
        </div>
      </section>

      <AgentRunner query={run.query} mode="fallback" />
    </Shell>
  );
}
