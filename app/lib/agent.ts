// Agent loop — Reason → Plan → Tool → (Replan if needed) → Complete.
// Calls OpenAI for the planner / replanner / synthesizer, dispatches tools
// to typed wrappers around Socrata SODA + outbound A2A calls (Miro REST).

import OpenAI from "openai";
import { AsyncLocalStorage } from "node:async_hooks";

import { CATALOG, PORTAL_LABELS, discover, findById } from "./catalog";
import { searchDiscovery } from "./catalog-discovered";
import { describeDataset, sodaQuery } from "./socrata";
import { callSpecialist, isSpecialistName } from "./specialists";

// Per-request BYOK key store. /api/agent reads the txl_byok cookie and
// wraps the agent call in `runWithKey(key, () => …)`. Inside the loop,
// `client()` picks up the per-request key if set; otherwise falls through
// to the server's OPENAI_API_KEY (the owner-funded balance).
const _byokStore = new AsyncLocalStorage<string>();
export function runWithKey<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return _byokStore.run(key, fn);
}

let _client: OpenAI | null = null;
function client() {
  const userKey = _byokStore.getStore();
  if (userKey) {
    // Per-request client; do NOT cache — different users have different keys
    return new OpenAI({ apiKey: userKey });
  }
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY missing");
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

// Canonical tool list — kept in one place so the planner and replanner stay
// in sync. The LLM has been observed inventing tool names (analyze_data,
// summarize_text, render_data_viz) when the replan prompt didn't list these.
const TOOL_LIST = `1. discover_datasets({query: string, city?: string}) — returns top candidate datasets
2. get_dataset_schema({datasetId: string}) — returns column names + types + last_updated
3. summarize_data({datasetId: string, where: string, dimensions: string[]}) — group + count, returns rows {col, count}
4. fetch_data({datasetId: string, where: string, order?: string, limit?: number}) — returns rows. DO NOT pass a "select" arg — that's not supported.
5. cite_dataset({datasetId: string}) — returns the citation block for the answer
6. render_to_miro({title: string, summary: string, records: object[]}) — A2A handoff to Miro. Renders a real Miro board with the multi-agent topology, this query's step trace, the answer summary, and a horizontal bar chart of "records". Returns {board_id, view_link} as an artifact. Use ONLY when the user explicitly asks for a Miro board, whiteboard, visual collaboration, or "render this to Miro". MUST emit AFTER a summarize_data or fetch_data step. The "records" argument is REQUIRED — pass the rows from the prior data step (top 8–12 rows). Each row should be a small object with one label field (e.g. zip, district, type) and one numeric field (e.g. count, total). Without records the board has no chart.`;

const TOOL_NAMES = `"discover_datasets" | "get_dataset_schema" | "summarize_data" | "fetch_data" | "cite_dataset" | "render_to_miro"`;

function buildPlannerPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const sixMonthsAgo = new Date(Date.now() - 183 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const oneYearAgo = new Date(Date.now() - 365 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const twoYearsAgo = new Date(Date.now() - 2 * 365 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const threeYearsAgo = new Date(Date.now() - 3 * 365 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 86400_000)
    .toISOString()
    .slice(0, 10);

  const catalogTable = CATALOG.map(
    (d) =>
      `- ${d.id} · ${d.title} (${d.city}) — key columns: ${d.keyColumns.join(", ")}`,
  ).join("\n");

  return `You are TXLookup's planner. The user asks a question about Texas public data.
TODAY is ${today}. Use these pre-computed date constants for time-range filters:
  "last 30 days"    → >= '${thirtyDaysAgo}'
  "last 90 days"    → >= '${ninetyDaysAgo}'
  "last six months" → >= '${sixMonthsAgo}'
  "this year"       → >= '${oneYearAgo}'
  "past 2 years"    → >= '${twoYearsAgo}'
  "past 3 years"    → >= '${threeYearsAgo}'
  "past 5 years"    → >= '${fiveYearsAgo}'
NEVER write SQL date math like "::timestamp - interval '3 years'" or "INTERVAL 3 YEARS" — Socrata SoQL ONLY accepts literal date strings ('YYYY-MM-DD'). If the user names a span we don't have a constant for, compute the literal date yourself and inline it.

You have these tools to call (in order):

${TOOL_LIST}

Available datasets (use these EXACTLY — pick the most appropriate by KEY COLUMNS, not just by keyword match):
${catalogTable}

Disambiguation rules (apply BEFORE picking a dataset):
- "permits" / "permit" / "construction" / "building" → 3syk-w9eu (Issued Construction Permits). Even "food truck permits" → 3syk-w9eu, NOT food inspections.
- "inspections" / "inspection" / "restaurant scores" → ecmv-9xxi (Food Establishment Inspection Scores)
- "311" / "complaints" / "service requests" → xwdj-i9he (Austin) BY DEFAULT. If the user says "Dallas 311" / "311 in Dallas" → gc4d-8a49 instead.
- "police calls" / "active calls" / "active dispatches" with "Dallas" → 9fxf-t2tr (Dallas Police Active Calls). Austin doesn't have an equivalent live-calls dataset; if no city is specified and the question is about active calls, default to Dallas (9fxf-t2tr).
- "code violations" / "zoning" → 6wtj-zbtb
- "crime" / "incidents" → fdj4-gpfu
- "traffic fatalities" / "vision zero" → y2wy-tgr5

Specialist routing — these question shapes route to specialists, NOT raw tools:
- META questions about TXLookup itself ("what data do you have?", "how does this work?", "what does original_zip mean?", "can you query Dallas?", "what cities do you cover?") → emit a 1-step plan: [{tool:"delegate_to", args:{specialist:"support", input:{query:<user's question>}}}]. No cite_dataset needed — support handles its own attribution.
- VAGUE geographic shorthands the user probably knows the answer to but the agent shouldn't guess ("south austin", "downtown", "north austin", "east austin", "west austin") → emit [{tool:"delegate_to", args:{specialist:"support", input:{query:<user's question>}}}]. Support returns clarifier chips and pauses; the user picks one, then re-asks. Do NOT attempt to disambiguate to a single zip yourself.
- STATISTICAL / TEMPORAL / VISUALIZATION questions — anything asking for yoy/qoq/mom deltas, "how has X shifted/changed since [year]", "trend over time", "top N by Y", "compare A vs B period", OR any chart/visualization request ("bar chart", "line chart", "month over month chart", "show me a chart", "visualize", "graph this") — emit [{tool:"delegate_to", args:{specialist:"data_analyst", input:{...spec...}}}, {tool:"cite_dataset", args:{datasetId:"..."}}]. The data_analyst input MUST include: dataset_id, dimensions (group-by SoQL field names), and where applicable time_column + current_window + prior_window (each window is a SoQL where fragment like "issue_date >= '2025-01-01'"). Optional: filter (extra where clause), metric (default "count(*) AS count"; for dollar totals use "sum(<column>) AS total"), metric_label (human label), top_n. The data_analyst returns findings + a viz_spec which the UI renders inline as a real bar/line/stat chart — that's how chart requests get satisfied.
  - Example for "how has Austin's permit mix shifted from residential to commercial since 2024?": input = {query, dataset_id:"3syk-w9eu", dimensions:["permit_class_mapped"], time_column:"issue_date", current_window:"issue_date >= '2025-01-01'", prior_window:"issue_date >= '2024-01-01' AND issue_date <= '2024-12-31'", metric_label:"permits"}.
  - Example for "money spent on permits in the past 3 years month over month, as a bar chart": dimensions:["date_trunc_ym(issue_date)"] won't work (Socrata rejects function calls in dimensions); instead group by year-month using a string column or a transformed field that exists. If unsure, use the closest grouping the dataset supports (e.g., dimensions:["original_zip"] for permits geographic breakdowns, or use a multi-window split like {prior_window:"issue_date >= '${twoYearsAgo}' AND issue_date < '${oneYearAgo}'", current_window:"issue_date >= '${oneYearAgo}'"} for a year-vs-year comparison). For "money spent" use metric:"sum(total_job_valuation) AS total_spent" and metric_label:"$".
- REPORT / NEWSLETTER / SUMMARY-PAGE questions — "give me a report on X", "compose a newsletter about Y", "summarize the state of Z", "tell me everything about W in [city]" — emit [{tool:"delegate_to", args:{specialist:"reporter", input:{query, dataset_id}}}, {tool:"cite_dataset", args:{datasetId:"..."}}]. Reporter runs its own hero-stat queries on the chosen dataset and composes a structured (category, title, dek, hero_stats, sections, sources) report shape. If the user's question implies a statistical comparison (yoy etc.), prefer data_analyst — only route to reporter when the user is asking for a report-style PRODUCT, not a single answer.
- All other data questions ("permits in 78702", "top zips for 311 complaints") → use raw tools as before (discover_datasets / get_dataset_schema / summarize_data / fetch_data / cite_dataset).

Hard rules:
- EVERY data-question plan MUST include at least one DATA step BEFORE cite_dataset. A "data step" means one of: summarize_data, fetch_data, delegate_to(data_analyst), or delegate_to(reporter). A plan with only discover_datasets + cite_dataset is FORBIDDEN — the synthesizer will have no real data to cite and will produce an ungrounded answer paraphrased from catalog blurbs. If you can't pick the right column or filter for summarize_data/fetch_data, call get_dataset_schema first. EXCEPTION: meta/vague-geography plans that delegate to support don't query data and skip cite_dataset entirely.
- ALWAYS end with cite_dataset.
- For ambiguous "easy/best/worst/most/fewest/which" questions, default to summarize_data grouped by a geographic key column (original_zip, council_district, zip_code, etc. — pick from the dataset's KEY COLUMNS). Prefer NO 'where' filter (or only a date filter); over-restrictive value-matching like permittype='Building' often returns zero rows because the dataset's real values don't match your guess. Surface counts; let the user infer the answer from volume.
- For questions like "top X by Y" / "what are the most common", use summarize_data — cheaper than fetch_data.
- For specific records ("show me the permits in 78702"), use fetch_data with a where clause.
- Use SoQL syntax in 'where'. Example for permits: "original_zip='78702' AND issue_date >= '${sixMonthsAgo}'". Example for inspections: "zip_code='78704' AND inspection_date >= '${sixMonthsAgo}' AND score < 70".
- The KEY COLUMNS shown above are the only valid SoQL field names per dataset. Don't guess.
- limit ≤ 100 by default.
- DO NOT pass "select" to fetch_data — Socrata rejects $select=*. Just omit it.

SCOPING RULES (load-bearing — ungrounded answers will be rejected):
- Every summarize_data and fetch_data step MUST include an args.where that scopes to whatever the user mentioned (zip, date range, keyword, status).
- If the user mentions a 5-digit zip code (e.g. "78704"), the where clause MUST contain that zip on the dataset's zip column (original_zip for permits, zip_code for inspections / code complaints, sr_location_zip_code for 311, taxpayer_zip for franchise / mixed beverage).
- If the user mentions a date range, use the constants in the TODAY block above ('${thirtyDaysAgo}' / '${ninetyDaysAgo}' / '${sixMonthsAgo}' / '${oneYearAgo}' / '${twoYearsAgo}' / '${threeYearsAgo}' / '${fiveYearsAgo}'), wrapped in single quotes and compared against the dataset's date column (issue_date for permits, inspection_date for inspections, sr_created_date for 311, opened_date for code complaints, occ_date for crime, crash_timestamp for crashes). NEVER write SQL INTERVAL syntax or ::timestamp casts — Socrata rejects them with HTTP 400.
- DO NOT emit a 1-step plan that just calls summarize_data for a scoped query. Scoped queries MUST start with discover_datasets followed by get_dataset_schema, then summarize_data or fetch_data with the proper where clause, then cite_dataset.

Return a JSON object with this exact shape:
{
  "intent": {"data_domain": string, "geography": string|null, "time_range": string|null, "analysis_type": string, "thinking": string},
  "steps": [
    {"tool": ${TOOL_NAMES},
     "args": object,
     "rationale": string (one short sentence — WHY this step, not just what it does)}
  ]
}

The "thinking" field in intent is YOUR plain-English read of what the user is really asking — 1-2 sentences. This is what we surface to the user so they can see the agent reasoning.
`;
}

function summarizePriorStep(step: PlanStep, env: ToolEnvelope): string {
  const args = JSON.stringify(step.args).slice(0, 240);
  // get_dataset_schema returns the load-bearing thing (real column list).
  // Surface it as a flat field-name list so the LLM doesn't miss it inside
  // a deeply-nested envelope.
  if (step.tool === "get_dataset_schema" && env.result) {
    const r = env.result as { columns?: Array<{ field_name?: string; name?: string; data_type?: string; type?: string }> };
    const cols = (r.columns ?? [])
      .map((c) => `${c.field_name ?? c.name ?? "?"}:${c.data_type ?? c.type ?? "?"}`)
      .join(", ");
    return `  ${step.tool}(${args}) → columns: ${cols.slice(0, 1200)}`;
  }
  // Generic fallback — truncated JSON preview.
  const preview = JSON.stringify(env.result).slice(0, 600);
  return `  ${step.tool}(${args}) → ${preview}`;
}

function buildReplanPrompt(
  originalIntent: unknown,
  originalSteps: PlanStep[],
  failedIndex: number,
  failure: ToolEnvelope,
  priorResults: ToolEnvelope[] = [],
): string {
  const today = new Date().toISOString().slice(0, 10);
  const catalogTable = CATALOG.map(
    (d) => `- ${d.id} · ${d.title} (${d.city}) — key columns: ${d.keyColumns.join(", ")}`,
  ).join("\n");
  const failedStep = originalSteps[failedIndex];

  // Successful prior steps are the agent's runtime knowledge — schema lookups
  // especially. Without surfacing them here, the replanner has no way to act
  // on what was learned mid-run and tends to repeat the same mistake.
  const priorBlock = (() => {
    const successful = priorResults
      .map((env, i) => ({ env, step: originalSteps[i] }))
      .filter((x) => x.env && x.step && x.env.status === "completed");
    if (successful.length === 0) return "";
    const lines = successful.map((x) => summarizePriorStep(x.step, x.env)).join("\n");
    return `\nWhat you've already learned from successful prior steps in THIS run (use this — don't ask for it again):\n${lines}\n`;
  })();

  return `You are TXLookup's REPLANNER. The original plan failed at step ${failedIndex + 1}.
TODAY is ${today}.

You have these tools available — use ONLY these. ANY other tool name (analyze_data, summarize_text, render_data_viz, etc.) will fail with "unknown tool X":

${TOOL_LIST}

Original user intent:
${JSON.stringify(originalIntent, null, 2)}

Original plan:
${originalSteps.map((s, i) => `  ${i + 1}. ${s.tool}(${JSON.stringify(s.args)}) — ${s.rationale ?? ""}${i === failedIndex ? "  ← FAILED" : ""}`).join("\n")}
${priorBlock}
Failure at step ${failedIndex + 1} (${failedStep.tool}):
- error: ${failure.error}
- result: ${JSON.stringify(failure.result).slice(0, 400)}

DIAGNOSE the failure (one line) then emit a NEW plan that fixes it. The fix could be:
- A different dataset (the picked one didn't have the right columns)
- A different where clause (column name was wrong, date was off, value didn't match)
- A different tool (summarize_data instead of fetch_data, etc.) — but ONLY from the 6 tools listed above
- Skipping the failed step and using a related dataset

Available datasets:
${catalogTable}

Return a JSON object with this shape:
{
  "diagnosis": string (one sentence — what went wrong + how you'll fix it),
  "intent": {"data_domain": string, "geography": string|null, "time_range": string|null, "analysis_type": string, "thinking": string},
  "steps": [{"tool": ${TOOL_NAMES}, "args": object, "rationale": string}]
}

The new "steps" replace ALL steps from the failed step onward — but you should re-run the failed step in a fixed form. Always end with cite_dataset.
`;
}

const SYNTH_PROMPT = `You are TXLookup's synthesizer. Given the user's question and the tool results,
write a tight 2-4 sentence answer in plain English with concrete numbers.
- Use specific counts and dates from the tool results.
- Do NOT invent numbers.
- Do NOT include a citation block — that's added separately.
- Do NOT use Markdown of any kind: no [text](url) links, no **bold**, no _italics_, no \`code\`, no headings, no lists. The UI renders this as plain text.
- Do NOT include URLs at all. The Miro board, dataset, and source links are surfaced in dedicated UI sections below the answer — never paste a URL into the answer text.
- Lead with the headline finding, not a recap of the question.
`;

export type PlanStep = {
  tool: string;
  args: Record<string, unknown>;
  rationale?: string;
};

export type Plan = {
  intent: Record<string, unknown> & { thinking?: string };
  steps: PlanStep[];
  diagnosis?: string; // present on replans
};

export type TokenUsage = {
  prompt: number;
  completion: number;
  total: number;
};

export type Planned = { plan: Plan; usage: TokenUsage };
export type Synthesized = { answer: string; usage: TokenUsage };

// ---------------------------------------------------------------------------
// Scope validation — catch ungrounded plans BEFORE we waste tool calls on them.
// The planner periodically emits a 1-step `summarize_data` with no `where`
// when the user's question is scoped (zip / date / keyword). We re-prompt
// once with a corrective system message instead of letting it through.
// ---------------------------------------------------------------------------

const SCOPED_TOOLS = new Set(["summarize_data", "fetch_data"]);

const DATE_PHRASES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bthis year\b/i, label: "this year" },
  { pattern: /\blast (six|6) months\b/i, label: "last six months" },
  { pattern: /\blast 30 days\b/i, label: "last 30 days" },
  { pattern: /\blast (twelve|12) months\b/i, label: "last twelve months" },
  { pattern: /\bytd\b/i, label: "year to date" },
];

const DATE_COLUMN_HINTS = [
  "issue_date",
  "issued_date",
  "inspection_date",
  "sr_created_date",
  "opened_date",
  "occ_date",
  "crash_timestamp",
  "obligation_end_date_yyyymmdd",
  "responsibility_beginning_date",
];

export type ScopeIssue = {
  step: number;
  tool: string;
  reason: string;
};

export function validatePlanScope(query: string, plan: Plan): ScopeIssue[] {
  const issues: ScopeIssue[] = [];
  const zipMatch = query.match(/\b(\d{5})\b/);
  const dateHit = DATE_PHRASES.find((d) => d.pattern.test(query));

  // 1-step "summarize_data" plans for scoped queries are the canonical bug:
  // the LLM short-circuits past discover_datasets when it thinks it knows
  // the dataset, but then forgets the where clause and yields ungrounded counts.
  if ((zipMatch || dateHit) && plan.steps.length === 1) {
    const only = plan.steps[0];
    if (SCOPED_TOOLS.has(only.tool)) {
      issues.push({
        step: 1,
        tool: only.tool,
        reason: "1-step plan for a scoped query (zip or date range present in question)",
      });
    }
  }

  plan.steps.forEach((step, i) => {
    if (!SCOPED_TOOLS.has(step.tool)) return;
    const where = String(
      (step.args as { where?: unknown }).where ?? "",
    ).toLowerCase();

    if (zipMatch) {
      const zip = zipMatch[1];
      if (!where.includes(zip)) {
        issues.push({
          step: i + 1,
          tool: step.tool,
          reason: `user mentioned zip ${zip} but step.where does not contain it`,
        });
      }
    }

    if (dateHit) {
      const hasDateColumn = DATE_COLUMN_HINTS.some((c) => where.includes(c));
      if (!hasDateColumn) {
        issues.push({
          step: i + 1,
          tool: step.tool,
          reason: `user mentioned "${dateHit.label}" but step.where has no date-column constraint`,
        });
      }
    }
  });

  return issues;
}

function buildScopeCorrectivePrompt(issues: ScopeIssue[], query: string): string {
  const zip = query.match(/\b(\d{5})\b/)?.[1];
  const lines = issues.map(
    (x) => `- step ${x.step} (${x.tool}): ${x.reason}`,
  );
  return `Your previous plan was rejected because it ignored explicit scoping in the user's question. Issues:
${lines.join("\n")}

Re-emit the plan with a correctly-scoped where clause on EVERY summarize_data / fetch_data step. ${zip ? `Use the dataset's zip column = '${zip}' (original_zip for permits, zip_code for inspections / code complaints, sr_location_zip_code for 311, taxpayer_zip for franchise / mixed beverage).` : ""} If the question implies a date range, include the dataset's date-column constraint (use literal 'YYYY-MM-DD' strings — NEVER use SQL INTERVAL or ::timestamp casts). Do NOT emit a 1-step plan — scoped queries start with discover_datasets + get_dataset_schema.`;
}

function readUsage(u: unknown): TokenUsage {
  const o = (u ?? {}) as {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  return {
    prompt: o.prompt_tokens ?? 0,
    completion: o.completion_tokens ?? 0,
    total: o.total_tokens ?? 0,
  };
}

export async function reasonAndPlan(
  query: string,
  model = "gpt-4o-2024-11-20",
  correctiveSystem?: string,
): Promise<Planned> {
  const messages: { role: "system" | "user"; content: string }[] = [
    { role: "system", content: buildPlannerPrompt() },
  ];
  if (correctiveSystem) messages.push({ role: "system", content: correctiveSystem });
  messages.push({ role: "user", content: query });

  const completion = await client().chat.completions.create({
    model,
    messages,
    response_format: { type: "json_object" },
    temperature: 0,
  });
  const text = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text) as Plan;
  if (!Array.isArray(parsed.steps)) {
    throw new Error("planner returned invalid shape");
  }

  // Post-validation: if the LLM ignored scoping in the user's query
  // (zip / date / 1-step short-circuit), replan ONCE with a corrective
  // system message. Skip on the corrective pass itself to bound retries.
  let usage = readUsage(completion.usage);
  if (!correctiveSystem) {
    const issues = validatePlanScope(query, parsed);
    if (issues.length > 0) {
      const corrected = await reasonAndPlan(
        query,
        model,
        buildScopeCorrectivePrompt(issues, query),
      );
      return {
        plan: corrected.plan,
        usage: {
          prompt: usage.prompt + corrected.usage.prompt,
          completion: usage.completion + corrected.usage.completion,
          total: usage.total + corrected.usage.total,
        },
      };
    }
  }
  return { plan: parsed, usage };
}

export async function replan(
  query: string,
  originalPlan: Plan,
  failedIndex: number,
  failure: ToolEnvelope,
  priorResults: ToolEnvelope[] = [],
  model = "gpt-4o-2024-11-20",
  correctiveSystem?: string,
): Promise<Planned> {
  const messages: { role: "system" | "user"; content: string }[] = [
    {
      role: "system",
      content: buildReplanPrompt(
        originalPlan.intent,
        originalPlan.steps,
        failedIndex,
        failure,
        priorResults,
      ),
    },
  ];
  if (correctiveSystem) messages.push({ role: "system", content: correctiveSystem });
  messages.push({ role: "user", content: query });

  const completion = await client().chat.completions.create({
    model,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.1,
  });
  const text = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text) as Plan;
  if (!Array.isArray(parsed.steps)) {
    throw new Error("replanner returned invalid shape");
  }
  return { plan: parsed, usage: readUsage(completion.usage) };
}

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------

export type ToolEnvelope = {
  status: "completed" | "failed";
  result: unknown;
  error: string | null;
  artifacts?: string[];
};

export type ExecuteContext = {
  priorSteps?: Array<{
    tool: string;
    status: "completed" | "failed";
    duration_ms?: number;
  }>;
  // Last successful summarize_data / fetch_data rows. render_to_miro falls
  // back to these when the planner skips the `records` arg, so the bar chart
  // still fills.
  lastDataRecords?: Array<Record<string, unknown>>;
  // The user's original natural-language question — rendered as the frame
  // title on the Miro board so each query gets a clear container label.
  query?: string;
};

export async function executeStep(
  step: PlanStep,
  context?: ExecuteContext,
): Promise<ToolEnvelope> {
  try {
    switch (step.tool) {
      case "discover_datasets": {
        const args = step.args as { query: string; city?: string };
        const curated = discover(args.query ?? "", args.city).slice(0, 3);
        // Merge in the top 2 hits from the discovered 6,061-dataset universe
        // so the planner isn't limited to the 11 curated rows. Normalize the
        // discovered shape to match CatalogDataset's key fields so downstream
        // tools (get_dataset_schema, summarize_data) work uniformly.
        const discovered = await searchDiscovery(args.query ?? "", 2).catch(
          () => [],
        );
        const merged = [
          ...curated.map((d) => ({
            id: d.id,
            title: d.title,
            agency: d.agency,
            city: d.city,
            portal: d.portal,
            blurb: d.blurb,
            keyColumns: d.keyColumns,
            source: "curated" as const,
          })),
          ...discovered
            .filter((d) => !curated.some((c) => c.id === d.id))
            .map((d) => ({
              id: d.id,
              title: d.name,
              agency: "—",
              city: d.portal.replace(/^data\./, "").split(".")[0],
              portal: d.portal,
              blurb: (d.description ?? "").slice(0, 240),
              keyColumns: [],
              source: "discovered" as const,
            })),
        ];
        return { status: "completed", result: merged, error: null };
      }
      case "get_dataset_schema": {
        const args = step.args as { datasetId: string; portal?: string };
        const ds = findById(args.datasetId);
        if (!ds) return { status: "failed", result: null, error: `unknown dataset_id ${args.datasetId}` };
        const schema = await describeDataset(args.portal ?? ds.portal, ds.id);
        return { status: schema.status, result: schema.result, error: schema.error };
      }
      case "summarize_data": {
        const args = step.args as { datasetId: string; where?: string; dimensions: string[] };
        const ds = findById(args.datasetId);
        if (!ds) return { status: "failed", result: null, error: `unknown dataset_id ${args.datasetId}` };
        const dims = args.dimensions.join(",");
        const select = `${dims},count(*) AS count`;
        const r = await sodaQuery(ds.portal, ds.id, {
          where: args.where,
          select,
          group: dims,
          order: "count DESC",
          limit: 100,
        });
        return {
          status: r.status,
          result: r.result
            ? { dimensions: args.dimensions, rows: r.result.records, url: r.result.url }
            : null,
          error: r.error,
          artifacts: r.result ? [r.result.url] : [],
        };
      }
      case "fetch_data": {
        const args = step.args as {
          datasetId: string;
          where?: string;
          select?: string;
          order?: string;
          limit?: number;
        };
        const ds = findById(args.datasetId);
        if (!ds) return { status: "failed", result: null, error: `unknown dataset_id ${args.datasetId}` };
        // Strip select="*" — invalid SoQL ($select expects a column list).
        const select =
          args.select && args.select.trim() !== "*" ? args.select : undefined;
        const r = await sodaQuery(ds.portal, ds.id, {
          where: args.where,
          select,
          order: args.order,
          limit: args.limit ?? 100,
        });
        return {
          status: r.status,
          result: r.result,
          error: r.error,
          artifacts: r.result ? [r.result.url] : [],
        };
      }
      case "cite_dataset": {
        const args = step.args as { datasetId: string };
        const ds = findById(args.datasetId);
        if (!ds) return { status: "failed", result: null, error: `unknown dataset_id ${args.datasetId}` };
        return {
          status: "completed",
          result: {
            portal: PORTAL_LABELS[ds.portal] ?? ds.portal,
            portal_host: ds.portal,
            dataset_name: ds.title,
            dataset_id: ds.id,
            url: `https://${ds.portal}/d/${ds.id}`,
            api_url: `https://${ds.portal}/resource/${ds.id}.json`,
          },
          error: null,
        };
      }
      case "render_to_miro": {
        // A2A handoff — the TXLookup agent calls out to the Miro agent
        // (over Miro's REST API) to render the answer as a structured board.
        // Layout (top → bottom): title sticky, multi-agent topology row
        // (Planner → Analyst → Reporter → Critic → Support), this query's
        // step trace mirroring the /q DAG panel, summary sticky, horizontal
        // bar chart of records (rectangle widths proportional to count),
        // and an attribution card. If MIRO_BOARD_ID is set we append to that
        // shared board with a fresh y-offset so demos don't overlap.
        const args = step.args as {
          title: string;
          summary: string;
          records?: Array<Record<string, unknown>>;
        };
        // Trim the token defensively — a stray newline or surrounding
        // whitespace in the env var (it has happened) produces a malformed
        // Authorization header and every Miro call 401s silently.
        const miroToken = process.env.MIRO_API_TOKEN?.trim();
        if (!miroToken) {
          return {
            status: "failed",
            result: null,
            error: "MIRO_API_TOKEN not set — agent-to-agent handoff to Miro unavailable in this deploy.",
          };
        }
        const miroHeaders = {
          Authorization: `Bearer ${miroToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        };
        const title = (args.title || "TXLookup answer").slice(0, 60);
        const summary = (args.summary || "").slice(0, 1000);
        const priorSteps = context?.priorSteps ?? [];
        try {
          // 1. Resolve the target board.
          //    If MIRO_BOARD_ID is set AND the board still exists, we APPEND
          //    to it — avoids the free-tier 3-board limit and gives the demo
          //    a persistent board judges can revisit.
          //    If MIRO_BOARD_ID is missing, points to a deleted board, or is
          //    inaccessible to this token, we fall back to creating a new
          //    board so the render still produces something visible.
          const existingBoardId = process.env.MIRO_BOARD_ID?.trim();
          let boardId: string | null = null;
          let viewLink: string;

          if (existingBoardId) {
            const existsResp = await fetch(
              `https://api.miro.com/v2/boards/${existingBoardId}`,
              { headers: miroHeaders },
            );
            if (existsResp.ok) {
              boardId = existingBoardId;
            }
          }

          if (boardId) {
            viewLink = `https://miro.com/app/board/${boardId}/`;
          } else {
            const boardResp = await fetch("https://api.miro.com/v2/boards", {
              method: "POST",
              headers: miroHeaders,
              body: JSON.stringify({
                name: title,
                description: summary.slice(0, 300),
              }),
            });
            if (!boardResp.ok) {
              const detail = await boardResp.text().catch(() => "");
              return {
                status: "failed",
                result: null,
                error: `Miro API HTTP ${boardResp.status}${detail ? `: ${detail.slice(0, 400)}` : ""}`,
              };
            }
            const board = (await boardResp.json()) as {
              id: string;
              viewLink?: string;
            };
            boardId = board.id;
            viewLink =
              board.viewLink ?? `https://miro.com/app/board/${boardId}/`;
          }
          // Each query gets its own Frame on the shared board — the frame is
          // a labeled container Miro renders with a header strip, which gives
          // judges a clean visual divider between runs. Stack frames vertically
          // by Date.now() so consecutive runs never overlap (frames are 2800px
          // tall and we use ms-resolution offset).
          const FRAME_W = 1700;
          const FRAME_H = 2800;
          const frameY = existingBoardId
            ? (Date.now() % 10_000_000) // ~115 day window, plenty
            : 0;

          // 2. Create a Frame for this query and parent every item to it.
          //    Items inside a frame use board-relative coordinates, but the
          //    frame visually groups them and labels them with a header.
          let itemsCreated = 1; // the board itself
          const failed: Array<{ kind: string; error: string }> = [];

          let frameId: string | null = null;
          try {
            const fResp = await fetch(
              `https://api.miro.com/v2/boards/${boardId}/frames`,
              {
                method: "POST",
                headers: miroHeaders,
                body: JSON.stringify({
                  data: {
                    title: (context?.query || title).slice(0, 80),
                    type: "freeform",
                    format: "custom",
                  },
                  position: { x: 0, y: frameY, origin: "center" },
                  geometry: { width: FRAME_W, height: FRAME_H },
                }),
              },
            );
            if (!fResp.ok) {
              const detail = await fResp.text().catch(() => "");
              throw new Error(`HTTP ${fResp.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
            }
            const fJson = (await fResp.json()) as { id: string };
            frameId = fJson.id;
            itemsCreated++;
          } catch (err) {
            failed.push({
              kind: "frame",
              error: err instanceof Error ? err.message : String(err),
            });
          }

          // Miro v2: when an item has a parent, its position is interpreted
          // FRAME-relative (not board-relative). So we add frameY only when
          // there's no parent (fallback path). With a parent, y is used raw.
          const parent = frameId ? { parent: { id: frameId } } : {};
          const yOffset = frameId ? 0 : frameY;

          const addSticky = async (
            content: string,
            color: string,
            x: number,
            y: number,
            width = 220,
          ) => {
            try {
              const r = await fetch(
                `https://api.miro.com/v2/boards/${boardId}/sticky_notes`,
                {
                  method: "POST",
                  headers: miroHeaders,
                  body: JSON.stringify({
                    data: { content: content.slice(0, 1500), shape: "rectangle" },
                    style: { fillColor: color },
                    position: { x, y: y + yOffset, origin: "center" },
                    geometry: { width },
                    ...parent,
                  }),
                },
              );
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              itemsCreated++;
            } catch (err) {
              failed.push({
                kind: "sticky",
                error: err instanceof Error ? err.message : String(err),
              });
            }
          };

          const addShape = async (
            shape: string,
            content: string,
            x: number,
            y: number,
            width: number,
            height: number,
            fillColor = "#ffffff",
            borderColor = "#1a1a1a",
            textColor = "#1a1a1a",
          ) => {
            try {
              const r = await fetch(
                `https://api.miro.com/v2/boards/${boardId}/shapes`,
                {
                  method: "POST",
                  headers: miroHeaders,
                  body: JSON.stringify({
                    data: { shape, content: content.slice(0, 600) },
                    style: {
                      fillColor,
                      borderColor,
                      borderWidth: "2",
                      color: textColor,
                      fontSize: "14",
                      textAlign: "center",
                    },
                    position: { x, y: y + yOffset, origin: "center" },
                    geometry: { width, height },
                    ...parent,
                  }),
                },
              );
              if (!r.ok) {
                const detail = await r.text().catch(() => "");
                throw new Error(`HTTP ${r.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
              }
              itemsCreated++;
            } catch (err) {
              failed.push({
                kind: "shape",
                error: err instanceof Error ? err.message : String(err),
              });
            }
          };

          const addCard = async (
            cardTitle: string,
            description: string,
            x: number,
            y: number,
          ) => {
            try {
              const r = await fetch(
                `https://api.miro.com/v2/boards/${boardId}/cards`,
                {
                  method: "POST",
                  headers: miroHeaders,
                  body: JSON.stringify({
                    data: {
                      title: cardTitle.slice(0, 120),
                      description: description.slice(0, 1000),
                    },
                    position: { x, y: y + yOffset, origin: "center" },
                    ...parent,
                  }),
                },
              );
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              itemsCreated++;
            } catch (err) {
              failed.push({
                kind: "card",
                error: err instanceof Error ? err.message : String(err),
              });
            }
          };

          // Layout coords below are RELATIVE to the frame center (0, 0).
          // The add* helpers translate to board coords by adding frameY.
          const work: Array<Promise<void>> = [];

          // ── ROW 0 — title sticky (yellow, full width) ──────────────────
          work.push(addSticky(title, "yellow", 0, -1300, 720));

          // ── ROW 1 — multi-agent topology (mirrors /q DAG tab) ──────────
          work.push(
            addSticky(
              "Multi-agent topology",
              "gray",
              -700,
              -1100,
              260,
            ),
          );
          const topology = [
            { label: "Planner", fill: "#dbeafe", border: "#2563eb" },
            { label: "Analyst", fill: "#dcfce7", border: "#16a34a" },
            { label: "Reporter", fill: "#ede9fe", border: "#7c3aed" },
            { label: "Critic", fill: "#ffe4e6", border: "#e11d48" },
            { label: "Support", fill: "#fef3c7", border: "#d97706" },
          ];
          const topoSpacing = 280;
          const topoY = -950;
          topology.forEach((node, i) => {
            const x = -((topology.length - 1) * topoSpacing) / 2 + i * topoSpacing;
            work.push(
              addShape(
                "round_rectangle",
                `<strong>${node.label}</strong>`,
                x,
                topoY,
                220,
                100,
                node.fill,
                node.border,
              ),
            );
            if (i < topology.length - 1) {
              work.push(
                addShape(
                  "right_arrow",
                  "",
                  x + topoSpacing / 2,
                  topoY,
                  topoSpacing - 230,
                  40,
                  "#1a1a1a",
                  "#1a1a1a",
                  "#ffffff",
                ),
              );
            }
          });

          // ── ROW 2 — this query's step trace (mirrors /q Steps tab) ─────
          if (priorSteps.length > 0) {
            work.push(
              addSticky(
                "Plan execution — this query",
                "gray",
                -700,
                -750,
                340,
              ),
            );
            const steps = priorSteps.slice(0, 8);
            const stepSpacing = Math.min(280, 1400 / Math.max(steps.length, 1));
            const stepY = -600;
            steps.forEach((s, i) => {
              const x =
                -((steps.length - 1) * stepSpacing) / 2 + i * stepSpacing;
              const ok = s.status === "completed";
              const fill = ok ? "#f0fdf4" : "#fef2f2";
              const border = ok ? "#16a34a" : "#dc2626";
              const label = `${i + 1}. ${s.tool}${
                s.duration_ms ? `<br>${Math.round(s.duration_ms)}ms` : ""
              }`;
              work.push(
                addShape(
                  "rectangle",
                  label,
                  x,
                  stepY,
                  Math.max(180, stepSpacing - 60),
                  90,
                  fill,
                  border,
                ),
              );
              if (i < steps.length - 1) {
                work.push(
                  addShape(
                    "right_arrow",
                    "",
                    x + stepSpacing / 2,
                    stepY,
                    Math.max(40, stepSpacing - Math.max(180, stepSpacing - 60)),
                    30,
                    "#94a3b8",
                    "#94a3b8",
                    "#ffffff",
                  ),
                );
              }
            });
          }

          // ── ROW 3 — answer summary ────────────────────────────────────
          if (summary) {
            work.push(
              addSticky(
                "Answer",
                "gray",
                -700,
                -380,
                160,
              ),
            );
            work.push(addSticky(summary, "light_yellow", 0, -230, 720));
          }

          // ── ROW 4 — horizontal bar chart of records ───────────────────
          // Prefer the planner's explicit records arg; fall back to the most
          // recent successful data step's rows so the chart still fills when
          // the planner forgets the arg.
          const explicitRecords = (args.records ?? []).slice(0, 12);
          const fallbackRecords = (context?.lastDataRecords ?? []).slice(0, 12);
          const records =
            explicitRecords.length > 0 ? explicitRecords : fallbackRecords;
          if (records.length > 0) {
            work.push(
              addSticky(
                explicitRecords.length > 0
                  ? "By the numbers"
                  : "By the numbers (auto-derived from last data step)",
                "gray",
                -700,
                40,
                340,
              ),
            );
            // Pick the first numeric field as the bar value, the first
            // non-numeric field as the label.
            const firstRow = records[0];
            const numericKey =
              Object.entries(firstRow).find(
                ([, v]) => typeof v === "number",
              )?.[0] ??
              Object.entries(firstRow).find(
                ([, v]) => !isNaN(Number(v)),
              )?.[0] ??
              null;
            const labelKey =
              Object.entries(firstRow).find(
                ([k, v]) => k !== numericKey && typeof v !== "number",
              )?.[0] ?? Object.keys(firstRow)[0];

            const values = records.map((r) =>
              Number(numericKey ? r[numericKey] : 0) || 0,
            );
            const maxVal = Math.max(...values, 1);
            const maxBarPx = 700;
            const rowH = 60;
            const palette = [
              "#3b82f6",
              "#16a34a",
              "#7c3aed",
              "#e11d48",
              "#d97706",
            ];

            records.forEach((rec, i) => {
              const y = 180 + i * rowH;
              const labelText = String(rec[labelKey] ?? `Row ${i + 1}`);
              const valNum = Number(numericKey ? rec[numericKey] : 0) || 0;
              const barPx = Math.max(40, Math.round((valNum / maxVal) * maxBarPx));
              const color = palette[i % palette.length];

              // Label sticky on the left.
              work.push(
                addSticky(
                  `${labelText}${
                    numericKey ? `\n${valNum.toLocaleString()}` : ""
                  }`,
                  "light_blue",
                  -640,
                  y,
                  180,
                ),
              );
              // Bar shape on the right — width proportional to value.
              work.push(
                addShape(
                  "rectangle",
                  numericKey ? valNum.toLocaleString() : "",
                  -440 + barPx / 2,
                  y,
                  barPx,
                  44,
                  color,
                  color,
                  "#ffffff",
                ),
              );
            });
          }

          // ── Attribution card ──────────────────────────────────────────
          const citationY = 180 + records.length * 60 + 120;
          work.push(
            addCard(
              "Generated by TXLookup",
              `An autonomous data agent for Texas/Austin civic data.\n\nSource of truth: Socrata SODA + CKAN portals across 6,061 indexed datasets.\n\nLive: txlookup.vercel.app\nCode (MIT): github.com/ATX-TXLookup/TXLookup`,
              0,
              citationY,
            ),
          );

          // Wait for the fan-out to finish so the result envelope reflects
          // what actually landed on the board.
          await Promise.all(work);

          // Anchor the artifact URL to the new frame so opening the board (or
          // the embedded iframe) auto-pans to this query's content. Without
          // this, the board opens at its default viewport and the new frame
          // is somewhere far off-screen on the shared board.
          const anchoredLink = frameId
            ? `${viewLink}${viewLink.includes("?") ? "&" : "?"}moveToWidget=${frameId}`
            : viewLink;

          return {
            status: "completed",
            result: {
              board_id: boardId,
              frame_id: frameId,
              view_link: anchoredLink,
              title,
              records_passed: args.records?.length ?? 0,
              items_created: itemsCreated,
              items_failed: failed.length,
              failure_samples: failed.slice(0, 3).map((f) => `${f.kind}: ${f.error}`),
            },
            artifacts: [anchoredLink],
            error: null,
          };
        } catch (e: unknown) {
          return {
            status: "failed",
            result: null,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      }
      case "delegate_to_parallel": {
        // Issue #90 — fan-out N specialist calls in parallel, await all,
        // return a merged envelope with per-branch results. The orchestrator
        // SSE layer wraps this in parallel_dispatch / parallel_join events
        // so the DAG can render the fork visually.
        const args = step.args as {
          branches?: Array<{
            specialist?: string;
            input?: Record<string, unknown>;
          }>;
        };
        const branches = Array.isArray(args.branches) ? args.branches : [];
        if (branches.length === 0) {
          return {
            status: "failed",
            result: null,
            error: "delegate_to_parallel: branches[] is empty",
          };
        }
        const settled = await Promise.all(
          branches.map(async (b) => {
            const name = (b.specialist ?? "").trim();
            if (!isSpecialistName(name)) {
              return {
                specialist: name,
                status: "failed" as const,
                result: null,
                error: `unknown specialist "${name}"`,
              };
            }
            const env = await callSpecialist(name, b.input ?? {});
            return {
              specialist: name,
              status:
                env.status === "needs_input"
                  ? ("completed" as const)
                  : env.status,
              result: env.result,
              error: env.error,
            };
          }),
        );
        const anyFailed = settled.some((s) => s.status === "failed");
        return {
          status: anyFailed ? "failed" : "completed",
          result: { parallel: true, branches: settled },
          error: anyFailed
            ? settled
                .filter((s) => s.status === "failed")
                .map((s) => `${s.specialist}: ${s.error}`)
                .join("; ")
            : null,
        };
      }
      case "delegate_to": {
        // Multi-agent step (issue #67). The orchestrator hands off to a
        // specialist registered in app/lib/specialists.ts. Specialists are
        // landing in #64/#65/#66 — until then this just routes to a stub
        // that returns "not yet implemented", and the planner prompt has
        // no rule that emits delegate_to (so this case is dormant on main).
        const args = step.args as {
          specialist?: string;
          input?: Record<string, unknown>;
        };
        const name = (args.specialist ?? "").trim();
        if (!isSpecialistName(name)) {
          return {
            status: "failed",
            result: null,
            error: `delegate_to: unknown specialist "${name}" (known: data_analyst, reporter, support)`,
          };
        }
        const env = await callSpecialist(name, args.input ?? {});
        // Fold the SpecialistEnvelope into the executor's ToolEnvelope shape.
        // The "agent" + "confidence" + "caveats" + "next_actions" extras are
        // stashed on the result so the SSE step_done preview can surface them
        // and the synthesizer can attribute findings to the right specialist.
        return {
          status: env.status === "needs_input" ? "completed" : env.status,
          result: {
            agent: env.agent,
            ...(typeof env.result === "object" && env.result !== null
              ? env.result
              : { value: env.result }),
            ...(env.confidence !== undefined ? { confidence: env.confidence } : {}),
            ...(env.caveats ? { caveats: env.caveats } : {}),
            ...(env.next_actions ? { next_actions: env.next_actions } : {}),
            ...(env.status === "needs_input" ? { needs_input: true } : {}),
          },
          error: env.error,
          artifacts: env.artifacts,
        };
      }
      default:
        return { status: "failed", result: null, error: `unknown tool ${step.tool}` };
    }
  } catch (e: unknown) {
    return {
      status: "failed",
      result: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ---------------------------------------------------------------------------
// Critic — lightweight LLM judge on the plan and on the final answer.
// Issue #90: orchestrator + critic loop. Emits a small JSON verdict the
// orchestrator uses to decide whether to re-run the failed phase ONCE with
// a corrective system prompt sourced from the critic's `issues` list.
// ---------------------------------------------------------------------------

export type Critique = {
  score: number; // 0..1
  issues: string[];
  approve: boolean;
};

const CRITIC_PLAN_PROMPT = `You are TXLookup's plan critic. Given the user's question
and a proposed JSON plan, judge whether the plan will produce a grounded,
on-topic answer. Score 0..1 (1 = ship it). Return STRICT JSON:
{"score": number, "issues": [string], "approve": boolean}
- approve = true iff score >= 0.7 AND no critical issues.
- Critical issues: missing where-clause for a scoped query, wrong dataset for the
  question, missing cite_dataset, plan that obviously can't answer the question.
- Be terse — issues should be one-line actionable strings the planner can fix.
Empty issues list is fine when approve=true.`;

const CRITIC_ANSWER_PROMPT = `You are TXLookup's answer critic. Given the user's
question and the synthesizer's draft answer (plus a short context summary of
what the tools returned), judge whether the answer is grounded and on-topic.
Score 0..1. Return STRICT JSON: {"score": number, "issues": [string], "approve": boolean}
- approve = true iff score >= 0.7 AND no critical issues.
- Critical issues: invented numbers not in tool results, off-topic, hedging
  without a number, missing the user's specific scope.
- Terse one-line issues only.`;

export async function criticize(
  target: "plan" | "answer",
  payload: unknown,
  query: string,
  context?: string,
  model = "gpt-4o",
): Promise<{ critique: Critique; usage: TokenUsage }> {
  const sys =
    target === "plan" ? CRITIC_PLAN_PROMPT : CRITIC_ANSWER_PROMPT;
  const userBody =
    target === "plan"
      ? `Question: ${query}\n\nProposed plan:\n${JSON.stringify(payload, null, 2)}`
      : `Question: ${query}\n\nDraft answer:\n${String(payload)}\n\nTool context:\n${(context ?? "").slice(0, 1500)}`;
  try {
    const completion = await client().chat.completions.create({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userBody },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });
    const text = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text) as Partial<Critique>;
    const score = typeof parsed.score === "number" ? parsed.score : 0;
    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.map((s) => String(s)).slice(0, 6)
      : [];
    const approve =
      typeof parsed.approve === "boolean"
        ? parsed.approve
        : score >= 0.7 && issues.length === 0;
    return {
      critique: { score, issues, approve },
      usage: readUsage(completion.usage),
    };
  } catch (e) {
    // Critic failure is never fatal — default to approve so the loop
    // proceeds. Surface the issue so the SSE stream can show it.
    return {
      critique: {
        score: 0.5,
        issues: [`critic offline: ${e instanceof Error ? e.message : String(e)}`],
        approve: true,
      },
      usage: { prompt: 0, completion: 0, total: 0 },
    };
  }
}

export async function synthesize(
  query: string,
  plan: Plan,
  results: ToolEnvelope[],
  model = "gpt-4o-2024-11-20",
): Promise<Synthesized> {
  const summary = plan.steps
    .map((s, i) => {
      const r = results[i];
      const rj = JSON.stringify(r.result).slice(0, 1500);
      return `STEP ${i + 1} (${s.tool}, ${r.status}): ${rj}`;
    })
    .join("\n");

  const completion = await client().chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYNTH_PROMPT },
      {
        role: "user",
        content: `Question: ${query}\n\nTool results:\n${summary}\n\nWrite the answer.`,
      },
    ],
    temperature: 0.2,
  });
  return {
    answer: stripMarkdown(completion.choices[0]?.message?.content ?? ""),
    usage: readUsage(completion.usage),
  };
}

// Defense-in-depth: even though the synthesizer prompt says no Markdown, the
// LLM occasionally leaks `[label](url)` links and `**bold**`. The answer card
// renders this string as plain text, so strip Markdown decorations rather
// than relying on the prompt alone.
function stripMarkdown(s: string): string {
  return s
    // [label](url) → label
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    // **bold** / __bold__ → bold
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    // *italic* / _italic_ → italic (only when surrounding non-space chars)
    .replace(/(^|\s)([*_])(\S(?:.*?\S)?)\2(?=$|\s|[.,;:!?])/g, "$1$3")
    // `code` → code
    .replace(/`([^`]+)`/g, "$1")
    // Leading "# Heading " on a line → "Heading"
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    // Bullet markers "- " or "* " at line start → drop the marker
    .replace(/^\s{0,3}[-*]\s+/gm, "")
    // Blockquote "> " at line start → drop the marker
    .replace(/^\s{0,3}>\s+/gm, "")
    // Bare URLs anywhere in the answer — replace with empty (links surface in
    // the dedicated UI sections below the insight, never in the prose).
    .replace(/https?:\/\/\S+/g, "")
    // Tidy double spaces left by removals.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}
