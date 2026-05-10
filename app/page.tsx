// TXLookup homepage — tool-first, not marketing-first.
// Lead with the input. Below it: live data, live agent activity, real datasets,
// real install command. No fake stats, no fake exec quotes, no vision copy.
// Dark surface, blue accent, generous whitespace, fast scan.

import Link from "next/link";
import AgentTopologyShowcase from "@/app/components/AgentTopologyShowcase";
import { listRuns } from "@/app/lib/run-archive";
import {
  austin311Last30d,
  austinInspections30dByZip,
  austinOpenCodeViolations,
  austinPermits7dTotal,
  austinPermitsLast7Days,
  datasetMetadata,
} from "@/app/lib/homepage-data";

const datasetSeed = [
  { id: "3syk-w9eu", title: "Issued Construction Permits", agency: "Austin · Development Services", rowsLabel: "2.3M", cadence: "daily" },
  { id: "ecmv-9xxi", title: "Food Establishment Inspections", agency: "Austin · Public Health", rowsLabel: "120K", cadence: "weekly" },
  { id: "xwdj-i9he", title: "311 Service Requests", agency: "Austin · Public Information", rowsLabel: "1.5M", cadence: "daily" },
  { id: "6wtj-zbtb", title: "Code Violation Cases", agency: "Austin · Code Department", rowsLabel: "300K", cadence: "daily" },
  { id: "fdj4-gpfu", title: "Crime Reports", agency: "Austin · APD", rowsLabel: "2M", cadence: "weekly" },
  { id: "y2wy-tgr5", title: "Traffic Fatalities", agency: "Austin · Vision Zero", rowsLabel: "1K", cadence: "monthly" },
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
  const [permitsSpark, permits7d, inspectionsByZip, requests30d, openViolations, datasetMeta, recentRuns] =
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
      listRuns(8).catch(() => []),
    ]);

  const sparkValues = permitsSpark.map((d) => d.count);
  const maxSpark = Math.max(1, ...sparkValues);

  return (
    <main
      className="min-h-screen bg-[#0A0A0F] text-[#FAFAFA] antialiased"
      style={{
        fontFamily:
          'Inter, "Inter Display", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#27272A] bg-[#0A0A0F]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-3.5 md:px-8">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-[16px] font-bold tracking-tight text-[#FAFAFA]">TXLookup</span>
            <span className="hidden font-mono text-[10px] uppercase tracking-wider text-[#71717A] md:inline">v0.1</span>
          </Link>
          <nav className="hidden items-center gap-6 text-[12px] text-[#A1A1AA] md:flex">
            <Link href="/agents" className="hover:text-[#FAFAFA]">Agents</Link>
            <Link href="/datasets" className="hover:text-[#FAFAFA]">Datasets</Link>
            <Link href="/reports" className="hover:text-[#FAFAFA]">Reports</Link>
            <Link href="/use-as-agent" className="hover:text-[#FAFAFA]">Install</Link>
            <a href="https://github.com/ATX-TXLookup/TXLookup" className="hover:text-[#FAFAFA]">GitHub ↗</a>
          </nav>
        </div>
      </header>

      {/* Tool — search at the top, no marketing pitch */}
      <section className="border-b border-[#27272A]">
        <div className="mx-auto max-w-[920px] px-6 py-12 md:px-8 md:py-16">
          <div className="flex items-center gap-2 text-[11px] text-[#71717A]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
            <span className="font-mono uppercase tracking-wider">agent online · 7 specialists active · 9 datasets</span>
          </div>
          <h1 className="mt-4 text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-[#FAFAFA] md:text-[36px]">
            Ask Texas civic data.
          </h1>
          <form action="/q" method="GET" className="mt-5">
            <div className="flex items-center gap-2 rounded-md border border-[#27272A] bg-[#16161B] p-1.5 transition-colors focus-within:border-[#5B8DEF]">
              <input
                name="q"
                type="text"
                required
                autoFocus
                placeholder="permits and code violations both spiking by zip this year"
                className="flex-1 bg-transparent px-3 py-2.5 text-[15px] text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-[#FAFAFA] px-4 py-2 text-[13px] font-semibold text-[#0A0A0F] hover:bg-[#FAFAFA]/90"
              >
                Run
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px]">
              <span className="font-mono uppercase tracking-wider text-[#71717A]">try</span>
              {sampleQuestions.map((q) => (
                <a
                  key={q}
                  href={`/q?q=${encodeURIComponent(q)}`}
                  className="rounded-full border border-[#27272A] bg-[#16161B] px-3 py-1 text-[#A1A1AA] hover:border-[#5B8DEF]/40 hover:text-[#FAFAFA]"
                >
                  {q.length > 56 ? q.slice(0, 54) + "…" : q}
                </a>
              ))}
            </div>
          </form>
        </div>
      </section>

      {/* Live signal — actual numbers, no pitch */}
      <section className="border-b border-[#27272A]">
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:px-8 md:py-12">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#71717A]">
              live · austin · recomputed every 5m
            </p>
            <Link href="/datasets" className="text-[12px] text-[#A1A1AA] hover:text-[#FAFAFA]">
              all datasets →
            </Link>
          </div>
          <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-[#27272A] bg-[#27272A] md:grid-cols-4">
            {[
              { label: "permits, 7d", value: permits7d > 0 ? `+${permits7d.toLocaleString()}` : "—", sub: "3syk-w9eu" },
              { label: "top inspection zip, 30d", value: inspectionsByZip[0]?.zip ?? "—", sub: inspectionsByZip[0] ? `${inspectionsByZip[0].count} inspections` : "ecmv-9xxi" },
              { label: "311 requests, 30d", value: requests30d > 0 ? requests30d.toLocaleString() : "—", sub: "xwdj-i9he" },
              { label: "open code violations", value: openViolations > 0 ? openViolations.toLocaleString() : "—", sub: "6wtj-zbtb", warn: true },
            ].map((t) => (
              <div key={t.label} className="bg-[#0E0E13] px-5 py-5">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">{t.label}</div>
                <div
                  className="mt-2 text-[26px] font-semibold tabular-nums tracking-tight"
                  style={{ color: t.warn ? "#F59E0B" : "#FAFAFA" }}
                >
                  {t.value}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#52525B]">{t.sub}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-end justify-between gap-4 rounded-md border border-[#27272A] bg-[#0E0E13] p-4">
            <div className="flex-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">austin permits — last 7 days</p>
              <div className="mt-3 flex h-[64px] items-end gap-1.5">
                {permitsSpark.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${(d.count / maxSpark) * 56}px`,
                        background: "linear-gradient(180deg, #5B8DEF 0%, #5B8DEF55 100%)",
                      }}
                      title={`${d.day}: ${d.count}`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/datasets/3syk-w9eu"
              className="rounded-md border border-[#27272A] px-3 py-1.5 text-[11px] text-[#A1A1AA] hover:border-[#5B8DEF]/40 hover:text-[#FAFAFA]"
            >
              dataset →
            </Link>
          </div>
        </div>
      </section>

      {/* Recent agent runs — actual proof of work, not vision copy */}
      {recentRuns.length > 0 && (
        <section className="border-b border-[#27272A]">
          <div className="mx-auto max-w-[1200px] px-6 py-10 md:px-8 md:py-12">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5B8DEF]">recent runs</p>
                <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-[#FAFAFA]">What the agents have actually done</h2>
              </div>
              <Link href="/agents" className="text-[12px] text-[#A1A1AA] hover:text-[#FAFAFA]">
                ops center →
              </Link>
            </div>
            <ul className="mt-5 divide-y divide-[#27272A] overflow-hidden rounded-md border border-[#27272A] bg-[#0E0E13]">
              {recentRuns.slice(0, 6).map((r) => (
                <li key={r.hash} className="grid items-baseline gap-4 px-5 py-3 md:grid-cols-[80px_1fr_140px_80px]">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                    {new Date(r.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="line-clamp-1 text-[13px] text-[#FAFAFA]">{r.query}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#A1A1AA]">
                    {(r.events as unknown[] | undefined)?.length ?? 0} events ·{" "}
                    {(r.citation as { dataset_id?: string } | null)?.dataset_id ?? "—"}
                  </span>
                  <Link
                    href={`/admin/replay/${r.hash}`}
                    className="text-right text-[11px] text-[#5B8DEF] hover:text-[#FAFAFA]"
                  >
                    replay →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Multi-agent topology — animated diagram of a real run */}
      <AgentTopologyShowcase />

      {/* Datasets — the corpus, no marketing */}
      <section className="border-b border-[#27272A]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5B8DEF]">corpus</p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-[#FAFAFA]">9 datasets in catalog · 6 most-queried</h2>
            </div>
            <Link href="/datasets" className="text-[12px] text-[#A1A1AA] hover:text-[#FAFAFA]">universe →</Link>
          </div>
          <div className="mt-6 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {datasetSeed.map((d, i) => {
              const meta = datasetMeta[i];
              return (
                <Link
                  key={d.id}
                  href={`/datasets/${d.id}`}
                  className="group rounded-md border border-[#27272A] bg-[#0E0E13] p-4 transition-colors hover:border-[#5B8DEF]/40"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">{d.id}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#52525B]">
                      {meta.lastRefreshed ?? d.cadence}
                    </span>
                  </div>
                  <h3 className="mt-3 text-[14px] font-semibold leading-tight text-[#FAFAFA] group-hover:text-[#5B8DEF]">{d.title}</h3>
                  <p className="mt-0.5 text-[11px] text-[#71717A]">{d.agency}</p>
                  <p className="mt-3 font-mono text-[11px] text-[#A1A1AA]">{d.rowsLabel} rows</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Install — actual command, not a pitch */}
      <section className="border-b border-[#27272A]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5B8DEF]">install</p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-[#FAFAFA]">
                Use TXLookup as your agent's MCP server
              </h2>
              <p className="mt-3 text-[13px] text-[#A1A1AA]">
                8 tools. Bounded queries. Citation enforced. Drops into Claude Code, Codex, Cursor.
              </p>
              <Link
                href="/use-as-agent"
                className="mt-4 inline-flex items-center text-[12px] font-medium text-[#5B8DEF] hover:text-[#FAFAFA]"
              >
                full install pitch →
              </Link>
            </div>
            <div className="md:col-span-8">
              <div className="overflow-hidden rounded-md border border-[#27272A] bg-[#0E0E13]">
                <div className="flex items-center gap-2 border-b border-[#27272A] bg-[#16161B] px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-[#27272A]" />
                  <span className="h-2 w-2 rounded-full bg-[#27272A]" />
                  <span className="h-2 w-2 rounded-full bg-[#27272A]" />
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-[#71717A]">~/txlookup</span>
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-[#FAFAFA]">
<span className="text-[#52525B]"># install in claude code</span>{"\n"}
<span className="text-[#71717A]">$</span> claude mcp add txlookup -- python -m mcp.server{"\n\n"}
<span className="text-[#52525B]"># ask</span>{"\n"}
<span className="text-[#71717A]">$</span> claude{"\n"}
<span className="text-[#5B8DEF]">&gt;</span> use txlookup: food truck permits 78702 last 6 months{"\n\n"}
<span className="text-[#52525B]"># sourced answer in 7s</span>{"\n"}
<span className="text-[#10B981]">→</span> 47 mobile food vendor permits, 22% above prior 6mo{"\n"}
<span className="text-[#10B981]">→</span> <span className="text-[#A1A1AA]">cite: 3syk-w9eu · 7.4s · 6,039 tok</span>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer — minimal */}
      <footer>
        <div className="mx-auto max-w-[1200px] px-6 py-8 md:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="text-[12px] text-[#71717A]">TXLookup · MIT · 2026</p>
            <nav className="flex items-center gap-5 text-[11px] text-[#71717A]">
              <Link href="/datasets" className="hover:text-[#FAFAFA]">datasets</Link>
              <Link href="/reports" className="hover:text-[#FAFAFA]">reports</Link>
              <Link href="/agents" className="hover:text-[#FAFAFA]">agents</Link>
              <Link href="/use-as-agent" className="hover:text-[#FAFAFA]">install</Link>
              <a href="https://github.com/ATX-TXLookup/TXLookup" className="hover:text-[#FAFAFA]">github ↗</a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
