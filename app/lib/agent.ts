// Agent loop — Reason → Plan → Tool → (Replan if needed) → Complete.
// Calls OpenAI for the planner / replanner / synthesizer, dispatches tools
// to typed wrappers around Socrata SODA + outbound A2A calls (Miro REST).

import OpenAI from "openai";

import { CATALOG, PORTAL_LABELS, discover, findById } from "./catalog";
import { describeDataset, sodaQuery } from "./socrata";
import { callSpecialist, isSpecialistName } from "./specialists";

let _client: OpenAI | null = null;
function client() {
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
6. render_to_miro({title: string, summary: string, records: array}) — agent-to-agent: hands off to Miro to render a visual board with the answer. Use ONLY for "show me a board", "visualize", or as the optional final step on multi-record results.`;

const TOOL_NAMES = `"discover_datasets" | "get_dataset_schema" | "summarize_data" | "fetch_data" | "cite_dataset" | "render_to_miro"`;

function buildPlannerPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = new Date(Date.now() - 183 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const oneYearAgo = new Date(Date.now() - 365 * 86400_000)
    .toISOString()
    .slice(0, 10);

  const catalogTable = CATALOG.map(
    (d) =>
      `- ${d.id} · ${d.title} (${d.city}) — key columns: ${d.keyColumns.join(", ")}`,
  ).join("\n");

  return `You are TXLookup's planner. The user asks a question about Texas public data.
TODAY is ${today}. Compute time ranges from TODAY (e.g. "last six months" = >= ${sixMonthsAgo}, "this year" = >= ${oneYearAgo}).

You have these tools to call (in order):

${TOOL_LIST}

Available datasets (use these EXACTLY — pick the most appropriate by KEY COLUMNS, not just by keyword match):
${catalogTable}

Disambiguation rules (apply BEFORE picking a dataset):
- "permits" / "permit" / "construction" / "building" → 3syk-w9eu (Issued Construction Permits). Even "food truck permits" → 3syk-w9eu, NOT food inspections.
- "inspections" / "inspection" / "restaurant scores" → ecmv-9xxi (Food Establishment Inspection Scores)
- "311" / "complaints" / "service requests" → xwdj-i9he
- "code violations" / "zoning" → 6wtj-zbtb
- "crime" / "incidents" → fdj4-gpfu
- "traffic fatalities" / "vision zero" → y2wy-tgr5

Specialist routing — these question shapes route to specialists, NOT raw tools:
- META questions about TXLookup itself ("what data do you have?", "how does this work?", "what does original_zip mean?", "can you query Dallas?", "what cities do you cover?") → emit a 1-step plan: [{tool:"delegate_to", args:{specialist:"support", input:{query:<user's question>}}}]. No cite_dataset needed — support handles its own attribution.
- VAGUE geographic shorthands the user probably knows the answer to but the agent shouldn't guess ("south austin", "downtown", "north austin", "east austin", "west austin") → emit [{tool:"delegate_to", args:{specialist:"support", input:{query:<user's question>}}}]. Support returns clarifier chips and pauses; the user picks one, then re-asks. Do NOT attempt to disambiguate to a single zip yourself.
- All other data questions ("permits in 78702", "top zips for 311 complaints") → use raw tools as before (discover_datasets / get_dataset_schema / summarize_data / fetch_data / cite_dataset).

Hard rules:
- EVERY data-question plan MUST include at least one summarize_data or fetch_data step BEFORE cite_dataset. A plan with only discover_datasets + cite_dataset is FORBIDDEN — the synthesizer will have no real data to cite and will produce an ungrounded answer paraphrased from catalog blurbs. If you can't pick the right column or filter, call get_dataset_schema first, then summarize_data. EXCEPTION: meta/vague-geography plans that delegate to support don't query data and skip cite_dataset entirely.
- ALWAYS end with cite_dataset.
- For ambiguous "easy/best/worst/most/fewest/which" questions, default to summarize_data grouped by a geographic key column (original_zip, council_district, zip_code, etc. — pick from the dataset's KEY COLUMNS). Prefer NO 'where' filter (or only a date filter); over-restrictive value-matching like permittype='Building' often returns zero rows because the dataset's real values don't match your guess. Surface counts; let the user infer the answer from volume.
- For questions like "top X by Y" / "what are the most common", use summarize_data — cheaper than fetch_data.
- For specific records ("show me the permits in 78702"), use fetch_data with a where clause.
- Use SoQL syntax in 'where'. Example for permits: "original_zip='78702' AND issue_date >= '${sixMonthsAgo}'". Example for inspections: "zip_code='78704' AND inspection_date >= '${sixMonthsAgo}' AND score < 70".
- The KEY COLUMNS shown above are the only valid SoQL field names per dataset. Don't guess.
- limit ≤ 100 by default.
- DO NOT pass "select" to fetch_data — Socrata rejects $select=*. Just omit it.

SCOPING RULES (load-bearing — ungrounded answers will be rejected):
- Every summarize_data, fetch_data, and render_to_miro step MUST include an args.where that scopes to whatever the user mentioned (zip, date range, keyword, status). render_to_miro should reference filtered records only.
- If the user mentions a 5-digit zip code (e.g. "78704"), the where clause MUST contain that zip on the dataset's zip column (original_zip for permits, zip_code for inspections / code complaints, sr_location_zip_code for 311, taxpayer_zip for franchise / mixed beverage).
- If the user mentions a date range ("this year" → >= ${oneYearAgo}; "last six months" → >= ${sixMonthsAgo}; "last 30 days" → >= ${new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)}), the where clause MUST include the dataset's date column constraint (issue_date for permits, inspection_date for inspections, sr_created_date for 311, opened_date for code complaints, occ_date for crime, crash_timestamp for crashes).
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

const SCOPED_TOOLS = new Set(["summarize_data", "fetch_data", "render_to_miro"]);

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

Re-emit the plan with a correctly-scoped where clause on EVERY summarize_data / fetch_data / render_to_miro step. ${zip ? `Use the dataset's zip column = '${zip}' (original_zip for permits, zip_code for inspections / code complaints, sr_location_zip_code for 311, taxpayer_zip for franchise / mixed beverage).` : ""} If the question implies a date range, include the dataset's date-column constraint. Do NOT emit a 1-step plan — scoped queries start with discover_datasets + get_dataset_schema.`;
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

export async function executeStep(step: PlanStep): Promise<ToolEnvelope> {
  try {
    switch (step.tool) {
      case "discover_datasets": {
        const args = step.args as { query: string; city?: string };
        const ranked = discover(args.query ?? "", args.city);
        return { status: "completed", result: ranked.slice(0, 5), error: null };
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
        // (over Miro's REST API) to render a visual board with the answer.
        // Returns the board URL as an artifact so the user can open it.
        const args = step.args as {
          title: string;
          summary: string;
          records?: Array<Record<string, unknown>>;
        };
        if (!process.env.MIRO_API_TOKEN) {
          return {
            status: "failed",
            result: null,
            error: "MIRO_API_TOKEN not set — agent-to-agent handoff to Miro unavailable in this deploy.",
          };
        }
        try {
          const r = await fetch("https://api.miro.com/v2/boards", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.MIRO_API_TOKEN}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: (args.title || "TXLookup answer").slice(0, 60),
              description: (args.summary || "").slice(0, 300),
              policy: { sharingPolicy: { access: "private" } },
            }),
          });
          if (!r.ok) {
            return {
              status: "failed",
              result: null,
              error: `Miro API HTTP ${r.status}`,
            };
          }
          const board = (await r.json()) as { id: string; viewLink?: string };
          const viewLink =
            board.viewLink ?? `https://miro.com/app/board/${board.id}/`;
          return {
            status: "completed",
            result: {
              board_id: board.id,
              view_link: viewLink,
              title: args.title,
              records_passed: args.records?.length ?? 0,
            },
            artifacts: [viewLink],
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
    answer: completion.choices[0]?.message?.content ?? "",
    usage: readUsage(completion.usage),
  };
}
