import Link from "next/link";

const datasets = [
  {
    city: "AUSTIN",
    title: "ISSUED CONSTRUCTION PERMITS",
    id: "3syk-w9eu",
    rows: "2,354,632",
    cadence: "DAILY",
  },
  {
    city: "AUSTIN",
    title: "FOOD ESTABLISHMENT INSPECTION SCORES",
    id: "ecmv-9xxi",
    rows: "120K+",
    cadence: "WEEKLY",
  },
  {
    city: "AUSTIN",
    title: "311 SERVICE REQUESTS",
    id: "i26j-ai4z",
    rows: "1.5M+",
    cadence: "DAILY",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* HEADER — thick TX blue band, hard bottom border */}
      <header className="border-b-4 border-black bg-[#002868] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-extrabold uppercase tracking-tight">
              TXLookup
            </span>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 md:inline">
              v0.1 / alpha
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-bold uppercase tracking-wider">
            <Link href="/components" className="hidden hover:underline md:inline">
              Components
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="hidden hover:underline md:inline"
            >
              Repository
            </a>
            <span className="border-2 border-white bg-[#BF0A30] px-3 py-1.5 font-mono text-[11px] tracking-[0.18em]">
              FREEZE / SUN 11:00 CT
            </span>
          </nav>
        </div>
      </header>

      {/* HERO — huge black H1, square chunky CTA with hard offset shadow */}
      <section className="border-b-4 border-black">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-6 py-16 md:grid-cols-12 md:px-10 md:py-24">
          <div className="md:col-span-8">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
              AITX × CODEX HACKATHON / MAY 8–10 / 2026
            </p>
            <h1 className="mt-6 font-display text-[56px] font-extrabold uppercase leading-[0.95] tracking-tight text-black md:text-[112px]">
              TEXAS<br />
              PUBLIC<br />
              <span className="bg-[#002868] px-3 text-white">DATA,</span>
              <br />
              CITED.
            </h1>
            <p className="mt-8 max-w-[60ch] text-base leading-relaxed text-black/80 md:text-lg">
              An autonomous data agent for the Austin, Dallas, San Antonio, and
              Houston open-data portals. Ask a question in plain English. The
              agent picks the dataset, runs the bounded query, and shows you
              the answer with the source attached.
            </p>
            <p className="mt-2 font-mono text-xs uppercase tracking-wider text-black/70">
              Open source / MCP server + agent skill / both shipped
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              {/* Hard-offset chunky CTA, neo-brutalist */}
              <Link
                href="/components"
                className="relative inline-block border-4 border-black bg-[#002868] px-8 py-4 font-display text-base font-extrabold uppercase tracking-wider text-white shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-none active:translate-x-[6px] active:translate-y-[6px]"
              >
                Live components →
              </Link>
              <a
                href="https://github.com/ATX-TXLookup/TXLookup"
                className="relative inline-block border-4 border-black bg-white px-8 py-4 font-display text-base font-extrabold uppercase tracking-wider text-black shadow-[6px_6px_0_0_#BF0A30] hover:shadow-[3px_3px_0_0_#BF0A30] hover:translate-x-[3px] hover:translate-y-[3px]"
              >
                Source ↗
              </a>
              <a
                href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
                className="font-mono text-sm font-bold uppercase tracking-wider text-[#002868] underline underline-offset-4 hover:text-[#BF0A30]"
              >
                Use as a skill →
              </a>
            </div>
          </div>

          {/* Right column — chunky stats stack */}
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
            </div>

            <div className="mt-5 border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#BF0A30]">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
                Tracks &amp; bounties
              </p>
              <ul className="mt-3 space-y-2 text-sm text-black">
                <li>
                  <span className="font-display font-bold uppercase">Agents</span> ·
                  reason / plan / tool / complete
                </li>
                <li>
                  <span className="font-display font-bold uppercase">
                    Brainforge / Vicinity
                  </span>{" "}
                  · MCP + skill, both shipped
                </li>
                <li>
                  <span className="font-display font-bold uppercase">Miro</span> ·
                  $500 bounty
                </li>
                <li>
                  <span className="font-display font-bold uppercase">DeepInvent</span>{" "}
                  · $500 + provisional patent
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* DATASETS — fat-bordered table on yellow with hard accents */}
      <section className="border-b-4 border-black bg-[#F5F5F0]">
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-7">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
                Datasets registered
              </p>
              <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[1] tracking-tight text-black md:text-6xl">
                What the agent<br />currently knows.
              </h2>
            </div>
            <p className="self-end text-sm text-black/75 md:col-span-5">
              Adding a new dataset is a YAML edit. The MCP server reloads the
              catalog without a redeploy.{" "}
              <a
                href="https://github.com/ATX-TXLookup/TXLookup/blob/main/config/datasets.yaml"
                className="font-bold text-[#002868] underline underline-offset-2 hover:text-[#BF0A30]"
              >
                config/datasets.yaml ↗
              </a>
            </p>
          </div>

          <div className="mt-10 border-4 border-black bg-white shadow-[8px_8px_0_0_#002868]">
            <table className="w-full text-left text-sm">
              <thead className="border-b-4 border-black bg-black text-white">
                <tr className="font-mono text-[11px] uppercase tracking-[0.22em]">
                  <th className="px-5 py-4 font-bold">CITY</th>
                  <th className="px-5 py-4 font-bold">DATASET</th>
                  <th className="px-5 py-4 font-bold">ID</th>
                  <th className="px-5 py-4 font-bold">ROWS</th>
                  <th className="px-5 py-4 font-bold">REFRESH</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d, i) => (
                  <tr
                    key={d.id}
                    className={`border-b-2 border-black last:border-b-0 ${
                      i % 2 === 0 ? "bg-white" : "bg-[#F5F5F0]"
                    }`}
                  >
                    <td className="px-5 py-5 font-display font-extrabold uppercase">
                      {d.city}
                    </td>
                    <td className="px-5 py-5 font-medium uppercase tracking-wide">
                      {d.title}
                    </td>
                    <td className="px-5 py-5 font-mono text-xs">{d.id}</td>
                    <td className="px-5 py-5 font-mono text-xs">{d.rows}</td>
                    <td className="px-5 py-5 font-mono text-xs">{d.cadence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-black/65">
            Dallas · San Antonio · Houston portals queryable via the same
            Socrata client. Dataset registration in flight.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS — four numbered chunky blocks, NOT circles */}
      <section className="border-b-4 border-black bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
            How it works
          </p>
          <h2 className="mt-3 max-w-[16ch] font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-black md:text-6xl">
            Reason.<br />Plan. Tool.<br />Complete.
          </h2>

          <div className="mt-12 grid gap-0 border-4 border-black md:grid-cols-4">
            {[
              {
                n: "01",
                title: "REASON",
                body: "Codex parses the question and extracts intent: data domain, geography, time range, analysis type.",
                bg: "bg-[#002868] text-white",
              },
              {
                n: "02",
                title: "PLAN",
                body: "Codex emits a structured list of tool calls — discover, describe, query, summarize, cite — with concrete arguments.",
                bg: "bg-white text-black",
              },
              {
                n: "03",
                title: "TOOL",
                body: "Executor dispatches each step through the TXLookup MCP server, hitting Socrata with bounded SoQL queries.",
                bg: "bg-[#FFD93D] text-black",
              },
              {
                n: "04",
                title: "COMPLETE",
                body: "Codex synthesizes the records into a plain-English answer with mandatory citation. A Miro board renders alongside.",
                bg: "bg-[#BF0A30] text-white",
              },
            ].map((s, i) => (
              <div
                key={s.n}
                className={`${s.bg} ${
                  i < 3 ? "border-b-4 border-black md:border-b-0 md:border-r-4" : ""
                } px-7 py-9`}
              >
                <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] opacity-70">
                  {s.n}
                </p>
                <h3 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SAMPLE QUESTION — big poster-style quote block */}
      <section className="border-b-4 border-black bg-[#FFD93D]">
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-black">
            Sample question
          </p>
          <p className="mt-6 font-display text-3xl font-extrabold uppercase leading-[1.05] tracking-tight text-black md:text-6xl">
            "Food truck permits issued in 78702 in the last six months."
          </p>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.22em] text-black/75">
            answer source · 3syk-w9eu · data.austintexas.gov · refreshed daily
          </p>
        </div>
      </section>

      {/* FOOTER — thick TX red band */}
      <footer className="bg-[#BF0A30] text-white">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">
          <p className="font-mono uppercase tracking-wider">
            BUILT AT THE AITX COMMUNITY × CODEX HACKATHON · MAY 2026 · OPEN SOURCE / MIT
          </p>
          <div className="flex flex-wrap gap-6 font-mono text-xs uppercase tracking-[0.18em]">
            <a href="https://github.com/ATX-TXLookup/TXLookup" className="hover:underline">
              GITHUB
            </a>
            <a href="https://github.com/ATX-TXLookup/TXLookup/issues" className="hover:underline">
              ISSUES
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/skills/txlookup/SKILL.md"
              className="hover:underline"
            >
              SKILL
            </a>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup/blob/main/docs/usage.md"
              className="hover:underline"
            >
              USAGE
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
