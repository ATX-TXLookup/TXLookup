// /pitch — single-page pitch deck. Pulls every important fact from across
// the site into one scannable narrative for judges, investors, and anyone
// who wants the full story without clicking through 14 routes.

import Link from "next/link";
import { Shell, TerminalBlock } from "@/app/components/ds";
import { CATALOG } from "@/app/lib/catalog";
import { loadDiscovery } from "@/app/lib/catalog-discovered";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export const metadata = {
  title: "Pitch — TXLookup · The civic-data agent",
  description:
    "TXLookup brings agentic AI to normal users. Plain-English questions to 6,061 Texas civic datasets. Multi-agent loop. MCP-installable. MIT-licensed.",
};

const TONE: Record<string, string> = {
  accent: "var(--ds-accent)",
  good: "var(--ds-good)",
  warm: "var(--ds-warm)",
  warn: "var(--ds-warn)",
  bad: "var(--ds-bad)",
  purple: "var(--ds-purple)",
  mute: "var(--ds-text-mute)",
};

export default async function PitchPage() {
  const discovery = await loadDiscovery();
  return (
    <Shell active="/pitch">
      {/* HERO — the one-liner */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-16 md:px-8 md:py-24">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
            The pitch · 90 seconds end-to-end
          </p>
          <h1 className="mt-5 max-w-[18ch] text-[44px] font-bold leading-[1.04] tracking-[-0.025em] text-[var(--ds-text)] md:text-[80px]">
            Texas civic data,{" "}
            <span className="text-[var(--ds-text-mute)]">accessible to anyone who can search Google.</span>
          </h1>
          <p className="mt-8 max-w-[68ch] text-[18px] leading-[1.6] text-[var(--ds-text-mute)] md:text-[22px]">
            <span className="text-[var(--ds-text)]">{discovery.totalKnown.toLocaleString()} datasets across {discovery.portals.length} open-data portals.</span> A team of OpenAI-powered agents picks the right one, writes the query, runs it on the source-of-truth portal, and hands you a sourced answer in plain English. Free. Open source. MIT-licensed. <span className="text-[var(--ds-good)]">Live at <Link href="/" className="underline decoration-[var(--ds-good)] underline-offset-4">txlookup.vercel.app</Link></span>.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/q"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--ds-purple)] px-5 py-3 text-[14px] font-semibold uppercase tracking-[0.08em] text-white hover:opacity-90"
            >
              Try the agent →
            </Link>
            <Link
              href="/reports/austin-heat-index-2026"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-5 py-3 text-[14px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-accent)]"
            >
              See the flagship report →
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-5 py-3 text-[14px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-accent)]"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
            01 · The problem
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
            Civic data is public. Reaching it isn&rsquo;t.
          </h2>
          <p className="mt-5 max-w-[68ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)] md:text-[18px]">
            Sifting through your city&rsquo;s data is hard. Unless you&rsquo;re a developer, a city official, or a reporter. The state and its cities run six open-data portals exposing {discovery.totalKnown.toLocaleString()} datasets. The current path: download a CSV, open a spreadsheet, filter by hand, give up. Most people never even try.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              { eyebrow: "Six portals", n: "6", body: "Different APIs (Socrata + CKAN), different IDs, different conventions, different filters.", tone: "accent" },
              { eyebrow: "Schema drift", n: "180+", body: "180+ columns just for permits. permittype vs work_class vs permit_class_mapped — same idea, three columns, three meanings.", tone: "warn" },
              { eyebrow: "SoQL syntax", n: "Brutal", body: "$where, $group, date_extract_y, double-quoting strings, escaping single quotes. One typo and the query 400s.", tone: "bad" },
              { eyebrow: "Download + sift", n: "Hours", body: "200,000-row CSVs in a spreadsheet. Most people give up before they reach an answer.", tone: "purple" },
            ].map((f) => (
              <div key={f.eyebrow} className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: TONE[f.tone] }}>
                  {f.eyebrow}
                </p>
                <p className="mt-3 text-[28px] font-bold tabular-nums tracking-[-0.02em]" style={{ color: TONE[f.tone] }}>
                  {f.n}
                </p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ds-text-mute)]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE PRODUCT */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-good)]">
            02 · The product
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
            Google search, with a concierge agent.
          </h2>
          <p className="mt-5 max-w-[68ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)] md:text-[18px]">
            You type a question. Seven specialist agents work for you. Planner picks the dataset. Analyst writes the SoQL. Critic verifies the citation. Reporter composes plain English. Support handles disambiguation. Two background agents grow the corpus on a six-hour cron.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              { name: "Planner", role: "Picks the dataset · drafts the plan", tone: "accent" },
              { name: "Data analyst", role: "Writes SoQL · computes stats with quality flags", tone: "good" },
              { name: "Reporter", role: "Composes plain-English answer · grounded in findings", tone: "purple" },
              { name: "Critic", role: "Reviews plan + answer · forces revision on reject", tone: "warn" },
              { name: "Support", role: "Disambiguation · meta questions · no SoQL", tone: "warm" },
              { name: "Scout + ingestor", role: "Cron-driven · grows the indexed catalog every 6h", tone: "mute" },
            ].map((a) => (
              <div key={a.name} className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: TONE[a.tone] }} aria-hidden />
                  <p className="text-[14px] font-bold text-[var(--ds-text)]">{a.name}</p>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-snug text-[var(--ds-text-mute)]">{a.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
            03 · How it works
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
            Plain-English in. Sourced answer out. Seven seconds.
          </h2>

          <ol className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              { n: "01", title: "Reason", body: "User question hits /api/agent. Planner parses intent, decides scope, drafts a structured plan with bounded tool calls." },
              { n: "02", title: "Plan + Critic", body: "Critic reviews the plan. Flags ungrounded steps. Forces a revision if the plan won't survive the answer-stage critic." },
              { n: "03", title: "Execute", body: "Tool dispatch fires bounded SoQL via Socrata + CKAN. 5,000-row cap. 30s timeout. 429 fallback to local cache." },
              { n: "04", title: "Doom-loop guard", body: "Pattern-based detector catches identical-3x and [A,B,A,B] cycles in code. Replan path preserves user intent across rewrites. (The patentable bit.)" },
              { n: "05", title: "Compose", body: "Reporter takes findings + cited rows, writes plain English. Critic verifies groundedness. Forces a final revision if needed." },
              { n: "06", title: "Cite + Ship", body: "Every answer carries portal + dataset_id + last_refreshed + a replayable SODA URL. Click any citation to reach the source." },
            ].map((s) => (
              <li key={s.n} className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
                <p className="font-mono text-[11px] font-bold tabular-nums tracking-[0.18em] text-[var(--ds-purple)]">
                  {s.n}
                </p>
                <p className="mt-2 text-[16px] font-bold text-[var(--ds-text)]">{s.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ds-text-mute)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* THE CORPUS GROWS */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-good)]">
            04 · The corpus grows itself
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
            {CATALOG.length} curated today. {discovery.totalKnown.toLocaleString()} indexed. More every six hours.
          </h2>
          <p className="mt-5 max-w-[68ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)]">
            The {CATALOG.length} curated datasets carry full schema knowledge — hand-picked SoQL, glossary entries per key column, locally mirrored every 6h. The rest of the {discovery.totalKnown.toLocaleString()}-dataset universe is answered live: the agent reads catalog metadata, plans a query, hits the source portal, comes back. As the data analyst agent works through more datasets, more graduate into the curated corpus. The system grows itself.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {discovery.portals.map((p) => (
              <div key={p.portal} className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-4">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ds-text-dim)]">
                  {p.portal.replace(/^www\./, "")}
                </p>
                <p className="mt-2 text-[24px] font-bold tabular-nums text-[var(--ds-good)]">
                  {p.total_known.toLocaleString()}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                  datasets indexed
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USE IT IN YOUR CODING AGENT */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
            05 · It&rsquo;s extensible
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
            Use the same agent in your coding tools.
          </h2>
          <p className="mt-5 max-w-[68ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)]">
            TXLookup ships as an MCP server. Eight tools. Installable in Claude Code, Cursor, Codex — one command. Your coding agent now queries Texas civic data the same way ours does. Skill doc included — teaches any runtime when to call which tool.
          </p>

          <div className="mt-8 space-y-3">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              Claude Code
            </p>
            <TerminalBlock>{`claude mcp add txlookup -- python -m mcp.server`}</TerminalBlock>
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              Codex
            </p>
            <TerminalBlock>{`codex mcp add txlookup --command python --args -m --args mcp.server`}</TerminalBlock>
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
              Cursor — paste into MCP settings
            </p>
            <TerminalBlock>{`{
  "txlookup": {
    "command": "python",
    "args": ["-m", "mcp.server"]
  }
}`}</TerminalBlock>
          </div>

          <div className="mt-8 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
              Roadmap
            </p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--ds-text-mute)]">
              Texas today. Same pipeline ingests Chicago, NYC, San Francisco — anywhere there&rsquo;s a Socrata or CKAN portal. Open source. Anyone can extend it. Add a portal config; the scout starts indexing on the next 6h tick.
            </p>
          </div>
        </div>
      </section>

      {/* NUMBERS */}
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
            06 · By the numbers
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
            What landed in 48 hours.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              { v: discovery.totalKnown.toLocaleString(), l: "Datasets indexed", s: `${discovery.portals.length} portals · Socrata + CKAN`, tone: "accent" },
              { v: String(CATALOG.length), l: "Deeply curated", s: "Schema + cached rows + glossary", tone: "good" },
              { v: "7", l: "Specialist agents", s: "5 in /q loop · 2 scheduled crons", tone: "purple" },
              { v: "8", l: "MCP tools", s: "Installable in Claude Code, Cursor, Codex", tone: "warm" },
            ].map((s) => (
              <div key={s.l} className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg)] p-5">
                <p className="text-[40px] font-bold tabular-nums tracking-tight md:text-[56px]" style={{ color: TONE[s.tone] }}>
                  {s.v}
                </p>
                <p className="mt-1 text-[14px] font-medium text-[var(--ds-text)]">{s.l}</p>
                <p className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                  {s.s}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM + CTA */}
      <section>
        <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
            07 · The team
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text)] md:text-[36px]">
            Four people. Shipped at the AITX × Codex Hackathon, May 2026.
          </h2>
          <p className="mt-3 max-w-[60ch] text-[14.5px] leading-relaxed text-[var(--ds-text-mute)]">
            Ravinder Jilkapally · Kunal Vyas · Godwyn James · Raj Akula. <Link href="/about" className="text-[var(--ds-accent)] hover:underline">Full bios + LinkedIns</Link>.
          </p>

          <div className="mt-10 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-7">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-good)]">
              Try it now
            </p>
            <p className="mt-3 max-w-[64ch] text-[16px] leading-relaxed text-[var(--ds-text)]">
              No login. No setup. Click any question, the agent fires.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/q?q=Restaurants%20near%2078704%20with%20failing%20inspections%20this%20year"
                className="inline-flex items-center gap-2 rounded-md bg-[var(--ds-purple)] px-5 py-3 text-[14px] font-semibold uppercase tracking-[0.08em] text-white hover:opacity-90"
              >
                Try the agent →
              </Link>
              <Link
                href="/architecture"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg)] px-5 py-3 text-[14px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-accent)]"
              >
                Read the architecture →
              </Link>
              <a
                href="https://github.com/ATX-TXLookup/TXLookup"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg)] px-5 py-3 text-[14px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-accent)]"
              >
                GitHub ↗
              </a>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
