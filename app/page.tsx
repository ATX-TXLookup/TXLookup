// TXLookup homepage — tight + information-dense, per the Stitch reference
// at projects/13098355225907638818?node-id=2e1b48b70ac6468187d90b4ade491a86.
//
// Sections (tightened):
//   1. Hero — compact headline + search + topic-chip nav (5 topics)
//   2. Topic icon grid — 6 categories, 1-line each
//   3. Map + multi-city tickers (side-by-side, single row)
//   4. Featured report inline (article + chart)
//   5. Multi-agent topology (existing)
//   6. Bring-your-own-portal universality (3-step, compact)
//   7. Install (split: terminal + minimal copy)

import Link from "next/link";
import AgentTopologyShowcase from "@/app/components/AgentTopologyShowcase";
import { HeroTexasMap } from "@/app/components/HeroTexasMap";
import { Shell, TerminalBlock } from "@/app/components/ds";
import { HomeHero } from "@/app/components/HomeHero";
import { DataSourceBadge } from "@/app/components/ds/DataSourceBadge";
import { loadDiscovery } from "@/app/lib/catalog-discovered";
import { listRuns, type SavedRun } from "@/app/lib/run-archive";
import { CATALOG } from "@/app/lib/catalog";

const CATALOG_LENGTH = CATALOG.length;
import {
  austin311Last30d,
  austinInspections30dByZip,
  austinOpenCodeViolations,
  austinPermits7dTotal,
  austinPermitsLast7Days,
  dallas311Last30d,
  dallasPoliceActiveCalls,
  texasFranchisePermitsActive,
} from "@/app/lib/homepage-data";

export const dynamic = "force-dynamic";
export const revalidate = 300;


export default async function HomePage() {
  const [
    permitsSparkRes,
    permits7dRes,
    inspectionsByZipRes,
    requests30dRes,
    openViolationsRes,
    dallas311Res,
    dallasActiveCallsRes,
    txFranchiseRes,
    discovery,
  ] = await Promise.all([
    austinPermitsLast7Days(),
    austinPermits7dTotal(),
    austinInspections30dByZip(),
    austin311Last30d(),
    austinOpenCodeViolations(),
    dallas311Last30d(),
    dallasPoliceActiveCalls(),
    texasFranchisePermitsActive(),
    loadDiscovery(),
  ]);

  // Pull 6 cached lookups to feature. Curation matters here — the
  // raw archive is full of failed runs, null results, and near-duplicate
  // QA queries. Quality gate:
  //   - drop bad-status + zero-duration
  //   - drop answers that signal failure or an empty result
  //   - require a real number in the answer (an actual finding)
  //   - require a substantive answer length
  //   - dedupe by dataset so it's not 4 rows of the same source
  //   - prefer answers with more concrete numbers (denser findings)
  const FAILURE_SIGNALS = [
    "does not include",
    "cannot be completed",
    "data provided does not",
    "ran into a problem",
    "couldn't recover",
    "could not recover",
    "i tried to answer",
    "there have been no",
    "there are no",
    "no data",
    "not available",
    "unable to",
    "insufficient",
  ];
  const numberDensity = (s: string) => (s.match(/[0-9][0-9,]{2,}/g) ?? []).length;
  const datasetOf = (r: SavedRun): string => {
    for (const ev of (r.events ?? []) as Array<Record<string, unknown>>) {
      if (ev.phase === "executing" && ev.args && typeof ev.args === "object") {
        const d = (ev.args as Record<string, unknown>).datasetId;
        if (typeof d === "string") return d;
      }
    }
    return "";
  };
  const allRunsForFeature = await listRuns(200);
  const featuredRuns = (() => {
    const candidates = allRunsForFeature
      .filter((r) => {
        if (r.status === "bad" || !r.answer || r.durationMs <= 0) return false;
        const low = r.answer.toLowerCase();
        if (FAILURE_SIGNALS.some((s) => low.includes(s))) return false;
        if (r.answer.trim().length < 80) return false;
        if (numberDensity(r.answer) < 1) return false;
        return true;
      })
      .sort((a, b) => numberDensity(b.answer) - numberDensity(a.answer));
    // Dedupe by dataset — one strong run per source.
    const seen = new Set<string>();
    const picked: SavedRun[] = [];
    for (const r of candidates) {
      const ds = datasetOf(r);
      if (ds && seen.has(ds)) continue;
      if (ds) seen.add(ds);
      picked.push(r);
      if (picked.length === 6) break;
    }
    return picked;
  })();

  // Unwrap StatResult shape into legacy plain values for the renderer below.
  const permitsSpark = permitsSparkRes.value ?? [];
  const permits7d = permits7dRes.value ?? 0;
  const inspectionsByZip = inspectionsByZipRes.value ?? [];
  const requests30d = requests30dRes.value ?? 0;
  const openViolations = openViolationsRes.value ?? 0;
  const dallas311 = dallas311Res.value ?? 0;
  const dallasActiveCalls = dallasActiveCallsRes.value ?? 0;
  const txFranchise = txFranchiseRes.value ?? 0;

  // Per-tile freshness — used for the "Local mirror · Nh ago" badge.
  const tileMeta: Record<string, { source: string; age_seconds: number | null }> = {
    "ecmv-9xxi": { source: inspectionsByZipRes.source, age_seconds: inspectionsByZipRes.age_seconds },
    "gc4d-8a49": { source: dallas311Res.source, age_seconds: dallas311Res.age_seconds },
    "9cir-efmm": { source: txFranchiseRes.source, age_seconds: txFranchiseRes.age_seconds },
    "xwdj-i9he": { source: requests30dRes.source, age_seconds: requests30dRes.age_seconds },
    "9fxf-t2tr": { source: dallasActiveCallsRes.source, age_seconds: dallasActiveCallsRes.age_seconds },
    "6wtj-zbtb": { source: openViolationsRes.source, age_seconds: openViolationsRes.age_seconds },
    "3syk-w9eu": { source: permits7dRes.source, age_seconds: permits7dRes.age_seconds },
  };

  return (
    <Shell active="/">
      <HomeHero datasetCount={discovery.totalKnown} />

      {/* AGENT INSIGHTS — compact: top cached lookups as cards */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-8 md:py-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
                Agent insights
              </p>
              <p className="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-[var(--ds-text-mute)]">
                Pulled from public records, written by the agents. Click any card to watch the work.
              </p>
            </div>
            <Link
              href="/q"
              className="hidden md:inline-flex shrink-0 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ds-text)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
            >
              All lookups →
            </Link>
          </div>

          {/* Cards tease — the question carries it, the meta row proves it
              ran. The full finding lives behind the click, not on the card. */}
          <ul className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {featuredRuns.map((r) => {
              const events = (r.events ?? []) as Array<Record<string, unknown>>;
              let dsId: string | null = null;
              for (const ev of events) {
                if (ev.phase === "executing" && ev.args && typeof ev.args === "object") {
                  const d = (ev.args as Record<string, unknown>).datasetId;
                  if (typeof d === "string") { dsId = d; break; }
                }
              }
              return (
                <li key={r.hash}>
                  <Link
                    href={`/q?q=${encodeURIComponent(r.query)}`}
                    className="flex h-full flex-col rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-5 transition-colors hover:border-[var(--ds-accent)]"
                  >
                    <h3 className="text-[16px] font-semibold leading-snug text-[var(--ds-text)]">
                      {r.query}
                    </h3>
                    <div className="mt-auto flex items-baseline gap-3 pt-5 font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                      {dsId && <span className="text-[var(--ds-accent)]">{dsId}</span>}
                      <span>{(r.durationMs / 1000).toFixed(1)}s</span>
                      <span>{r.tokenTotal.toLocaleString()} tok</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link href="/q" className="mt-6 inline-flex text-[13px] text-[var(--ds-accent)] hover:underline md:hidden">All lookups →</Link>
        </div>
      </section>

      {/* LIVE ACROSS TEXAS — multi-city pulse, real numbers right now.
          Dropped the SQLite/mirror jargon; section now reads as a "see it
          moving" snapshot of the major Texas cities + state. */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-8 md:py-14">
          <div className="grid gap-10 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-5">
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-good)]">
                Live across Texas
              </p>
              <h2 className="mt-2 max-w-[20ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-white md:text-[44px]">
                Austin. Dallas. San Antonio. Houston. The state.
              </h2>
              <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                Live from 6 portals · refreshed on load
              </p>
              <HeroTexasMap />
            </div>

            <div className="md:col-span-7">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { label: "Austin · top inspection zip · 30d", value: inspectionsByZip[0]?.zip ?? "—", sub: inspectionsByZip[0] ? `${inspectionsByZip[0].count} inspections` : "ecmv-9xxi", tone: "warm" },
                  { label: "Dallas · 311 requests · 30d", value: dallas311 > 0 ? dallas311.toLocaleString() : "—", sub: "gc4d-8a49", tone: "purple" },
                  { label: "TX · active franchise permits", value: txFranchise > 0 ? txFranchise.toLocaleString() : "—", sub: "9cir-efmm", tone: "good" },
                  { label: "Austin · 311 requests · 30d", value: requests30d > 0 ? requests30d.toLocaleString() : "—", sub: "xwdj-i9he", tone: "neutral" },
                  { label: "Dallas · police active calls", value: dallasActiveCalls > 0 ? dallasActiveCalls.toLocaleString() : "—", sub: "9fxf-t2tr", tone: "neutral" },
                  { label: "Austin · open code violations", value: openViolations > 0 ? openViolations.toLocaleString() : "—", sub: "6wtj-zbtb", tone: openViolations > 5000 ? "bad" : "neutral" },
                ].map((t) => {
                  const colorMap: Record<string, string> = {
                    warm: "var(--ds-warm)",
                    purple: "var(--ds-purple)",
                    good: "var(--ds-good)",
                    bad: "var(--ds-bad)",
                    neutral: "var(--ds-text)",
                  };
                  // City color-code: Austin orange, Dallas purple, TX/state green,
                  // San Antonio blue, Houston red. Read from the label prefix.
                  const cityPrefix = t.label.split(" · ")[0] || "";
                  const cityColorMap: Record<string, string> = {
                    Austin: "var(--ds-warm)",
                    Dallas: "var(--ds-purple)",
                    TX: "var(--ds-good)",
                    "San Antonio": "var(--ds-accent)",
                    Houston: "var(--ds-bad)",
                  };
                  const cityColor = cityColorMap[cityPrefix] ?? "var(--ds-text-dim)";
                  const labelRest = t.label.slice(cityPrefix.length);
                  const meta = tileMeta[t.sub];
                  return (
                    <div
                      key={t.label}
                      className="overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]"
                    >
                      <div className="flex">
                        <span
                          aria-hidden
                          className="w-1 shrink-0"
                          style={{ background: cityColor }}
                        />
                        <div className="flex-1 p-4">
                          <p className="ds-eyebrow text-[var(--ds-text-dim)]">
                            <span className="font-semibold" style={{ color: cityColor }}>{cityPrefix}</span>
                            <span>{labelRest}</span>
                          </p>
                          <p
                            className="mt-2 text-[24px] font-semibold tabular-nums tracking-tight"
                            style={{ color: colorMap[t.tone] }}
                          >
                            {t.value}
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                              {t.sub}
                            </p>
                            {meta && (
                              <DataSourceBadge source={meta.source} ageSeconds={meta.age_seconds} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sparkline — Austin permits 7d, smaller */}
              <div className="mt-3 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4">
                <div className="flex items-baseline justify-between">
                  <p className="ds-eyebrow text-[var(--ds-text-dim)]">Austin permits · 7-day pulse</p>
                  <p className="text-[14px] font-semibold tabular-nums text-[var(--ds-text)]">
                    {permits7d > 0 ? `+${permits7d.toLocaleString()}` : "—"}
                  </p>
                </div>
                <div className="mt-3 flex h-[44px] items-end gap-1.5">
                  {permitsSpark.length > 0 ? (
                    permitsSpark.map((d) => {
                      const max = Math.max(1, ...permitsSpark.map((x) => x.count));
                      return (
                        <div key={d.day} className="flex flex-1 flex-col items-center justify-end">
                          <div
                            className="w-full rounded-sm"
                            style={{
                              height: `${(d.count / max) * 38}px`,
                              background: "linear-gradient(180deg, var(--ds-accent) 0%, rgba(91,141,239,0.3) 100%)",
                            }}
                            title={`${d.day}: ${d.count}`}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-[var(--ds-text-mute)]">live data unavailable</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MULTI-AGENT TOPOLOGY */}
      <AgentTopologyShowcase />

      {/* INSTALL — split, compact */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-8 md:py-14">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--ds-accent)]">
                Use as agent
              </p>
              <h2 className="mt-2 max-w-[18ch] text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[40px]">
                Install in 30 seconds.
              </h2>
              <p className="mt-3 max-w-[36ch] text-[13.5px] leading-relaxed text-[var(--ds-text-mute)]">
                MCP server + agent skill. Drops into Claude Code, Codex, Cursor. Bounded queries, citation enforced.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/use-as-agent"
                  className="rounded-md bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-bg)] hover:opacity-90"
                >
                  Install pitch →
                </Link>
                <a
                  href="https://github.com/ATX-TXLookup/TXLookup"
                  className="rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-text)] hover:border-[var(--ds-text-dim)]"
                >
                  GitHub ↗
                </a>
              </div>
            </div>
            <div className="md:col-span-8">
              <TerminalBlock title="~/txlookup · install" tone="good">
{`# 1. install in claude code
$ claude mcp add txlookup -- python -m mcp.server

# 2. ask
$ claude
> use txlookup: food truck permits 78702 last 6 months

# 3. answer with citation
→ count by month, % change vs prior 6mo
→ cite: dataset_id · portal_url · age_seconds`}
              </TerminalBlock>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                8 tools · 5,000-row cap · 30s timeout · backoff on 429 · citation enforced
              </p>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
