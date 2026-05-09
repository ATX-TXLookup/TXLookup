// V2 homepage — same structure as v1 (app/page.tsx), brand colors + real SVG logos from BRAND.md.
// Color mapping:  #0B2545 → #0D2340 (navy)  |  #0B5FFF → #C4420A (rust CTA) / #3A7FBE (sky link)
//                 white   → #FAF7F2 (cream)  |  #F4F6FB → #F5E8DF (rust-light warm tone)
//                 #1A1F2A → #1A1510 (ink)    |  #06182F → #07152A (footer dark)
// Fonts: DM Serif Display (headlines) · Syne (UI/body) · IBM Plex Mono (code/labels)

import Link from "next/link";
import Image from "next/image";
import {
  austin311Last30d,
  austinInspections30dByZip,
  austinOpenCodeViolations,
  austinPermits7dTotal,
  austinPermitsLast7Days,
  datasetMetadata,
} from "@/app/lib/homepage-data";

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

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function V2HomePage() {
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
    },
    {
      label: "Top inspection zip, 30d",
      value: inspectionsByZip[0]
        ? `${inspectionsByZip[0].zip} (${inspectionsByZip[0].count})`
        : "—",
      sub: "live · ecmv-9xxi",
    },
    {
      label: "311 requests, 30d",
      value: requests30d > 0 ? requests30d.toLocaleString() : "—",
      sub: "live · xwdj-i9he",
    },
    {
      label: "Open code violations",
      value: openViolations > 0 ? openViolations.toLocaleString() : "—",
      sub: "live · 6wtj-zbtb",
      warn: true,
    },
  ];

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#1A1510] font-body">

      {/* ── Top utility bar ── */}
      <div className="bg-[#0D2340] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-2 text-[13px] md:px-10">
          <span>An open-source agent for Texas public data. Live counts on this page are computed from Socrata at request time.</span>
          <span className="hidden font-mono text-[11px] uppercase tracking-wider text-white/70 md:inline">
            v2 · beta
          </span>
        </div>
      </div>

      {/* ── Header ── */}
      <header className="border-b border-[#1A1510]/10 bg-[#FAF7F2]">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-4 md:px-10 md:py-5">
          <Link href="/v2" className="flex items-center">
            <Image
              src="/txlookup-logo-light.svg"
              alt="TXLookup"
              width={200}
              height={67}
              priority
              className="h-10 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-7 font-display text-sm font-semibold">
            <Link href="#search" className="hover:text-[#C4420A]">
              Search
            </Link>
            <Link href="#datasets" className="hidden hover:text-[#C4420A] md:inline">
              Datasets
            </Link>
            <Link href="#topics" className="hidden hover:text-[#C4420A] md:inline">
              Topics
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
              className="hidden hover:text-[#C4420A] md:inline"
            >
              Use as a tool
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="rounded-sm bg-[#0D2340] px-4 py-2 font-medium text-white hover:bg-[#C4420A]"
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        id="search"
        className="border-b border-[#1A1510]/10"
        style={{
          background: "#0D2340",
          backgroundImage:
            "radial-gradient(circle at 80% 30%, rgba(58,127,190,0.18) 0%, transparent 55%), radial-gradient(circle at 10% 80%, rgba(196,66,10,0.12) 0%, transparent 50%)",
        }}
      >
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto max-w-[860px] text-center">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#3A7FBE]">
              The Texas Open Data Agent
            </p>
            {/* BRAND.md: DM Serif Display 48px white on navy */}
            <h1 className="mt-4 font-display text-[40px] font-normal leading-[1.05] tracking-tight text-[#FAF7F2] md:text-[60px]">
              Ask Texas a question.
              <br />
              <span className="italic text-[#D48B10]">Get the answer with the source attached.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[60ch] text-base leading-relaxed text-[#FAF7F2]/70 md:text-lg">
              TXLookup searches Austin, Dallas, San Antonio, and Houston
              open-data portals — plus state filings — in plain English. Every
              answer cites the source dataset and when it was last refreshed.
            </p>
          </div>

          {/* Search form — BRAND.md: IBM Plex Mono input, navy bg, gold caret, rust CTA */}
          <form
            action="/q"
            method="GET"
            className="mx-auto mt-10 flex max-w-[820px] gap-2 rounded-md p-2"
            style={{
              background: "rgba(13,35,64,0.6)",
              border: "0.5px solid rgba(58,127,190,0.35)",
              boxShadow: "0 2px 24px -8px rgba(13,35,64,0.5)",
              backdropFilter: "blur(8px)",
            }}
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
              className="flex-1 rounded-sm bg-transparent px-4 py-3 font-mono text-base text-[#FAF7F2] placeholder:text-[#FAF7F2]/40 focus:outline-none md:text-lg"
              style={{ caretColor: "#D48B10" }}
            />
            <button
              type="submit"
              className="rounded-sm bg-[#C4420A] px-7 py-3 font-display text-base font-semibold text-white hover:bg-[#A3350A] md:text-lg"
            >
              Search
            </button>
          </form>

          <div className="mx-auto mt-5 flex max-w-[820px] flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="font-medium text-[#FAF7F2]/60">Try:</span>
            {sampleQuestions.map((q) => (
              <a
                key={q}
                href={`/q?q=${encodeURIComponent(q)}`}
                className="text-[#3A7FBE] hover:text-[#D48B10] hover:underline"
              >
                {q}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live ticker + sparkline ── */}
      <section className="border-b border-[#1A1510]/10 bg-[#FAF7F2]">
        <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C4420A]">
              Live · Austin civic data
            </p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#1A1510]/55">
              recomputed every 5 minutes
            </p>
          </div>
          <div className="mt-5 grid gap-px border border-[#1A1510]/10 bg-[#1A1510]/10 md:grid-cols-4">
            {tickers.map((t) => (
              <div key={t.label} className="bg-[#FAF7F2] px-5 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#1A1510]/55">
                  {t.label}
                </div>
                <div
                  className="mt-2 font-display text-2xl font-bold tabular-nums"
                  style={{ color: t.warn ? "#C4420A" : "#0D2340" }}
                >
                  {t.value}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#1A1510]/55">
                  {t.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Sparkline */}
          <div className="mt-6 flex items-end justify-between gap-3">
            <div className="flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#1A1510]/55">
                Austin permits issued — last 7 days
              </p>
              <div className="mt-3 flex h-[80px] items-end gap-2 border-b border-[#1A1510]/15">
                {permitsSpark.length > 0 ? (
                  permitsSpark.map((d) => (
                    <div key={d.day} className="flex flex-1 flex-col items-center justify-end">
                      <div
                        className="w-full bg-[#D48B10]"
                        style={{ height: `${(d.count / maxSpark) * 70}px` }}
                        title={`${d.day}: ${d.count} permits`}
                      />
                    </div>
                  ))
                ) : (
                  <p className="font-mono text-[11px] text-[#1A1510]/55">
                    Live data temporarily unavailable. Source remains queryable on the dataset page.
                  </p>
                )}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-[#1A1510]/55">
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
              className="rounded-sm border border-[#C4420A]/40 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#C4420A] hover:border-[#C4420A]"
            >
              Browse permits →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Topics ── */}
      <section id="topics" className="border-b border-[#1A1510]/10 bg-[#FDF3DC]">
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#C4420A]">
                Browse by topic
              </p>
              <h2 className="mt-2 font-display text-3xl font-normal tracking-tight text-[#0D2340] md:text-4xl">
                Pick a subject.
              </h2>
            </div>
            <Link
              href="#datasets"
              className="hidden text-sm font-medium text-[#C4420A] hover:underline md:inline"
            >
              See all datasets →
            </Link>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {topics.map((t) => (
              <a
                key={t.name}
                href={`/q?q=${encodeURIComponent(t.name + " in Austin")}`}
                className="group flex flex-col rounded-md border border-[#1A1510]/10 bg-[#FAF7F2] px-4 py-4 transition-colors hover:border-[#C4420A]"
              >
                <span className="font-display text-base font-semibold text-[#0D2340] group-hover:text-[#C4420A]">
                  {t.name}
                </span>
                <span className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[#1A1510]/55">
                  {t.count} datasets
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Datasets grid ── */}
      <section id="datasets" className="scroll-mt-24 border-b border-[#1A1510]/10 bg-[#FAF7F2]">
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#C4420A]">
                Popular datasets
              </p>
              <h2 className="mt-2 font-display text-3xl font-normal tracking-tight text-[#0D2340] md:text-4xl">
                What the agent knows about today.
              </h2>
            </div>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/config/datasets.yaml"
              className="hidden text-sm font-medium text-[#C4420A] hover:underline md:inline"
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
                  className="group flex flex-col rounded-md border border-[#1A1510]/10 bg-[#FAF7F2] p-6 transition-all hover:border-[#C4420A] hover:shadow-[0_8px_24px_-12px_rgba(196,66,10,0.18)]"
                >
                  <div className="flex items-baseline justify-between">
                    {/* BRAND.md: gold insight badge */}
                    <span
                      className="rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        background: "#FDF3DC",
                        color: "#D48B10",
                        border: "0.5px solid rgba(212,139,16,0.3)",
                        padding: "3px 10px",
                      }}
                    >
                      Austin
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[#1A1510]/55">
                      {meta.lastRefreshed
                        ? `Refreshed ${meta.lastRefreshed}`
                        : `Updated ${d.cadence.toLowerCase()}`}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-xl font-normal leading-tight text-[#0D2340] group-hover:text-[#C4420A]">
                    {d.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#1A1510]/65">{d.agency}</p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-[#1A1510]/80">
                    {d.blurb}
                  </p>
                  <div className="mt-5 flex items-baseline justify-between border-t border-[#1A1510]/10 pt-3">
                    <span className="font-mono text-xs text-[#1A1510]/55">{d.id}</span>
                    <span className="font-display text-xs font-semibold text-[#C4420A]">
                      {d.rowsLabel} rows →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <p className="mt-6 text-sm text-[#1A1510]/60">
            Dallas, San Antonio, and Houston portals are queryable via the same
            Socrata client. Datasets being onboarded.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-b border-[#1A1510]/10 bg-[#FAF7F2]">
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#C4420A]">
            How it works
          </p>
          <h2 className="mt-2 max-w-[24ch] font-display text-3xl font-normal tracking-tight text-[#0D2340] md:text-4xl">
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
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3A7FBE]">
                  Step {s.n}
                </span>
                <h3 className="mt-3 font-display text-2xl font-normal tracking-tight text-[#0D2340]">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1A1510]/75">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For builders — dark navy section ── */}
      <section className="border-b border-[#1A1510]/10 bg-[#0D2340] text-white">
        <div className="mx-auto max-w-[1320px] px-6 py-14 md:px-10 md:py-20">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#D48B10]">
                For builders
              </p>
              <h2 className="mt-2 font-display text-3xl font-normal leading-tight tracking-tight md:text-4xl">
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
                  className="rounded-sm bg-[#D48B10] px-5 py-2.5 font-display text-sm font-semibold text-[#0D2340] hover:bg-[#B8770D]"
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
              <div
                className="rounded-md p-5 font-mono text-xs leading-relaxed md:p-7 md:text-sm"
                style={{
                  background: "#07152A",
                  border: "0.5px solid rgba(58,127,190,0.2)",
                  color: "#DFF0FA",
                }}
              >
                <p className="text-white/45"># Install in Claude Code</p>
                <p className="mt-1">$ claude mcp add --transport stdio txlookup \</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;"python /path/to/TXLookup/mcp/server.py"</p>
                <p className="mt-5 text-white/45"># Then ask</p>
                <p className="mt-1">$ claude</p>
                <p style={{ color: "#D48B10" }}>&gt; mcp__txlookup__discover_datasets("food trucks 78702")</p>
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

      {/* ── Footer ── */}
      <footer className="bg-[#07152A] text-white/85">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-14">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <Image
                src="/txlookup-logo-dark.svg"
                alt="TXLookup"
                width={200}
                height={67}
                className="h-10 w-auto opacity-90"
              />
              <p className="mt-4 max-w-[42ch] text-sm leading-relaxed">
                An open-source agent for Texas public data. Built on the
                Socrata SODA API, FastMCP, and structured outputs. MIT
                licensed.
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Use it
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li><Link href="#search" className="hover:text-white">Search</Link></li>
                <li><Link href="#datasets" className="hover:text-white">Datasets</Link></li>
                <li><Link href="#topics" className="hover:text-white">Topics</Link></li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Build
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <a href="https://github.com/ATX-TXLookup/TXLookup" className="hover:text-white">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://github.com/ATX-TXLookup/TXLookup/issues" className="hover:text-white">
                    Issues
                  </a>
                </li>
              </ul>
            </div>
            <div className="md:col-span-3">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white/55">
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
            <span>Set in DM Serif Display + Syne + IBM Plex Mono · 2026</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
