// /developer — single-screen transparency view of the TXLookup system.
// MCP server card, full tool catalog, agent roster, install snippets, API
// surface, sample queries, and live-ish telemetry. All sourced from
// mcp/manifest.json + the existing /agents roster + /api/admin/runs.
//
// Public page — falls back gracefully when run-archive isn't readable.

import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";

import {
  EyebrowLabel,
  FeatureCard,
  SectionHeader,
  Shell,
  TerminalBlock,
} from "@/app/components/ds";
import { listRuns } from "@/app/lib/run-archive";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "Developer reference — TXLookup",
  description:
    "MCP tool catalog, agent roster, install snippets, API endpoints, and live telemetry for the TXLookup civic data agent.",
};

// ─── manifest typing ──────────────────────────────────────────────────────
type ManifestTool = {
  name: string;
  description: string;
  input_schema?: { properties?: Record<string, unknown>; required?: string[] };
  examples?: { input?: unknown; output_summary?: string }[];
};

type Manifest = {
  name: string;
  display_name: string;
  version: string;
  description: string;
  repository: string;
  license: string;
  transport?: { stdio?: { command: string; args: string[] } };
  tools: ManifestTool[];
  examples?: Record<string, string>;
};

// Hardcoded fallback so the page renders even if manifest.json moves/breaks.
const FALLBACK_MANIFEST: Manifest = {
  name: "txlookup",
  display_name: "TXLookup — Texas civic data agent",
  version: "0.1.0",
  description:
    "MCP server for Texas open civic data. Bounded discovery, scoped queries, citation-enforced summaries.",
  repository: "https://github.com/ATX-TXLookup/TXLookup",
  license: "MIT",
  transport: { stdio: { command: "python", args: ["-m", "mcp.server"] } },
  tools: [
    { name: "discover_datasets", description: "Find a relevant Texas civic dataset for a question." },
    { name: "get_dataset_schema", description: "Inspect a dataset's columns + types before querying." },
    { name: "fetch_data", description: "Fetch up to 100 rows from a Texas Socrata dataset." },
    { name: "ask_data", description: "End-to-end agent loop. Plain-English question → cited answer." },
    { name: "get_task_status", description: "Poll status of a long-running ask_data task." },
    { name: "create_miro_board", description: "Create a Miro board for visualizing agent results." },
    { name: "add_to_miro", description: "Post a structured payload to an existing Miro board." },
    { name: "list_known_tools", description: "Self-introspection: returns this tool catalog." },
  ],
  examples: {},
};

async function loadManifest(): Promise<Manifest> {
  try {
    const p = path.join(process.cwd(), "mcp", "manifest.json");
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw) as Manifest;
  } catch {
    return FALLBACK_MANIFEST;
  }
}

// ─── canned per-tool example inputs ──────────────────────────────────────
const TOOL_EXAMPLE_INPUTS: Record<string, unknown> = {
  discover_datasets: { query: "food truck permits 78702", city: "Austin" },
  get_dataset_schema: { dataset_id: "3syk-w9eu" },
  fetch_data: {
    dataset_id: "3syk-w9eu",
    where: "original_zip='78702' AND issue_date >= '2026-01-01'",
    limit: 100,
  },
  ask_data: { query: "Permits + violations spike together by zip this year" },
  get_task_status: { task_id: "task_01HZ…" },
  create_miro_board: { name: "78702 permits Q1", description: "Auto-built by ask_data" },
  add_to_miro: { board_id: "uXjVM…", items: ["frame", "sticky_grid", "chart_card"] },
  list_known_tools: {},
};

// ─── agent roster — same 7 as /agents, tighter row form ──────────────────
type AgentTone = "accent" | "good" | "warn" | "warm" | "purple" | "neutral" | "bad";
type Agent = { id: string; label: string; role: string; tone: AgentTone; schedule: string; one_line: string; href: string };

const AGENTS: Agent[] = [
  { id: "orchestrator", label: "Orchestrator", role: "Plans & dispatches", tone: "accent", schedule: "On every /q request",
    one_line: "Builds the plan, picks the specialist, runs the doom-loop guard.", href: "/agents/orchestrator" },
  { id: "data_analyst", label: "Data Analyst", role: "Statistical reasoning", tone: "good", schedule: "Triggered by orchestrator",
    one_line: "Owns analytical SoQL — deltas, percentiles, top-N, YoY.", href: "/agents/data-analyst" },
  { id: "reporter", label: "Reporter", role: "Composes /reports", tone: "purple", schedule: "On-demand + nightly cron",
    one_line: "Splices findings into long-form report templates.", href: "/agents/reporter" },
  { id: "support", label: "Support", role: "Disambiguates & helps", tone: "warm", schedule: "Triggered by orchestrator",
    one_line: "Handles vague queries, returns chip-set follow-ups.", href: "/agents/support" },
  { id: "critic", label: "Critic", role: "Self-correction", tone: "warn", schedule: "After every plan + answer",
    one_line: "Grades groundedness + scope; forces a corrective revision.", href: "/agents/critic" },
  { id: "dataset_scout", label: "Dataset Scout", role: "Grows the corpus", tone: "neutral", schedule: "Every 6 hours",
    one_line: "Scans Socrata portals for new datasets, files curation issues.", href: "/agents/dataset-scout" },
  { id: "ingestor", label: "Ingestor", role: "Local cache curator", tone: "good", schedule: "Every 6 hours",
    one_line: "Pulls dataset deltas into SQLite for cross-dataset SQL JOINs.", href: "/agents/ingestor" },
];

const TONE_DOT: Record<AgentTone, string> = {
  accent: "var(--ds-accent)",
  good: "var(--ds-good)",
  warn: "var(--ds-warn)",
  warm: "var(--ds-warm)",
  purple: "var(--ds-purple)",
  neutral: "var(--ds-text-dim)",
  bad: "var(--ds-bad)",
};

// ─── HTTP API surface ────────────────────────────────────────────────────
const API_ROUTES: { method: string; path: string; purpose: string }[] = [
  { method: "POST", path: "/api/agent",       purpose: "SSE stream — reason → plan → tool* → cited answer" },
  { method: "GET",  path: "/api/admin/runs",  purpose: "List archived runs (auth-gated). ?hash=… for one." },
  { method: "POST", path: "/api/admin/runs",  purpose: "Mark a run good | bad | pending." },
];

// ─── sample queries (4 from homepage + 2 advanced) ───────────────────────
const SAMPLE_QUERIES = [
  "Where do permits and code violations both spike together this year by zip?",
  "How has Austin's permit mix shifted from residential to commercial since 2024?",
  "Restaurants near 78704 with failing inspections this year",
  "Build a Miro board mapping 311 hotspots by council district",
  "Compare 311 noise complaints between Austin and Dallas, by month, last 12 months",
  "Cross-reference active food permits in 78702 against open code violations on the same parcel",
];

// ─── install snippets ────────────────────────────────────────────────────
type Snippet = { label: string; tone: "neutral" | "accent" | "good"; cmd: string };
const INSTALL_SNIPPETS: Snippet[] = [
  { label: "claude-code · install MCP", tone: "accent", cmd: "claude mcp add txlookup -- python -m mcp.server" },
  { label: "codex · install MCP",        tone: "neutral", cmd: "codex mcp add txlookup --command python --args -m --args mcp.server" },
  { label: "cursor · settings.json",     tone: "neutral", cmd: '"txlookup": { "command": "python", "args": ["-m", "mcp.server"] }' },
  { label: "curl · ask the agent",       tone: "good",    cmd: "curl -N https://txlookup.vercel.app/api/agent \\\n  -H 'content-type: application/json' \\\n  -d '{\"query\":\"food truck permits in 78702 last 6 months\"}'" },
];

// ─── page ────────────────────────────────────────────────────────────────
export default async function DeveloperPage() {
  const manifest = await loadManifest();

  // Telemetry — public page, so failures must be silent.
  let runsCount = 0;
  let latestQuery: string | null = null;
  try {
    const recent = await listRuns(50);
    runsCount = recent.length;
    latestQuery = recent[0]?.query ?? null;
  } catch {
    runsCount = 0;
    latestQuery = null;
  }

  const transportCmd = manifest.transport?.stdio
    ? `${manifest.transport.stdio.command} ${manifest.transport.stdio.args.join(" ")}`
    : "python -m mcp.server";

  return (
    <Shell active="/developer">
      {/* HERO — small */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-10 md:px-8 md:pb-14 md:pt-14">
          <EyebrowLabel tone="accent">Developer reference · public</EyebrowLabel>
          <h1 className="mt-4 max-w-[36ch] text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[40px]">
            TXLookup developer reference{" "}
            <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
              · MCP tools, agents, install, telemetry.
            </span>
          </h1>
          <p className="mt-4 max-w-[64ch] text-[14px] leading-relaxed text-[var(--ds-text-mute)] md:text-[15px]">
            Everything you need to drop the TXLookup agent into Claude Code, Codex, or Cursor — plus the public surface area we expose. <span className="text-[var(--ds-text)]">6,061 datasets indexed across 6 portals · 9 deeply curated · MIT licensed.</span> One screen, no docs maze.
          </p>
        </div>
      </section>

      {/* MCP SERVER CARD */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <SectionHeader
            eyebrow="MCP server"
            eyebrowTone="accent"
            size="md"
            headline={
              <>
                One server,{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
                  eight tools.
                </span>
              </>
            }
          />
          <div className="mt-8 grid gap-3 md:grid-cols-12">
            <div className="md:col-span-7 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                {manifest.name} · v{manifest.version} · {manifest.license}
              </p>
              <h3 className="mt-2 text-[18px] font-semibold text-[var(--ds-text)]">{manifest.display_name}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--ds-text-mute)]">{manifest.description}</p>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-[11px]">
                <dt className="text-[var(--ds-text-dim)] uppercase tracking-wider">Transport</dt>
                <dd className="text-[var(--ds-text)]">stdio</dd>
                <dt className="text-[var(--ds-text-dim)] uppercase tracking-wider">Command</dt>
                <dd className="text-[var(--ds-text)]">{transportCmd}</dd>
                <dt className="text-[var(--ds-text-dim)] uppercase tracking-wider">Repo</dt>
                <dd>
                  <a href={manifest.repository} className="text-[var(--ds-accent)] hover:text-[var(--ds-text)]">
                    {manifest.repository.replace("https://", "")} ↗
                  </a>
                </dd>
                <dt className="text-[var(--ds-text-dim)] uppercase tracking-wider">License</dt>
                <dd className="text-[var(--ds-text)]">{manifest.license}</dd>
              </dl>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/use-as-agent"
                  className="inline-flex items-center gap-2 rounded-md bg-[var(--ds-text)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--ds-bg)] hover:bg-[var(--ds-text-mute)]"
                >
                  Install pitch →
                </Link>
                <a
                  href={`${manifest.repository}/blob/main/mcp/manifest.json`}
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--ds-border)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--ds-text)] hover:border-[var(--ds-border-strong)]"
                >
                  manifest.json ↗
                </a>
              </div>
            </div>
            <div className="md:col-span-5">
              <TerminalBlock title="~/.claude · mcp" tone="accent">
                <span className="text-[var(--ds-text-dim)]">$ </span>
                claude mcp add txlookup \{"\n"}
                {"  "}-- {transportCmd}{"\n\n"}
                <span className="text-[var(--ds-good)]">✓ MCP server &lsquo;txlookup&rsquo; added</span>{"\n"}
                <span className="text-[var(--ds-text-dim)]">  8 tools registered</span>
              </TerminalBlock>
            </div>
          </div>
        </div>
      </section>

      {/* TOOL CATALOG */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <SectionHeader
            eyebrow="Tool catalog"
            eyebrowTone="good"
            size="md"
            headline={
              <>
                Eight tools.{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
                  All citation-enforced.
                </span>
              </>
            }
          />
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {manifest.tools.map((t) => (
              <div
                key={t.name}
                className="flex flex-col rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5"
              >
                <p className="font-mono text-[12px] font-semibold text-[var(--ds-accent)]">{t.name}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--ds-text-mute)]">{t.description}</p>
                <pre className="mt-4 overflow-x-auto rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg-deep)] p-3 font-mono text-[10.5px] leading-relaxed text-[var(--ds-text)]">
{JSON.stringify(TOOL_EXAMPLE_INPUTS[t.name] ?? {}, null, 2)}
                </pre>
                <a
                  href={`${manifest.repository}/blob/main/mcp/server.py`}
                  className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-accent)] hover:text-[var(--ds-text)]"
                >
                  see source · mcp/server.py ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AGENT ROSTER — single-row cards */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <SectionHeader
            eyebrow="Agent roster"
            eyebrowTone="purple"
            size="md"
            headline={
              <>
                Seven agents.{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
                  One contract each.
                </span>
              </>
            }
          />
          <div className="mt-8 overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
            <ul className="divide-y divide-[var(--ds-border)]">
              {AGENTS.map((a) => (
                <li key={a.id} className="grid items-center gap-4 px-5 py-4 md:grid-cols-[10px_180px_1fr_220px_80px]">
                  <span
                    className="block h-6 w-1 rounded-sm"
                    style={{ background: TONE_DOT[a.tone] }}
                    aria-hidden
                  />
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--ds-text)]">{a.label}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                      {a.role}
                    </p>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-[var(--ds-text-mute)]">{a.one_line}</p>
                  <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                    {a.schedule}
                  </p>
                  <Link
                    href={a.href}
                    className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ds-accent)] hover:text-[var(--ds-text)]"
                  >
                    Detail →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* INSTALL SNIPPETS */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <SectionHeader
            eyebrow="Install · 4 ways"
            eyebrowTone="accent"
            size="md"
            headline={
              <>
                Drop it in.{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
                  Pick your client.
                </span>
              </>
            }
          />
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {INSTALL_SNIPPETS.map((s) => (
              <TerminalBlock key={s.label} title={s.label} tone={s.tone}>
                <span className="text-[var(--ds-text-dim)]">$ </span>
                {s.cmd}
              </TerminalBlock>
            ))}
          </div>
        </div>
      </section>

      {/* API ENDPOINTS */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <SectionHeader
            eyebrow="HTTP surface"
            eyebrowTone="warm"
            size="md"
            headline={
              <>
                Endpoints,{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
                  for the curious.
                </span>
              </>
            }
          />
          <div className="mt-8 overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--ds-border)] font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Path</th>
                  <th className="px-5 py-3 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {API_ROUTES.map((r) => (
                  <tr key={`${r.method}-${r.path}`} className="border-b border-[var(--ds-border)] last:border-b-0">
                    <td className="px-5 py-3 font-mono text-[11px] font-semibold text-[var(--ds-accent)]">{r.method}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-[var(--ds-text)]">{r.path}</td>
                    <td className="px-5 py-3 text-[12.5px] text-[var(--ds-text-mute)]">{r.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SAMPLE QUERIES */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <SectionHeader
            eyebrow="Sample queries"
            eyebrowTone="good"
            size="md"
            headline={
              <>
                Run one.{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
                  Watch the loop.
                </span>
              </>
            }
          />
          <div className="mt-8 flex flex-wrap gap-2">
            {SAMPLE_QUERIES.map((q) => (
              <Link
                key={q}
                href={`/q?q=${encodeURIComponent(q)}`}
                className="inline-flex max-w-full items-center rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-3.5 py-2 text-[12.5px] text-[var(--ds-text)] transition-colors hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
              >
                <span className="mr-2 font-mono text-[10px] text-[var(--ds-text-dim)]">/q?q=</span>
                <span className="truncate">{q}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TELEMETRY */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-8 md:py-16">
          <SectionHeader
            eyebrow="Telemetry"
            eyebrowTone="accent"
            size="md"
            headline={
              <>
                Live numbers,{" "}
                <span className="font-display-serif font-normal text-[var(--ds-text-mute)]">
                  publicly visible.
                </span>
              </>
            }
          />
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">Tools registered</p>
              <p className="mt-2 text-[28px] font-bold tabular-nums text-[var(--ds-text)]">{manifest.tools.length}</p>
            </div>
            <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">Agents on the roster</p>
              <p className="mt-2 text-[28px] font-bold tabular-nums text-[var(--ds-text)]">{AGENTS.length}</p>
            </div>
            <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">Recent runs (visible)</p>
              <p className="mt-2 text-[28px] font-bold tabular-nums text-[var(--ds-text)]">{runsCount}</p>
              <p className="mt-1 font-mono text-[10px] text-[var(--ds-text-dim)]">
                {runsCount === 0 ? "archive private — auth required" : "from /api/admin/runs"}
              </p>
            </div>
            <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">Latest visible query</p>
              <p className="mt-2 line-clamp-3 text-[13px] leading-snug text-[var(--ds-text)]">
                {latestQuery ?? "— hidden —"}
              </p>
            </div>
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
            Telemetry pulls from /api/admin/runs · falls back to 0 when the archive isn&rsquo;t readable to the public.
          </p>
        </div>
      </section>
    </Shell>
  );
}
