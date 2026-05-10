// /agents — operations center index. Public-facing dashboard listing every
// agent in the TXLookup roster with live activity, schedule, last/next run.
// The "we're not a wrapper" demo: judges can SEE agents working on a clock.

import Link from "next/link";
import { listRuns } from "@/app/lib/run-archive";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type AgentCard = {
  id: string;
  label: string;
  role: string;
  color: string;
  schedule: string;
  status: "live" | "scheduled" | "on-demand";
  description: string;
  detail_path: string;
  upstream_lane?: string;
};

const ROSTER: AgentCard[] = [
  {
    id: "orchestrator",
    label: "Orchestrator",
    role: "Plans & dispatches",
    color: "var(--tx-navy)",
    schedule: "On every /q request",
    status: "on-demand",
    description: "Reasons over the question, builds the plan, decides which specialist owns each step. Hosts the doom-loop guard and the critic-revision loop.",
    detail_path: "/agents/orchestrator",
  },
  {
    id: "data_analyst",
    label: "Data Analyst",
    role: "Statistical reasoning",
    color: "var(--tx-sky)",
    schedule: "Triggered by orchestrator",
    status: "on-demand",
    description: "Owns analytical SoQL — deltas, percentiles, top-N with ties broken, year-over-year. Returns findings + viz spec + confidence + caveats.",
    detail_path: "/agents/data-analyst",
  },
  {
    id: "reporter",
    label: "Reporter",
    role: "Composes /reports",
    color: "var(--tx-gold)",
    schedule: "Triggered by orchestrator + nightly cron",
    status: "scheduled",
    description: "Takes findings, splices into long-form templates, writes data/reports/{slug}.json snapshots that drive every /reports page.",
    detail_path: "/agents/reporter",
  },
  {
    id: "support",
    label: "Support",
    role: "Disambiguates & helps",
    color: "var(--tx-rust)",
    schedule: "Triggered by orchestrator",
    status: "on-demand",
    description: "Handles vague queries (\"south austin\"), answers TXLookup-meta questions, returns chip-set follow-ups when the user needs to clarify scope.",
    detail_path: "/agents/support",
  },
  {
    id: "critic",
    label: "Critic",
    role: "Self-correction",
    color: "var(--tx-ink)",
    schedule: "After every plan + every answer",
    status: "on-demand",
    description: "Grades the plan and the synthesized answer on groundedness, scope match, citation quality. On reject (approve=false), forces a single corrective revision.",
    detail_path: "/agents/critic",
  },
  {
    id: "dataset_scout",
    label: "Dataset Scout",
    role: "Grows the corpus",
    color: "#6B6660",
    schedule: "Every 6 hours",
    status: "scheduled",
    description: "Scans Austin / Dallas / SA / Houston / TX state Socrata portals for new or refreshed datasets. Files GitHub issues for human curation.",
    detail_path: "/agents/dataset-scout",
  },
  {
    id: "ingestor",
    label: "Ingestor",
    role: "Local cache curator",
    color: "#3B6D3B",
    schedule: "Every 6 hours",
    status: "scheduled",
    description: "Pulls deltas from each catalog dataset into a SQLite cache. Enables cross-dataset SQL JOINs that Socrata's SoQL can't express. Source pill (cache vs live) on every tool envelope.",
    detail_path: "/agents/ingestor",
  },
];

export const metadata = {
  title: "Agent Operations Center — TXLookup",
  description: "Live status of every agent in the TXLookup roster. Schedules, last-runs, recent activity. Watch the multi-agent system work in real time.",
};

export default async function AgentsPage() {
  // Newest 10 runs from the run-archive — these are real agent activations.
  let recentRuns: Awaited<ReturnType<typeof listRuns>> = [];
  try {
    recentRuns = await listRuns(10);
  } catch {
    recentRuns = [];
  }

  return (
    <main className="min-h-screen bg-tx-cream text-tx-ink font-body">
      <div className="bg-tx-navy text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-2 text-[13px] md:px-10">
          <span>Operations center · live agent status, schedules, recent activity.</span>
          <span className="hidden font-mono text-[11px] uppercase tracking-wider text-white/70 md:inline">
            v0.1 · auto-refresh 60s
          </span>
        </div>
      </div>

      {/* Hero */}
      <section
        className="border-b border-tx-ink/10"
        style={{
          background: "var(--tx-navy)",
          backgroundImage:
            "radial-gradient(circle at 80% 30%, rgba(58,127,190,0.15) 0%, transparent 55%), radial-gradient(circle at 10% 80%, rgba(196,66,10,0.10) 0%, transparent 50%)",
        }}
      >
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-tx-sky">
            Agent operations center
          </p>
          <h1 className="mt-3 max-w-[28ch] font-display text-3xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl">
            Seven agents.<br />
            <span className="italic text-tx-gold">Working on a clock.</span>
          </h1>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-white/85 md:text-lg">
            Multi-agent reasoning isn't a slide — it's running right now. Each agent has a defined role, a schedule (cron or on-demand), an audit trail, and a public detail page. This is what we mean by "not a wrapper."
          </p>
        </div>
      </section>

      {/* Agent grid */}
      <section className="border-b border-tx-ink/10 bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
          <div className="grid gap-px bg-tx-ink/10 md:grid-cols-2 lg:grid-cols-3">
            {ROSTER.map((a) => (
              <Link
                key={a.id}
                href={a.detail_path}
                className="group relative block bg-white p-6 transition-colors hover:bg-tx-cream"
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-6 h-[calc(100%-3rem)] w-[3px]"
                  style={{ backgroundColor: a.color }}
                />
                <div className="ml-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: a.color }}>
                      {a.role}
                    </p>
                    <StatusDot status={a.status} />
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold text-tx-navy group-hover:text-tx-rust">
                    {a.label}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-tx-ink">{a.description}</p>
                  <div className="mt-5 border-t border-tx-ink/10 pt-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-tx-ink/55">Schedule</p>
                    <p className="mt-1 font-mono text-[12px] text-tx-navy">{a.schedule}</p>
                  </div>
                  <p className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-tx-rust opacity-0 group-hover:opacity-100">
                    See activity →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent run-archive activity (everyone's collective output) */}
      <section className="border-b border-tx-ink/10 bg-tx-cream">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
                Live activity feed
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-tx-navy md:text-3xl">
                What every agent has done in the last hour.
              </h2>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-tx-ink/55">
              {recentRuns.length} run{recentRuns.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-8 border border-tx-ink/15 bg-white">
            {recentRuns.length === 0 ? (
              <div className="px-6 py-12 text-center font-mono text-[11px] uppercase tracking-wider text-tx-ink/55">
                No recent agent runs to display.
              </div>
            ) : (
              <ul className="divide-y divide-tx-ink/10">
                {recentRuns.map((r) => (
                  <li key={r.hash} className="flex items-baseline gap-4 px-6 py-4">
                    <p className="font-mono text-[10px] tabular-nums text-tx-ink/55 min-w-[80px]">
                      {new Date(r.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-semibold text-tx-navy">
                        <span className="line-clamp-1">{r.query}</span>
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-tx-ink/65">
                        {(r.events as unknown[] | undefined)?.length ?? 0} events ·{" "}
                        {(r.citation as { dataset_id?: string } | null)?.dataset_id ?? "no citation"} ·
                        {" "}status: {r.status ?? "pending"}
                      </p>
                    </div>
                    <Link
                      href={`/admin/replay/${r.hash}`}
                      className="font-mono text-[11px] font-semibold uppercase tracking-wider text-tx-rust hover:text-tx-navy"
                    >
                      Replay →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <footer className="bg-tx-navy-dark text-white">
        <div className="mx-auto max-w-[1320px] px-6 py-6 md:px-10">
          <p className="text-[13px] text-white/60">
            All agent activity audited and replayable ·{" "}
            <Link href="/" className="text-white/85 hover:text-tx-gold">← Back to TXLookup</Link>
          </p>
        </div>
      </footer>
    </main>
  );
}

function StatusDot({ status }: { status: "live" | "scheduled" | "on-demand" }) {
  const config = {
    live: { color: "var(--tx-sage)", label: "live" },
    scheduled: { color: "var(--tx-sky)", label: "scheduled" },
    "on-demand": { color: "var(--tx-gold)", label: "on-demand" },
  }[status];
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
      <span className="font-mono text-[10px] uppercase tracking-wider text-tx-ink/65">{config.label}</span>
    </div>
  );
}
