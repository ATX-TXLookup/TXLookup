// Pre-generated insights from live Socrata queries (tests/fixtures/*.json).
// Each insight stores the SoQL params so the findings page can re-fetch live data.

export type SoqlParams = {
  select?: string;
  where?: string;
  group?: string;
  order?: string;
  limit?: number;
};

export type Insight = {
  headline: string;   // punchy one-line finding
  detail: string;     // supporting context
  valueLabel?: string; // label for the hero stat on the findings page
  portal: string;
  datasetId: string;
  soql: SoqlParams;
};

export type DatasetInsights = {
  insights: Insight[];
  questions: string[];
};

export const INSIGHTS: Record<string, DatasetInsights> = {

  // ── Food Establishment Inspections ───────────────────────────────────────
  "ecmv-9xxi": {
    insights: [
      {
        headline: "34 restaurants scored below 70 in the last year",
        detail: "Scores below 70 trigger mandatory follow-up inspections by Austin Public Health.",
        valueLabel: "restaurants below 70",
        portal: "data.austintexas.gov",
        datasetId: "ecmv-9xxi",
        soql: {
          select: "count(*) as cnt",
          where: "score<70 AND inspection_date>'2025-05-09T00:00:00.000'",
        },
      },
      {
        headline: "78753 has the most low-scoring restaurants — 8 in the last 6 months",
        detail: "Followed by 78759 (7) and 78750 (5). North Austin zip codes dominate the low-score list.",
        valueLabel: "low-score restaurants by zip",
        portal: "data.austintexas.gov",
        datasetId: "ecmv-9xxi",
        soql: {
          select: "zip_code, count(*) as cnt",
          where: "score<80 AND inspection_date>'2025-11-09T00:00:00.000'",
          group: "zip_code",
          order: "cnt DESC",
          limit: 10,
        },
      },
      {
        headline: "K-Bop scored 57 — worst single inspection in Austin this year",
        detail: "Parlor & Yard (67) and Hunan Lion Restaurant (62) also among the lowest-scoring establishments.",
        valueLabel: "worst-scoring restaurants",
        portal: "data.austintexas.gov",
        datasetId: "ecmv-9xxi",
        soql: {
          select: "restaurant_name, score, inspection_date, zip_code",
          where: "score<80 AND inspection_date>'2025-11-09T00:00:00.000'",
          order: "score ASC",
          limit: 15,
        },
      },
      {
        headline: "2 restaurants in 78704 have repeated inspection failures",
        detail: "Whip In (worst score: 62) and Hunan Lion Restaurant both flagged for repeat violations.",
        valueLabel: "repeat-failure restaurants in 78704",
        portal: "data.austintexas.gov",
        datasetId: "ecmv-9xxi",
        soql: {
          select: "restaurant_name, count(*) as inspections, min(score) as worst_score",
          where: "score<80 AND zip_code like '78704%'",
          group: "restaurant_name",
          order: "worst_score ASC",
          limit: 10,
        },
      },
    ],
    questions: [
      "Which Austin restaurants scored below 70 in the last year?",
      "What zip code has the most low food inspection scores in Austin?",
      "Show me the worst-scoring restaurants in Austin in the last 6 months",
      "Which restaurants on 6th Street have low inspection scores?",
    ],
  },

  // ── Issued Construction Permits ───────────────────────────────────────────
  "3syk-w9eu": {
    insights: [
      {
        headline: "78744 leads Austin with 1,466 permits issued this year",
        detail: "Followed by 78704 (1,325) and 78745 (1,178). South and Southeast Austin dominate construction activity.",
        valueLabel: "permits by zip code",
        portal: "data.austintexas.gov",
        datasetId: "3syk-w9eu",
        soql: {
          select: "original_zip, count(*) as cnt",
          where: "issue_date>'2026-01-01T00:00:00.000'",
          group: "original_zip",
          order: "cnt DESC",
          limit: 10,
        },
      },
      {
        headline: "14,271 residential vs 5,497 commercial permits issued in Austin YTD",
        detail: "Residential construction outpaces commercial 2.6:1 — consistent with Austin's housing growth trajectory.",
        valueLabel: "residential vs commercial permits",
        portal: "data.austintexas.gov",
        datasetId: "3syk-w9eu",
        soql: {
          select: "permit_class_mapped, count(*) as cnt",
          where: "issue_date>'2026-01-01T00:00:00.000'",
          group: "permit_class_mapped",
          order: "cnt DESC",
          limit: 5,
        },
      },
      {
        headline: "IES Residential leads Austin with 452 permits pulled this year",
        detail: "Top 10 contractors account for a significant share of all permit activity in the city.",
        valueLabel: "permits by contractor",
        portal: "data.austintexas.gov",
        datasetId: "3syk-w9eu",
        soql: {
          select: "contractor_company_name, count(*) as cnt",
          where: "issue_date>'2026-01-01T00:00:00.000' AND contractor_company_name IS NOT NULL",
          group: "contractor_company_name",
          order: "cnt DESC",
          limit: 10,
        },
      },
      {
        headline: "Monthly permit volume trending up: Jan 4,205 · Feb 4,473 · Mar 4,756",
        detail: "3,817 commercial permits were issued in the last 3 months — a steady upward trend.",
        valueLabel: "monthly permit trend",
        portal: "data.austintexas.gov",
        datasetId: "3syk-w9eu",
        soql: {
          select: "date_trunc_ym(issue_date) as month, count(*) as cnt",
          where: "issue_date>'2025-11-01T00:00:00.000'",
          group: "month",
          order: "month ASC",
          limit: 12,
        },
      },
    ],
    questions: [
      "Which Austin zip codes have the most building permits this year?",
      "How many residential vs commercial permits were issued in Austin YTD?",
      "Which contractors have pulled the most permits in Austin this year?",
      "Show me monthly permit volume in Austin for 2026",
    ],
  },

  // ── Austin 311 Service Requests ───────────────────────────────────────────
  "xwdj-i9he": {
    insights: [
      {
        headline: "Garbage pickup is Austin's #1 complaint — 8,286 requests YTD",
        detail: "ARR - Garbage tops all categories, followed by parking enforcement and code officer requests.",
        valueLabel: "top 311 issue types",
        portal: "datahub.austintexas.gov",
        datasetId: "xwdj-i9he",
        soql: {
          select: "sr_type_desc, count(*) as cnt",
          where: "sr_created_date>'2026-01-01T00:00:00.000'",
          group: "sr_type_desc",
          order: "cnt DESC",
          limit: 10,
        },
      },
      {
        headline: "78704 leads all zip codes with 7,279 service requests YTD",
        detail: "Followed by 78745 (6,366) and 78741 (5,847). South Austin files the most 311 complaints in the city.",
        valueLabel: "311 complaints by zip",
        portal: "datahub.austintexas.gov",
        datasetId: "xwdj-i9he",
        soql: {
          select: "sr_location_zip_code, count(*) as cnt",
          where: "sr_created_date>'2026-01-01T00:00:00.000'",
          group: "sr_location_zip_code",
          order: "cnt DESC",
          limit: 10,
        },
      },
      {
        headline: "1,094 pothole complaints filed in Austin in the last 90 days",
        detail: "That's roughly 12 pothole reports every day — one of Austin's most consistent infrastructure complaints.",
        valueLabel: "pothole complaints",
        portal: "datahub.austintexas.gov",
        datasetId: "xwdj-i9he",
        soql: {
          select: "count(*) as cnt",
          where: "sr_type_desc like '%Pothole%' AND sr_created_date>'2026-02-07T00:00:00.000'",
        },
      },
      {
        headline: "5,487 requests still open vs 86,179 closed this year",
        detail: "~6% backlog rate. Austin Resource Recovery handles 29,299 requests YTD — more than any other department.",
        valueLabel: "open vs closed requests",
        portal: "datahub.austintexas.gov",
        datasetId: "xwdj-i9he",
        soql: {
          select: "sr_status_desc, count(*) as cnt",
          where: "sr_created_date>'2026-01-01T00:00:00.000'",
          group: "sr_status_desc",
          order: "cnt DESC",
          limit: 10,
        },
      },
    ],
    questions: [
      "What are the top 311 issue types reported in Austin this year?",
      "Which Austin zip code has the most 311 complaints?",
      "How many pothole complaints were filed in Austin in the last 90 days?",
      "Show me unresolved 311 service requests in 78704",
    ],
  },

  // ── Austin Code Complaint Cases ───────────────────────────────────────────
  "6wtj-zbtb": {
    insights: [
      {
        headline: "78741 has the most active code violations — 381 open cases",
        detail: "Followed by 78702 (255) and 78704 (247). East Austin zip codes carry the heaviest open caseloads.",
        valueLabel: "active violations by zip",
        portal: "data.austintexas.gov",
        datasetId: "6wtj-zbtb",
        soql: {
          select: "zip_code, count(*) as cnt",
          where: "status='Active'",
          group: "zip_code",
          order: "cnt DESC",
          limit: 10,
        },
      },
      {
        headline: "3,257 code complaints are currently active in Austin",
        detail: "9,910 new cases were opened city-wide in 2026 so far — all handled by Code Enforcement.",
        valueLabel: "active complaint cases",
        portal: "data.austintexas.gov",
        datasetId: "6wtj-zbtb",
        soql: {
          select: "status, count(*) as cnt",
          group: "status",
          order: "cnt DESC",
          limit: 5,
        },
      },
      {
        headline: "2606 Wheless Lane has 9 active violations — most of any address",
        detail: "1600 Royal Crest Drive (5) and 10310 N IH 35 Service Rd (5) also among the most-flagged properties.",
        valueLabel: "addresses with most violations",
        portal: "data.austintexas.gov",
        datasetId: "6wtj-zbtb",
        soql: {
          select: "address, count(*) as cnt",
          where: "status='Active'",
          group: "address",
          order: "cnt DESC",
          limit: 10,
        },
      },
      {
        headline: "Some Austin code cases have been open since 2004",
        detail: "The oldest active violation at 3807 Duval St (rear) has been unresolved for over 20 years.",
        valueLabel: "oldest active violations",
        portal: "data.austintexas.gov",
        datasetId: "6wtj-zbtb",
        soql: {
          select: "case_id, case_type, address, opened_date, status",
          where: "status='Active'",
          order: "opened_date ASC",
          limit: 10,
        },
      },
    ],
    questions: [
      "Which Austin zip codes have the most active code violations?",
      "Show me code violations that have been open for more than 90 days",
      "Which addresses in Austin have the most open code cases?",
      "How many code cases were opened in Austin this year?",
    ],
  },

  // ── Crime Reports ─────────────────────────────────────────────────────────
  "fdj4-gpfu": {
    insights: [
      {
        headline: "District 3 leads Austin with 4,852 reported crimes this year",
        detail: "District 9 (4,448) and District 1 (3,804) follow. South and Central Austin account for the highest volumes.",
        valueLabel: "crimes by council district",
        portal: "data.austintexas.gov",
        datasetId: "fdj4-gpfu",
        soql: {
          select: "council_district, count(*) as cnt",
          where: "occ_date>'2026-01-01T00:00:00.000'",
          group: "council_district",
          order: "cnt DESC",
          limit: 10,
        },
      },
      {
        headline: "Burglary of Vehicle is Austin's most common crime — 3,589 reported in 6 months",
        detail: "Family Disturbance (3,656) and Theft also in the top 3. Property crimes dominate the volume.",
        valueLabel: "top crime types",
        portal: "data.austintexas.gov",
        datasetId: "fdj4-gpfu",
        soql: {
          select: "crime_type, count(*) as cnt",
          where: "occ_date>'2025-11-09T00:00:00.000'",
          group: "crime_type",
          order: "cnt DESC",
          limit: 10,
        },
      },
      {
        headline: "Residences are the most common crime location — 10,519 incidents YTD",
        detail: "Highways/roads (8,215) and parking lots (3,287) follow. Over half of all Austin crimes occur near homes.",
        valueLabel: "crimes by location type",
        portal: "data.austintexas.gov",
        datasetId: "fdj4-gpfu",
        soql: {
          select: "location_type, count(*) as cnt",
          where: "occ_date>'2026-01-01T00:00:00.000'",
          group: "location_type",
          order: "cnt DESC",
          limit: 10,
        },
      },
      {
        headline: "74% of Austin crimes remain uncleared — 17,423 open cases YTD",
        detail: "Only 5,853 cases were cleared this year. Family violence has 2,122 incidents with very low clearance rates.",
        valueLabel: "clearance status breakdown",
        portal: "data.austintexas.gov",
        datasetId: "fdj4-gpfu",
        soql: {
          select: "clearance_status, count(*) as cnt",
          where: "occ_date>'2026-01-01T00:00:00.000'",
          group: "clearance_status",
          order: "cnt DESC",
          limit: 5,
        },
      },
    ],
    questions: [
      "Which Austin council district has the most reported crimes this year?",
      "What are the most common crime types in Austin in the last 6 months?",
      "How many crimes in Austin remain uncleared this year?",
      "Show me family violence incidents in Austin this year",
    ],
  },

  // ── Austin Crash Report Data ──────────────────────────────────────────────
  "y2wy-tgr5": {
    insights: [
      {
        headline: "25 traffic deaths already in Austin in 2026",
        detail: "2025 recorded 105 deaths across 97 crashes. Austin's Vision Zero goal remains far from reached.",
        valueLabel: "fatalities by year",
        portal: "data.austintexas.gov",
        datasetId: "y2wy-tgr5",
        soql: {
          select: "date_trunc_y(crash_timestamp) as year, sum(death_cnt) as deaths, count(*) as crashes",
          where: "crash_fatal_fl='true'",
          group: "year",
          order: "year DESC",
          limit: 6,
        },
      },
      {
        headline: "Lamar Blvd is Austin's deadliest named street",
        detail: "Lamar appears in multiple fatal crash clusters for vehicles, pedestrians, and bicyclists.",
        valueLabel: "fatal crashes by street",
        portal: "data.austintexas.gov",
        datasetId: "y2wy-tgr5",
        soql: {
          select: "rpt_street_name, count(*) as crashes, sum(death_cnt) as deaths",
          where: "crash_fatal_fl='true' AND rpt_street_name IS NOT NULL AND rpt_street_name != 'NOT REPORTED'",
          group: "rpt_street_name",
          order: "deaths DESC",
          limit: 10,
        },
      },
      {
        headline: "12,037 crashes in construction zones — 92 deaths",
        detail: "Construction-zone crashes account for a disproportionate share of serious injuries.",
        valueLabel: "construction zone crashes",
        portal: "data.austintexas.gov",
        datasetId: "y2wy-tgr5",
        soql: {
          select: "count(*) as cnt, sum(death_cnt) as deaths, sum(tot_injry_cnt) as injuries",
          where: "road_constr_zone_fl='Y'",
        },
      },
      {
        headline: "45 mph zones have the most fatal crashes — 30,294 crashes, 214 deaths",
        detail: "Speed is a major factor: 55 mph zones follow with similar fatality counts.",
        valueLabel: "crashes by speed limit",
        portal: "data.austintexas.gov",
        datasetId: "y2wy-tgr5",
        soql: {
          select: "crash_speed_limit, count(*) as crashes, sum(death_cnt) as deaths",
          where: "crash_speed_limit IS NOT NULL AND crash_speed_limit != '0'",
          group: "crash_speed_limit",
          order: "crashes DESC",
          limit: 10,
        },
      },
    ],
    questions: [
      "How many traffic deaths occurred in Austin in 2025?",
      "Which Austin streets have the most fatal crashes?",
      "How many pedestrian fatalities were there in Austin in the last 2 years?",
      "Show me crashes in Austin at 45 mph speed zones",
    ],
  },

  // ── Active Franchise Tax Permit Holders ───────────────────────────────────
  "9cir-efmm": {
    insights: [
      {
        headline: "3,280,283 active businesses registered in Texas",
        detail: "Texas is one of the most business-dense states in the US — over 3.2 million active permit holders.",
        valueLabel: "total active businesses",
        portal: "data.texas.gov",
        datasetId: "9cir-efmm",
        soql: {
          select: "taxpayer_city, count(*) as cnt",
          group: "taxpayer_city",
          order: "cnt DESC",
          limit: 10,
        },
      },
      {
        headline: "Austin has 291,098 active businesses — 2nd only to Houston (378,606)",
        detail: "Dallas (248,929) ranks 3rd. Austin's count reflects its rapid growth over the past decade.",
        valueLabel: "businesses by city",
        portal: "data.texas.gov",
        datasetId: "9cir-efmm",
        soql: {
          select: "taxpayer_city, count(*) as cnt",
          group: "taxpayer_city",
          order: "cnt DESC",
          limit: 10,
        },
      },
      {
        headline: "24,502 new businesses registered in Texas in 2026 alone",
        detail: "55,127 were registered in all of 2025. Austin's 78731 zip leads all zips with 106,646 total registrations.",
        valueLabel: "new businesses by year",
        portal: "data.texas.gov",
        datasetId: "9cir-efmm",
        soql: {
          select: "date_trunc_y(responsibility_beginning_date) as year, count(*) as cnt",
          where: "responsibility_beginning_date>'2020-01-01T00:00:00.000'",
          group: "year",
          order: "year DESC",
          limit: 7,
        },
      },
      {
        headline: "276,519 Austin businesses have active right-to-transact status",
        detail: "Of Austin's 291,098 registered businesses, 5.3% (14,579) are flagged as not currently authorized.",
        valueLabel: "Austin business status breakdown",
        portal: "data.texas.gov",
        datasetId: "9cir-efmm",
        soql: {
          select: "right_to_transact_business_code, count(*) as cnt",
          where: "taxpayer_city='AUSTIN'",
          group: "right_to_transact_business_code",
          order: "cnt DESC",
          limit: 5,
        },
      },
    ],
    questions: [
      "How many active businesses are registered in Austin Texas?",
      "Which Texas cities have the most active businesses?",
      "How many new businesses started in Texas in 2025?",
      "Show me active businesses in Travis County by organization type",
    ],
  },

  // ── Texas State Expenditures ──────────────────────────────────────────────
  "2zpi-yjjs": {
    insights: [
      {
        headline: "Texas spent $189.9 billion in fiscal year 2024",
        detail: "Total state expenditures across all agencies and spending categories for FY2024.",
        valueLabel: "total expenditure",
        portal: "data.texas.gov",
        datasetId: "2zpi-yjjs",
        soql: {
          select: "agency_name, sum(amount) as total",
          where: "fiscal_year='2024'",
          group: "agency_name",
          order: "total DESC",
          limit: 10,
        },
      },
      {
        headline: "HHSC topped all agencies at $62.7 billion in FY2024",
        detail: "Health and Human Services Commission alone accounts for 33% of all Texas state spending.",
        valueLabel: "spending by agency",
        portal: "data.texas.gov",
        datasetId: "2zpi-yjjs",
        soql: {
          select: "agency_name, sum(amount) as total",
          where: "fiscal_year='2024'",
          group: "agency_name",
          order: "total DESC",
          limit: 10,
        },
      },
      {
        headline: "Public Assistance Payments is the largest category — $71.7 billion",
        detail: "Salaries and Wages ($28.5B) and Grants ($22.3B) follow. Public assistance is 38% of all state spending.",
        valueLabel: "spending by category",
        portal: "data.texas.gov",
        datasetId: "2zpi-yjjs",
        soql: {
          select: "major_spending_category, sum(amount) as total",
          where: "fiscal_year='2024'",
          group: "major_spending_category",
          order: "total DESC",
          limit: 10,
        },
      },
      {
        headline: "Average spend per Texas agency: $4.3 million in FY2024",
        detail: "Expenditures are highly concentrated — the top 5 agencies account for the majority of all state spending.",
        valueLabel: "average agency spend",
        portal: "data.texas.gov",
        datasetId: "2zpi-yjjs",
        soql: {
          select: "fiscal_year, sum(amount) as total, count(distinct agency_name) as agencies",
          where: "fiscal_year='2024'",
          group: "fiscal_year",
          limit: 1,
        },
      },
    ],
    questions: [
      "What are the top Texas state agencies by spending in 2024?",
      "How much did Texas spend on public assistance in fiscal year 2024?",
      "What are the largest spending categories in the Texas state budget?",
      "How much did Texas Health and Human Services spend in 2024?",
    ],
  },

  // ── Mixed Beverage Gross Receipts ─────────────────────────────────────────
  "naix-2893": {
    insights: [
      {
        headline: "ACL Music Festival tops Austin bars with $14.8M in receipts",
        detail: "The festival's Platinum Lounge generates more alcohol revenue in days than most Austin venues do all year.",
        valueLabel: "top Austin venues by receipts",
        portal: "data.texas.gov",
        datasetId: "naix-2893",
        soql: {
          select: "location_name, sum(total_receipts) as total",
          where: "taxpayer_city='AUSTIN'",
          group: "location_name",
          order: "total DESC",
          limit: 10,
        },
      },
      {
        headline: "Liquor dominates Austin alcohol sales: $6.6B vs $3.1B beer vs $1.2B wine",
        detail: "Across all Austin permit holders, liquor accounts for 61% of all alcohol revenue.",
        valueLabel: "alcohol type breakdown",
        portal: "data.texas.gov",
        datasetId: "naix-2893",
        soql: {
          select: "sum(liquor_receipts) as liquor, sum(wine_receipts) as wine, sum(beer_receipts) as beer",
          where: "taxpayer_city='AUSTIN'",
        },
      },
      {
        headline: "78701 (downtown) generates the most receipts — $3.2 billion total",
        detail: "78704 (South Congress) follows at $1.3B. Downtown Austin's bar density makes it the clear leader.",
        valueLabel: "receipts by zip code",
        portal: "data.texas.gov",
        datasetId: "naix-2893",
        soql: {
          select: "location_zip, sum(total_receipts) as total",
          where: "taxpayer_city='AUSTIN' AND location_zip IS NOT NULL",
          group: "location_zip",
          order: "total DESC",
          limit: 10,
        },
      },
      {
        headline: "210,534 active mixed beverage permit holders in Austin",
        detail: "Austin's permit holder count reflects one of the densest bar and restaurant markets in Texas.",
        valueLabel: "permit holders in Austin",
        portal: "data.texas.gov",
        datasetId: "naix-2893",
        soql: {
          select: "taxpayer_city, count(*) as cnt",
          where: "taxpayer_city='AUSTIN'",
          group: "taxpayer_city",
          limit: 1,
        },
      },
    ],
    questions: [
      "Which Austin bars have the highest total alcohol receipts?",
      "How do liquor, beer, and wine receipts compare across Austin?",
      "Which Austin zip code generates the most alcohol revenue?",
      "Show me the top Texas cities by mixed beverage receipts",
    ],
  },
};

export function getInsights(datasetId: string): DatasetInsights | null {
  return INSIGHTS[datasetId] ?? null;
}
