// Runtime mirror of `config/reports.yaml`.
//
// We hand-mirror the YAML into TypeScript to avoid adding `js-yaml` (or any
// other parser) as a dependency. The YAML file is the human-readable spec;
// this file is what the runtime actually loads. Keep them in sync.

export type Viz = "stat" | "line" | "bar";

export type ReportQueryParams = {
  select?: string;
  where_template?: string;
  group?: string;
  order?: string;
  limit?: number;
};

export type ReportQuery = {
  label: string;
  portal: string;
  dataset_id: string;
  viz: Viz;
  params: ReportQueryParams;
};

export type ReportDef = {
  slug: string;
  title: string;
  subtitle: string;
  dataset_ids: string[];
  intro_paragraph: string;
  conclusion_paragraph?: string;
  socrata_queries: ReportQuery[];
};

const austinConstruction: ReportDef = {
  slug: "austin-construction-2026",
  title: "Austin Construction in 2026",
  subtitle:
    "Where, what, and how fast — read live from the City of Austin permits feed.",
  dataset_ids: ["3syk-w9eu"],
  intro_paragraph:
    "Every construction permit issued by the City of Austin lands in a single public dataset. This report reads that feed live and summarizes what is under way right now: how many permits issued in the last month, where they cluster, how the trend has moved, and what kind of work is dominating the pipeline.",
  conclusion_paragraph:
    "Permits are a leading indicator. They tell you what is about to be built before the cranes arrive. Watch the zip leaders quarter over quarter and the permit-class mix month over month.",
  socrata_queries: [
    {
      label: "Permits issued in the last 30 days",
      portal: "data.austintexas.gov",
      dataset_id: "3syk-w9eu",
      viz: "stat",
      params: {
        select: "count(*) AS count",
        where_template: "issue_date >= '${ISO_DATE_30D}'",
      },
    },
    {
      label: "Top 5 zip codes by permit count, last 12 months",
      portal: "data.austintexas.gov",
      dataset_id: "3syk-w9eu",
      viz: "bar",
      params: {
        select: "original_zip AS zip, count(*) AS count",
        where_template: "issue_date >= '${ISO_DATE_365D}'",
        group: "original_zip",
        order: "count DESC",
        limit: 5,
      },
    },
    {
      label: "Monthly permit count, last 12 months",
      portal: "data.austintexas.gov",
      dataset_id: "3syk-w9eu",
      viz: "bar",
      params: {
        select:
          "date_extract_y(issue_date) AS y, date_extract_m(issue_date) AS m, count(*) AS count",
        where_template: "issue_date >= '${ISO_DATE_365D}'",
        group: "y, m",
        order: "y, m",
        limit: 24,
      },
    },
    {
      label: "Top 5 permit classes, last 12 months",
      portal: "data.austintexas.gov",
      dataset_id: "3syk-w9eu",
      viz: "bar",
      params: {
        select: "permit_class_mapped AS label, count(*) AS count",
        where_template:
          "issue_date >= '${ISO_DATE_365D}' AND permit_class_mapped IS NOT NULL",
        group: "permit_class_mapped",
        order: "count DESC",
        limit: 5,
      },
    },
  ],
};

const austinRestaurants: ReportDef = {
  slug: "austin-restaurants-watchlist",
  title: "Austin Restaurants Watchlist",
  subtitle: "Repeat offenders in Austin Public Health inspection scores.",
  dataset_ids: ["ecmv-9xxi"],
  intro_paragraph:
    "Austin Public Health inspects every food establishment on a rolling schedule and publishes a numeric score per visit. This report reads the inspections feed (ecmv-9xxi) and surfaces the lowest scores in the cached window.",
  socrata_queries: [
    {
      label: "Inspections logged in the last 30 days",
      portal: "data.austintexas.gov",
      dataset_id: "ecmv-9xxi",
      viz: "stat",
      params: {
        select: "count(*) AS count",
        where_template: "inspection_date >= '${ISO_DATE_30D}'",
      },
    },
  ],
};

const austin311: ReportDef = {
  slug: "austin-311-leaderboard",
  title: "Austin 311 Leaderboard",
  subtitle: "How quickly each part of the city gets a 311 response.",
  dataset_ids: ["xwdj-i9he"],
  intro_paragraph:
    "Austin 311 logs every non-emergency service request — potholes, graffiti, animal services, brush pickup. This report reads the 311 feed (xwdj-i9he) and ranks zip codes by recent request volume.",
  socrata_queries: [
    {
      label: "311 requests in the last 30 days",
      portal: "datahub.austintexas.gov",
      dataset_id: "xwdj-i9he",
      viz: "stat",
      params: {
        select: "count(*) AS count",
        where_template: "sr_created_date >= '${ISO_DATE_30D}'",
      },
    },
  ],
};

const austinCodeViolations: ReportDef = {
  slug: "austin-code-violations-trend",
  title: "Austin Code Violations — 12-month trend",
  subtitle: "Where the Code Department is opening cases.",
  dataset_ids: ["6wtj-zbtb"],
  intro_paragraph:
    "Code complaint cases are neighborhood-level signal: short-term rentals, building issues, junk vehicles, overgrown lots. This report reads the cases feed (6wtj-zbtb) — currently active cases and the 12-month opening trend.",
  socrata_queries: [
    {
      label: "Currently active cases",
      portal: "data.austintexas.gov",
      dataset_id: "6wtj-zbtb",
      viz: "stat",
      params: {
        select: "count(*) AS count",
        where_template: "status='Active'",
      },
    },
  ],
};

const austinPermitsHeatmap: ReportDef = {
  slug: "austin-permits-heatmap",
  title: "Austin Permits Heatmap",
  subtitle: "Building activity by zip code.",
  dataset_ids: ["3syk-w9eu"],
  intro_paragraph:
    "A geographic cut of the construction permits feed (3syk-w9eu) — top zips by permit count over the last 90 days. Pairs with the long-form Austin Construction in 2026 report.",
  socrata_queries: [
    {
      label: "Top 10 zip codes by permit count, last 90 days",
      portal: "data.austintexas.gov",
      dataset_id: "3syk-w9eu",
      viz: "bar",
      params: {
        select: "original_zip AS zip, count(*) AS count",
        where_template: "issue_date >= '${ISO_DATE_90D}'",
        group: "original_zip",
        order: "count DESC",
        limit: 10,
      },
    },
  ],
};

export const REPORTS: ReportDef[] = [
  austinConstruction,
  austinRestaurants,
  austin311,
  austinCodeViolations,
  austinPermitsHeatmap,
];

export function findReport(slug: string): ReportDef | undefined {
  return REPORTS.find((r) => r.slug === slug);
}
