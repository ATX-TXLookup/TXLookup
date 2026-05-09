import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FCF9F8] text-[#1C1B1B]">
      <header className="border-b border-[#E0C0B2]/50">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-4 md:px-8">
          <span className="font-display text-xl font-extrabold">TXLookup</span>
          <span className="rounded-full bg-[#111110] px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-[#F3F0EF]">
            BUILDING — AITX × CODEX HACKATHON
          </span>
        </div>
      </header>

      <section className="px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1280px]">
          <div className="max-w-[640px]">
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Texas public data,
              <br />
              in plain English.
            </h1>
            <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-[#594238] md:text-lg">
              An autonomous data agent for Austin / Dallas / San Antonio /
              Houston / state portals. The agent finds the right dataset,
              runs the query, and shows you the answer with the source cited.
            </p>
            <p className="mt-3 max-w-[58ch] text-sm text-[#594238]">
              Built live during the AITX Community × Codex Hackathon, May 8-10, 2026.
              Code freeze Sun May 10 11:00 AM CT.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/components"
                className="rounded-full bg-[#9E3D00] px-7 py-3.5 text-base text-white hover:bg-[#C64F00]"
              >
                See components storybook
              </Link>
              <a
                href="https://github.com/ATX-TXLookup/TXLookup"
                className="rounded-full border border-[#E0C0B2] px-7 py-3.5 text-base text-[#9E3D00] hover:bg-[#EBE7E7]"
              >
                Repository
              </a>
            </div>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-[0_1px_0_rgba(140,113,102,0.12)]">
              <div className="font-display text-sm font-bold uppercase tracking-[0.14em] text-[#594238]">
                Tracks
              </div>
              <ul className="mt-3 space-y-1 text-sm text-[#1C1B1B]">
                <li>Agents — autonomous reason → plan → tool → complete</li>
                <li>Brainforge / Vicinity Texas Open Data</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-[0_1px_0_rgba(140,113,102,0.12)]">
              <div className="font-display text-sm font-bold uppercase tracking-[0.14em] text-[#594238]">
                Bounties
              </div>
              <ul className="mt-3 space-y-1 text-sm text-[#1C1B1B]">
                <li>Miro MCP — $500</li>
                <li>DeepInvent best patentable hack — $500 + provisional</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-[0_1px_0_rgba(140,113,102,0.12)]">
              <div className="font-display text-sm font-bold uppercase tracking-[0.14em] text-[#594238]">
                Sample question
              </div>
              <p className="mt-3 text-sm text-[#1C1B1B]">
                "Food truck permits issued in 78702 in the last 6 months."
              </p>
              <p className="mt-2 font-mono text-xs text-[#594238]">
                source: 3syk-w9eu (data.austintexas.gov)
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-24 border-t border-[#E0C0B2]/50 bg-[#F6F3F2]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-5 py-6 text-sm text-[#594238] md:flex-row md:items-center md:justify-between md:px-8">
          <span>Built at the AITX Community × Codex Hackathon, May 2026.</span>
          <a
            href="https://github.com/ATX-TXLookup/TXLookup"
            className="text-[#3D5AAB] hover:underline"
          >
            github.com/ATX-TXLookup/TXLookup
          </a>
        </div>
      </footer>
    </main>
  );
}
