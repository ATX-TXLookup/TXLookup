// Specialist registry — plumbing for the multi-agent architecture.
//
// The orchestrator's `delegate_to` step type (in `executeStep`) routes to the
// matching specialist via this registry.
//   #64 — data_analyst (statistical SoQL, yoy/qoq deltas, anomalies)  — STUB
//   #65 — reporter (compose_report → JSON snapshot for /reports/[slug]) — STUB
//   #66 — support (disambiguation, meta-questions, no Socrata)         — LIVE
//
// Per the spec all three should eventually live in `agent/specialists/*.py`
// (Python, called via MCP). For demo-day reliability the support specialist
// is implemented in TS in-process here — same envelope shape, no MCP
// roundtrip latency, no extra moving parts. Python migration is a post-demo
// follow-up. data_analyst + reporter remain stubs until #64/#65 land.

import OpenAI from "openai";
import { CATALOG } from "./catalog";

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

const dataAnalystStub: Specialist = async () => NOT_YET("data_analyst");
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

// --- Registry -------------------------------------------------------------

const REGISTRY: Record<SpecialistName, Specialist> = {
  data_analyst: dataAnalystStub,
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
  REGISTRY.data_analyst = dataAnalystStub;
  REGISTRY.reporter = reporterStub;
  REGISTRY.support = support;
}
