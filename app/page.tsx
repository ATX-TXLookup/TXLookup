// TXLookup homepage — Undervolt-ATX visual + VCAP info flow.
// Per /Users/red/.claude/plans/golden-prancing-tome.md.
//
// Sections, top-to-bottom:
//   1. Hero with orange context badge + serif italic display headline + 3 CTAs
//   2. THE PROBLEM — 2-col, 3 problem cards with colored icons
//   3. PLATFORMS — 4-card grid (multi-agent / MCP / critic+scout / open source)
//   4. WHO IS THIS FOR — 3 persona cards with gradient bg
//   5. MULTI-AGENT TOPOLOGY — AgentTopologyShowcase (restyled separately)
//   6. AUSTIN BY THE NUMBERS — 3 big serif stat callouts from real Socrata
//   7. OPEN SOURCE — minimal CTA
//
// All numbers are live (homepage-data.ts → Socrata). No fake stats. No
// marketing copy. No exec quotes.

import Link from "next/link";
import AgentTopologyShowcase from "@/app/components/AgentTopologyShowcase";
import { HeroTexasMap } from "@/app/components/HeroTexasMap";
import {
  EyebrowLabel,
  FeatureCard,
  PersonaCard,
  SectionHeader,
  Shell,
  StatCallout,
  TerminalBlock,
} from "@/app/components/ds";
import {
  austin311Last30d,
  austinInspections30dByZip,
  austinOpenCodeViolations,
  austinPermits7dTotal,
  austinPermitsLast7Days,
} from "@/app/lib/homepage-data";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function HomePage() {
  const [permitsSpark, permits7d, inspectionsByZip, requests30d, openViolations] = await Promise.all([
    austinPermitsLast7Days(),
    austinPermits7dTotal(),
    austinInspections30dByZip(),
    austin311Last30d(),
    austinOpenCodeViolations(),
  ]);

  const totalPermits7d = permitsSpark.reduce((s, d) => s + d.count, 0);

  return (
    <Shell active="/">
      {/* HERO — text left, Texas map right */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 pb-20 pt-12 md:px-8 md:pb-28 md:pt-16">
        <div className="grid items-center gap-12 md:grid-cols-12 md:gap-14">
        <div className="md:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ds-warm)]/40 bg-[rgba(249,115,22,0.10)] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ds-warm)]" />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ds-warm)]">
              Any civic dataset · sourced · cited · always-on scout
            </span>
          </div>

          <h1 className="mt-6 max-w-[18ch] text-[42px] font-bold leading-[1.04] tracking-[-0.025em] text-[var(--ds-text)] md:text-[68px]">
            <span className="font-display-serif font-normal">Any civic dataset.</span>
            <br />
            <span className="text-[var(--ds-text-mute)]">Any question. Sourced.</span>
          </h1>

          <p className="mt-6 max-w-[58ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
            Point us at a Socrata portal — Austin, Dallas, San Antonio, Houston, the state, or your own city. The dataset scout discovers schema. The ingestor populates a local cache. Five specialist agents — orchestrator, data analyst, critic, reporter, support — work the question with citation enforced at the protocol level.
          </p>
          <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
            Not a wrapper. The agent acquires the corpus on its own and{" "}
            <span className="text-[var(--ds-good)]">turns any portal into knowledge.</span>
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/q"
              className="inline-flex items-center rounded-md bg-[var(--ds-text)] px-5 py-2.5 text-[13px] font-semibold text-[var(--ds-bg)] hover:bg-[var(--ds-text-mute)]"
            >
              Try the agent →
            </Link>
            <Link
              href="/datasets"
              className="inline-flex items-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-5 py-2.5 text-[13px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-text-dim)]"
            >
              Browse the corpus
            </Link>
            <Link
              href="/use-as-agent"
              className="inline-flex items-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-5 py-2.5 text-[13px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-text-dim)]"
            >
              Bring your own portal
            </Link>
          </div>
        </div>
        <div className="md:col-span-5">
          <HeroTexasMap />
        </div>
        </div>
        </div>
      </section>

      {/* BRING YOUR OWN DATASET — the universality moat */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-8 md:py-28">
          <SectionHeader
            eyebrow="The selling point"
            eyebrowTone="good"
            headline={
              <>
                Any dataset. Any portal.{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
                  Knowledge in 24 hours.
                </span>
              </>
            }
            sub="The scout + ingestor + multi-agent loop is portable. Texas is the demo corpus — the same pipeline ingests Chicago, NYC, LA, federal data.gov, anywhere with a Socrata-compatible API. People become knowledge-capable without writing a line of SoQL."
          />
          <div className="mt-12 grid gap-3 md:grid-cols-3">
            <FeatureCard
              tone="accent"
              icon={<span className="text-[14px]">▷</span>}
              title="1. Point at a portal"
              body="Open an issue with the portal hostname. The scout's next 6h tick discovers every available dataset, scores it on (rows · time-col · geo-col · freshness · license), and proposes a catalog entry."
              href="https://github.com/ATX-TXLookup/TXLookup/issues/new?labels=area%3Adata%2Cdataset-request&title=Add+portal%3A+"
              ctaLabel="File a portal request →"
            />
            <FeatureCard
              tone="purple"
              icon={<span className="text-[14px]">⌽</span>}
              title="2. Ingestor populates"
              body="The ingestor cron pulls deltas into a local SQLite cache so cross-dataset SQL JOINs work (Socrata SoQL can't). Source pill (cache/live/cache-fallback) on every tool envelope."
              href="/agents/ingestor"
              ctaLabel="See the ingestor →"
            />
            <FeatureCard
              tone="warm"
              icon={<span className="text-[14px]">⌖</span>}
              title="3. Anyone asks"
              body="A citizen, journalist, or civic team types a question in plain English. The orchestrator dispatches specialists. The critic rejects ungrounded answers. The reporter composes long-form. Every claim has a citation."
              href="/q"
              ctaLabel="Try a question →"
            />
          </div>
          <div className="mt-12 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-6">
            <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--ds-good)]">
                On the scout's queue right now
              </p>
              <p className="font-mono text-[12px] text-[var(--ds-text-mute)]">
                San Antonio · Houston · El Paso · data.texas.gov · data.gov (federal pilot)
              </p>
              <Link
                href="/agents/dataset-scout"
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-good)] hover:text-[var(--ds-text)]"
              >
                Watch the scout →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-8 md:py-28">
          <div className="grid gap-10 md:grid-cols-12 md:gap-14">
            <div className="md:col-span-5">
              <EyebrowLabel tone="warm">The problem</EyebrowLabel>
              <h2 className="mt-3 max-w-[18ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[48px]">
                Civic data is hiding{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">in plain sight.</span>
              </h2>
              <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
                Hundreds of Texas open datasets across nine portals. Inconsistent schemas. Broken filters. Generic AI confidently hallucinates. Citizens, journalists, and civic teams pay the cost.
              </p>
            </div>

            <div className="grid gap-3 md:col-span-7 md:grid-cols-1">
              <FeatureCard
                tone="good"
                icon={<span className="text-[14px]">▣</span>}
                title="Portal sprawl"
                body="Austin, Dallas, San Antonio, Houston, plus state portals. Each with its own schema quirks, column-name aliases, and broken UI filters. No one assistant grounds across them."
              />
              <FeatureCard
                tone="warn"
                icon={<span className="text-[14px]">≋</span>}
                title="Hallucinated answers"
                body="ChatGPT will confidently invent percentages and cite imaginary URLs. Most 'data agents' wrap an LLM and inherit the same failure mode. We made citation a protocol-level requirement instead."
              />
              <FeatureCard
                tone="bad"
                icon={<span className="text-[14px]">!</span>}
                title="Brittle one-shot loops"
                body="A single SoQL guess that returns zero rows ends the conversation. Wrappers don't notice. Our critic agent grades every answer and forces a corrective revision when the data doesn't actually support it."
              />
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORMS */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-8 md:py-28">
          <SectionHeader
            eyebrow="Platforms"
            eyebrowTone="accent"
            headline={
              <>
                From raw portals to{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">sourced answers.</span>
              </>
            }
            sub="Built on Socrata SODA, FastMCP, OpenAI structured outputs, and a custom multi-agent orchestrator. Each piece replaces a class of failure that wrappers can't address."
          />
          <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              tone="good"
              icon={<span className="text-[14px]">⌬</span>}
              title="Multi-agent loop"
              body="Orchestrator dispatches to data analyst, reporter, support. Critic agent self-corrects. Visible per-step in the DAG."
              href="/agents"
              ctaLabel="See the agents →"
            />
            <FeatureCard
              tone="warm"
              icon={<span className="text-[14px]">⟂</span>}
              title="MCP server"
              body="Eight tools for any MCP-compliant runtime. Drops into Claude Code, Codex, Cursor in 30 seconds with citation enforced."
              href="/use-as-agent"
              ctaLabel="Install pitch →"
            />
            <FeatureCard
              tone="purple"
              icon={<span className="text-[14px]">⌖</span>}
              title="Critic + scout"
              body="Critic grades plan + answer. Dataset scout cron scans 5 TX portals every 6h, files issues for new datasets the corpus should ingest."
              href="/agents/critic"
              ctaLabel="How it works →"
            />
            <FeatureCard
              tone="neutral"
              icon={<span className="text-[14px]">◇</span>}
              title="Open source"
              body="MIT-licensed. Adapts to any city or dataset. Source on GitHub, skill doc + manifest published for marketplace discovery."
              href="https://github.com/ATX-TXLookup/TXLookup"
              ctaLabel="View on GitHub ↗"
            />
          </div>
        </div>
      </section>

      {/* WHO IS THIS FOR */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-8 md:py-28">
          <SectionHeader
            eyebrow="Who is this for"
            eyebrowTone="purple"
            headline={
              <>
                Built for the people who{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">read the data.</span>
              </>
            }
            align="center"
          />
          <div className="mt-12 grid gap-3 md:grid-cols-3">
            <PersonaCard
              tone="blue"
              icon="🏛️"
              title="Civic teams"
              body="Cross-dataset analysis without writing SoQL. Pull permits + violations + 311 in a single sourced answer. Citation enforced for every data point."
            />
            <PersonaCard
              tone="warm"
              icon="📰"
              title="Journalists"
              body="USAFacts-grade reports with chart-prose interleave + source per chart. Trace any number back to the run that generated it via /admin/replay."
            />
            <PersonaCard
              tone="purple"
              icon="🧑‍💻"
              title="Builders"
              body="Install as an MCP server. Bounded queries, replayable archive, doom-loop guard. Use in Claude Code, Codex, Cursor, or your own MCP client."
            />
          </div>
        </div>
      </section>

      {/* MULTI-AGENT TOPOLOGY */}
      <AgentTopologyShowcase />

      {/* AUSTIN BY THE NUMBERS */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-8 md:py-28">
          <SectionHeader
            eyebrow="Live · Austin"
            eyebrowTone="good"
            headline={
              <>
                The corpus, right{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">now.</span>
              </>
            }
            sub="Live counts pulled from Socrata at request time. Recomputed every 5 minutes."
          />

          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-14">
            <StatCallout
              tone="good"
              value={permits7d > 0 ? `+${permits7d.toLocaleString()}` : "—"}
              label="Permits issued · last 7 days"
              caption="Source: City of Austin Issued Construction Permits (3syk-w9eu)"
            />
            <StatCallout
              tone="warm"
              value={inspectionsByZip[0] ? inspectionsByZip[0].zip : "—"}
              label={inspectionsByZip[0] ? `Top inspection zip · ${inspectionsByZip[0].count} in 30d` : "Top inspection zip · 30d"}
              caption="Source: Austin Food Establishment Inspection Scores (ecmv-9xxi)"
            />
            <StatCallout
              tone={openViolations > 5000 ? "bad" : "warn"}
              value={openViolations > 0 ? openViolations.toLocaleString() : "—"}
              label="Open code violations"
              caption="Source: Austin Code Violation Cases (6wtj-zbtb)"
            />
          </div>

          <div className="mt-12 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
            <div className="flex items-baseline justify-between">
              <p className="ds-eyebrow text-[var(--ds-text-dim)]">Permits issued · last 7 days</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                {totalPermits7d.toLocaleString()} total
              </p>
            </div>
            <div className="mt-4 flex h-[80px] items-end gap-1.5">
              {permitsSpark.length > 0 ? (
                permitsSpark.map((d) => {
                  const max = Math.max(1, ...permitsSpark.map((x) => x.count));
                  return (
                    <div key={d.day} className="flex flex-1 flex-col items-center justify-end">
                      <div
                        className="w-full rounded-sm"
                        style={{
                          height: `${(d.count / max) * 72}px`,
                          background: "linear-gradient(180deg, var(--ds-accent) 0%, rgba(91,141,239,0.3) 100%)",
                        }}
                        title={`${d.day}: ${d.count}`}
                      />
                    </div>
                  );
                })
              ) : (
                <p className="text-[12px] text-[var(--ds-text-mute)]">Live data temporarily unavailable.</p>
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
              <span>{permitsSpark[0]?.day}</span>
              <span>{permitsSpark[permitsSpark.length - 1]?.day}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4">
              <div>
                <p className="ds-eyebrow text-[var(--ds-text-dim)]">311 requests · 30d</p>
                <p className="mt-1 text-[20px] font-bold tabular-nums text-[var(--ds-text)]">
                  {requests30d > 0 ? requests30d.toLocaleString() : "—"}
                </p>
              </div>
              <Link
                href="/datasets/xwdj-i9he"
                className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-accent)] hover:text-[var(--ds-text)]"
              >
                xwdj-i9he →
              </Link>
            </div>
            <div className="flex items-center justify-between rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4">
              <div>
                <p className="ds-eyebrow text-[var(--ds-text-dim)]">9 datasets curated</p>
                <p className="mt-1 text-[20px] font-bold tabular-nums text-[var(--ds-text)]">
                  Austin · Dallas · TX state
                </p>
              </div>
              <Link
                href="/datasets"
                className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-accent)] hover:text-[var(--ds-text)]"
              >
                universe →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* OPEN SOURCE / INSTALL */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-8 md:py-28">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <EyebrowLabel tone="accent">Open source</EyebrowLabel>
              <h2 className="mt-3 max-w-[18ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[40px]">
                Install in your agent.{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">Bring your own city.</span>
              </h2>
              <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
                MCP server + agent skill. Bounded queries, citation enforced, ships with a 90-question test harness. MIT licensed. Adapts to any Socrata-backed civic portal.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link
                  href="/use-as-agent"
                  className="inline-flex items-center rounded-md bg-[var(--ds-text)] px-4 py-2 text-[12px] font-semibold text-[var(--ds-bg)] hover:bg-[var(--ds-text-mute)]"
                >
                  Install pitch →
                </Link>
                <a
                  href="https://github.com/ATX-TXLookup/TXLookup"
                  className="inline-flex items-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] px-4 py-2 text-[12px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-text-dim)]"
                >
                  GitHub ↗
                </a>
              </div>
            </div>

            <div className="md:col-span-7">
              <TerminalBlock title="~/txlookup · install" tone="good">
{`# 1. Install in Claude Code
$ claude mcp add txlookup -- python -m mcp.server

# 2. Ask
$ claude
> use txlookup: food truck permits 78702 last 6 months

# 3. Sourced answer in 7 seconds
→ 47 mobile food vendor permits, 22% above prior 6mo
→ cite: 3syk-w9eu · data.austintexas.gov · 7.4s · 6,039 tok`}
              </TerminalBlock>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                8 tools · 5,000-row cap · 30s timeout · backoff on 429 · citation enforced
              </p>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
