// Agent loop — Reason → Plan → Tool → Complete — in TypeScript.
// Calls OpenAI for the planner + synthesizer, dispatches tools to TS stubs.

import OpenAI from "openai";

import { CATALOG, PORTAL_LABELS, discover, findById } from "./catalog";
import { describeDataset, sodaQuery } from "./socrata";

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

1. discover_datasets({query: string, city?: string}) — returns top candidate datasets
2. get_dataset_schema({datasetId: string}) — returns column names + types + last_updated
3. summarize_data({datasetId: string, where: string, dimensions: string[]}) — group + count, returns rows {col, count}
4. fetch_data({datasetId: string, where: string, order?: string, limit?: number}) — returns rows. DO NOT pass a "select" arg — that's not supported.
5. cite_dataset({datasetId: string}) — returns the citation block for the answer

Available datasets (use these EXACTLY — pick the most appropriate by KEY COLUMNS, not just by keyword match):
${catalogTable}

Disambiguation rules (apply BEFORE picking a dataset):
- "permits" / "permit" / "construction" / "building" → 3syk-w9eu (Issued Construction Permits). Even "food truck permits" → 3syk-w9eu, NOT food inspections.
- "inspections" / "inspection" / "restaurant scores" → ecmv-9xxi (Food Establishment Inspection Scores)
- "311" / "complaints" / "service requests" → i26j-ai4z
- "code violations" / "zoning" → 6wtj-zbtb
- "crime" / "incidents" → fdj4-gpfu
- "traffic fatalities" / "vision zero" → y2wy-tgr5

Hard rules:
- ALWAYS end with cite_dataset.
- For questions like "top X by Y" / "what are the most common", use summarize_data — cheaper than fetch_data.
- For specific records ("show me the permits in 78702"), use fetch_data with a where clause.
- Use SoQL syntax in 'where'. Example for permits: "original_zip='78702' AND issued_date >= '${sixMonthsAgo}'". Example for inspections: "zip_code='78704' AND inspection_date >= '${sixMonthsAgo}' AND score < 70".
- The KEY COLUMNS shown above are the only valid SoQL field names per dataset. Don't guess.
- limit ≤ 100 by default.
- DO NOT pass "select" to fetch_data — Socrata rejects $select=*. Just omit it.

Return a JSON object with this exact shape:
{
  "intent": {"data_domain": string, "geography": string|null, "time_range": string|null, "analysis_type": string},
  "steps": [
    {"tool": "discover_datasets" | "get_dataset_schema" | "summarize_data" | "fetch_data" | "cite_dataset",
     "args": object,
     "rationale": string (one short sentence)}
  ]
}
`;
}

const PLANNER_PROMPT_NOTE = "Built dynamically per request to inject TODAY.";

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
  intent: Record<string, unknown>;
  steps: PlanStep[];
};

export async function reasonAndPlan(
  query: string,
  model = "gpt-4o-2024-11-20",
): Promise<Plan> {
  const completion = await client().chat.completions.create({
    model,
    messages: [
      { role: "system", content: buildPlannerPrompt() },
      { role: "user", content: query },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });
  const text = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text) as Plan;
  if (!Array.isArray(parsed.steps)) {
    throw new Error("planner returned invalid shape");
  }
  return parsed;
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
): Promise<string> {
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
  return completion.choices[0]?.message?.content ?? "";
}
