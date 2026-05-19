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
  description: "The team behind TXLookup, an open-source agent for Texas public data.",
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
    role: "Agent runtime",
    github: "jravinder",
    linkedin: "https://www.linkedin.com/in/jravinder",
    blurb:
      "Built the agent loop, planner contracts, result page, and run trace surfaces.",
    tone: "accent",
  },
  {
    name: "Kunal Vasavada",
    role: "Dataset catalog",
    github: "promptkv",
    linkedin: "https://www.linkedin.com/in/kunalvasavada",
    blurb:
      "Curates source datasets, sample questions, and catalog checks so answers point to the right public portal.",
    tone: "good",
  },
  {
    name: "Godwyn James",
    role: "Runtime telemetry",
    github: "goodguygoddy",
    linkedin: "https://www.linkedin.com/in/goodguygoddy/",
    blurb:
      "Added self-correction guards, per-step timing, token usage, and observability for agent runs.",
    tone: "warm",
  },
  {
    name: "Raj Akula",
    role: "MCP integration",
    github: "rajakula1",
    linkedin: "https://www.linkedin.com/in/rajaakula/",
    blurb:
      "Validated TXLookup as an MCP server for external agent runtimes and maintained the install path.",
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
  { label: "Coverage", value: "Texas public data" },
  { label: "Interface", value: "Plain-English lookups" },
  { label: "Output", value: "Cited answers" },
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
            About TXLookup
          </p>
          <h1 className="mt-4 max-w-[28ch] text-[32px] font-semibold leading-[1.15] tracking-[-0.015em] text-[var(--ds-text)] md:text-[44px]">
            Public data, made answerable.
          </h1>
          <p className="mt-6 max-w-[64ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
            TXLookup is an open-source civic data agent for Texas. Ask a question in plain English; it finds the dataset, runs the query, checks the result, and cites the public source.
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

      {/* PRODUCT */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-14 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-16">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
              How it works
            </p>
            <h2 className="mt-3 max-w-[28ch] text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--ds-text)] md:text-[30px]">
              One question becomes a sourced result.
            </h2>
          </div>
          <div className="grid gap-3">
            {[
              ["Find", "Ranks relevant Texas and city datasets from the catalog."],
              ["Query", "Builds and runs a bounded API query against the public source."],
              ["Check", "Reviews the result and attaches citations before showing the answer."],
              ["Share", "Creates follow-up questions or a Miro board when the result needs to travel."],
            ].map(([label, body]) => (
              <div key={label} className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4">
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
                  {label}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-[var(--ds-text-mute)]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
            Team
          </p>
          <h2 className="mt-3 max-w-[36ch] text-[22px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--ds-text)] md:text-[26px]">
            Built by a small Austin team.
          </h2>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
            The project combines agent runtime work, open-data cataloging, observability, and MCP integration.
          </p>

          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {TEAM.map((p) => (
              <li
                key={p.github}
                className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4 transition-colors hover:border-[var(--ds-text-dim)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: TONE_COLOR[p.tone] }}
                          aria-hidden
                        />
                        <h3 className="text-[17px] font-bold tracking-tight text-[var(--ds-text)]">
                          {p.name}
                        </h3>
                      </div>
                      <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                        {p.role}
                      </p>
                    </div>
                  <div className="flex flex-wrap items-center gap-2">
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
            Coverage
          </p>
          <h2 className="mt-3 max-w-[36ch] text-[22px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--ds-text)] md:text-[28px]">
            What the project covers.
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
                  className="text-[28px] font-semibold tabular-nums tracking-tight md:text-[36px]"
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
          <h2 className="mt-3 max-w-[48ch] text-[20px] font-semibold leading-[1.25] tracking-[-0.005em] text-[var(--ds-text)] md:text-[26px]">
            Built on public data and open tools.
          </h2>
          <p className="mt-4 max-w-[64ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
            TXLookup uses datasets published by Austin, Dallas, San Antonio, Houston, and the State of Texas. The project also uses Miro for visual reports and MCP tooling for agent-runtime access.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/q"
              className="inline-flex items-center gap-2 rounded-md bg-[color-mix(in_srgb,var(--ds-accent)_12%,var(--ds-bg))] px-4 py-2.5 text-[13px] font-semibold text-[var(--ds-accent)] hover:bg-[color-mix(in_srgb,var(--ds-accent)_16%,var(--ds-bg))]"
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
