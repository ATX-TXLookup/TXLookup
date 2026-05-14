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
import { FeatureCard, Shell, TerminalBlock } from "@/app/components/ds";
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

const TOPICS = [
  { num: "01", key: "housing",   label: "Housing & Permits",  blurb: "Construction, zoning, code enforcement.",     primaryDataset: "3syk-w9eu", count: "2.3M permits" },
  { num: "02", key: "safety",    label: "Public Safety",      blurb: "Crime reports, traffic fatalities, 311.",     primaryDataset: "fdj4-gpfu", count: "2M+ incidents" },
  { num: "03", key: "health",    label: "Public Health",      blurb: "Restaurant inspections, food-safety scoring.", primaryDataset: "ecmv-9xxi", count: "120K inspections" },
  { num: "04", key: "transit",   label: "Transportation",     blurb: "Vision Zero, road incidents, mobility data.",  primaryDataset: "y2wy-tgr5", count: "1K+ fatal crashes" },
  { num: "05", key: "civic",     label: "311 & Code",         blurb: "Service requests, code violations, response.", primaryDataset: "xwdj-i9he", count: "1.5M requests" },
  { num: "06", key: "economy",   label: "Economy & Business", blurb: "Franchise tax, mixed beverage, expenditures.", primaryDataset: "9cir-efmm", count: "3M+ permits" },
];

const SAMPLES = [
  "Where do permits and code violations both spike together this year by zip?",
  "How has Austin's permit mix shifted from residential to commercial since 2024?",
  "Restaurants near 78704 with failing inspections this year",
  "Build a Miro board mapping 311 hotspots by council district",
];

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

  // Pull top 6 cached investigations to feature on the homepage (post-mortem:
  // investigation as the unit of work). Drop bad-status runs + ones without
  // a real answer / duration.
  const featuredRuns = (await listRuns(50))
    .filter((r) => r.status !== "bad" && r.answer && r.durationMs > 0)
    .slice(0, 6);

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
      {/* HERO — tight: headline left, search right; subtle Texas map backdrop */}
      <section className="relative overflow-hidden border-b border-[var(--ds-border)]">
        <div className="relative mx-auto max-w-[1240px] px-6 py-12 md:px-8 md:py-16">
          <div className="grid items-start gap-8 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-6">
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
                For curious Texans, journalists, and city staff
              </p>
              <h1 className="mt-4 max-w-[14ch] text-[44px] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--ds-text)] md:text-[88px]">
                Look up Texas.
              </h1>
              <p className="mt-6 max-w-[60ch] text-[17px] leading-[1.6] text-[var(--ds-text-mute)] md:text-[18px]">
                The records are public. The <span className="text-[var(--ds-text)]">{discovery.totalKnown.toLocaleString()} spreadsheets</span> they live in aren&rsquo;t. Ask who&rsquo;s on the city payroll, which restaurants failed inspection, where the permits piled up. We find the answer in seconds and <span className="text-[var(--ds-text)]">show you exactly where it came from</span>.
              </p>
            </div>
            <div className="md:col-span-6 md:-mx-2">
              <HeroTexasMap />
            </div>
            <div className="md:col-span-12">
              <form action="/q" method="GET" className="mt-8">
                <div className="flex items-stretch gap-2 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-2 transition-colors focus-within:border-[var(--ds-accent)]">
                  <input
                    name="q"
                    type="text"
                    required
                    autoFocus
                    placeholder="Try: who got the biggest city contract last year?"
                    className="flex-1 bg-transparent px-3 py-3 text-[15.5px] leading-tight text-[var(--ds-text)] placeholder:text-[var(--ds-text-dim)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-white px-6 text-[14px] font-semibold text-[var(--ds-bg)] hover:opacity-90"
                  >
                    Ask
                  </button>
                </div>
              </form>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-[var(--ds-text-dim)]">Or try:</span>
                {SAMPLES.slice(0, 3).map((q) => (
                  <a
                    key={q}
                    href={`/q?q=${encodeURIComponent(q)}`}
                    className="rounded-full border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-3 py-1.5 text-[13px] text-[var(--ds-text-mute)] transition-colors hover:border-[var(--ds-accent)] hover:text-[var(--ds-text)]"
                  >
                    {q}
                  </a>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 text-[13px] text-[var(--ds-text-mute)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ds-good)]" />
                <span>Live across {discovery.totalKnown.toLocaleString()} Texas datasets right now</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED INVESTIGATIONS — the post-mortem "investigation as the
          unit of work" lesson on the homepage. Pulls top cached lookups
          and shows them as headline + finding + dataset + replay link. */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1240px] px-6 py-14 md:px-8 md:py-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
                Featured investigations
              </p>
              <h2 className="mt-3 max-w-[26ch] text-[34px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
                Questions we&apos;ve already answered.
              </h2>
              <p className="mt-3 max-w-[60ch] text-[14.5px] leading-relaxed text-[var(--ds-text-mute)]">
                Click any card to watch the agent run end-to-end — same UI a live query produces, replayed from the saved trace.
              </p>
            </div>
            <Link
              href="/q"
              className="hidden md:inline-flex shrink-0 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ds-text)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
            >
              All lookups →
            </Link>
          </div>

          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredRuns.map((r) => {
              const finding = (r.answer || "").split(/\n\n+/)[0]?.slice(0, 180) ?? "";
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
                    {finding && (
                      <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[var(--ds-text-mute)]">
                        {finding}
                      </p>
                    )}
                    <div className="mt-4 flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                      {dsId && <span className="text-[var(--ds-accent)]">{dsId}</span>}
                      <span>{(r.durationMs / 1000).toFixed(1)}s</span>
                      <span>{r.tokenTotal.toLocaleString()} tok</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-[var(--ds-text-dim)]">
            <span>Source classes: <span className="text-[var(--ds-good)]">authoritative</span> · <span className="text-[var(--ds-warm)]">modeled</span> · <span className="text-[var(--ds-accent)]">community</span></span>
            <Link href="/q" className="text-[var(--ds-accent)] hover:underline md:hidden">All lookups →</Link>
          </div>
        </div>
      </section>

      {/* MOTIVATION — the problem the agent solves */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1240px] px-6 py-14 md:px-8 md:py-20">
          <div className="grid gap-10 md:grid-cols-12 md:gap-14">
            <div className="md:col-span-5">
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
                The motivation
              </p>
              <h2 className="mt-3 max-w-[18ch] text-[36px] font-bold leading-[1.08] tracking-[-0.025em] text-[var(--ds-text)] md:text-[52px]">
                Texas publishes everything.
                <br />
                <span className="text-[var(--ds-text-mute)]">Hard to navigate, until now.</span>
              </h2>
              <p className="mt-5 max-w-[48ch] text-[15.5px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
                The state and its cities run six open-data portals. Together they expose <span className="font-semibold text-[var(--ds-text)]">{discovery.totalKnown.toLocaleString()} datasets</span> covering permits, inspections, 311 calls, code violations, traffic fatalities, franchise tax, contracts, library checkouts — millions of rows refreshed daily. All of it public. To use it directly you have to write SoQL by hand against six different APIs.
              </p>
            </div>

            <div className="md:col-span-7">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  {
                    eyebrow: "Six portals",
                    n: String(discovery.portals.length || 6),
                    nLabel: "different APIs",
                    body: "Austin runs Socrata. San Antonio runs CKAN. Houston runs CKAN. Dallas runs Socrata. Different IDs, different conventions, different filters.",
                    tone: "var(--ds-accent)",
                  },
                  {
                    eyebrow: "Schema drift",
                    n: "180+",
                    nLabel: "columns just for permits",
                    body: "Each dataset has its own column names, types, code values. permittype vs work_class vs permit_class_mapped — same idea, three columns, three meanings.",
                    tone: "var(--ds-warn)",
                  },
                  {
                    eyebrow: "SoQL syntax",
                    n: "Brutal",
                    nLabel: "to hand-write",
                    body: "$select, $where, $group, $order, $limit, date_extract_y, double-quoting strings, escaping single quotes. One typo and the whole query 400s.",
                    tone: "var(--ds-bad)",
                  },
                  {
                    eyebrow: "Download + sift",
                    n: "Hours",
                    nLabel: "of CSV manual review",
                    body: "The current path: download a 200,000-row CSV, open it in a spreadsheet, filter by hand, hope you didn't miss a column. Most people give up before getting to an answer.",
                    tone: "var(--ds-purple)",
                  },
                ].map((f) => (
                  <div
                    key={f.eyebrow}
                    className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5"
                  >
                    <p
                      className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: f.tone }}
                    >
                      {f.eyebrow}
                    </p>
                    <p
                      className="mt-3 text-[28px] font-bold leading-none tabular-nums tracking-[-0.02em] md:text-[36px]"
                      style={{ color: f.tone }}
                    >
                      {f.n}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                      {f.nLabel}
                    </p>
                    <p className="mt-3 text-[13px] leading-relaxed text-[var(--ds-text-mute)]">
                      {f.body}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-6 max-w-[64ch] text-[15px] leading-relaxed text-[var(--ds-text)]">
                <span className="font-semibold text-[var(--ds-warm)]">A team of OpenAI-powered agents stands between you and {discovery.totalKnown.toLocaleString()} datasets.</span>{" "}
                <span className="text-[var(--ds-text-mute)]">If you can search Google or read a news article, you can ask Texas civic data anything. The planner picks the dataset; the analyst writes the SoQL; the reporter composes the answer; the critic verifies citations. Same data the experts use — now reachable in plain English.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT PEOPLE ASK — varied auto-click question chips, grouped by domain */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1240px] px-6 py-14 md:px-8 md:py-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
                What people ask
              </p>
              <h2 className="mt-3 max-w-[24ch] text-[34px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
                Pick a question. Skip the typing.
              </h2>
              <p className="mt-3 max-w-[60ch] text-[14.5px] leading-relaxed text-[var(--ds-text-mute)]">
                Click anything below — the agent answers in 7 seconds with a citation. No login, no setup, no SoQL.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                eyebrow: "Housing",
                tone: "var(--ds-accent)",
                qs: [
                  "Where do construction permits cluster in Austin in the last 30 days?",
                  "How has Austin's permit mix shifted from residential to commercial since 2024?",
                  "Top 5 zips by permit count, last 12 months",
                ],
              },
              {
                eyebrow: "Public health",
                tone: "var(--ds-good)",
                qs: [
                  "Restaurants near 78704 with failing inspections this year",
                  "Repeat-offender restaurants by address last 12 months",
                  "Average inspection score by zip — best and worst 5",
                ],
              },
              {
                eyebrow: "311 + code",
                tone: "var(--ds-warm)",
                qs: [
                  "Top 311 complaint types in Austin last month",
                  "Open code violations in 78745",
                  "Where do permits and code violations spike together by zip?",
                ],
              },
              {
                eyebrow: "Compare cities",
                tone: "var(--ds-purple)",
                qs: [
                  "Compare 311 volume between Austin and Dallas last month",
                  "Which Texas city has the most active franchise tax holders?",
                  "How does Houston's open-data catalog compare to Austin's?",
                ],
              },
              {
                eyebrow: "Trends + outliers",
                tone: "var(--ds-bad)",
                qs: [
                  "Most-improved restaurants over the last 2 years",
                  "Which zip is heating up fastest by composite Heat Index?",
                  "Top 5 outliers in permit valuation this year",
                ],
              },
              {
                eyebrow: "Meta · ask the system",
                tone: "var(--ds-text-mute)",
                qs: [
                  "What datasets do you have for Dallas?",
                  "How does the agent loop work end-to-end?",
                  "What does permit_class_mapped mean?",
                ],
              },
            ].map((g) => (
              <div
                key={g.eyebrow}
                className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5"
              >
                <p
                  className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: g.tone }}
                >
                  {g.eyebrow}
                </p>
                <ul className="mt-4 space-y-2">
                  {g.qs.map((q) => (
                    <li key={q}>
                      <a
                        href={`/q?q=${encodeURIComponent(q)}`}
                        className="group flex items-start justify-between gap-3 rounded border border-[var(--ds-border)] bg-[var(--ds-bg)] px-3.5 py-2.5 text-[13.5px] leading-snug text-[var(--ds-text)] transition-colors hover:border-[var(--ds-purple)] hover:bg-[var(--ds-bg-elev)]"
                      >
                        <span>{q}</span>
                        <span
                          className="shrink-0 font-mono text-[11px] opacity-50 transition-opacity group-hover:opacity-100"
                          style={{ color: g.tone }}
                          aria-hidden
                        >
                          →
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bridge to /chat for the conversational surface */}
          <div className="mt-8 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
                  Conversational
                </p>
                <p className="mt-2 max-w-[48ch] text-[14.5px] leading-relaxed text-[var(--ds-text-mute)]">
                  Want to chat about the data instead? <Link href="/chat" className="text-[var(--ds-text)] underline decoration-[var(--ds-purple)] underline-offset-4 hover:text-[var(--ds-purple)]">Open <code className="font-mono text-[12.5px]">/chat</code></Link> — same agent, multi-turn. Ask what we have, what a column means, which dataset fits.
                </p>
              </div>
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-bg)] hover:opacity-90"
              >
                Open chat →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TOPIC GRID — numbered, larger, links to dataset detail pages */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1240px] px-6 py-14 md:px-8 md:py-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-text-dim)]">
                Browse by topic
              </p>
              <h2 className="mt-3 max-w-[20ch] text-[38px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[52px]">
                Six domains, hundreds of datasets.
              </h2>
            </div>
            <Link href="/datasets" className="hidden md:inline-flex items-center font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--ds-accent)] hover:text-[var(--ds-text)]">
              All datasets →
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((t) => (
              <Link
                key={t.key}
                href={`/datasets/${t.primaryDataset}`}
                className="group flex flex-col rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-6 transition-colors hover:border-[var(--ds-accent)]/50"
              >
                <p className="font-mono text-[18px] font-bold tabular-nums text-[var(--ds-accent)]">
                  {t.num}
                </p>
                <h3 className="mt-3 text-[20px] font-bold tracking-tight text-[var(--ds-text)]">
                  {t.label}
                </h3>
                <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[var(--ds-text-mute)]">
                  {t.blurb}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-[var(--ds-border)] pt-3 font-mono text-[11px] uppercase tracking-wider">
                  <span className="text-[var(--ds-text-dim)]">{t.count}</span>
                  <span className="text-[var(--ds-accent)] group-hover:text-[var(--ds-text)]">
                    Open →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* MAP + MULTI-CITY LIVE — side by side, single row */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1240px] px-6 py-12 md:px-8 md:py-16">
          <div className="grid gap-10 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-5">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--ds-good)]">
                Local mirror · refreshed every 6h
              </p>
              <h2 className="mt-2 max-w-[20ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
                9 curated, locally mirrored.{" "}
                <span className="text-[var(--ds-text-mute)]">The other {(discovery.totalKnown - 9).toLocaleString()} answered live.</span>
              </h2>
              <p className="mt-4 max-w-[44ch] text-[14px] leading-relaxed text-[var(--ds-text-mute)]">
                The 9 datasets behind these tiles are mirrored to a local SQLite store every 6 hours by an autonomous ingestor cron. Pages render from the mirror in milliseconds and survive upstream throttling. The remaining {discovery.totalKnown.toLocaleString() }-dataset catalog across {discovery.portals.length} portals is queried on demand — each tile shows a freshness badge so the source is never ambiguous.
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
                  const meta = tileMeta[t.sub];
                  return (
                    <div key={t.label} className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4">
                      <p className="ds-eyebrow text-[var(--ds-text-dim)]">{t.label}</p>
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

      {/* BRING YOUR OWN PORTAL — compact 3-card */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1240px] px-6 py-12 md:px-8 md:py-16">
          <div className="grid items-end gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--ds-good)]">
                The selling point
              </p>
              <h2 className="mt-2 max-w-[20ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
                Any dataset. Any portal.{" "}
                <span className="text-[var(--ds-text-mute)]">Knowledge in 24 hours.</span>
              </h2>
              <p className="mt-4 max-w-[40ch] text-[14px] leading-relaxed text-[var(--ds-text-mute)]">
                The scout + ingestor + multi-agent loop is portable. Texas is the demo corpus — the same pipeline ingests Chicago, NYC, federal data.gov, anywhere with a Socrata-compatible API.
              </p>
            </div>
            <div className="md:col-span-7">
              <div className="grid gap-2 md:grid-cols-3">
                <FeatureCard
                  tone="accent"
                  icon={<span className="text-[14px]">▷</span>}
                  title="1. Point at portal"
                  body="Open an issue. The scout's next 6h tick discovers every dataset, scores it, and proposes a catalog entry."
                  href="https://github.com/ATX-TXLookup/TXLookup/issues/new?labels=area%3Adata%2Cdataset-request&title=Add+portal%3A+"
                  ctaLabel="File a portal request →"
                />
                <FeatureCard
                  tone="purple"
                  icon={<span className="text-[14px]">⌽</span>}
                  title="2. Ingestor populates"
                  body="The ingestor cron pulls deltas into a local SQLite cache so cross-dataset SQL JOINs work that Socrata SoQL can't."
                  href="/agents/ingestor"
                  ctaLabel="See the ingestor →"
                />
                <FeatureCard
                  tone="warm"
                  icon={<span className="text-[14px]">⌖</span>}
                  title="3. Anyone asks"
                  body="Type a question. Orchestrator dispatches. Critic rejects ungrounded. Reporter composes. Citation enforced."
                  href="/q"
                  ctaLabel="Try a question →"
                />
              </div>
              <div className="mt-3 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ds-good)]">
                    Scout queue
                  </span>
                  <span className="font-mono text-[11px] text-[var(--ds-text-mute)]">
                    San Antonio · Houston · El Paso · data.gov (federal pilot)
                  </span>
                  <Link href="/agents/dataset-scout" className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ds-good)] hover:text-[var(--ds-text)]">
                    watch →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INSTALL — split, compact */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1240px] px-6 py-12 md:px-8 md:py-16">
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
