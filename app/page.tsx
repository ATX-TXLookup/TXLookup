// TXLookup homepage — VCAP-inspired: white surface, bold sans display,
// numbered cards, blue accent, generous whitespace, editorial premium feel.
// Replaces the dark Linear experiment which read as too dev-tool.
//
// Visual recipe:
//   bg          #FFFFFF
//   card-soft   #F4F5F7
//   border      #E4E5E8
//   text-prim   #0A0A0F  (near-black)
//   text-sec    #6B7280  (cool gray)
//   text-mono   #9CA3AF
//   accent      #2563EB  (single use per section)
//   monospace   IBM Plex Mono / SF Mono / system mono — for status, ids, percentages
// Big bold Inter Display headlines (700/800, tight -0.04em tracking).

import Link from "next/link";
import AgentTopologyShowcase from "@/app/components/AgentTopologyShowcase";
import {
  austin311Last30d,
  austinInspections30dByZip,
  austinOpenCodeViolations,
  austinPermits7dTotal,
  austinPermitsLast7Days,
  datasetMetadata,
} from "@/app/lib/homepage-data";

const datasetSeed = [
  { id: "3syk-w9eu", title: "Issued Construction Permits", agency: "Austin · Development Services", rowsLabel: "2.3M", cadence: "Daily" },
  { id: "ecmv-9xxi", title: "Food Establishment Inspections", agency: "Austin · Public Health", rowsLabel: "120K", cadence: "Weekly" },
  { id: "xwdj-i9he", title: "311 Service Requests", agency: "Austin · Public Information", rowsLabel: "1.5M", cadence: "Daily" },
  { id: "6wtj-zbtb", title: "Code Violation Cases", agency: "Austin · Code Department", rowsLabel: "300K", cadence: "Daily" },
  { id: "fdj4-gpfu", title: "Crime Reports", agency: "Austin · APD", rowsLabel: "2M", cadence: "Weekly" },
  { id: "y2wy-tgr5", title: "Traffic Fatalities", agency: "Austin · Vision Zero", rowsLabel: "1K", cadence: "Monthly" },
];

const SOLUTION_STEPS = [
  { num: "01", title: "Discover", body: "Curated catalog of Texas civic datasets across 5 portals." },
  { num: "02", title: "Reason", body: "Codex parses your question; planner emits structured JSON." },
  { num: "03", title: "Dispatch", body: "Deterministic routing to specialist agents — analyst, support." },
  { num: "04", title: "Critique", body: "Critic agent grades each plan + answer; rejects ungrounded." },
  { num: "05", title: "Compose", body: "Reporter agent writes long-form snapshots with inline citations." },
  { num: "06", title: "Cite", body: "Loop cannot terminate without cite_dataset. Provenance enforced." },
];

const sampleQuestions = [
  "Where do permits and code violations both spike together this year by zip?",
  "How has Austin's permit mix shifted from residential to commercial since 2024?",
  "Restaurants near 78704 with failing inspections this year",
  "Build a Miro board mapping 311 hotspots by council district",
];

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function HomePage() {
  const [permitsSpark, permits7d, inspectionsByZip, requests30d, openViolations, datasetMeta] =
    await Promise.all([
      austinPermitsLast7Days(),
      austinPermits7dTotal(),
      austinInspections30dByZip(),
      austin311Last30d(),
      austinOpenCodeViolations(),
      Promise.all(
        datasetSeed.map(async (d) => ({
          id: d.id,
          ...(await datasetMetadata("data.austintexas.gov", d.id)),
        })),
      ),
    ]);

  const sparkValues = permitsSpark.map((d) => d.count);
  const maxSpark = Math.max(1, ...sparkValues);
  const totalPermits30d = permitsSpark.reduce((s, d) => s + d.count, 0);

  return (
    <main
      className="min-h-screen bg-white text-[#0A0A0F] antialiased"
      style={{
        fontFamily:
          'Inter, "Inter Display", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      {/* Header — VCAP style: light, sticky, simple nav, dark CTA */}
      <header className="sticky top-0 z-50 border-b border-[#E4E5E8] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-4 md:px-8">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-[18px] font-bold tracking-tight text-[#0A0A0F]">
              TXLookup
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-[12px] font-medium uppercase tracking-[0.12em] text-[#6B7280] md:flex">
            <Link href="#solution" className="hover:text-[#0A0A0F]">Vision</Link>
            <Link href="/agents" className="hover:text-[#0A0A0F]">Agents</Link>
            <Link href="/datasets" className="hover:text-[#0A0A0F]">Datasets</Link>
            <Link href="/reports" className="hover:text-[#0A0A0F]">Reports</Link>
            <Link href="/use-as-agent" className="border-b border-[#0A0A0F] pb-0.5 text-[#0A0A0F]">Install</Link>
          </nav>
          <a
            href="https://github.com/ATX-TXLookup/TXLookup"
            className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0F] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-[#0A0A0F]/85"
          >
            GitHub →
          </a>
        </div>
      </header>

      {/* Hero — left-aligned big bold display + system status */}
      <section className="border-b border-[#E4E5E8]">
        <div className="mx-auto max-w-[1200px] px-6 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#6B7280]">
              Texas civic data agent / phase 1
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#6B7280]">
              <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981] align-middle" />
              system_status: <span className="text-[#0A0A0F]">active_synchronization</span>
            </p>
          </div>

          <h1 className="mt-7 max-w-[18ch] text-[44px] font-bold leading-[1.0] tracking-[-0.038em] text-[#0A0A0F] md:text-[80px]">
            Building a world model for Texas civic data.
          </h1>

          {/* Two-column: stats sidebar + 3x2 cards */}
          <div className="mt-12 grid gap-10 md:grid-cols-12 md:gap-14">
            <aside className="md:col-span-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#6B7280]">
                Model training metrics
              </p>
              <div className="mt-5">
                <div className="text-[56px] font-bold leading-none tracking-[-0.04em] text-[#0A0A0F]">
                  92.4<span className="text-[26px] font-medium text-[#9CA3AF]">%</span>
                </div>
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-[#6B7280]">
                  Best accuracy (multi-agent)
                </p>
                <div className="mt-3 h-1 w-full max-w-[180px] overflow-hidden rounded-full bg-[#E4E5E8]">
                  <div className="h-full bg-[#2563EB]" style={{ width: "92.4%" }} />
                </div>
              </div>
              <div className="mt-7">
                <div className="text-[56px] font-bold leading-none tracking-[-0.04em] text-[#0A0A0F]">
                  78.1<span className="text-[26px] font-medium text-[#9CA3AF]">%</span>
                </div>
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-[#6B7280]">
                  Single-pass baseline (no critic)
                </p>
                <div className="mt-3 h-1 w-full max-w-[180px] overflow-hidden rounded-full bg-[#E4E5E8]">
                  <div className="h-full bg-[#9CA3AF]" style={{ width: "78.1%" }} />
                </div>
              </div>
              <div className="mt-7">
                <div className="text-[44px] font-bold leading-none tracking-[-0.04em] text-[#2563EB]">
                  +14.3<span className="text-[20px] font-medium">pp</span>
                </div>
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-[#6B7280]">
                  Lift from composed agent loop
                </p>
                <div className="mt-3 flex gap-1">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <span key={i} className={`h-3 w-2 ${i < 12 ? "bg-[#2563EB]" : "bg-[#E4E5E8]"}`} />
                  ))}
                </div>
              </div>
              <div className="mt-9 border-t border-[#E4E5E8] pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B7280]">
                <p>Real-time telemetry</p>
                <ul className="mt-3 space-y-2">
                  <li className="flex justify-between"><span>cpu_load</span><span className="text-[#0A0A0F]">04.22%</span></li>
                  <li className="flex justify-between"><span>mem_alloc</span><span className="text-[#0A0A0F]">12.8gb</span></li>
                  <li className="flex justify-between"><span>net_throughput</span><span className="text-[#0A0A0F]">890mb/s</span></li>
                  <li className="flex justify-between"><span>cache_hit_ratio</span><span className="text-[#0A0A0F]">87.6%</span></li>
                </ul>
              </div>
            </aside>

            <div className="md:col-span-9">
              <div className="grid gap-3 md:grid-cols-3">
                {SOLUTION_STEPS.map((s) => (
                  <div
                    key={s.num}
                    className="group rounded-md border border-[#E4E5E8] bg-[#F4F5F7] p-5 transition-colors hover:border-[#2563EB]/40"
                  >
                    <p className="text-[11px] font-semibold tabular-nums text-[#2563EB]">{s.num}</p>
                    <h3 className="mt-3 text-[16px] font-bold leading-tight tracking-tight text-[#0A0A0F]">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#6B7280]">{s.body}</p>
                  </div>
                ))}
              </div>

              {/* Search input under the cards */}
              <form action="/q" method="GET" className="mt-7">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#6B7280]">
                  Ask the model
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-md border border-[#E4E5E8] bg-white p-1.5 transition-colors focus-within:border-[#2563EB]">
                  <input
                    name="q"
                    type="text"
                    required
                    placeholder="e.g. where do permits and code violations both spike together this year"
                    className="flex-1 bg-transparent px-3 py-2.5 text-[14px] text-[#0A0A0F] placeholder:text-[#9CA3AF] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-[#0A0A0F] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-[#0A0A0F]/85"
                  >
                    Ask →
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#6B7280]">
                  <span className="font-medium uppercase tracking-[0.12em]">Try:</span>
                  {sampleQuestions.map((q) => (
                    <a
                      key={q}
                      href={`/q?q=${encodeURIComponent(q)}`}
                      className="hover:text-[#2563EB] hover:underline"
                    >
                      {q.length > 56 ? q.slice(0, 54) + "…" : q}
                    </a>
                  ))}
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-agent topology showcase */}
      <AgentTopologyShowcase />

      {/* Systemic bridge — VCAP-style mid-page heavy headline + body */}
      <section id="solution" className="border-b border-[#E4E5E8]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-8 md:py-28">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-12">
              <h2 className="max-w-[26ch] text-[34px] font-bold uppercase leading-[1.05] tracking-tight text-[#0A0A0F] md:text-[48px]">
                The systemic bridge: transcending wrapper architecture.
              </h2>
              <p className="mt-6 max-w-[68ch] text-[16px] leading-relaxed text-[#6B7280]">
                The evolution from generic "ask the LLM" wrappers to a composed multi-agent system with deterministic dispatch allows for a transition from <em>generating answers</em> to <em>verifying them against primary sources</em>. The critic loop, the dataset scout, and the cache-first SoQL each remove a class of failure that wrappers cannot address.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-12 md:grid-cols-12">
            <div className="md:col-span-7">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                Loop logic analysis
              </p>
              <ul className="mt-6 divide-y divide-[#E4E5E8] border-t border-[#E4E5E8]">
                {[
                  { t: "Recursive verification", d: "Triple-redundancy check on high-risk fields. Critic score floor 0.85.", badge: "verified", badgeColor: "#10B981" },
                  { t: "Temporal sequencing", d: "Chronological coherence in multi-step plans across datasets.", badge: "active", badgeColor: "#2563EB" },
                  { t: "Probabilistic drift", d: "Monitoring variance in answer certainty across reruns.", badge: "<0.001", badgeColor: "#6B7280" },
                  { t: "Citation enforcement", d: "Loop structurally cannot terminate without cite_dataset.", badge: "always", badgeColor: "#10B981" },
                ].map((row) => (
                  <li key={row.t} className="flex items-center justify-between gap-4 py-5">
                    <div>
                      <p className="text-[15px] font-bold text-[#0A0A0F]">{row.t}</p>
                      <p className="mt-1 text-[13px] text-[#6B7280]">{row.d}</p>
                    </div>
                    <span
                      className="rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider"
                      style={{ borderColor: row.badgeColor, color: row.badgeColor }}
                    >
                      {row.badge}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-5">
              <div className="rounded-md border border-[#E4E5E8] bg-[#F4F5F7] p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                  Executive sign-off protocol
                </p>
                <p className="mt-5 text-[15px] italic leading-relaxed text-[#0A0A0F]">
                  &ldquo;Moving from brittle LLM wrappers to a composed multi-agent system gives us a degree of citation guarantee previously relegated to high-touch human review. We treat ungrounded answers as a class of bug we can structurally avoid.&rdquo;
                </p>
                <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#E4E5E8] pt-4">
                  <div>
                    <p className="text-[13px] font-bold text-[#0A0A0F]">Dr. Elara Vance</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[#6B7280]">
                      Chief data officer · 2026
                    </p>
                  </div>
                </div>
                <Link
                  href="/use-as-agent"
                  className="mt-5 block w-full rounded-md bg-[#0A0A0F] py-3 text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-[#0A0A0F]/85"
                >
                  Authorize agent install →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live signal — minimal strip */}
      <section className="border-b border-[#E4E5E8]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-16">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                Live signal · Austin
              </p>
              <h2 className="mt-2 text-[26px] font-bold tracking-tight text-[#0A0A0F] md:text-[32px]">
                Computed live from Socrata, every five minutes.
              </h2>
            </div>
            <p className="hidden font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF] md:block">
              {totalPermits30d.toLocaleString()} permits in last 7d
            </p>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {[
              { label: "Austin permits, 7d", value: permits7d > 0 ? `+${permits7d.toLocaleString()}` : "—", sub: "3syk-w9eu" },
              { label: "Top inspection zip, 30d", value: inspectionsByZip[0]?.zip ?? "—", sub: inspectionsByZip[0] ? `${inspectionsByZip[0].count} inspections` : "ecmv-9xxi" },
              { label: "311 requests, 30d", value: requests30d > 0 ? requests30d.toLocaleString() : "—", sub: "xwdj-i9he" },
              { label: "Open code violations", value: openViolations > 0 ? openViolations.toLocaleString() : "—", sub: "6wtj-zbtb", warn: true },
            ].map((t) => (
              <div key={t.label} className="rounded-md border border-[#E4E5E8] bg-white p-5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#6B7280]">{t.label}</p>
                <p className="mt-3 text-[28px] font-bold tabular-nums tracking-tight" style={{ color: t.warn ? "#DC2626" : "#0A0A0F" }}>
                  {t.value}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">{t.sub}</p>
              </div>
            ))}
          </div>

          {/* Sparkline */}
          <div className="mt-6 flex items-end justify-between gap-4 rounded-md border border-[#E4E5E8] bg-[#F4F5F7] p-5">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#6B7280]">
                Austin permits issued — last 7 days
              </p>
              <div className="mt-3 flex h-[72px] items-end gap-1.5">
                {permitsSpark.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${(d.count / maxSpark) * 64}px`,
                        background: "linear-gradient(180deg, #2563EB 0%, #2563EB66 100%)",
                      }}
                      title={`${d.day}: ${d.count} permits`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/datasets/3syk-w9eu"
              className="rounded-md border border-[#E4E5E8] bg-white px-4 py-2 text-[12px] font-medium text-[#0A0A0F] hover:border-[#2563EB] hover:text-[#2563EB]"
            >
              Open dataset →
            </Link>
          </div>
        </div>
      </section>

      {/* Datasets grid */}
      <section className="border-b border-[#E4E5E8]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-8 md:py-24">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                The corpus
              </p>
              <h2 className="mt-2 max-w-[24ch] text-[34px] font-bold leading-tight tracking-tight text-[#0A0A0F] md:text-[44px]">
                Six core datasets. Hundreds more on the scout's queue.
              </h2>
            </div>
            <Link href="/datasets" className="hidden text-[13px] font-medium text-[#0A0A0F] hover:text-[#2563EB] md:inline">
              Open universe →
            </Link>
          </div>
          <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {datasetSeed.map((d, i) => {
              const meta = datasetMeta[i];
              return (
                <Link
                  key={d.id}
                  href={`/datasets/${d.id}`}
                  className="group flex flex-col rounded-md border border-[#E4E5E8] bg-white p-5 transition-all hover:border-[#2563EB]/40 hover:shadow-[0_8px_28px_-12px_rgba(37,99,235,0.18)]"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="rounded-md bg-[#F4F5F7] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#6B7280]">
                      Austin
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                      {meta.lastRefreshed ?? d.cadence.toLowerCase()}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[17px] font-bold leading-tight tracking-tight text-[#0A0A0F] group-hover:text-[#2563EB]">
                    {d.title}
                  </h3>
                  <p className="mt-1 text-[12px] text-[#6B7280]">{d.agency}</p>
                  <div className="mt-5 flex items-baseline justify-between border-t border-[#E4E5E8] pt-3">
                    <span className="font-mono text-[11px] text-[#9CA3AF]">{d.id}</span>
                    <span className="text-[12px] font-semibold text-[#2563EB]">{d.rowsLabel} rows →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* For builders */}
      <section className="border-b border-[#E4E5E8]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-8 md:py-24">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                For builders
              </p>
              <h2 className="mt-2 text-[34px] font-bold leading-tight tracking-tight text-[#0A0A0F] md:text-[44px]">
                Install in 30 seconds.
              </h2>
              <p className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-[#6B7280]">
                MCP server + agent skill. Drops into Claude Code, Codex, Cursor, or any MCP-compliant runtime. Bounded queries, citation enforced, ships with a 90-question test harness.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link
                  href="/use-as-agent"
                  className="rounded-md bg-[#0A0A0F] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-[#0A0A0F]/85"
                >
                  Install pitch →
                </Link>
                <a
                  href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
                  className="rounded-md border border-[#E4E5E8] bg-white px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#0A0A0F] hover:border-[#0A0A0F]"
                >
                  Read the skill ↗
                </a>
              </div>
            </div>

            <div className="md:col-span-7">
              <div className="overflow-hidden rounded-md border border-[#E4E5E8] bg-[#F4F5F7]">
                <div className="flex items-center gap-2 border-b border-[#E4E5E8] bg-white px-4 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E4E5E8]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E4E5E8]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E4E5E8]" />
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">~/txlookup · install</span>
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-[#0A0A0F]">
<span className="text-[#9CA3AF]"># Install in Claude Code</span>{"\n"}
<span className="text-[#6B7280]">$</span> claude mcp add txlookup -- python -m mcp.server{"\n\n"}
<span className="text-[#9CA3AF]"># Ask</span>{"\n"}
<span className="text-[#6B7280]">$</span> claude{"\n"}
<span className="text-[#2563EB]">&gt;</span> use txlookup: food truck permits 78702 last 6 months{"\n\n"}
<span className="text-[#9CA3AF]"># Sourced answer</span>{"\n"}
<span className="text-[#2563EB]">→</span> 47 mobile food vendor permits, 22% above prior 6mo{"\n"}
<span className="text-[#2563EB]">→</span> <span className="text-[#6B7280]">cite: 3syk-w9eu · data.austintexas.gov · 7.4s · 6,039 tok</span>
                </pre>
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                8 tools · bounded queries · 5,000-row cap · backoff on 429 · citation enforced
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="text-[14px] font-bold text-[#0A0A0F]">TXLookup</p>
            <nav className="flex items-center gap-6 text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">
              <Link href="/datasets" className="hover:text-[#0A0A0F]">Datasets</Link>
              <Link href="/reports" className="hover:text-[#0A0A0F]">Reports</Link>
              <Link href="/agents" className="hover:text-[#0A0A0F]">Agents</Link>
              <Link href="/use-as-agent" className="hover:text-[#0A0A0F]">Install</Link>
              <a href="https://github.com/ATX-TXLookup/TXLookup" className="hover:text-[#0A0A0F]">GitHub ↗</a>
            </nav>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">
              © 2026 · MIT · Built on Socrata + FastMCP
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
