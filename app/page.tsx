import Link from "next/link";
import {
  austin311Last30d,
  austinInspections30dByZip,
  austinOpenCodeViolations,
  austinPermits7dTotal,
  austinPermitsLast7Days,
  datasetMetadata,
} from "./lib/homepage-data";

const datasetSeed = [
  {
    id: "3syk-w9eu",
    title: "Issued Construction Permits",
    agency: "Development Services Department",
    portal: "data.austintexas.gov",
    rowsLabel: "2.3M+",
    cadence: "Daily",
    blurb:
      "Every construction permit issued by the City of Austin since the 1980s — type, address, contractor, status, value.",
  },
  {
    id: "ecmv-9xxi",
    title: "Food Establishment Inspections",
    agency: "Austin Public Health",
    portal: "data.austintexas.gov",
    rowsLabel: "120K+",
    cadence: "Weekly",
    blurb:
      "Health-inspection scores and violations for Austin restaurants, food trucks, and grocery stores.",
  },
  {
    id: "xwdj-i9he",
    title: "311 Service Requests",
    agency: "Communications & Public Information",
    portal: "datahub.austintexas.gov",
    rowsLabel: "1.5M+",
    cadence: "Daily",
    blurb:
      "Every non-emergency 311 call logged in Austin — pothole, graffiti, animal services, code complaints.",
  },
  {
    id: "6wtj-zbtb",
    title: "Code Violation Cases",
    agency: "Code Department",
    portal: "data.austintexas.gov",
    rowsLabel: "300K+",
    cadence: "Daily",
    blurb:
      "Open and closed building, zoning, and short-term-rental violations across Austin.",
  },
  {
    id: "fdj4-gpfu",
    title: "Crime Reports",
    agency: "Austin Police Department",
    portal: "data.austintexas.gov",
    rowsLabel: "2M+",
    cadence: "Weekly",
    blurb:
      "Reported crimes by type, location, and time. Case-level data published by APD.",
  },
  {
    id: "y2wy-tgr5",
    title: "Traffic Fatalities",
    agency: "Austin Transportation",
    portal: "data.austintexas.gov",
    rowsLabel: "1K+",
    cadence: "Monthly",
    blurb:
      "Fatal traffic crashes by location, mode, and year. Vision Zero source data.",
  },
];

const sampleQuestions = [
  "Restaurants near 78704 with failing inspections this year",
  "Food truck permits issued in 78702 in the last six months",
  "311 response times across all 10 council districts",
  "Where are construction permits growing fastest by zip?",
];

const topics = [
  { name: "Permits & Building", count: 12 },
  { name: "Public Health", count: 6 },
  { name: "Public Safety", count: 9 },
  { name: "311 & Code", count: 5 },
  { name: "Transportation", count: 7 },
  { name: "Demographics & Housing", count: 4 },
];

// Force dynamic rendering — the homepage hits Socrata at request time, and we
// don't want the build sandbox to prerender it (some calls hang without auth).
export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function HomePage() {
  // Live homepage data — all server-rendered from real Socrata queries at request time.
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
          ...(await datasetMetadata(d.portal, d.id)),
        })),
      ),
    ]);

  const sparkValues = permitsSpark.map((d) => d.count);
  const maxSpark = Math.max(1, ...sparkValues);

  const tickers = [
    {
      label: "Austin permits, 7d",
      value: permits7d > 0 ? `+${permits7d.toLocaleString()}` : "—",
      sub: "live · 3syk-w9eu",
      tone: "navy" as const,
    },
    {
      label: "Top inspection zip, 30d",
      value: inspectionsByZip[0]
        ? `${inspectionsByZip[0].zip} (${inspectionsByZip[0].count})`
        : "—",
      sub: "live · ecmv-9xxi",
      tone: "navy" as const,
    },
    {
      label: "311 requests, 30d",
      value: requests30d > 0 ? requests30d.toLocaleString() : "—",
      sub: "live · xwdj-i9he",
      tone: "navy" as const,
    },
    {
      label: "Open code violations",
      value: openViolations > 0 ? openViolations.toLocaleString() : "—",
      sub: "live · 6wtj-zbtb",
      tone: "warn" as const,
    },
  ];

  return (
    <main className="min-h-screen bg-white text-[#1A1F2A] font-body">
      {/* Top utility bar */}
      <div className="bg-[#0B2545] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-2 text-[13px] md:px-10">
          <span>An open-source agent for Texas public data. Live counts on this page are computed from Socrata at request time.</span>
          <span className="hidden font-mono text-[11px] uppercase tracking-wider text-white/70 md:inline">
            v0.1 · alpha
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-[#1A1F2A]/10 bg-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-5 md:px-10 md:py-6">
          <Link href="/" className="flex items-center gap-3">
            <span aria-hidden="true" className="block h-8 w-8 rounded-sm bg-[#0B2545]" />
            <div className="flex flex-col leading-tight">
              <span className="font-display text-[22px] font-extrabold tracking-tight text-[#0B2545]">
                TXLookup
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#1A1F2A]/55">
                Texas open data · cited
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-7 font-display text-sm font-semibold">
            <Link href="#search" className="hover:text-[#0B5FFF]">
              Search
            </Link>
            <Link href="#datasets" className="hidden hover:text-[#0B5FFF] md:inline">
              Datasets
            </Link>
            <Link href="#topics" className="hidden hover:text-[#0B5FFF] md:inline">
              Topics
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
              className="hidden hover:text-[#0B5FFF] md:inline"
            >
              Use as a tool
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="rounded-sm bg-[#0B2545] px-4 py-2 font-medium text-white hover:bg-[#0B5FFF]"
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section
        id="search"
        className="border-b border-[#1A1F2A]/10 bg-gradient-to-b from-[#F4F6FB] to-white"
      >
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto max-w-[860px] text-center">
            <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
              The Texas Open Data Agent
            </p>
            <h1 className="mt-4 font-display text-[40px] font-black leading-[1.05] tracking-tight text-[#0B2545] md:text-[64px]">
              Ask Texas a question.
              <br />
              <span className="text-[#0B5FFF]">Get the answer with the source attached.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[60ch] text-base leading-relaxed text-[#1A1F2A]/75 md:text-lg">
              TXLookup searches Austin, Dallas, San Antonio, and Houston
              open-data portals — plus state filings — in plain English. Every
              answer cites the source dataset and when it was last refreshed.
            </p>
          </div>

          <form
            action="/q"
            method="GET"
            className="mx-auto mt-10 flex max-w-[820px] gap-2 rounded-md border border-[#1A1F2A]/15 bg-white p-2 shadow-[0_2px_24px_-8px_rgba(11,37,69,0.18)]"
          >
            <label htmlFor="q" className="sr-only">
              Search Texas public data
            </label>
            <input
              id="q"
              name="q"
              type="text"
              required
              placeholder="e.g. restaurants near 78704 with failing inspections this year"
              className="flex-1 rounded-sm bg-white px-4 py-3 text-base text-[#1A1F2A] placeholder:text-[#1A1F2A]/45 focus:outline-none md:text-lg"
            />
            <button
              type="submit"
              className="rounded-sm bg-[#0B5FFF] px-7 py-3 font-display text-base font-semibold text-white hover:bg-[#0B2545] md:text-lg"
            >
              Search
            </button>
          </form>

          <div className="mx-auto mt-5 flex max-w-[820px] flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="font-medium text-[#1A1F2A]/60">Try:</span>
            {sampleQuestions.map((q) => (
              <a
                key={q}
                href={`/q?q=${encodeURIComponent(q)}`}
                className="text-[#0B5FFF] hover:underline"
              >
                {q}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE TICKER + SPARKLINE — server-rendered from real Socrata */}
      <section className="border-b border-[#1A1F2A]/10 bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
              Live · Austin civic data
            </p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
              recomputed every 5 minutes
            </p>
          </div>
          <div className="mt-5 grid gap-px border border-[#1A1F2A]/10 bg-[#1A1F2A]/10 md:grid-cols-4">
            {tickers.map((t) => (
              <div key={t.label} className="bg-white px-5 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#1A1F2A]/55">
                  {t.label}
                </div>
                <div className="mt-2 font-display text-2xl font-extrabold tabular-nums text-[#0B2545]">
                  {t.value}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#1A1F2A]/55">
                  {t.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Sparkline */}
          <div className="mt-6 flex items-end justify-between gap-3">
            <div className="flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#1A1F2A]/55">
                Austin permits issued — last 7 days
              </p>
              <div className="mt-3 flex h-[80px] items-end gap-2 border-b border-[#1A1F2A]/15">
                {permitsSpark.length > 0 ? (
                  permitsSpark.map((d) => (
                    <div key={d.day} className="flex flex-1 flex-col items-center justify-end">
                      <div
                        className="w-full bg-[#0B5FFF]"
                        style={{ height: `${(d.count / maxSpark) * 70}px` }}
                        title={`${d.day}: ${d.count} permits`}
                      />
                    </div>
                  ))
                ) : (
                  <p className="font-mono text-[11px] text-[#1A1F2A]/55">
                    Live data temporarily unavailable. Source remains queryable on the dataset page.
                  </p>
                )}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-[#1A1F2A]/55">
                {permitsSpark.length > 0 && (
                  <>
                    <span>{permitsSpark[0]?.day}</span>
                    <span>{permitsSpark[permitsSpark.length - 1]?.day}</span>
                  </>
                )}
              </div>
            </div>
            <Link
              href="/datasets/3syk-w9eu"
              className="rounded-sm border border-[#0B5FFF]/30 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0B5FFF] hover:border-[#0B5FFF]"
            >
              Browse permits →
            </Link>
          </div>
        </div>
      </section>

      {/* TOPICS */}
      <section id="topics" className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                Browse by topic
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#0B2545] md:text-4xl">
                Pick a subject.
              </h2>
            </div>
            <Link
              href="#datasets"
              className="hidden text-sm font-medium text-[#0B5FFF] hover:underline md:inline"
            >
              See all datasets →
            </Link>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {topics.map((t) => (
              <a
                key={t.name}
                href={`/q?q=${encodeURIComponent(t.name + " in Austin")}`}
                className="group flex flex-col rounded-md border border-[#1A1F2A]/10 bg-white px-4 py-4 transition-colors hover:border-[#0B5FFF] hover:bg-white"
              >
                <span className="font-display text-base font-semibold text-[#0B2545] group-hover:text-[#0B5FFF]">
                  {t.name}
                </span>
                <span className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
                  {t.count} datasets
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* DATASETS — popular grid, with live last-refresh timestamp */}
      <section
        id="datasets"
        className="scroll-mt-24 border-b border-[#1A1F2A]/10 bg-white"
      >
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                Popular datasets
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#0B2545] md:text-4xl">
                What the agent knows about today.
              </h2>
            </div>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/config/datasets.yaml"
              className="hidden text-sm font-medium text-[#0B5FFF] hover:underline md:inline"
            >
              View catalog →
            </a>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {datasetSeed.map((d, i) => {
              const meta = datasetMeta[i];
              return (
                <Link
                  key={d.id}
                  href={`/datasets/${d.id}`}
                  className="group flex flex-col rounded-md border border-[#1A1F2A]/10 bg-white p-6 transition-all hover:border-[#0B5FFF] hover:shadow-[0_8px_24px_-12px_rgba(11,37,69,0.18)]"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="rounded-sm bg-[#0B2545] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
                      Austin
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
                      {meta.lastRefreshed
                        ? `Refreshed ${meta.lastRefreshed}`
                        : `Updated ${d.cadence.toLowerCase()}`}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold leading-tight text-[#0B2545] group-hover:text-[#0B5FFF]">
                    {d.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#1A1F2A]/65">{d.agency}</p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-[#1A1F2A]/80">
                    {d.blurb}
                  </p>
                  <div className="mt-5 flex items-baseline justify-between border-t border-[#1A1F2A]/10 pt-3">
                    <span className="font-mono text-xs text-[#1A1F2A]/55">
                      {d.id}
                    </span>
                    <span className="font-display text-xs font-semibold text-[#0B5FFF]">
                      {d.rowsLabel} rows →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <p className="mt-6 text-sm text-[#1A1F2A]/60">
            Dallas, San Antonio, and Houston portals are queryable via the same
            Socrata client. Datasets being onboarded.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-[#1A1F2A]/10 bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
            How it works
          </p>
          <h2 className="mt-2 max-w-[24ch] font-display text-3xl font-extrabold tracking-tight text-[#0B2545] md:text-4xl">
            Four steps from question to cited answer.
          </h2>

          <div className="mt-10 grid gap-8 md:grid-cols-4">
            {[
              {
                n: "01",
                title: "Reason",
                body: "Codex parses the question and identifies the relevant data domain, geography, and time range.",
              },
              {
                n: "02",
                title: "Plan",
                body: "Codex emits a structured tool sequence — discover, describe, query, summarize, cite.",
              },
              {
                n: "03",
                title: "Tool",
                body: "Bounded SoQL queries run through the TXLookup MCP server against live Socrata endpoints.",
              },
              {
                n: "04",
                title: "Complete",
                body: "Codex synthesizes the records into a plain-English answer with mandatory citation. Replans if a step fails.",
              },
            ].map((s) => (
              <div key={s.n}>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                  Step {s.n}
                </span>
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-[#0B2545]">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1A1F2A]/75">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AGENT BUILDERS */}
      <section className="border-b border-[#1A1F2A]/10 bg-[#0B2545] text-white">
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7BA8FF]">
                For builders
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
                Install TXLookup as a tool.
              </h2>
              <p className="mt-5 max-w-[44ch] text-base leading-relaxed text-white/80">
                The repository ships an MCP server and a portable agent skill.
                Drop them into Claude Code, Codex, or any MCP-compliant runtime
                and your agent gets safe, bounded access to Texas civic data
                with citation enforced.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
                  className="rounded-sm bg-white px-5 py-2.5 font-display text-sm font-semibold text-[#0B2545] hover:bg-[#7BA8FF]"
                >
                  Read docs →
                </a>
                <a
                  href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
                  className="rounded-sm border border-white/30 px-5 py-2.5 font-display text-sm font-semibold text-white hover:border-white"
                >
                  See the skill →
                </a>
              </div>
            </div>

            <div className="md:col-span-7">
              <div className="rounded-md border border-white/15 bg-[#06182F] p-5 font-mono text-xs leading-relaxed text-[#D6E4FF] md:p-7 md:text-sm">
                <p className="text-white/45"># Install in Claude Code</p>
                <p className="mt-1">$ claude mcp add --transport stdio txlookup \</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;"python /path/to/TXLookup/mcp/server.py"</p>
                <p className="mt-5 text-white/45"># Then ask</p>
                <p className="mt-1">$ claude</p>
                <p>&gt; mcp__txlookup__discover_datasets("food trucks 78702")</p>
                <p className="mt-1 text-white">→ 3syk-w9eu (Austin Issued Construction Permits)</p>
                <p className="mt-5 text-white/45">
                  # Five tools: discover · describe · query · summarize · cite
                </p>
              </div>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-white/55">
                Bounded queries · 30s timeout · 5,000-row cap · backoff on 429 · citation enforced
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#06182F] text-white/85">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-14">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="block h-7 w-7 rounded-sm bg-white/85" />
                <span className="font-display text-xl font-extrabold tracking-tight text-white">
                  TXLookup
                </span>
              </div>
              <p className="mt-4 max-w-[42ch] text-sm leading-relaxed">
                An open-source agent for Texas public data. Built on the
                Socrata SODA API, FastMCP, and structured outputs. MIT
                licensed.
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Use it
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <Link href="#search" className="hover:text-white">
                    Search
                  </Link>
                </li>
                <li>
                  <Link href="#datasets" className="hover:text-white">
                    Datasets
                  </Link>
                </li>
                <li>
                  <Link href="#topics" className="hover:text-white">
                    Topics
                  </Link>
                </li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Build
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup"
                    className="hover:text-white"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup/issues"
                    className="hover:text-white"
                  >
                    Issues
                  </a>
                </li>
              </ul>
            </div>
            <div className="md:col-span-3">
              <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Integrate
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
                    className="hover:text-white"
                  >
                    Agent skill (MCP)
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
                    className="hover:text-white"
                  >
                    Integration guide
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-wrap gap-y-2 border-t border-white/10 pt-5 text-[12px] text-white/55">
            <span className="mr-6">All data sourced from public Texas open-data portals.</span>
            <span className="mr-6">Attribution enforced.</span>
            <span>Set in Public Sans + JetBrains Mono · 2026</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
