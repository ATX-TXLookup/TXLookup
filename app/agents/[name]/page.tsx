// /agents/[name] — per-agent detail page. Activity timeline, schedule, role,
// recent runs, tool/input/output schema. Public proof per agent that it's
// doing actual work, not just decorative copy.

import { notFound } from "next/navigation";
import Link from "next/link";
import { listRuns, type SavedRun } from "@/app/lib/run-archive";
import { Shell } from "@/app/components/ds";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type AgentSpec = {
  slug: string;
  label: string;
  role: string;
  color: string;
  schedule: string;
  status: "live" | "scheduled" | "on-demand";
  description: string;
  how_it_works: string[];
  inputs: string[];
  outputs: string[];
  source_files: { path: string; description: string }[];
  next_run?: string;
  envelope_field?: string; // SSE step_done.agent value used to filter activity
};

const AGENTS: Record<string, AgentSpec> = {
  orchestrator: {
    slug: "orchestrator",
    label: "Orchestrator",
    role: "Plans & dispatches",
    color: "var(--ds-accent)",
    schedule: "On every /q request",
    status: "on-demand",
    description: "The top-level reasoner. Reads the user's question, decides which specialists own which steps, runs the doom-loop guard, and routes the critic-revision loop.",
    how_it_works: [
      "Receives the plain-English question via POST /api/agent",
      "Calls Codex once for reasoning + once for the JSON-schema-validated plan",
      "Validates the plan with two post-validators (scope check + plan-shape check)",
      "Dispatches each step to the right tool or specialist via deterministic routing",
      "On step failure or doom-loop pattern, re-prompts the planner with the failure envelope",
      "Hands the final result set to the synthesizer + critic",
    ],
    inputs: ["query: string", "dataset?: string (scope-anchor)", "demo?: boolean", "fallback?: boolean"],
    outputs: ["SSE event stream: reasoning → planning → executing → step_done → done", "Final ToolEnvelope with answer + citation + artifacts + token usage + duration"],
    source_files: [
      { path: "app/lib/agent.ts", description: "reasonAndPlan / replan / synthesize / criticize" },
      { path: "app/api/agent/route.ts", description: "SSE endpoint + dispatch loop" },
      { path: "app/lib/doomLoop.ts", description: "loop detection guard" },
    ],
    envelope_field: "orchestrator",
  },
  "data-analyst": {
    slug: "data-analyst",
    label: "Data Analyst",
    role: "Statistical reasoning",
    color: "var(--ds-good)",
    schedule: "Triggered by orchestrator (delegate_to)",
    status: "on-demand",
    description: "Owns analytical SoQL — deltas (yoy/qoq/mom), percentiles, correlations across datasets, top-N with ties broken. Returns structured findings + viz spec + confidence + caveats.",
    how_it_works: [
      "Receives (query, dataset_ids[], context) via callSpecialist()",
      "Picks an analytical SoQL shape: count + group by, percentile_disc, year-over-year delta",
      "Hits the cache layer first; falls through to live Socrata when stale",
      "Computes confidence based on row count + null density",
      "Surfaces caveats when columns have >20% nulls or values look bucketed",
      "Returns envelope: { findings: [{text, value, unit, baseline}], viz_spec, confidence, caveats }",
    ],
    inputs: ["query: string", "dataset_ids: string[]", "context: object"],
    outputs: ["AgentEnvelope with findings + viz_spec + confidence + caveats"],
    source_files: [
      { path: "app/lib/specialists.ts", description: "callSpecialist router" },
      { path: "agent/specialists/data_analyst.py", description: "Python implementation (in flight)" },
    ],
    envelope_field: "data_analyst",
  },
  reporter: {
    slug: "reporter",
    label: "Reporter",
    role: "Composes /reports",
    color: "var(--ds-purple)",
    schedule: "Triggered by orchestrator + nightly cron at 02:00 UTC",
    status: "scheduled",
    description: "Takes findings + run-archive context, splices into editorial templates, writes data/reports/{slug}.json snapshots that drive every /reports page. Composes prose + viz + sourcing.",
    how_it_works: [
      "Receives (slug, findings[], template) — or runs autonomously on cron",
      "Pulls relevant runs from app/lib/run-archive when adjacent insights exist",
      "Generates JSON snapshot: hero_stats, sections (prose+viz), sources, method_footer",
      "Writes data/reports/{slug}.json — read by app/reports/[slug]/page.tsx",
      "Uses inline-SVG viz from app/components/viz/ (no chart deps)",
    ],
    inputs: ["slug: string", "findings: AnalystResult[]", "template?: string"],
    outputs: ["data/reports/{slug}.json", "AgentEnvelope { composed_at, run_archive_hashes, sections_count }"],
    source_files: [
      { path: "app/lib/specialists.ts", description: "callSpecialist router" },
      { path: "agent/specialists/reporter.py", description: "Python composer (in flight)" },
      { path: "app/components/viz/", description: "Inline-SVG viz library" },
    ],
    envelope_field: "reporter",
  },
  support: {
    slug: "support",
    label: "Support",
    role: "Disambiguates & helps",
    color: "var(--ds-warm)",
    schedule: "Triggered by orchestrator on vague queries",
    status: "on-demand",
    description: "Lightweight LLM call with no Socrata access. Handles vague geo (\"south austin\"), TXLookup-meta questions, and graceful explanations on agent failure. Returns chip-set follow-ups when scope clarification is needed.",
    how_it_works: [
      "Receives (query, context) via callSpecialist()",
      "Loads catalog metadata + skills/txlookup/SKILL.md as system prompt",
      "Detects vague geographic terms (south austin → 78704/78745/78748)",
      "Returns status: 'completed' | 'needs_input' with next_actions[] chips",
      "On 'needs_input', the UI renders chips at /q for the user to pick scope",
    ],
    inputs: ["query: string", "context: object"],
    outputs: ["AgentEnvelope { status, message, next_actions[] }"],
    source_files: [
      { path: "app/lib/specialists.ts", description: "callSpecialist router" },
      { path: "agent/specialists/support.py", description: "Python disambiguation (in flight)" },
      { path: "app/q/components/SupportChips.tsx", description: "UI for next_actions chips" },
    ],
    envelope_field: "support",
  },
  critic: {
    slug: "critic",
    label: "Critic",
    role: "Self-correction",
    color: "var(--ds-warn)",
    schedule: "After every plan + every answer",
    status: "on-demand",
    description: "A separate LLM role that grades the plan AND the synthesized answer on groundedness, scope match, citation quality, completeness. On reject (approve=false), forces a single corrective revision.",
    how_it_works: [
      "Called by app/lib/agent.ts:criticize() at two hooks: post-plan, post-synth",
      "Returns { score: 0..1, issues: string[], approve: boolean }",
      "On approve=false, the orchestrator re-runs the failed phase ONCE with the critic's issues injected as corrective system prompt",
      "Caps revisions at 1 per phase to bound latency",
      "Emits SSE 'critique' event (score + approve + issues) and 'revising' if revision triggered",
    ],
    inputs: ["plan_or_answer: object", "query: string", "context: object"],
    outputs: ["{ score, issues, approve } + SSE critique/revising events"],
    source_files: [
      { path: "app/lib/agent.ts", description: "criticize() function" },
      { path: "app/api/agent/route.ts", description: "Hooks the critic into the loop" },
    ],
    envelope_field: "critic",
  },
  "dataset-scout": {
    slug: "dataset-scout",
    label: "Dataset Scout",
    role: "Grows the corpus",
    color: "var(--ds-text-dim)",
    schedule: "Cron: 0 */6 * * * (every 6 hours)",
    status: "scheduled",
    description: "Scans Socrata catalog APIs across Austin, Dallas, San Antonio, Houston, and TX state portals. Scores newly-published or recently-updated datasets on quality (row count, temporal column, geographic column, freshness). Files GitHub issues with suggested catalog entries + 4 sample questions for human curation.",
    how_it_works: [
      "GitHub Actions workflow .github/workflows/dataset-scout.yml fires on cron",
      "Hits /api/views.json on each portal with $where=updatedAt > last_seen",
      "For each candidate: probes /api/views/{id}.json for schema",
      "Computes quality score: row count > 1000, has time + geo cols, < 30d freshness, license clarity",
      "Top-N candidates above threshold → opens GitHub issue with metadata + suggested catalog entry",
      "Updates data/scout/last_seen.json and commits via github-actions[bot]",
    ],
    inputs: ["portals: string[] (configurable)", "since: datetime (last_seen)"],
    outputs: ["GitHub issues with label scout-find", "data/scout/last_seen.json updates"],
    source_files: [
      { path: "agent/specialists/dataset_scout.py", description: "Python scout (in flight)" },
      { path: ".github/workflows/dataset-scout.yml", description: "6h cron" },
      { path: "data/scout/last_seen.json", description: "State file" },
    ],
    envelope_field: "dataset_scout",
  },
  ingestor: {
    slug: "ingestor",
    label: "Ingestor",
    role: "Local cache curator",
    color: "var(--ds-good)",
    schedule: "Cron: 0 */6 * * * (every 6 hours, offset from scout)",
    status: "scheduled",
    description: "Pulls deltas from each catalog dataset into a local SQLite cache. Enables cross-dataset SQL JOINs that Socrata's SoQL can't express. Surfaces source pill (cache | live | cache-fallback) on every tool envelope so the user/judge can see provenance.",
    how_it_works: [
      "Reads catalog from app/lib/catalog.ts",
      "For each dataset, paginated SODA pulls (limit 1000, $offset) since last_ingested",
      "UPSERTs into data/cache.db keyed on dataset primary key",
      "Updates data/cache_meta.json with timestamp + row count + schema hash",
      "Writes back to repo via github-actions[bot] commit (dev mode also supports manual run)",
      "Tool calls in app/lib/socrata.ts try cache first; fall through to live with cache-fallback pill",
    ],
    inputs: ["dataset_id: string | --all", "since?: datetime"],
    outputs: ["data/cache.db updates", "data/cache_meta.json", "Optional GitHub commit"],
    source_files: [
      { path: "agent/specialists/ingestor.py", description: "Python ingestor (in flight)" },
      { path: ".github/workflows/ingestor.yml", description: "6h cron" },
      { path: "app/lib/cache.ts", description: "sql.js reader" },
    ],
    envelope_field: "ingestor",
  },
};

export async function generateStaticParams() {
  return Object.keys(AGENTS).map((slug) => ({ name: slug }));
}

type Props = { params: { name: string } };

export async function generateMetadata({ params }: Props) {
  const a = AGENTS[params.name];
  if (!a) return { title: "Unknown agent — TXLookup" };
  return {
    title: `${a.label} — TXLookup agent`,
    description: a.description,
  };
}

export default async function AgentDetailPage({ params }: Props) {
  const agent = AGENTS[params.name];
  if (!agent) notFound();

  // Fetch recent runs and filter to those that involved this agent
  let allRuns: SavedRun[] = [];
  try {
    allRuns = await listRuns(50);
  } catch {
    allRuns = [];
  }
  const runs = agent.envelope_field
    ? allRuns
        .filter((r) =>
          (r.events as Array<{ agent?: string; phase?: string }> | undefined)?.some(
            (e) => e?.agent === agent.envelope_field || (agent.envelope_field === "orchestrator" && e?.phase === "planning"),
          ),
        )
        .slice(0, 12)
    : allRuns.slice(0, 12);

  return (
    <Shell active="/agents">
      {/* Hero */}
      <section
        className="border-b border-[var(--ds-border)]"
        style={{
          backgroundImage: `radial-gradient(circle at 80% 30%, ${agent.color}1A 0%, transparent 55%)`,
        }}
      >
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-10 md:py-16">
          <div className="mb-6">
            <Link
              href="/agents"
              className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-mute)] hover:text-[var(--ds-text)]"
            >
              ← All agents
            </Link>
          </div>
          <h1 className="max-w-[24ch] text-4xl font-bold leading-[1.05] tracking-tight text-[var(--ds-text)] md:text-6xl">
            <span className="font-display-serif font-normal">{agent.label}</span>
          </h1>
          <p className="mt-3 font-mono text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: agent.color }}>
            {agent.role}
          </p>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-[var(--ds-text-mute)] md:text-lg">{agent.description}</p>
          <div className="mt-6 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
            <span className="rounded-sm border border-[var(--ds-border-strong)] px-3 py-1 text-[var(--ds-text-mute)]">{agent.schedule}</span>
            <span className="rounded-sm border px-3 py-1" style={{ borderColor: agent.color, color: agent.color }}>
              {agent.status}
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-10 md:py-16">
          <h2 className="text-2xl font-bold text-[var(--ds-text)] md:text-3xl">
            What this agent actually does,{" "}
            <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">step by step.</span>
          </h2>
          <ol className="mt-8 space-y-4">
            {agent.how_it_works.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="font-mono text-sm font-bold tabular-nums text-[var(--ds-warn)] min-w-[2rem]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-base leading-relaxed text-[var(--ds-text)]">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* I/O contract */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-10 md:py-16">
          <h2 className="text-2xl font-bold text-[var(--ds-text)] md:text-3xl">
            Inputs &amp;{" "}
            <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">outputs.</span>
          </h2>
          <div className="mt-8 grid gap-px bg-[var(--ds-border)] md:grid-cols-2">
            <div className="bg-[var(--ds-bg-elev)] p-6">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-warn)]">Inputs</p>
              <ul className="mt-3 space-y-2">
                {agent.inputs.map((x, i) => (
                  <li key={i} className="font-mono text-[12px] text-[var(--ds-text)]">
                    · {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[var(--ds-bg-elev)] p-6">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-warn)]">Outputs</p>
              <ul className="mt-3 space-y-2">
                {agent.outputs.map((x, i) => (
                  <li key={i} className="font-mono text-[12px] text-[var(--ds-text)]">
                    · {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Source files */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-10 md:py-16">
          <h2 className="text-2xl font-bold text-[var(--ds-text)] md:text-3xl">
            Where this agent lives{" "}
            <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">in the codebase.</span>
          </h2>
          <div className="mt-8 divide-y divide-[var(--ds-border)] overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
            {agent.source_files.map((f) => (
              <div key={f.path} className="grid gap-2 p-4 md:grid-cols-[280px_1fr]">
                <a
                  href={`https://github.com/ATX-TXLookup/TXLookup/blob/main/${f.path}`}
                  className="font-mono text-[12px] font-semibold text-[var(--ds-warm)] hover:text-[var(--ds-text)] hover:underline"
                >
                  {f.path}
                </a>
                <p className="text-sm text-[var(--ds-text-mute)]">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent runs */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-10 md:py-16">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-bold text-[var(--ds-text)] md:text-3xl">
              Last {runs.length} runs{" "}
              <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">that touched this agent.</span>
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
              auto-refresh 60s
            </p>
          </div>
          <div className="mt-8 overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
            {runs.length === 0 ? (
              <div className="px-6 py-12 text-center font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                No recent runs touched {agent.label} yet.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--ds-border)]">
                {runs.map((r) => (
                  <li key={r.hash} className="grid gap-4 px-6 py-4 md:grid-cols-[100px_1fr_120px]">
                    <p className="font-mono text-[10px] tabular-nums text-[var(--ds-text-dim)]">
                      {new Date(r.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--ds-text)] line-clamp-1">{r.query}</p>
                      <p className="mt-1 font-mono text-[11px] text-[var(--ds-text-mute)]">
                        {(r.events as unknown[] | undefined)?.length ?? 0} events ·{" "}
                        {(r.citation as { dataset_id?: string } | null)?.dataset_id ?? "no citation"}
                      </p>
                    </div>
                    <Link
                      href={`/admin/replay/${r.hash}`}
                      className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ds-warm)] hover:text-[var(--ds-text)]"
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
