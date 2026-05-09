import Link from "next/link";

const datasets = [
  {
    id: "3syk-w9eu",
    title: "Issued Construction Permits",
    city: "Austin",
    rows: "2,354,632",
    cadence: "Daily",
    blurb:
      "Every construction permit issued by the City of Austin since the 1980s — type, address, contractor, status, value.",
  },
  {
    id: "ecmv-9xxi",
    title: "Food Establishment Inspections",
    city: "Austin",
    rows: "120K+",
    cadence: "Weekly",
    blurb:
      "Health-inspection scores and violations for Austin restaurants, food trucks, and grocery stores.",
  },
  {
    id: "i26j-ai4z",
    title: "311 Service Requests",
    city: "Austin",
    rows: "1.5M+",
    cadence: "Daily",
    blurb:
      "Every non-emergency 311 call logged in Austin — pothole, graffiti, animal services, code complaints, by zip and district.",
  },
  {
    id: "6wtj-zbtb",
    title: "Code Violation Cases",
    city: "Austin",
    rows: "300K+",
    cadence: "Daily",
    blurb:
      "Open and closed building, zoning, and short-term-rental violations.",
  },
  {
    id: "fdj4-gpfu",
    title: "Crime Reports",
    city: "Austin",
    rows: "2M+",
    cadence: "Weekly",
    blurb:
      "Reported crimes by type, location, and time. APD case-level data.",
  },
  {
    id: "y2wy-tgr5",
    title: "Traffic Fatalities",
    city: "Austin",
    rows: "1K+",
    cadence: "Monthly",
    blurb:
      "Fatal traffic crashes by location, mode, and year. The Vision Zero source data.",
  },
];

const sampleQuestions = [
  "Restaurants near 78704 with failing inspections this year",
  "Food truck permits issued in 78702 in the last six months",
  "311 response times across all 10 council districts",
  "Where are construction permits growing fastest by zip?",
];

const tickers = [
  { label: "Austin permits, 7d", value: "+372", delta: "+22%", up: true },
  { label: "78704 inspections, 30d", value: "47", delta: "−6%", up: false },
  { label: "311 avg response, days", value: "2.4", delta: "−0.3", up: true },
  { label: "Open code violations", value: "1,409", delta: "+18", up: false },
];

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-[#111111]">
      {/* MASTHEAD — newspaper-style date strip */}
      <div className="border-b border-[#111111] bg-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#111111]/70 md:px-10">
          <span>{today} · Austin, TX</span>
          <span>Vol. I · No. 1 · Open Source · MIT</span>
        </div>
      </div>

      {/* HEADER — masthead title in serif */}
      <header className="border-b-2 border-[#111111] bg-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-6 md:px-10 md:py-8">
          <Link href="/" className="font-serif text-3xl font-black tracking-tight text-[#111111] md:text-4xl">
            TXLookup
          </Link>
          <nav className="flex items-center gap-7 font-mono text-[11px] font-medium uppercase tracking-[0.18em]">
            <Link href="#datasets" className="hover:text-[#A0231C]">
              Datasets
            </Link>
            <Link href="/components" className="hidden hover:text-[#A0231C] md:inline">
              Components
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
              className="hidden hover:text-[#A0231C] md:inline"
            >
              Docs
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="border border-[#111111] px-3 py-1.5 hover:bg-[#111111] hover:text-white"
            >
              Repository ↗
            </a>
          </nav>
        </div>
      </header>

      {/* TICKER STRIP — Bloomberg energy */}
      <div className="border-b border-[#111111]/30 bg-white">
        <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-px bg-[#111111]/30 md:grid-cols-4">
          {tickers.map((t) => (
            <div key={t.label} className="bg-white px-5 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#111111]/60">
                {t.label}
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-mono text-2xl font-semibold tabular-nums text-[#111111]">
                  {t.value}
                </span>
                <span
                  className={`font-mono text-xs font-semibold ${
                    t.up ? "text-[#1E7A47]" : "text-[#A0231C]"
                  }`}
                >
                  {t.delta}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HERO — newspaper above-the-fold */}
      <section className="border-b-2 border-[#111111] bg-white">
        <div className="mx-auto max-w-[1320px] px-6 pt-14 pb-16 md:px-10 md:pt-20 md:pb-24">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-8">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#A0231C]">
                Civic Data · Texas
              </p>
              <h1 className="mt-4 font-serif text-[44px] font-black leading-[1] tracking-tight text-[#111111] md:text-[88px]">
                Public records,
                <br />
                read{" "}
                <span className="italic font-light text-[#A0231C]">like a story.</span>
              </h1>
              <p className="mt-7 max-w-[60ch] font-serif text-lg leading-relaxed text-[#111111] md:text-xl">
                <span className="float-left mr-3 mt-1 font-serif text-6xl font-black leading-[0.85] text-[#A0231C]">
                  T
                </span>
                XLookup is an autonomous data agent that searches the Austin,
                Dallas, San Antonio, and Houston open-data portals — plus state
                filings — in plain English. Every answer cites the source dataset
                and the moment it was last refreshed. Nothing is invented; every
                number can be traced.
              </p>

              {/* Working search */}
              <form
                action="/q"
                method="GET"
                className="mt-10 flex flex-col gap-2 md:flex-row"
              >
                <label htmlFor="q" className="sr-only">
                  Ask about Texas public data
                </label>
                <input
                  id="q"
                  name="q"
                  type="text"
                  required
                  placeholder="Ask the record. e.g. restaurants near 78704 with failing inspections this year…"
                  className="flex-1 border-2 border-[#111111] bg-white px-5 py-3 font-serif text-base text-[#111111] placeholder:text-[#111111]/45 focus:bg-[#FFF8E7] focus:outline-none focus:ring-0 md:text-lg"
                />
                <button
                  type="submit"
                  className="border-2 border-[#111111] bg-[#111111] px-7 py-3 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-white hover:bg-[#A0231C] hover:border-[#A0231C]"
                >
                  Ask the record →
                </button>
              </form>

              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#111111]/60">
                Or try a sample question:
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-serif text-sm italic text-[#111111]/85">
                {sampleQuestions.map((q) => (
                  <li key={q}>
                    <a
                      href={`/q?q=${encodeURIComponent(q)}`}
                      className="border-b border-[#111111]/30 hover:border-[#A0231C] hover:text-[#A0231C]"
                    >
                      “{q}”
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right rail */}
            <aside className="md:col-span-4 md:border-l md:border-[#111111]/30 md:pl-10">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[#A0231C]">
                Daily · Construction
              </p>
              <h3 className="mt-2 font-serif text-2xl font-black leading-[1.05] tracking-tight">
                Permit volume in Austin keeps trending up.
              </h3>
              <div className="mt-4 flex items-end gap-1.5 border-b border-[#111111]/30 pb-3">
                {[42, 38, 51, 49, 67, 58, 72].map((v, i) => (
                  <span
                    key={i}
                    className="block w-5 bg-[#111111]"
                    style={{ height: `${v * 1.2}px` }}
                  />
                ))}
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#111111]/65">
                7-day · 3syk-w9eu · data.austintexas.gov
              </p>

              <div className="mt-10 border-t-2 border-[#111111] pt-5">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[#A0231C]">
                  How it works
                </p>
                <ol className="mt-3 space-y-3 font-serif text-base text-[#111111]">
                  <li>
                    <span className="font-bold">Reason.</span> Codex parses the
                    question and picks the relevant dataset.
                  </li>
                  <li>
                    <span className="font-bold">Plan.</span> A structured tool
                    sequence: discover, describe, query, summarize, cite.
                  </li>
                  <li>
                    <span className="font-bold">Tool.</span> Bounded SoQL queries
                    run through the TXLookup MCP server.
                  </li>
                  <li>
                    <span className="font-bold">Complete.</span> A plain-English
                    answer with a mandatory citation block.
                  </li>
                </ol>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* DATASETS — section masthead + serif headline + grid */}
      <section
        id="datasets"
        className="scroll-mt-24 border-b-2 border-[#111111] bg-white"
      >
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
          <div className="grid items-end gap-6 border-b border-[#111111] pb-6 md:grid-cols-12">
            <div className="md:col-span-7">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#A0231C]">
                Section · Records
              </p>
              <h2 className="mt-3 font-serif text-4xl font-black leading-[1] tracking-tight md:text-6xl">
                Six datasets,
                <br />
                <span className="italic font-light">live and queryable.</span>
              </h2>
            </div>
            <p className="font-serif text-base leading-relaxed text-[#111111]/85 md:col-span-5 md:text-lg">
              Each entry below links to its TXLookup record — schema, sample
              rows, freshness, and a search box scoped to that dataset. Adding
              another is a YAML edit:{" "}
              <a
                href="https://github.com/ATX-TXLookup/TXLookup/blob/main/config/datasets.yaml"
                className="border-b border-[#A0231C] text-[#A0231C] hover:bg-[#FFF8E7]"
              >
                config/datasets.yaml
              </a>
              .
            </p>
          </div>

          <div className="mt-8 grid md:grid-cols-2 md:gap-x-10">
            {datasets.map((d, i) => (
              <Link
                key={d.id}
                href={`/datasets/${d.id}`}
                className={`group block py-7 ${
                  i % 2 === 1 ? "md:border-l-2 md:border-[#111111] md:pl-10" : ""
                } ${i >= 2 ? "md:border-t-2 md:border-[#111111] md:pt-7" : ""} ${
                  i > 0 ? "border-t-2 border-[#111111] md:border-t-0" : ""
                } ${
                  i >= 2 ? "md:border-t-2" : ""
                }`}
              >
                <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[#111111]/65">
                  <span>{d.city} · {d.cadence}</span>
                  <span>{d.id}</span>
                </div>
                <h3 className="mt-2 font-serif text-2xl font-black leading-[1.05] tracking-tight text-[#111111] group-hover:text-[#A0231C] md:text-3xl">
                  {d.title}
                </h3>
                <p className="mt-3 max-w-[60ch] font-serif text-base leading-relaxed text-[#111111]/85">
                  {d.blurb}
                </p>
                <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-[#111111]/65">
                  {d.rows} rows →
                </p>
              </Link>
            ))}
          </div>

          <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.18em] text-[#111111]/65">
            Dallas · San Antonio · Houston — queryable via the same Socrata
            client, datasets being onboarded.
          </p>
        </div>
      </section>

      {/* AGENT BUILDERS — feature article */}
      <section className="border-b-2 border-[#111111] bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#A0231C]">
                For builders
              </p>
              <h2 className="mt-3 font-serif text-4xl font-black leading-[1] tracking-tight md:text-6xl">
                Install TXLookup
                <br />
                <span className="italic font-light">as a tool.</span>
              </h2>
              <p className="mt-7 font-serif text-base leading-relaxed text-[#111111]/85 md:text-lg">
                The repository ships an MCP server and a portable agent skill.
                Drop them into Claude Code, Codex, or any MCP-compliant runtime
                and your agent gets safe, bounded access to Texas civic data
                with citation enforced.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
                  className="border-2 border-[#111111] bg-[#111111] px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-white hover:bg-[#A0231C] hover:border-[#A0231C]"
                >
                  Read docs →
                </a>
                <a
                  href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
                  className="border-2 border-[#111111] bg-white px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-[#111111] hover:bg-[#FFF8E7]"
                >
                  See the skill →
                </a>
              </div>
            </div>

            <div className="md:col-span-7">
              <div className="border-2 border-[#111111] bg-[#111111] p-6 font-mono text-xs leading-relaxed text-[#FFE7B5] md:p-8 md:text-sm">
                <p className="text-white/55"># Install in Claude Code</p>
                <p className="mt-1">$ claude mcp add --transport stdio txlookup \</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;"python /path/to/TXLookup/mcp/server.py"</p>
                <p className="mt-5 text-white/55"># Then ask</p>
                <p className="mt-1">$ claude</p>
                <p>&gt; mcp__txlookup__discover_datasets("food trucks 78702")</p>
                <p className="mt-1 text-white">→ 3syk-w9eu (Austin Issued Construction Permits)</p>
                <p className="mt-5 text-white/55">
                  # Five tools: discover · describe · query · summarize · cite
                </p>
              </div>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#111111]/65">
                Bounded queries · 30-second timeout · 5,000-row cap · backoff on 429 · citation enforced
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER — colophon */}
      <footer className="border-t-2 border-[#111111] bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="font-serif text-3xl font-black tracking-tight text-[#111111]">
                TXLookup
              </p>
              <p className="mt-3 max-w-[42ch] font-serif text-base leading-relaxed text-[#111111]/85">
                An open-source agent for Texas public data. Built on the Socrata
                SODA API, FastMCP, and structured outputs. MIT licensed. Edited
                in Austin.
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[#111111]/55">
                Sections
              </p>
              <ul className="mt-3 space-y-1 font-serif text-base text-[#111111]">
                <li>
                  <Link href="#datasets" className="hover:text-[#A0231C]">
                    Datasets
                  </Link>
                </li>
                <li>
                  <Link href="/components" className="hover:text-[#A0231C]">
                    Components
                  </Link>
                </li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[#111111]/55">
                Build
              </p>
              <ul className="mt-3 space-y-1 font-serif text-base text-[#111111]">
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup"
                    className="hover:text-[#A0231C]"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup/issues"
                    className="hover:text-[#A0231C]"
                  >
                    Issues
                  </a>
                </li>
              </ul>
            </div>
            <div className="md:col-span-3">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[#111111]/55">
                Use it
              </p>
              <ul className="mt-3 space-y-1 font-serif text-base text-[#111111]">
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
                    className="hover:text-[#A0231C]"
                  >
                    Agent skill (MCP)
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
                    className="hover:text-[#A0231C]"
                  >
                    Integration guide
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-[#111111]/30 pt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-[#111111]/65">
            All data sourced from public Texas open-data portals · Attribution enforced · Set in Source Serif 4 + JetBrains Mono · 2026
          </div>
        </div>
      </footer>
    </main>
  );
}
