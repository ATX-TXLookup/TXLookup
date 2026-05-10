// Specialist registry — plumbing for the multi-agent architecture.
//
// The orchestrator's `delegate_to` step type (in `executeStep`) routes to the
// matching specialist via this registry.
//   #64 — data_analyst (statistical SoQL, yoy/qoq deltas, anomalies)  — LIVE
//   #65 — reporter (compose_report → JSON snapshot for /reports/[slug]) — STUB
//   #66 — support (disambiguation, meta-questions, no Socrata)         — LIVE
//
// Per the spec all three should eventually live in `agent/specialists/*.py`
// (Python, called via MCP). For demo-day reliability the live specialists
// are implemented in TS in-process here — same envelope shape, no MCP
// roundtrip latency, no extra moving parts. Python migration is a post-demo
// follow-up. reporter remains a stub until #65 lands.

import OpenAI from "openai";
import { CATALOG, findById } from "./catalog";
import { sodaQuery } from "./socrata";

export type SpecialistName = "data_analyst" | "reporter" | "support";

// Envelope returned by every specialist. Compatible with ToolEnvelope so the
// SSE step_done event can flow through unchanged, with optional extras the
// specialists fill in (confidence, caveats, agent identity).
export type SpecialistEnvelope = {
  agent: SpecialistName;
  status: "completed" | "failed" | "needs_input";
  result: unknown;
  error: string | null;
  artifacts?: string[];
  // Forward-looking fields from #64/#65/#66 specs. Optional today; required
  // once those PRs land.
  confidence?: number;
  caveats?: string[];
  next_actions?: Array<{ label: string; query: string }>;
};

export type Specialist = (
  input: Record<string, unknown>,
) => Promise<SpecialistEnvelope>;

// --- Stubs ----------------------------------------------------------------
// Each returns the "not yet implemented" envelope. Once the per-specialist
// PR lands, swap the stub here for a real call (and update the planner
// prompt to actually route to it).

const NOT_YET: (name: SpecialistName) => SpecialistEnvelope = (name) => ({
  agent: name,
  status: "failed",
  result: null,
  error: `specialist "${name}" is registered but not yet implemented — see the corresponding PR for the live wire-up`,
});

const reporterStub: Specialist = async () => NOT_YET("reporter");

// --- Support specialist (LIVE) -------------------------------------------
// Lightweight, no Socrata. Three jobs:
//   1. Catalog/meta questions ("what data do you have?") — pre-canned, no LLM
//   2. Vague-geography disambiguation ("south austin") — needs_input + chips
//   3. Everything else (the meta tail: "how does this work", "what does X
//      mean", "can you query Dallas") — Codex with a small system prompt.
//   PLUS: when called with input.context.failed (orchestrator handing off
//   after a 2x-failed plan), explain the failure in plain English.

let _supportClient: OpenAI | null = null;
function supportClient() {
  if (!_supportClient) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
    _supportClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _supportClient;
}

// Curated geographic shorthands → candidate zip codes. The chip's `query`
// field is built per-call by substituting the phrase with the bare zip in
// the user's original sentence — that keeps prepositions/articles correct
// (e.g. "permits in south austin" → "permits in 78704", not the broken
// "permits in in 78704" the earlier in-the-chip prefix produced).
const VAGUE_GEO: Record<string, string[]> = {
  "south austin": ["78704", "78745", "78748"],
  "north austin": ["78751", "78759", "78727"],
  "east austin": ["78702", "78721", "78723"],
  "west austin": ["78703", "78731", "78746"],
  downtown: ["78701", "78702"],
};

// True if the query is asking *about* TXLookup itself rather than for data.
function isCatalogMetaQuery(q: string): boolean {
  return (
    /^(what|which) (data|datasets?|sources?)/i.test(q) ||
    /^list (the )?(datasets?|sources?)/i.test(q) ||
    /^what can (you|tx ?lookup|the agent)/i.test(q) ||
    /^(your |the )?(capabilit|coverage)/i.test(q)
  );
}

function findVagueGeo(q: string): { phrase: string; zips: string[] } | null {
  const lower = q.toLowerCase();
  for (const [phrase, zips] of Object.entries(VAGUE_GEO)) {
    // Match as a phrase, not a substring of a zip etc.
    const re = new RegExp(`\\b${phrase}\\b`, "i");
    if (re.test(lower)) return { phrase, zips };
  }
  return null;
}

// Build the chip's rewrite of the user's original query. If the query is
// just the bare phrase (e.g. "south austin" with nothing else), the chip
// query becomes a useful sentence stub instead of just a zip number.
function chipQueryFor(originalQuery: string, phrase: string, zip: string): string {
  const trimmed = originalQuery.trim();
  if (trimmed.toLowerCase() === phrase.toLowerCase()) {
    return zip; // bare phrase — let the planner default to "what's in <zip>"
  }
  return trimmed.replace(new RegExp(`\\b${phrase}\\b`, "i"), zip);
}

function catalogSummary(): {
  message: string;
  datasets: Array<{ id: string; title: string; city: string; portal: string; cadence: string }>;
} {
  const datasets = CATALOG.map((d) => ({
    id: d.id,
    title: d.title,
    city: d.city,
    portal: d.portal,
    cadence: d.cadence,
  }));
  const cities = Array.from(new Set(CATALOG.map((d) => d.city))).join(" and ");
  const message =
    `TXLookup currently knows ${CATALOG.length} Texas datasets across ${cities}. ` +
    `I can answer questions about ${CATALOG.map((d) => d.title.toLowerCase()).slice(0, 3).join(", ")}, ` +
    `and ${CATALOG.length - 3} more. Try a question like "permits in 78702 last six months" or ` +
    `"top zips for 311 complaints this year".`;
  return { message, datasets };
}

const SUPPORT_SYSTEM_PROMPT = (catalogTable: string) =>
  `You are TXLookup's support specialist. You handle meta-questions ABOUT TXLookup,
NOT data questions. Other specialists (planner / data_analyst) answer data questions.

You answer when the user is asking:
  - What datasets / sources / coverage do we have?
  - How does the agent work? What's the loop?
  - What does column X mean?
  - Can you query [city/state] ? (Answer based on what's actually in our catalog.)
  - How do citations work? What's the rate limit?

You DO NOT:
  - Run SoQL queries or fetch data
  - Pretend to know data we haven't fetched
  - Make up numbers ("over 2 million records") that aren't in your context

Catalog (these are the ONLY datasets we have today):
${catalogTable}

Style: 2-4 sentences, plain English, conversational but factual. If the user asks
about a city or topic NOT in the catalog above, say so plainly and suggest the
closest thing we DO have.`;

const support: Specialist = async (input) => {
  const query = String(input.query ?? "").trim();
  const ctx = (input.context as Record<string, unknown> | undefined) ?? {};
  const failed = ctx.failed === true || ctx.failedStep != null;

  if (!query && !failed) {
    return {
      agent: "support",
      status: "completed",
      result: { message: "I'm here to help with questions about TXLookup itself — what datasets we have, how the agent works, what columns mean. Ask me anything." },
      error: null,
    };
  }

  // 1. Pre-canned catalog summary — no LLM, sub-millisecond.
  if (isCatalogMetaQuery(query)) {
    return {
      agent: "support",
      status: "completed",
      result: catalogSummary(),
      error: null,
    };
  }

  // 2. Vague-geography disambiguation — return chips, no LLM.
  const vague = findVagueGeo(query);
  if (vague) {
    return {
      agent: "support",
      status: "needs_input",
      result: {
        message: `"${vague.phrase}" can mean a few different zip codes in Austin. Which one are you asking about?`,
      },
      error: null,
      next_actions: vague.zips.map((zip) => ({
        label: zip,
        query: chipQueryFor(query, vague.phrase, zip),
      })),
    };
  }

  // 3. Failure-explanation mode — orchestrator delegated after 2x failure.
  if (failed) {
    const failedTool = String(ctx.failedTool ?? "a step");
    const failedError = String(ctx.error ?? "no detail provided");
    const truncated = failedError.slice(0, 200);
    return {
      agent: "support",
      status: "completed",
      result: {
        message:
          `I tried to answer that but ran into a problem the agent couldn't recover from. ` +
          `The ${failedTool} step kept failing with: ${truncated}. ` +
          `This usually means the dataset doesn't have the column or value the question implied. ` +
          `Try rephrasing — e.g., remove specific filters, broaden the geography, or pick a different time window.`,
      },
      error: null,
    };
  }

  // 4. LLM fallback for genuine meta questions.
  try {
    const catalogTable = CATALOG.map(
      (d) => `- ${d.id} · ${d.title} (${d.city}, ${d.portal}) — ${d.blurb}`,
    ).join("\n");

    const completion = await supportClient().chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        { role: "system", content: SUPPORT_SYSTEM_PROMPT(catalogTable) },
        { role: "user", content: query },
      ],
      temperature: 0.2,
      max_tokens: 250,
    });
    const message = (completion.choices[0]?.message?.content ?? "").trim();
    return {
      agent: "support",
      status: "completed",
      result: { message },
      error: null,
      confidence: 0.7,
    };
  } catch (e: unknown) {
    return {
      agent: "support",
      status: "failed",
      result: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
};

// --- Data analyst specialist (LIVE) --------------------------------------
// Statistical reasoning the planner can't do by itself: yoy/qoq/mom deltas,
// top-N with rankings, simple anomaly hints (Z-score). Uses two sodaQuery
// calls (current window + prior window) and computes deltas in JS rather
// than asking Socrata for window functions (some portals reject them).
//
// Input shape (planner emits this — see the routing rule in agent.ts):
//   {
//     query: string,                 // user's natural-language question
//     dataset_id: string,            // anchor dataset (one of CATALOG.id)
//     dimensions: string[],          // SoQL field names to group by
//     time_column?: string,          // SoQL field name for time-windowing
//     current_window?: string,       // SoQL where fragment for "now"
//     prior_window?: string,         // SoQL where fragment for "before"
//     filter?: string,               // optional extra where clause
//     metric?: string,               // SoQL aggregation, default count(*) AS count
//     metric_label?: string,         // human label for the metric ("permits")
//     top_n?: number,                // findings to surface, default 5
//   }

type AnalysisInput = {
  query?: string;
  dataset_id?: string;
  dimensions?: string[];
  time_column?: string;
  current_window?: string;
  prior_window?: string;
  filter?: string;
  metric?: string;
  metric_label?: string;
  top_n?: number;
};

type DeltaRow = {
  key: string;
  current: number;
  prior: number;
  delta: number;
  pct: number | null; // null when prior is 0 (avoid divide-by-zero)
};

// Pure helper — exported for unit tests.
export function computeDeltas(
  current: Array<Record<string, unknown>>,
  prior: Array<Record<string, unknown>>,
  dimension: string,
  metricField: string,
): DeltaRow[] {
  const priorMap = new Map<string, number>();
  for (const row of prior) {
    const k = String(row[dimension] ?? "");
    const v = Number(row[metricField] ?? 0);
    priorMap.set(k, (priorMap.get(k) ?? 0) + (Number.isFinite(v) ? v : 0));
  }
  const out: DeltaRow[] = [];
  const seenKeys = new Set<string>();
  for (const row of current) {
    const k = String(row[dimension] ?? "");
    const cur = Number(row[metricField] ?? 0);
    const pri = priorMap.get(k) ?? 0;
    const delta = cur - pri;
    const pct = pri === 0 ? null : (delta / pri) * 100;
    out.push({ key: k, current: cur, prior: pri, delta, pct });
    seenKeys.add(k);
  }
  // Surface dimension values that DROPPED to zero (in prior but not current).
  for (const [k, pri] of priorMap.entries()) {
    if (!seenKeys.has(k)) {
      out.push({ key: k, current: 0, prior: pri, delta: -pri, pct: -100 });
    }
  }
  // Sort by absolute pct change (ties broken by absolute delta), descending.
  out.sort((a, b) => {
    const aMag = a.pct === null ? Number.POSITIVE_INFINITY : Math.abs(a.pct);
    const bMag = b.pct === null ? Number.POSITIVE_INFINITY : Math.abs(b.pct);
    if (aMag !== bMag) return bMag - aMag;
    return Math.abs(b.delta) - Math.abs(a.delta);
  });
  return out;
}

function fmtPct(p: number | null): string {
  if (p === null) return "(no prior)";
  const sign = p >= 0 ? "+" : "";
  return `${sign}${p.toFixed(1)}%`;
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

const dataAnalyst: Specialist = async (rawInput) => {
  const input = rawInput as AnalysisInput;
  const datasetId = (input.dataset_id ?? "").trim();
  const dimensions = (input.dimensions ?? []).filter((d) => typeof d === "string" && d.length > 0);

  if (!datasetId || dimensions.length === 0) {
    return {
      agent: "data_analyst",
      status: "failed",
      result: null,
      error: "data_analyst: input must include dataset_id and at least one dimension",
    };
  }

  const ds = findById(datasetId);
  if (!ds) {
    return {
      agent: "data_analyst",
      status: "failed",
      result: null,
      error: `data_analyst: unknown dataset_id ${datasetId}`,
    };
  }

  const dim = dimensions[0]; // single-dim today; multi-dim is a follow-up
  const metric = (input.metric ?? "count(*) AS count").trim();
  const metricField = (() => {
    const m = /AS\s+([a-zA-Z_][a-zA-Z0-9_]*)/i.exec(metric);
    return m ? m[1] : "count";
  })();
  const metricLabel = input.metric_label ?? "records";
  const topN = Math.max(1, Math.min(10, input.top_n ?? 5));

  function whereOf(...frags: Array<string | undefined>): string | undefined {
    const parts = frags.filter((f): f is string => typeof f === "string" && f.trim().length > 0);
    return parts.length > 0 ? parts.join(" AND ") : undefined;
  }

  const fetchWindow = async (windowFrag: string | undefined) => {
    const r = await sodaQuery(ds.portal, ds.id, {
      where: whereOf(input.filter, windowFrag),
      select: `${dim}, ${metric}`,
      group: dim,
      order: `${metricField} DESC`,
      limit: 100,
    });
    return r;
  };

  const currentR = await fetchWindow(input.current_window);
  if (currentR.status !== "completed" || !currentR.result) {
    return {
      agent: "data_analyst",
      status: "failed",
      result: null,
      error: `data_analyst: current-window query failed — ${currentR.error}`,
    };
  }
  const currentRows = currentR.result.records;

  const hasPrior = !!input.prior_window;
  const priorRows = hasPrior
    ? await (async () => {
        const r = await fetchWindow(input.prior_window);
        return r.status === "completed" && r.result ? r.result.records : [];
      })()
    : [];

  const findings: Array<{ text: string; value?: number | string; unit?: string; baseline?: number | string; pct_change?: number }> = [];
  const caveats: string[] = [];
  let vizSpec: Record<string, unknown>;

  if (hasPrior && priorRows.length > 0) {
    // YoY-style mode: compute deltas between current and prior windows.
    const deltas = computeDeltas(currentRows, priorRows, dim, metricField);
    const top = deltas.slice(0, topN);
    for (const row of top) {
      const direction = row.delta >= 0 ? "rose" : "dropped";
      const absDelta = Math.abs(row.delta);
      findings.push({
        text:
          `${row.key}: ${metricLabel} ${direction} from ${fmtNum(row.prior)} to ${fmtNum(row.current)} ` +
          `(${row.delta >= 0 ? "+" : ""}${fmtNum(row.delta)}, ${fmtPct(row.pct)})`,
        value: row.current,
        baseline: row.prior,
        pct_change: row.pct ?? undefined,
        unit: metricLabel,
      });
    }
    vizSpec = {
      kind: "bar",
      x: dim,
      y: metricLabel,
      series: [
        { name: "prior", data: deltas.map((d) => [d.key, d.prior]) },
        { name: "current", data: deltas.map((d) => [d.key, d.current]) },
      ],
    };
    if (deltas.some((d) => d.pct === null)) {
      caveats.push("some categories had zero prior-window records (percent change shown as 'no prior')");
    }
  } else {
    // Single-window mode: top-N by metric.
    const sorted = [...currentRows].sort((a, b) => {
      const av = Number(a[metricField] ?? 0);
      const bv = Number(b[metricField] ?? 0);
      return bv - av;
    });
    const top = sorted.slice(0, topN);
    const total = sorted.reduce((s, r) => s + (Number(r[metricField] ?? 0)), 0);
    for (const row of top) {
      const k = String(row[dim] ?? "");
      const v = Number(row[metricField] ?? 0);
      const share = total > 0 ? (v / total) * 100 : 0;
      findings.push({
        text: `${k}: ${fmtNum(v)} ${metricLabel} (${share.toFixed(1)}% of top ${sorted.length})`,
        value: v,
        unit: metricLabel,
        pct_change: share,
      });
    }
    vizSpec = {
      kind: "bar",
      x: dim,
      y: metricLabel,
      series: [{ name: metricLabel, data: top.map((r) => [String(r[dim] ?? ""), Number(r[metricField] ?? 0)]) }],
    };
  }

  if (findings.length === 0) {
    caveats.push("no rows returned for the requested window — try broadening the filter or time range");
  }

  return {
    agent: "data_analyst",
    status: "completed",
    result: {
      query: input.query ?? "",
      dataset: { id: ds.id, title: ds.title, portal: ds.portal },
      mode: hasPrior && priorRows.length > 0 ? "delta" : "single_window",
      findings,
      viz_spec: vizSpec,
      sources: {
        current_url: currentR.result.url,
        prior_url: hasPrior ? "queried" : null,
      },
    },
    error: null,
    confidence: hasPrior && priorRows.length > 0 ? 0.85 : 0.7,
    caveats: caveats.length > 0 ? caveats : undefined,
    artifacts: [currentR.result.url],
  };
};

// --- Registry -------------------------------------------------------------

const REGISTRY: Record<SpecialistName, Specialist> = {
  data_analyst: dataAnalyst,
  reporter: reporterStub,
  support: support,
};

const KNOWN: ReadonlySet<SpecialistName> = new Set([
  "data_analyst",
  "reporter",
  "support",
]);

export function isSpecialistName(name: string): name is SpecialistName {
  return KNOWN.has(name as SpecialistName);
}

export async function callSpecialist(
  name: SpecialistName,
  input: Record<string, unknown>,
): Promise<SpecialistEnvelope> {
  const handler = REGISTRY[name];
  return handler(input);
}

// Test seam — lets unit tests swap a stub for a fixture without monkey-patching.
// Production code MUST NOT use this; the per-specialist PRs replace stubs by
// editing this file's top-half directly.
export function _setSpecialistForTest(
  name: SpecialistName,
  fn: Specialist,
): void {
  REGISTRY[name] = fn;
}

export function _resetSpecialistsForTest(): void {
  REGISTRY.data_analyst = dataAnalyst;
  REGISTRY.reporter = reporterStub;
  REGISTRY.support = support;
}
