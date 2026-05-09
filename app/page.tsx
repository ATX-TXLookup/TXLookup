import Link from "next/link";

const datasets = [
  {
    id: "3syk-w9eu",
    title: "ISSUED CONSTRUCTION PERMITS",
    city: "AUSTIN",
    rows: "2,354,632",
    cadence: "DAILY",
    blurb: "Every construction permit issued by the City of Austin since the 1980s — type, address, contractor, status, value.",
  },
  {
    id: "ecmv-9xxi",
    title: "FOOD ESTABLISHMENT INSPECTIONS",
    city: "AUSTIN",
    rows: "120K+",
    cadence: "WEEKLY",
    blurb: "Health-inspection scores and violations for Austin restaurants, food trucks, and grocery stores. Each row is one inspection.",
  },
  {
    id: "i26j-ai4z",
    title: "311 SERVICE REQUESTS",
    city: "AUSTIN",
    rows: "1.5M+",
    cadence: "DAILY",
    blurb: "Every non-emergency 311 call logged in Austin — pothole, graffiti, animal services, code complaints, by zip and district.",
  },
  {
    id: "6wtj-zbtb",
    title: "CODE VIOLATION CASES",
    city: "AUSTIN",
    rows: "300K+",
    cadence: "DAILY",
    blurb: "Open and closed building, zoning, and short-term-rental violations.",
  },
  {
    id: "fdj4-gpfu",
    title: "CRIME REPORTS",
    city: "AUSTIN",
    rows: "2M+",
    cadence: "WEEKLY",
    blurb: "Reported crimes by type, location, and time. APD case-level data.",
  },
  {
    id: "y2wy-tgr5",
    title: "TRAFFIC FATALITIES",
    city: "AUSTIN",
    rows: "1K+",
    cadence: "MONTHLY",
    blurb: "Fatal traffic crashes — location, mode, year. The Vision Zero source data.",
  },
];

const sampleQuestions = [
  "Restaurants near 78704 with failing inspections this year",
  "Food truck permits issued in 78702 in the last six months",
  "311 response times across all 10 council districts",
  "Where are construction permits growing fastest by zip?",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* Header — thick navy band */}
      <header className="border-b-4 border-black bg-[#002868] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-extrabold uppercase tracking-tight">
              TXLookup
            </span>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 md:inline">
              public data, cited
            </span>
          </Link>
          <nav className="flex items-center gap-7 font-display text-sm font-bold uppercase tracking-wider">
            <Link href="#datasets" className="hover:underline">
              Datasets
            </Link>
            <Link href="/components" className="hidden hover:underline md:inline">
              Components
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
              className="hidden hover:underline md:inline"
            >
              Docs
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="border-2 border-white bg-white px-3 py-1.5 text-[#002868] hover:bg-[#FFD93D]"
            >
              Source ↗
            </a>
          </nav>
        </div>
      </header>

      {/* HERO — search-first. The page is usable. */}
      <section className="border-b-4 border-black bg-white">
        <div className="mx-auto max-w-[1320px] px-6 pt-16 pb-20 md:px-10 md:pt-24 md:pb-28">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-8">
              <h1 className="font-display text-[44px] font-extrabold uppercase leading-[0.95] tracking-tight md:text-[88px]">
                ASK TEXAS<br />
                A QUESTION.<br />
                <span className="bg-[#002868] px-3 text-white">GET</span>{" "}
                <span className="bg-[#FFD93D] px-3">THE DATA.</span>
              </h1>
              <p className="mt-7 max-w-[60ch] text-base leading-relaxed text-black/80 md:text-lg">
                Search the Austin, Dallas, San Antonio, and Houston open-data
                portals plus state filings — in plain English. Every answer
                cites the source dataset and when it was last refreshed.
              </p>

              {/* SEARCH — the primary call to action */}
              <form
                action="/q"
                method="GET"
                className="mt-10 flex flex-col gap-3 md:flex-row md:items-stretch"
              >
                <label htmlFor="q" className="sr-only">
                  Ask about Texas public data
                </label>
                <input
                  id="q"
                  name="q"
                  type="text"
                  required
                  defaultValue=""
                  placeholder="Restaurants near 78704 with failing inspections this year…"
                  className="flex-1 border-4 border-black bg-white px-5 py-4 text-base font-medium text-black shadow-[6px_6px_0_0_#000] placeholder:text-black/55 focus:bg-[#FFD93D] focus:outline-none focus:shadow-[3px_3px_0_0_#000] focus:translate-x-[3px] focus:translate-y-[3px] md:text-lg"
                />
                <button
                  type="submit"
                  className="border-4 border-black bg-[#BF0A30] px-8 py-4 font-display text-base font-extrabold uppercase tracking-wider text-white shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] md:text-lg"
                >
                  Ask →
                </button>
              </form>

              <div className="mt-6 flex flex-wrap gap-2">
                {sampleQuestions.map((q) => (
                  <a
                    key={q}
                    href={`/q?q=${encodeURIComponent(q)}`}
                    className="border-2 border-black bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-black hover:bg-[#FFD93D]"
                  >
                    {q}
                  </a>
                ))}
              </div>
            </div>

            <aside className="md:col-span-4">
              <div className="border-4 border-black bg-[#FFD93D] p-6 shadow-[8px_8px_0_0_#000]">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-black">
                  Austin permits / last 7 days
                </p>
                <div className="mt-4 flex items-end gap-2 border-b-2 border-black pb-3">
                  {[42, 38, 51, 49, 67, 58, 72].map((v, i) => (
                    <span
                      key={i}
                      className="block w-7 border-2 border-black bg-[#002868]"
                      style={{ height: `${v * 1.4}px` }}
                    />
                  ))}
                </div>
                <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-wider text-black">
                  source · 3syk-w9eu · data.austintexas.gov
                </p>
                <Link
                  href="/datasets/3syk-w9eu"
                  className="mt-3 inline-block font-mono text-[11px] font-bold uppercase tracking-wider text-black underline underline-offset-4 hover:text-[#BF0A30]"
                >
                  Browse this dataset →
                </Link>
              </div>

              <div className="mt-6 border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#BF0A30]">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
                  How it works
                </p>
                <ol className="mt-3 space-y-2 text-sm text-black">
                  <li>
                    <span className="font-display font-bold uppercase">1. Reason</span>{" "}
                    — pick the right dataset from your question
                  </li>
                  <li>
                    <span className="font-display font-bold uppercase">2. Plan</span>{" "}
                    — emit a structured tool sequence
                  </li>
                  <li>
                    <span className="font-display font-bold uppercase">3. Tool</span>{" "}
                    — run a bounded SoQL query
                  </li>
                  <li>
                    <span className="font-display font-bold uppercase">4. Complete</span>{" "}
                    — answer in plain English with citation
                  </li>
                </ol>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* DATASETS — browsable list. This is the main usable surface. */}
      <section
        id="datasets"
        className="border-b-4 border-black bg-[#F5F5F0] scroll-mt-24"
      >
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-7">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
                Browse datasets
              </p>
              <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[1] tracking-tight md:text-6xl">
                Six datasets,<br />live and queryable.
              </h2>
            </div>
            <p className="self-end text-sm text-black/75 md:col-span-5">
              Each card links to the dataset's TXLookup browser — schema,
              sample rows, freshness, and a search box scoped to that dataset.
              Adding more is a YAML edit:{" "}
              <a
                href="https://github.com/ATX-TXLookup/TXLookup/blob/main/config/datasets.yaml"
                className="font-bold text-[#002868] underline underline-offset-2 hover:text-[#BF0A30]"
              >
                config/datasets.yaml ↗
              </a>
            </p>
          </div>

          <div className="mt-12 grid gap-0 border-4 border-black md:grid-cols-3">
            {datasets.map((d, i) => {
              const accent =
                i % 3 === 0
                  ? "bg-white shadow-[8px_8px_0_0_#002868]"
                  : i % 3 === 1
                  ? "bg-white shadow-[8px_8px_0_0_#BF0A30]"
                  : "bg-white shadow-[8px_8px_0_0_#FFD93D]";
              const borderRight =
                i % 3 < 2 ? "md:border-r-4 md:border-black" : "";
              const borderBottom =
                i < datasets.length - 3
                  ? "border-b-4 border-black"
                  : "border-b-4 border-black md:border-b-0";
              return (
                <Link
                  key={d.id}
                  href={`/datasets/${d.id}`}
                  className={`group relative block ${accent} ${borderRight} ${borderBottom} p-6 transition-all hover:-translate-x-1 hover:-translate-y-1`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
                      {d.city}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-black/60">
                      {d.cadence}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-xl font-extrabold uppercase leading-tight tracking-tight md:text-2xl">
                    {d.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-black/75">
                    {d.blurb}
                  </p>
                  <div className="mt-5 flex items-baseline justify-between border-t-2 border-black pt-3">
                    <span className="font-mono text-xs uppercase text-black/70">
                      {d.id}
                    </span>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                      {d.rows} rows →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-black/65">
            Dallas · San Antonio · Houston portals queryable via the same
            Socrata client. Their datasets are being onboarded.
          </p>
        </div>
      </section>

      {/* USE IT YOURSELF — the agent skill, MCP install */}
      <section className="border-b-4 border-black bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
                For agent builders
              </p>
              <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-6xl">
                Install TXLookup as a tool.
              </h2>
              <p className="mt-6 text-base leading-relaxed text-black/80">
                TXLookup ships an MCP server and a portable agent skill.
                Drop them into Claude Code, Codex, or any MCP-compliant
                runtime and your agent gets safe, bounded access to Texas
                civic data with citation enforced.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
                  className="border-4 border-black bg-[#002868] px-7 py-3.5 font-display font-extrabold uppercase tracking-wider text-white shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px]"
                >
                  Read docs →
                </a>
                <a
                  href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
                  className="border-4 border-black bg-white px-7 py-3.5 font-display font-extrabold uppercase tracking-wider text-black shadow-[6px_6px_0_0_#BF0A30] hover:shadow-[3px_3px_0_0_#BF0A30] hover:translate-x-[3px] hover:translate-y-[3px]"
                >
                  See the skill →
                </a>
              </div>
            </div>

            <div className="md:col-span-7">
              <div className="border-4 border-black bg-black p-5 font-mono text-xs leading-relaxed text-[#FFD93D] md:p-7 md:text-sm">
                <p className="text-white/55"># Install in Claude Code</p>
                <p className="mt-1">
                  $ claude mcp add --transport stdio txlookup \
                </p>
                <p>
                  &nbsp;&nbsp;"python /path/to/TXLookup/mcp/server.py"
                </p>
                <p className="mt-4 text-white/55"># Then ask anything</p>
                <p className="mt-1">$ claude</p>
                <p>&gt; mcp__txlookup__discover_datasets("food trucks 78702")</p>
                <p className="mt-1 text-white">
                  → 3syk-w9eu (Austin Issued Construction Permits)
                </p>
                <p className="mt-4 text-white/55">
                  # Five tools: discover · describe · query · summarize · cite
                </p>
              </div>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-black/65">
                Bounded queries · 30s timeout · 5000-row cap · backoff on 429 · citation enforced
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER — thick red band */}
      <footer className="bg-[#BF0A30] text-white">
        <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="font-display text-xl font-extrabold uppercase tracking-tight">
                TXLookup
              </p>
              <p className="mt-2 max-w-[40ch] text-sm leading-relaxed">
                An open-source agent for Texas public data. MIT licensed.
                Built on the Socrata SODA API, FastMCP, and structured
                outputs.
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
                Product
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <Link href="#datasets" className="hover:underline">
                    Datasets
                  </Link>
                </li>
                <li>
                  <Link href="/components" className="hover:underline">
                    Components
                  </Link>
                </li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
                Build
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup"
                    className="hover:underline"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup/issues"
                    className="hover:underline"
                  >
                    Issues
                  </a>
                </li>
              </ul>
            </div>
            <div className="md:col-span-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
                Use it
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
                    className="hover:underline"
                  >
                    Agent skill (MCP)
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
                    className="hover:underline"
                  >
                    Integration guide
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t-2 border-white/30 pt-5 font-mono text-[11px] uppercase tracking-wider text-white/80">
            ALL DATA SOURCED FROM PUBLIC TEXAS OPEN-DATA PORTALS · ATTRIBUTION ENFORCED · 2026
          </div>
        </div>
      </footer>
    </main>
  );
}
