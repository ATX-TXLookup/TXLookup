// /about — team + project page.
// Dark theme, matches the rest of the site (Shell wrapper, ds tokens).

import Link from "next/link";
import { Shell } from "@/app/components/ds";
import { CATALOG } from "@/app/lib/catalog";
import { loadDiscovery } from "@/app/lib/catalog-discovered";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export const metadata = {
  title: "About — TXLookup",
  description: "The team behind TXLookup. Built at the AITX × Codex Hackathon, May 2026.",
};

type Person = {
  name: string;
  role: string;
  github: string;
  linkedin?: string | null;
  blurb: string;
  tone: "accent" | "good" | "warm" | "purple";
};

const TEAM: Person[] = [
  {
    name: "Ravinder Jilkapally",
    role: "Agent loop · Replanner · Observatory",
    github: "jravinder",
    linkedin: "https://www.linkedin.com/in/jravinder",
    blurb:
      "Built the multi-agent orchestrator, the doom-loop guard, and the /q observatory. Owns the agent runtime and the planner contracts.",
    tone: "accent",
  },
  {
    name: "Kunal Vyas",
    role: "Dataset onboarding · Catalog correctness",
    github: "promptkv",
    linkedin: "https://www.linkedin.com/in/kunalvasavada",
    blurb:
      "Curates the dataset catalog. Wrote the user-story corpus and the 90-question Claude harness. Filed the bugs that pinned the 311 dataset-id and the permits-column mismatch.",
    tone: "good",
  },
  {
    name: "Godwyn James",
    role: "Doom-loop wiring · Instrumentation",
    github: "goodguygoddy",
    linkedin: "https://www.linkedin.com/in/goodguygoddy/",
    blurb:
      "Wired the pattern-based doom-loop guard into the agent runtime. Owns the per-step duration_ms + token-usage telemetry that feeds the STATUS panel.",
    tone: "warm",
  },
  {
    name: "Raj Akula",
    role: "External-runtime validation · MCP integration",
    github: "rajakula1",
    linkedin: "https://www.linkedin.com/in/rajaakula/",
    blurb:
      "Validates TXLookup as an MCP server in external runtimes (Claude Code, Cursor, Codex). Authored the MCP manifest + Smithery deploy spec.",
    tone: "purple",
  },
];

const TONE_COLOR: Record<Person["tone"], string> = {
  accent: "var(--ds-accent)",
  good: "var(--ds-good)",
  warm: "var(--ds-warm)",
  purple: "var(--ds-purple)",
};

const PROJECT_FACTS = [
  { label: "Hackathon", value: "AITX × Codex" },
  { label: "Tracks", value: "Agents + Open Data (combined)" },
  { label: "Dates", value: "May 8–10, 2026" },
  { label: "License", value: "MIT" },
  { label: "Repo", value: "github.com/ATX-TXLookup/TXLookup" },
];

export default async function AboutPage() {
  const discovery = await loadDiscovery();
  return (
    <Shell active="/about">
      {/* HERO */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
            About · The team
          </p>
          <h1 className="mt-4 max-w-[24ch] text-[44px] font-bold leading-[1.04] tracking-[-0.025em] text-[var(--ds-text)] md:text-[64px]">
            Four people. Seven agents. {discovery.totalKnown.toLocaleString()} datasets.
          </h1>
          <p className="mt-6 max-w-[64ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
            Built at the AITX × Codex Hackathon (May 8–10, 2026). A live layer over the source-of-truth Texas + Austin open-data portals. Plain-English in, sourced answer out, every claim citable back to the originating portal.
          </p>

          <div className="mt-8 grid gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.12em] md:grid-cols-3">
            {PROJECT_FACTS.map((f) => (
              <div key={f.label} className="flex items-baseline gap-2">
                <span className="text-[var(--ds-text-dim)]">{f.label}</span>
                <span className="text-[var(--ds-text)]">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
            The roster
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
            Builders, not just demoers.
          </h2>
          <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)] md:text-[16px]">
            Each person owns a distinct slice. Git history attributes every line.
          </p>

          <ul className="mt-12 grid gap-5 md:grid-cols-2">
            {TEAM.map((p) => (
              <li
                key={p.github}
                className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-6 transition-colors hover:border-[var(--ds-text-dim)]"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: TONE_COLOR[p.tone] }}
                        aria-hidden
                      />
                      <h3 className="text-[20px] font-bold tracking-tight text-[var(--ds-text)] md:text-[22px]">
                        {p.name}
                      </h3>
                    </div>
                    <p
                      className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em]"
                      style={{ color: TONE_COLOR[p.tone] }}
                    >
                      {p.role}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[14.5px] leading-relaxed text-[var(--ds-text-mute)]">
                  {p.blurb}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <a
                    href={`https://github.com/${p.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg)] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ds-text-mute)] transition-colors hover:border-[var(--ds-accent)] hover:text-[var(--ds-text)]"
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    @{p.github}
                  </a>
                  {p.linkedin ? (
                    <a
                      href={p.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--ds-accent)]/40 bg-[var(--ds-accent)]/[0.08] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ds-accent)] hover:bg-[var(--ds-accent)]/[0.16]"
                    >
                      LinkedIn ↗
                    </a>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--ds-border)] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ds-text-dim)]"
                      title="LinkedIn URL coming"
                    >
                      LinkedIn · soon
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* WHAT WE BUILT (numbers strip) */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-good)]">
            By the numbers
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[36px]">
            What landed in 48 hours.
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                value: discovery.totalKnown.toLocaleString(),
                label: "Texas datasets indexed",
                sub: `${discovery.portals.length} portals · Socrata + CKAN`,
                tone: "accent" as const,
              },
              { value: String(CATALOG.length), label: "Deeply curated", sub: "Schema knowledge + cached rows", tone: "good" as const },
              { value: "7", label: "Specialist agents", sub: "Orchestrator / analyst / reporter / support / critic / scout / ingestor", tone: "purple" as const },
              { value: "8", label: "MCP tools exposed", sub: "Discoverable from Claude Code, Cursor, Codex", tone: "warm" as const },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5"
              >
                <p
                  className="text-[40px] font-bold tabular-nums tracking-tight md:text-[56px]"
                  style={{ color: TONE_COLOR[s.tone] }}
                >
                  {s.value}
                </p>
                <p className="mt-1 text-[14px] font-medium text-[var(--ds-text)]">{s.label}</p>
                <p className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                  {s.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THANKS / FOOTER */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
            Acknowledgements
          </p>
          <h2 className="mt-3 max-w-[40ch] text-[24px] font-bold leading-[1.2] tracking-[-0.02em] text-[var(--ds-text)] md:text-[32px]">
            None of this exists without the open-data movement.
          </h2>
          <p className="mt-4 max-w-[64ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
            Thanks to the cities of Austin, Dallas, San Antonio, Houston, and the State of Texas for publishing the datasets behind this site openly. Thanks to AITX and Codex for hosting the hackathon, and to Miro and Smithery for the MCP tooling. The agent loop runs on OpenAI Codex / GPT-4o, with Featherless as an open-source fallback.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/q"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--ds-text)] px-4 py-2.5 text-[13px] font-semibold text-[var(--ds-bg)] hover:bg-[var(--ds-text-mute)]"
            >
              Try the agent →
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-4 py-2.5 text-[13px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-accent)]"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </section>
    </Shell>
  );
}
