import Link from "next/link";

const districtSpark = [42, 38, 51, 49, 67, 58, 72]; // last 7 days, mock

const datasets = [
  {
    city: "Austin",
    title: "Issued Construction Permits",
    id: "3syk-w9eu",
    rows: "2,354,632",
    cadence: "daily",
  },
  {
    city: "Austin",
    title: "Food Establishment Inspection Scores",
    id: "ecmv-9xxi",
    rows: "120k+",
    cadence: "weekly",
  },
  {
    city: "Austin",
    title: "311 Service Requests",
    id: "i26j-ai4z",
    rows: "1.5M+",
    cadence: "daily",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F4F4F2] text-[#101216]">
      {/* District-stripe top accent — civic, not corporate */}
      <div className="grid h-1 grid-cols-10">
        <span className="bg-[#3D5AAB]" />
        <span className="bg-[#1E7A47]" />
        <span className="bg-[#A06200]" />
        <span className="bg-[#7A2E8E]" />
        <span className="bg-[#0E7C8C]" />
        <span className="bg-[#A0231C]" />
        <span className="bg-[#5A4E2A]" />
        <span className="bg-[#2E5070]" />
        <span className="bg-[#883C5A]" />
        <span className="bg-[#3E6B2E]" />
      </div>

      <header className="border-b border-[#101216]/10 bg-[#F4F4F2]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-4 md:px-10">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-display text-xl font-extrabold text-[#101216]">
              TXLookup
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#3D5AAB]">
              v0.1 · alpha
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#101216]/70 md:flex">
            <Link href="/components" className="hover:text-[#101216]">
              Components
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="hover:text-[#101216]"
            >
              Repository
            </a>
            <span className="rounded-sm bg-[#101216] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white">
              Code freeze · Sun 11:00 CT
            </span>
          </nav>
        </div>
      </header>

      {/* Hero — left-aligned, editorial, NOT a SaaS landing page */}
      <section className="border-b border-[#101216]/10">
        <div className="mx-auto max-w-[1280px] px-5 py-16 md:grid md:grid-cols-12 md:gap-10 md:px-10 md:py-24">
          <div className="md:col-span-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#3D5AAB]">
              AITX × Codex Hackathon · May 8–10, 2026
            </p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-[#101216] md:text-[5.5rem]">
              Texas public data,{" "}
              <span className="border-b-[6px] border-[#3D5AAB] pb-1">
                cited
              </span>
              .
            </h1>
            <p className="mt-6 max-w-[64ch] text-base leading-relaxed text-[#101216]/75 md:text-lg">
              An autonomous data agent for the Austin, Dallas, San Antonio, and
              Houston open-data portals — plus state filings. Ask in plain
              English; the agent picks the dataset, runs the query, and shows
              you the answer with the source attached.
            </p>
            <p className="mt-2 max-w-[64ch] text-sm text-[#101216]/60">
              Open source. MCP server + agent skill, both shipped.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/components"
                className="rounded-sm bg-[#3D5AAB] px-5 py-3 text-sm font-medium text-white hover:bg-[#2E437F]"
              >
                See live components
              </Link>
              <a
                href="https://github.com/ATX-TXLookup/TXLookup"
                className="rounded-sm border border-[#101216]/20 px-5 py-3 text-sm font-medium text-[#101216] hover:border-[#101216] hover:bg-white"
              >
                Read the source
              </a>
              <a
                href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
                className="text-sm font-medium text-[#3D5AAB] hover:underline"
              >
                Use it as a skill →
              </a>
            </div>
          </div>

          {/* Data figure — small live-ish stats, NOT a stat banner with N · N · N */}
          <aside className="mt-16 border-t border-[#101216]/10 pt-10 md:col-span-4 md:mt-0 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#101216]/50">
              Austin permits — last 7 days
            </p>
            <div className="mt-4 flex items-end gap-2">
              {districtSpark.map((v, i) => (
                <span
                  key={i}
                  className="block w-6 bg-[#3D5AAB]"
                  style={{ height: `${v * 1.2}px` }}
                  aria-label={`day -${districtSpark.length - 1 - i}: ${v}`}
                />
              ))}
            </div>
            <p className="mt-3 font-mono text-[11px] text-[#101216]/55">
              source: 3syk-w9eu · data.austintexas.gov
            </p>
            <p className="mt-2 text-xs text-[#101216]/50">
              indicative only — dataset refreshes daily. Sample shown above is
              a demo placeholder until the agent loop is wired (#10/#11).
            </p>

            <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.18em] text-[#101216]/50">
              Tracks &amp; bounties
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[#101216]/80">
              <li>
                <span className="font-medium">Agents</span> — reason · plan ·
                tool · complete
              </li>
              <li>
                <span className="font-medium">
                  Brainforge / Vicinity Open Data
                </span>{" "}
                — MCP + skill, both shipped
              </li>
              <li>
                <span className="font-medium">Miro</span> — $500 bounty
              </li>
              <li>
                <span className="font-medium">DeepInvent</span> — $500 +
                provisional patent
              </li>
            </ul>
          </aside>
        </div>
      </section>

      {/* Datasets registered — table layout, civic-records vibe */}
      <section className="border-b border-[#101216]/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#3D5AAB]">
                Datasets registered
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#101216] md:text-5xl">
                What the agent currently knows.
              </h2>
            </div>
            <p className="max-w-[40ch] text-sm text-[#101216]/65">
              Adding a new dataset is a YAML edit — the MCP server reloads the
              catalog without a redeploy. See{" "}
              <a
                href="https://github.com/ATX-TXLookup/TXLookup/blob/main/config/datasets.yaml"
                className="text-[#3D5AAB] hover:underline"
              >
                config/datasets.yaml
              </a>
              .
            </p>
          </div>

          <table className="mt-10 w-full border-t border-[#101216]/10 text-left text-sm">
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#101216]/55">
                <th className="py-3 pr-4 font-normal">city</th>
                <th className="py-3 pr-4 font-normal">dataset</th>
                <th className="py-3 pr-4 font-normal">id</th>
                <th className="py-3 pr-4 font-normal">rows</th>
                <th className="py-3 pr-4 font-normal">refresh</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr
                  key={d.id}
                  className="border-t border-[#101216]/10 align-top"
                >
                  <td className="py-4 pr-4 font-medium text-[#101216]">
                    {d.city}
                  </td>
                  <td className="py-4 pr-4 text-[#101216]/85">{d.title}</td>
                  <td className="py-4 pr-4 font-mono text-xs text-[#101216]/70">
                    {d.id}
                  </td>
                  <td className="py-4 pr-4 font-mono text-xs text-[#101216]/70">
                    {d.rows}
                  </td>
                  <td className="py-4 pr-4 text-[#101216]/70">{d.cadence}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-6 text-xs text-[#101216]/55">
            Dallas, San Antonio, and Houston portals are queryable via the same
            Socrata client; per-city datasets get registered as we onboard them.
          </p>
        </div>
      </section>

      {/* How it works — prose, not feature cards */}
      <section className="border-b border-[#101216]/10">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-16 md:grid-cols-12 md:px-10 md:py-20">
          <div className="md:col-span-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#3D5AAB]">
              How it works
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#101216] md:text-5xl">
              Reason. Plan. Tool. Complete.
            </h2>
          </div>
          <div className="space-y-5 text-base leading-relaxed text-[#101216]/80 md:col-span-8">
            <p>
              You type a fuzzy question. <span className="font-medium">Codex reasons</span> about
              the intent, picks the relevant dataset from the registered
              catalog, and emits a structured plan as a sequence of tool
              calls.
            </p>
            <p>
              The executor dispatches each step — discover, describe, query,
              summarize, cite — through the{" "}
              <span className="font-medium">TXLookup MCP server</span>, which
              is a thin, bounded wrapper around Socrata SODA APIs.
            </p>
            <p>
              Codex synthesizes the records into a plain-English answer, and
              the same data flows in parallel into a{" "}
              <span className="font-medium">live-generated Miro board</span> —
              frames per category, color-coded sticky notes per record, a
              citation block beneath. The board materializes alongside the
              answer.
            </p>
            <p className="text-sm text-[#101216]/65">
              The agent runs as a Claude Code / Codex skill. Other agents can
              install it from the{" "}
              <a
                href="https://github.com/ATX-TXLookup/TXLookup/blob/main/.mcp.json"
                className="text-[#3D5AAB] hover:underline"
              >
                .mcp.json
              </a>{" "}
              and inherit the safety bounds (rate-limit backoff, no PII, no
              auth-walled scraping, mandatory citation).
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-[#101216] text-[#F4F4F2]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-5 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">
          <p>
            Built at the AITX Community × Codex Hackathon, May 2026. Open
            source, MIT.
          </p>
          <div className="flex flex-wrap gap-6">
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="hover:underline"
            >
              github
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/issues"
              className="hover:underline"
            >
              issues
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
              className="hover:underline"
            >
              skill
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
              className="hover:underline"
            >
              usage
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
