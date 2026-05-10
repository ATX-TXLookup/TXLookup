// /agents — operations center index. Wrapped in <Shell> for consistency
// with the homepage. 7-agent roster as <FeatureCard> grid + recent run
// archive feed below.

import Link from "next/link";
import { listRuns } from "@/app/lib/run-archive";
import {
  EyebrowLabel,
  FeatureCard,
  SectionHeader,
  Shell,
} from "@/app/components/ds";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type AgentTone = "accent" | "good" | "warn" | "warm" | "purple" | "neutral" | "bad";

type AgentCard = {
  id: string;
  label: string;
  role: string;
  tone: AgentTone;
  schedule: string;
  status: "live" | "scheduled" | "on-demand";
  description: string;
  detail_path: string;
};

const ROSTER: AgentCard[] = [
  {
    id: "orchestrator",
    label: "Orchestrator",
    role: "Plans & dispatches",
    tone: "accent",
    schedule: "On every /q request",
    status: "on-demand",
    description: "Reasons over the question, builds the plan, decides which specialist owns each step. Hosts the doom-loop guard and the critic-revision loop.",
    detail_path: "/agents/orchestrator",
  },
  {
    id: "data_analyst",
    label: "Data Analyst",
    role: "Statistical reasoning",
    tone: "good",
    schedule: "Triggered by orchestrator",
    status: "on-demand",
    description: "Owns analytical SoQL — deltas, percentiles, top-N with ties broken, year-over-year. Returns findings + viz spec + confidence + caveats.",
    detail_path: "/agents/data-analyst",
  },
  {
    id: "reporter",
    label: "Reporter",
    role: "Composes /reports",
    tone: "purple",
    schedule: "Triggered by orchestrator + nightly cron",
    status: "scheduled",
    description: "Takes findings, splices into long-form templates, writes data/reports/{slug}.json snapshots that drive every /reports page.",
    detail_path: "/agents/reporter",
  },
  {
    id: "support",
    label: "Support",
    role: "Disambiguates & helps",
    tone: "warm",
    schedule: "Triggered by orchestrator",
    status: "on-demand",
    description: "Handles vague queries (\"south austin\"), answers TXLookup-meta questions, returns chip-set follow-ups when the user needs to clarify scope.",
    detail_path: "/agents/support",
  },
  {
    id: "critic",
    label: "Critic",
    role: "Self-correction",
    tone: "warn",
    schedule: "After every plan + every answer",
    status: "on-demand",
    description: "Grades the plan and the synthesized answer on groundedness, scope match, citation quality. On reject (approve=false), forces a single corrective revision.",
    detail_path: "/agents/critic",
  },
  {
    id: "dataset_scout",
    label: "Dataset Scout",
    role: "Grows the corpus",
    tone: "neutral",
    schedule: "Every 6 hours",
    status: "scheduled",
    description: "Scans Austin / Dallas / SA / Houston / TX state Socrata portals for new or refreshed datasets. Files GitHub issues for human curation.",
    detail_path: "/agents/dataset-scout",
  },
  {
    id: "ingestor",
    label: "Ingestor",
    role: "Local cache curator",
    tone: "good",
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

const STATUS_DOT: Record<AgentCard["status"], string> = {
  live:        "var(--ds-good)",
  scheduled:   "var(--ds-accent)",
  "on-demand": "var(--ds-warn)",
};

export default async function AgentsPage() {
  let recentRuns: Awaited<ReturnType<typeof listRuns>> = [];
  try {
    recentRuns = await listRuns(10);
  } catch {
    recentRuns = [];
  }

  return (
    <Shell active="/agents">
      {/* Hero */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 pb-16 pt-12 md:px-8 md:pb-24 md:pt-16">
          <EyebrowLabel tone="good">Operations center · live</EyebrowLabel>
          <h1 className="mt-4 max-w-[24ch] text-[42px] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--ds-text)] md:text-[64px]">
            Seven agents.{" "}
            <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
              Working on a clock.
            </span>
          </h1>
          <p className="mt-6 max-w-[60ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
            Multi-agent reasoning isn&rsquo;t a slide — it&rsquo;s running right now. Each agent has a defined role, a schedule (cron or on-demand), an audit trail, and a public detail page. This is what we mean by &ldquo;not a wrapper.&rdquo;
          </p>
        </div>
      </section>

      {/* Agent grid */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-16 md:px-8 md:py-20">
          <SectionHeader
            eyebrow="The roster"
            eyebrowTone="accent"
            headline={
              <>
                Each one with a job,{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
                  not a vibe.
                </span>
              </>
            }
          />
          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ROSTER.map((a) => (
              <FeatureCard
                key={a.id}
                tone={a.tone}
                icon={
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: STATUS_DOT[a.status] }}
                  />
                }
                title={a.label}
                body={
                  <>
                    <span className="block">{a.description}</span>
                    <span className="mt-3 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                      {a.role} · {a.schedule}
                    </span>
                  </>
                }
                href={a.detail_path}
                ctaLabel="See activity →"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Recent activity feed */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-16 md:px-8 md:py-20">
          <div className="flex items-baseline justify-between gap-4">
            <SectionHeader
              eyebrow="Live activity feed"
              eyebrowTone="warm"
              headline={
                <>
                  What every agent has done{" "}
                  <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
                    in the last hour.
                  </span>
                </>
              }
              size="md"
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              {recentRuns.length} run{recentRuns.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
            {recentRuns.length === 0 ? (
              <div className="px-6 py-12 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                No recent agent runs to display.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--ds-border)]">
                {recentRuns.map((r) => (
                  <li key={r.hash} className="grid items-baseline gap-4 px-6 py-4 md:grid-cols-[80px_1fr_240px_80px]">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)] tabular-nums">
                      {new Date(r.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="line-clamp-1 text-[14px] text-[var(--ds-text)]">{r.query}</p>
                    <p className="font-mono text-[11px] text-[var(--ds-text-mute)]">
                      {(r.events as unknown[] | undefined)?.length ?? 0} events ·{" "}
                      {(r.citation as { dataset_id?: string } | null)?.dataset_id ?? "no citation"}
                    </p>
                    <Link
                      href={`/admin/replay/${r.hash}`}
                      className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ds-accent)] hover:text-[var(--ds-text)]"
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
    </Shell>
  );
}
