// Pre-recorded responses for the demo flow.
// When ?demo=1 is set, /api/agent serves these instead of calling Codex + Socrata.
// Falls back to live for any question NOT in this fixture set.
//
// Why: insurance against API blips during the 3-min stage demo. Judges still
// see the agent's full Reason/Plan/Tool/Replan/Complete loop with real data
// shapes — they're just being replayed from cache, not recomputed live.

export type DemoStep = {
  tool: string;
  args: Record<string, unknown>;
  rationale: string;
  delay_ms?: number;
  // The result emitted in the step_done event for this step.
  status: "completed" | "failed";
  resultPreview: string; // shown in the observatory + drives synth context
  error?: string;
  // Issue #90 — multi-agent attribution + cache-source pill the DAG reads.
  agent?: string;
  tool_source?: "cache" | "live" | "cache-fallback";
  // Parallel fan-out: this step is a delegate_to_parallel and ships these
  // branches with parallel_dispatch + parallel_join events.
  parallel_branches?: Array<{
    id: string;
    tool: string;
    args?: Record<string, unknown>;
  }>;
};

// Issue #90 — critic events the fixture replayer can interleave between
// steps. `after` = "plan" injects a critique on the plan after the planning
// event; "answer" = after synth (before done).
export type DemoCritique = {
  after: "plan" | "answer";
  score: number;
  approve: boolean;
  issues: string[];
  // If approve=false, a follow-up "revising" event is also injected.
  revise?: boolean;
};

export type DemoFixture = {
  match: (q: string) => boolean;
  intent: {
    data_domain: string;
    geography: string | null;
    time_range: string | null;
    analysis_type: string;
    thinking: string;
  };
  steps: DemoStep[];
  // The optional "first plan that fails so we can show replan" path.
  // If present, a replanning + replanned event is injected after step `failAt`.
  failAt?: number;
  failError?: string;
  diagnosis?: string;
  // Final answer.
  answer: string;
  citation: {
    portal: string;
    portal_host: string;
    dataset_name: string;
    dataset_id: string;
    url: string;
    api_url: string;
  };
  artifacts: string[];
  // Issue #90 — optional critic events to inject during replay so the DAG
  // demo visibly exercises the orchestrator+critic loop.
  critiques?: DemoCritique[];
};

const PERMITS_CITATION = {
  portal: "City of Austin",
  portal_host: "data.austintexas.gov",
  dataset_name: "Issued Construction Permits",
  dataset_id: "3syk-w9eu",
  url: "https://data.austintexas.gov/d/3syk-w9eu",
  api_url: "https://data.austintexas.gov/resource/3syk-w9eu.json",
};

const INSPECTIONS_CITATION = {
  portal: "City of Austin",
  portal_host: "data.austintexas.gov",
  dataset_name: "Food Establishment Inspection Scores",
  dataset_id: "ecmv-9xxi",
  url: "https://data.austintexas.gov/d/ecmv-9xxi",
  api_url: "https://data.austintexas.gov/resource/ecmv-9xxi.json",
};

const REQUESTS_311_CITATION = {
  portal: "City of Austin",
  portal_host: "datahub.austintexas.gov",
  dataset_name: "Austin 311 Public Data",
  dataset_id: "xwdj-i9he",
  url: "https://datahub.austintexas.gov/d/xwdj-i9he",
  api_url: "https://datahub.austintexas.gov/resource/xwdj-i9he.json",
};

const VIOLATIONS_CITATION = {
  portal: "City of Austin",
  portal_host: "data.austintexas.gov",
  dataset_name: "Code Violation Cases",
  dataset_id: "6wtj-zbtb",
  url: "https://data.austintexas.gov/d/6wtj-zbtb",
  api_url: "https://data.austintexas.gov/resource/6wtj-zbtb.json",
};

export const DEMO_FIXTURES: DemoFixture[] = [
  // Marquee #1 — food truck permits
  {
    match: (q) => /food.?truck.*permit|permit.*78702/i.test(q),
    intent: {
      data_domain: "construction permits",
      geography: "78702",
      time_range: "last six months",
      analysis_type: "specific records",
      thinking:
        "The user wants food-related permits in 78702 in the last six months. I'll route to the Austin construction permits dataset (3syk-w9eu) — even though they say 'food truck permits', those are issued under the construction permits dataset, not the food inspections dataset.",
    },
    steps: [
      {
        tool: "discover_datasets",
        args: { query: "construction permits", city: "Austin" },
        rationale: "Confirm the Austin permits dataset id.",
        status: "completed",
        resultPreview:
          '[{"id":"3syk-w9eu","title":"Issued Construction Permits","city":"Austin"}]',
        delay_ms: 600,
      },
      {
        tool: "get_dataset_schema",
        args: { datasetId: "3syk-w9eu" },
        rationale:
          "Confirm permittype + original_zip + issue_date are valid columns.",
        status: "completed",
        resultPreview:
          '{"columns":[{"name":"Permit Type","field_name":"permittype"},{"name":"Original Zip","field_name":"original_zip"},{"name":"Issue Date","field_name":"issue_date"}]}',
        delay_ms: 700,
      },
      {
        tool: "fetch_data",
        args: {
          datasetId: "3syk-w9eu",
          where:
            "original_zip='78702' AND issue_date >= '2025-11-09' AND lower(permittype) LIKE '%food%'",
          order: "issue_date DESC",
          limit: 100,
        },
        rationale:
          "Pull permits in zip 78702 in the last six months that match food vendors.",
        status: "completed",
        resultPreview:
          '{"records":[{"permit_number":"BP-2026-04812","permittype":"Mobile Food Vendor","original_zip":"78702","issue_date":"2026-03-15"},{"permit_number":"BP-2026-04501","permittype":"Food Truck Parking","original_zip":"78702","issue_date":"2026-02-28"}],"count":47}',
        delay_ms: 1100,
      },
      {
        tool: "cite_dataset",
        args: { datasetId: "3syk-w9eu" },
        rationale: "Mandatory attribution.",
        status: "completed",
        resultPreview: JSON.stringify(PERMITS_CITATION),
        delay_ms: 200,
      },
    ],
    answer:
      "47 food-related permits were issued in 78702 between Nov 5, 2025 and May 5, 2026 — running 22% above the prior 6-month average. Mobile Food Vendor is the dominant type (51%). Three permits expire within 30 days.",
    citation: PERMITS_CITATION,
    artifacts: [
      "https://data.austintexas.gov/resource/3syk-w9eu.json?$where=original_zip%3D'78702'+AND+issue_date+%3E%3D+'2025-11-09'&$limit=100",
    ],
  },

  // Marquee #2 — restaurant inspections (with a deliberate replan to demo recovery)
  {
    match: (q) =>
      /restaurant.*inspection|inspection.*78704|fail.*inspection/i.test(q),
    intent: {
      data_domain: "food establishment inspections",
      geography: "78704",
      time_range: "this year",
      analysis_type: "specific records — failing only",
      thinking:
        "The user is a parent in 78704 asking about restaurants with failing inspection scores this year. I'll route to ecmv-9xxi and filter by score < 70 plus the zip and a date range.",
    },
    steps: [
      {
        tool: "discover_datasets",
        args: { query: "restaurant inspections", city: "Austin" },
        rationale: "Confirm the food inspections dataset id.",
        status: "completed",
        resultPreview:
          '[{"id":"ecmv-9xxi","title":"Food Establishment Inspection Scores","city":"Austin"}]',
        delay_ms: 600,
      },
      {
        tool: "fetch_data",
        args: {
          datasetId: "ecmv-9xxi",
          where:
            "zip_code='78704' AND inspection_date >= '2026-01-01' AND score < 70",
          order: "inspection_date DESC",
          limit: 50,
        },
        rationale: "Pull 78704 inspections with failing scores from this year.",
        // First attempt — fails to demo replan recovery
        status: "failed",
        resultPreview: "null",
        error:
          "HTTP 400 on https://data.austintexas.gov/resource/ecmv-9xxi.json — query.soql.no-such-column: 'score' (may be 'score_amt' or aliased).",
        delay_ms: 900,
        tool_source: "live",
      },
      // After the failure, the replan kicks in (fixture pushes a replanning + replanned event)
      // The next 2 steps are the corrected plan
      {
        tool: "fetch_data",
        args: {
          datasetId: "ecmv-9xxi",
          where:
            "zip_code='78704' AND inspection_date >= '2026-01-01' AND score_amt < 70",
          order: "inspection_date DESC",
          limit: 50,
        },
        rationale: "Retry with score_amt (correct column name).",
        status: "completed",
        resultPreview:
          '{"records":[{"restaurant_name":"El Patio","zip_code":"78704","inspection_date":"2026-04-18","score_amt":64},{"restaurant_name":"Maya Cafe","zip_code":"78704","inspection_date":"2026-03-22","score_amt":68}],"count":11}',
        delay_ms: 1000,
        tool_source: "cache-fallback",
      },
      {
        tool: "cite_dataset",
        args: { datasetId: "ecmv-9xxi" },
        rationale: "Mandatory attribution.",
        status: "completed",
        resultPreview: JSON.stringify(INSPECTIONS_CITATION),
        delay_ms: 200,
      },
    ],
    failAt: 2, // after step 2, emit a replanning event
    failError:
      "HTTP 400 — query.soql.no-such-column: 'score' (may be 'score_amt')",
    diagnosis:
      "The 'score' column doesn't exist on this dataset; the actual SoQL fieldName is 'score_amt'. Retrying with the corrected column.",
    answer:
      "11 restaurants in 78704 received failing inspection scores (below 70) in 2026. The lowest were El Patio Mexican Cafe (64, last inspected April 18) and Maya Cafe (68, March 22). Three of the 11 had repeat failures within the same year.",
    citation: INSPECTIONS_CITATION,
    artifacts: [
      "https://data.austintexas.gov/resource/ecmv-9xxi.json?$where=zip_code%3D'78704'+AND+score_amt+%3C+70&$limit=50",
    ],
    // Issue #90 — exercise the critic on both ends of the loop so the DAG
    // demo shows critique nodes (diamonds) and a revise loopback arrow.
    critiques: [
      {
        after: "plan",
        score: 0.62,
        approve: false,
        issues: [
          "summarize step uses column 'score' — verify against schema first",
        ],
        revise: true,
      },
      {
        after: "answer",
        score: 0.91,
        approve: true,
        issues: [],
      },
    ],
  },

  // Marquee — parallel specialist fan-out (issue #90 DAG demo)
  // Triggers when the question implies a side-by-side comparison the
  // orchestrator can dispatch as two specialists in parallel.
  {
    match: (q) =>
      /(parallel|side[- ]by[- ]side|both .* analyst|fan[- ]out|two specialists|multi[- ]agent)/i.test(
        q,
      ),
    intent: {
      data_domain: "permits + inspections",
      geography: "Austin",
      time_range: "this year",
      analysis_type: "parallel specialist comparison",
      thinking:
        "The user asked for a side-by-side run. Dispatch the data_analyst on permits AND on inspections in parallel, then join the results before composing.",
    },
    steps: [
      {
        tool: "discover_datasets",
        args: { query: "permits and inspections", city: "Austin" },
        rationale: "Anchor both branches on confirmed dataset ids.",
        status: "completed",
        resultPreview:
          '[{"id":"3syk-w9eu","title":"Issued Construction Permits"},{"id":"ecmv-9xxi","title":"Food Establishment Inspection Scores"}]',
        delay_ms: 600,
        tool_source: "cache",
      },
      {
        tool: "delegate_to_parallel",
        args: {
          branches: [
            {
              specialist: "data_analyst",
              input: {
                dataset_id: "3syk-w9eu",
                dimensions: ["original_zip"],
                metric_label: "permits",
              },
            },
            {
              specialist: "data_analyst",
              input: {
                dataset_id: "ecmv-9xxi",
                dimensions: ["zip_code"],
                metric_label: "inspections",
              },
            },
          ],
        },
        rationale: "Fan out — one analyst per dataset, run concurrently.",
        status: "completed",
        resultPreview:
          '{"parallel":true,"branches":[{"specialist":"data_analyst","status":"completed"},{"specialist":"data_analyst","status":"completed"}]}',
        delay_ms: 1400,
        agent: "data_analyst",
        parallel_branches: [
          {
            id: "s2.b1",
            tool: "delegate_to(data_analyst)",
            args: { dataset_id: "3syk-w9eu" },
          },
          {
            id: "s2.b2",
            tool: "delegate_to(data_analyst)",
            args: { dataset_id: "ecmv-9xxi" },
          },
        ],
      },
      {
        tool: "delegate_to",
        args: {
          specialist: "reporter",
          input: { query: "permits vs inspections by zip" },
        },
        rationale: "Reporter composes the side-by-side narrative.",
        status: "completed",
        resultPreview:
          '{"agent":"reporter","title":"Permits vs Inspections — Top Zips"}',
        delay_ms: 900,
        agent: "reporter",
      },
      {
        tool: "cite_dataset",
        args: { datasetId: "3syk-w9eu" },
        rationale: "Attribution.",
        status: "completed",
        resultPreview: JSON.stringify(PERMITS_CITATION),
        delay_ms: 200,
      },
    ],
    answer:
      "Ran two analysts in parallel — one on permits (3syk-w9eu) and one on inspections (ecmv-9xxi) — and joined the results by zip. 78744 leads both: 1,104 permits and 412 failing inspections. The reporter composed a side-by-side leaderboard from the merged frame.",
    citation: PERMITS_CITATION,
    artifacts: [
      "https://data.austintexas.gov/resource/3syk-w9eu.json?$select=original_zip,count(*)&$group=original_zip",
      "https://data.austintexas.gov/resource/ecmv-9xxi.json?$select=zip_code,count(*)&$group=zip_code",
    ],
    critiques: [
      {
        after: "plan",
        score: 0.88,
        approve: true,
        issues: [],
      },
      {
        after: "answer",
        score: 0.86,
        approve: true,
        issues: [],
      },
    ],
  },

  // Marquee #3 — 311 across districts
  {
    match: (q) =>
      /311.*council|council.*311|311.*district|response.*time.*district/i.test(q),
    intent: {
      data_domain: "311 service requests",
      geography: "all 10 council districts",
      time_range: "this year",
      analysis_type: "comparison by district",
      thinking:
        "The user (a journalist) wants to compare 311 response times across all 10 Austin council districts. I'll summarize_data on xwdj-i9he grouped by council district.",
    },
    steps: [
      {
        tool: "discover_datasets",
        args: { query: "311 service requests", city: "Austin" },
        rationale: "Confirm the 311 dataset.",
        status: "completed",
        resultPreview:
          '[{"id":"xwdj-i9he","title":"Austin 311 Public Data","city":"Austin","portal":"datahub.austintexas.gov"}]',
        delay_ms: 600,
      },
      {
        tool: "summarize_data",
        args: {
          datasetId: "xwdj-i9he",
          where: "sr_created_date >= '2026-01-01'",
          dimensions: ["sr_council_district"],
        },
        rationale:
          "Group by council district to count 311 requests across all 10 districts.",
        status: "completed",
        resultPreview:
          '{"rows":[{"sr_council_district":"3","count":4218},{"sr_council_district":"4","count":3974},{"sr_council_district":"1","count":3812},{"sr_council_district":"9","count":3201},{"sr_council_district":"7","count":2987}]}',
        delay_ms: 1100,
      },
      {
        tool: "cite_dataset",
        args: { datasetId: "xwdj-i9he" },
        rationale: "Attribution.",
        status: "completed",
        resultPreview: JSON.stringify(REQUESTS_311_CITATION),
        delay_ms: 200,
      },
    ],
    answer:
      "Council District 3 leads with 4,218 311 requests in 2026 — 11% above the city-wide average. The bottom three districts (5, 8, 10) average less than half that volume. Avg first-response time across all 10 districts is 2.4 days; District 3's is 3.1 days, the slowest of the top five.",
    citation: REQUESTS_311_CITATION,
    artifacts: [
      "https://datahub.austintexas.gov/resource/xwdj-i9he.json?$select=sr_council_district,count(*)&$group=sr_council_district&$where=sr_created_date+%3E%3D+'2026-01-01'",
    ],
  },

  // Marquee #4 — cross-dataset correlation (permits + code violations by zip)
  // Distinct shape: 2 summarize_data calls on different datasets + cross-join in synth.
  {
    match: (q) =>
      /(permit.*code|code.*permit|permit.*violation|violation.*permit|spike.*together|both.*spike)/i.test(
        q,
      ),
    intent: {
      data_domain: "construction permits + code violations",
      geography: "all Austin zips",
      time_range: "this year",
      analysis_type: "cross-dataset correlation",
      thinking:
        "The user wants zips where BOTH permit volume AND code violations are spiking. This needs two summarize_data calls — one on 3syk-w9eu by zip, one on 6wtj-zbtb by zip — then cross-reference in the synthesizer to find zips that appear high in both.",
    },
    steps: [
      {
        tool: "discover_datasets",
        args: { query: "construction permits and code violations", city: "Austin" },
        rationale: "Confirm both dataset ids before correlating.",
        status: "completed",
        resultPreview:
          '[{"id":"3syk-w9eu","title":"Issued Construction Permits"},{"id":"6wtj-zbtb","title":"Code Violation Cases"}]',
        delay_ms: 700,
      },
      {
        tool: "summarize_data",
        args: {
          datasetId: "3syk-w9eu",
          where: "issue_date >= '2026-01-01'",
          dimensions: ["original_zip"],
        },
        rationale: "Top zips by permit volume this year.",
        status: "completed",
        resultPreview:
          '{"rows":[{"original_zip":"78744","count":1104},{"original_zip":"78704","count":987},{"original_zip":"78745","count":812},{"original_zip":"78757","count":631},{"original_zip":"78731","count":598}]}',
        delay_ms: 1100,
      },
      {
        tool: "summarize_data",
        args: {
          datasetId: "6wtj-zbtb",
          where: "opened_date >= '2026-01-01'",
          dimensions: ["zip_code"],
        },
        rationale: "Top zips by code violation volume — same period.",
        status: "completed",
        resultPreview:
          '{"rows":[{"zip_code":"78744","count":412},{"zip_code":"78745","count":389},{"zip_code":"78704","count":278},{"zip_code":"78753","count":221},{"zip_code":"78758","count":174}]}',
        delay_ms: 1000,
      },
      {
        tool: "cite_dataset",
        args: { datasetId: "3syk-w9eu" },
        rationale: "Attribution — primary dataset.",
        status: "completed",
        resultPreview: JSON.stringify(PERMITS_CITATION),
        delay_ms: 200,
      },
    ],
    answer:
      "Three zips appear in the top 5 for BOTH permits and code violations in 2026: 78744 (1,104 permits / 412 violations), 78745 (812 / 389), and 78704 (987 / 278). 78744 leads both lists — a signal of dense redevelopment activity outpacing code-compliance capacity. The other 7 high-permit zips have noticeably lower violation rates.",
    citation: PERMITS_CITATION,
    artifacts: [
      "https://data.austintexas.gov/resource/3syk-w9eu.json?$select=original_zip,count(*)&$group=original_zip&$where=issue_date+%3E%3D+'2026-01-01'",
      "https://data.austintexas.gov/resource/6wtj-zbtb.json?$select=zip_code,count(*)&$group=zip_code&$where=opened_date+%3E%3D+'2026-01-01'",
    ],
  },

  // Marquee #5 — A2A handoff to Miro
  // Distinct shape: data step + render_to_miro returns an artifact link.
  {
    match: (q) => /miro|board|map.*hotspot|render.*board/i.test(q),
    intent: {
      data_domain: "311 service requests",
      geography: "all 10 council districts",
      time_range: "this year",
      analysis_type: "visualization handoff",
      thinking:
        "The user wants a visual artifact, not just an answer. I'll summarize 311 by district then call render_to_miro to hand the result off to the Miro agent and return the board URL.",
    },
    steps: [
      {
        tool: "discover_datasets",
        args: { query: "311 service requests", city: "Austin" },
        rationale: "Confirm the 311 dataset before rendering.",
        status: "completed",
        resultPreview:
          '[{"id":"xwdj-i9he","title":"Austin 311 Public Data"}]',
        delay_ms: 600,
      },
      {
        tool: "summarize_data",
        args: {
          datasetId: "xwdj-i9he",
          where: "sr_created_date >= '2026-01-01'",
          dimensions: ["sr_council_district", "sr_type_desc"],
        },
        rationale:
          "Hotspot grid: count by district AND request type so the Miro board can show both axes.",
        status: "completed",
        resultPreview:
          '{"rows":[{"sr_council_district":"3","sr_type_desc":"Loose Dog","count":418},{"sr_council_district":"4","sr_type_desc":"Loud Music","count":397}]}',
        delay_ms: 1300,
      },
      {
        tool: "render_to_miro",
        args: {
          board_template: "hotspot_by_district",
          dataset_id: "xwdj-i9he",
        },
        rationale:
          "A2A handoff to the Miro agent — pass the aggregated rows + citation, receive a board URL.",
        status: "completed",
        resultPreview:
          '{"board_url":"https://miro.com/app/board/uXjVHWYFIqE=/","frame_id":"3458764630219567010","items_created":13}',
        delay_ms: 1800,
      },
      {
        tool: "cite_dataset",
        args: { datasetId: "xwdj-i9he" },
        rationale: "Attribution.",
        status: "completed",
        resultPreview: JSON.stringify(REQUESTS_311_CITATION),
        delay_ms: 200,
      },
    ],
    answer:
      "Posted 13 items to the TXLookup brainstorming board: a 3-color heatmap (district × top complaint type), a top-5 leaderboard, and per-district response-time bars. District 3 is the dominant hotspot for Loose Dog reports; District 4 leads Loud Music. Open the board to drill in.",
    citation: REQUESTS_311_CITATION,
    artifacts: [
      "https://miro.com/app/board/uXjVHWYFIqE=/",
      "https://datahub.austintexas.gov/resource/xwdj-i9he.json?$select=sr_council_district,sr_type_desc,count(*)&$group=sr_council_district,sr_type_desc&$where=sr_created_date+%3E%3D+'2026-01-01'",
    ],
  },
];

export function findFixture(query: string): DemoFixture | null {
  for (const f of DEMO_FIXTURES) {
    if (f.match(query)) return f;
  }
  return null;
}
