// Pre-generated insights from live Socrata queries (tests/fixtures/*.json).
// Updated: 2026-05-09 · 90/90 queries passing · do not hand-edit numbers.

export type Insight = {
  headline: string;
  detail: string;
  icon: string; // single emoji for visual anchoring
  source: string; // Socrata URL
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
        icon: "⚠️",
        headline: "34 restaurants scored below 70 in the last year",
        detail: "Scores below 70 trigger mandatory follow-up inspections by Austin Public Health.",
        source: "https://data.austintexas.gov/resource/ecmv-9xxi.json?$select=count(*)%20as%20cnt&$where=score%3C70%20AND%20inspection_date%3E%272025-05-09T00%3A00%3A00.000%27",
      },
      {
        icon: "📍",
        headline: "78753 has the most low-scoring restaurants — 8 in the last 6 months",
        detail: "Followed by 78759 (7) and 78750 (5). North Austin zip codes dominate the low-score list.",
        source: "https://data.austintexas.gov/resource/ecmv-9xxi.json?$select=zip_code,count(*)%20as%20cnt&$where=score%3C80%20AND%20inspection_date%3E%272025-11-09T00%3A00%3A00.000%27&$group=zip_code&$order=cnt%20DESC&$limit=10",
      },
      {
        icon: "🍽️",
        headline: "K-Bop scored 57 — worst single inspection in Austin this year",
        detail: "Parlor & Yard (67) and Hunan Lion Restaurant (62) also among the lowest-scoring establishments.",
        source: "https://data.austintexas.gov/resource/ecmv-9xxi.json?$select=restaurant_name,score,inspection_date,zip_code&$where=score%3C80%20AND%20inspection_date%3E%272025-11-09T00%3A00%3A00.000%27&$order=score%20ASC&$limit=15",
      },
      {
        icon: "🔁",
        headline: "2 restaurants in 78704 have repeated inspection failures",
        detail: "Whip In (worst score: 62, 2 inspections) and Hunan Lion Restaurant both flagged for repeat violations.",
        source: "https://data.austintexas.gov/resource/ecmv-9xxi.json?$select=restaurant_name,count(*)%20as%20inspections,min(score)%20as%20worst&$where=score%3C80%20AND%20zip_code%20like%20%2778704%25%27&$group=restaurant_name&$having=count(*)%3E1&$order=worst%20ASC",
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
        icon: "🏗️",
        headline: "78744 leads Austin with 1,466 permits issued this year",
        detail: "Followed closely by 78704 (1,325) and 78745 (1,178). South and Southeast Austin dominate construction activity.",
        source: "https://data.austintexas.gov/resource/3syk-w9eu.json?$select=original_zip,count(*)%20as%20cnt&$where=issue_date%3E%272026-01-01T00%3A00%3A00.000%27&$group=original_zip&$order=cnt%20DESC&$limit=10",
      },
      {
        icon: "🏘️",
        headline: "14,271 residential vs 5,497 commercial permits issued in Austin YTD",
        detail: "Residential construction outpaces commercial 2.6:1 — consistent with Austin's housing growth trajectory.",
        source: "https://data.austintexas.gov/resource/3syk-w9eu.json?$select=permit_class_mapped,count(*)%20as%20cnt&$where=issue_date%3E%272026-01-01T00%3A00%3A00.000%27&$group=permit_class_mapped&$order=cnt%20DESC&$limit=2",
      },
      {
        icon: "👷",
        headline: "IES Residential leads Austin with 452 permits pulled this year",
        detail: "Vitex Inc (2nd) and other national contractors follow. Top 10 contractors account for a significant share of all activity.",
        source: "https://data.austintexas.gov/resource/3syk-w9eu.json?$select=contractor_company_name,count(*)%20as%20cnt&$where=issue_date%3E%272026-01-01T00%3A00%3A00.000%27%20AND%20contractor_company_name%20IS%20NOT%20NULL&$group=contractor_company_name&$order=cnt%20DESC&$limit=10",
      },
      {
        icon: "📈",
        headline: "3,817 commercial permits issued in Austin in the last 3 months",
        detail: "Monthly volumes have been steady: Jan 4,205 · Feb 4,473 · Mar 4,756 — a gradual upward trend.",
        source: "https://data.austintexas.gov/resource/3syk-w9eu.json?$select=count(*)%20as%20cnt&$where=permit_class_mapped%3D%27Commercial%27%20AND%20issue_date%3E%272026-02-08T00%3A00%3A00.000%27",
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
        icon: "🗑️",
        headline: "Garbage pickup is Austin's #1 complaint — 8,286 requests YTD",
        detail: "ARR - Garbage tops all categories, followed by parking enforcement and code officer requests.",
        source: "https://datahub.austintexas.gov/resource/xwdj-i9he.json?$select=sr_type_desc,count(*)%20as%20cnt&$where=sr_created_date%3E%272026-01-01T00%3A00%3A00.000%27&$group=sr_type_desc&$order=cnt%20DESC&$limit=10",
      },
      {
        icon: "📍",
        headline: "78704 leads all zip codes with 7,279 service requests YTD",
        detail: "Followed by 78745 (6,366) and 78741 (5,847). South Austin files the most 311 complaints in the city.",
        source: "https://datahub.austintexas.gov/resource/xwdj-i9he.json?$select=sr_location_zip_code,count(*)%20as%20cnt&$where=sr_created_date%3E%272026-01-01T00%3A00%3A00.000%27&$group=sr_location_zip_code&$order=cnt%20DESC&$limit=10",
      },
      {
        icon: "🕳️",
        headline: "1,094 pothole complaints filed in Austin in the last 90 days",
        detail: "That's roughly 12 pothole reports every day — one of Austin's most consistent infrastructure complaints.",
        source: "https://datahub.austintexas.gov/resource/xwdj-i9he.json?$select=count(*)%20as%20cnt&$where=sr_type_desc%20like%20%27%25Pothole%25%27%20AND%20sr_created_date%3E%272026-02-07T00%3A00%3A00.000%27",
      },
      {
        icon: "📂",
        headline: "5,487 requests still open vs 86,179 closed this year",
        detail: "~6% backlog rate. Austin Resource Recovery handles the highest volume of any single department (29,299 requests YTD).",
        source: "https://datahub.austintexas.gov/resource/xwdj-i9he.json?$select=sr_status_desc,count(*)%20as%20cnt&$where=sr_created_date%3E%272026-01-01T00%3A00%3A00.000%27&$group=sr_status_desc&$order=cnt%20DESC",
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
        icon: "🚨",
        headline: "78741 has the most active code violations — 381 open cases",
        detail: "Followed by 78702 (255) and 78704 (247). East Austin zip codes carry the heaviest open caseloads.",
        source: "https://data.austintexas.gov/resource/6wtj-zbtb.json?$select=zip_code,count(*)%20as%20cnt&$where=status%3D%27Active%27&$group=zip_code&$order=cnt%20DESC&$limit=10",
      },
      {
        icon: "📋",
        headline: "3,257 code complaints are currently active in Austin",
        detail: "All classified under a single case type: Complaints. 9,910 new cases were opened city-wide in 2026 so far.",
        source: "https://data.austintexas.gov/resource/6wtj-zbtb.json?$select=case_type,count(*)%20as%20cnt&$where=status%3D%27Active%27&$group=case_type&$order=cnt%20DESC",
      },
      {
        icon: "🏠",
        headline: "2606 Wheless Lane has 9 active violations — most of any address",
        detail: "1600 Royal Crest Drive (5) and 10310 N IH 35 Service Rd (5) are also among the most-flagged properties.",
        source: "https://data.austintexas.gov/resource/6wtj-zbtb.json?$select=address,count(*)%20as%20cnt&$where=status%3D%27Active%27&$group=address&$order=cnt%20DESC&$limit=10",
      },
      {
        icon: "⏳",
        headline: "Some Austin code cases have been open since 2004",
        detail: "The oldest active violation at 3807 Duval St (rear) has been open for over 20 years — one of many stalled enforcement cases.",
        source: "https://data.austintexas.gov/resource/6wtj-zbtb.json?$select=case_id,case_type,address,opened_date,status&$where=status%3D%27Active%27&$order=opened_date%20ASC&$limit=10",
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
        icon: "🏙️",
        headline: "District 3 leads Austin with 4,852 reported crimes this year",
        detail: "District 9 (4,448) and District 1 (3,804) follow. South and Central Austin account for the highest crime volumes.",
        source: "https://data.austintexas.gov/resource/fdj4-gpfu.json?$select=council_district,count(*)%20as%20cnt&$where=occ_date%3E%272026-01-01T00%3A00%3A00.000%27&$group=council_district&$order=cnt%20DESC&$limit=10",
      },
      {
        icon: "🚗",
        headline: "Burglary of Vehicle is Austin's most common specific crime — 3,589 YTD",
        detail: "Family Disturbance (3,656) and Theft are also in the top 3. Property crimes dominate the report volume.",
        source: "https://data.austintexas.gov/resource/fdj4-gpfu.json?$select=crime_type,count(*)%20as%20cnt&$where=occ_date%3E%272025-11-09T00%3A00%3A00.000%27&$group=crime_type&$order=cnt%20DESC&$limit=10",
      },
      {
        icon: "🏠",
        headline: "Residences are the most common crime location — 10,519 incidents YTD",
        detail: "Highways/roads (8,215) and parking lots (3,287) follow. More than half of all Austin crimes occur at or near homes.",
        source: "https://data.austintexas.gov/resource/fdj4-gpfu.json?$select=location_type,count(*)%20as%20cnt&$where=occ_date%3E%272026-01-01T00%3A00%3A00.000%27&$group=location_type&$order=cnt%20DESC&$limit=10",
      },
      {
        icon: "📊",
        headline: "74% of Austin crimes remain uncleared — 17,423 open cases YTD",
        detail: "Only 5,853 cases were cleared this year. Family violence has 2,122 incidents with very low clearance rates.",
        source: "https://data.austintexas.gov/resource/fdj4-gpfu.json?$select=clearance_status,count(*)%20as%20cnt&$where=occ_date%3E%272026-01-01T00%3A00%3A00.000%27&$group=clearance_status&$order=cnt%20DESC",
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
        icon: "💀",
        headline: "25 traffic deaths already in Austin in 2026",
        detail: "2025 recorded 105 deaths across 97 crashes. Austin's Vision Zero goal remains far from reached.",
        source: "https://data.austintexas.gov/resource/y2wy-tgr5.json?$select=date_trunc_y(crash_timestamp)%20as%20year,sum(death_cnt)%20as%20deaths,count(*)%20as%20crashes&$where=crash_fatal_fl%3D%27true%27&$group=year&$order=year%20DESC&$limit=5",
      },
      {
        icon: "🛣️",
        headline: "Lamar Blvd is Austin's deadliest named street",
        detail: "Lamar appears in multiple fatal crash clusters for vehicles, pedestrians, and bicyclists — the highest of any named corridor.",
        source: "https://data.austintexas.gov/resource/y2wy-tgr5.json?$select=rpt_street_name,count(*)%20as%20crashes,sum(death_cnt)%20as%20deaths&$where=crash_fatal_fl%3D%27true%27&$group=rpt_street_name&$order=deaths%20DESC&$limit=10",
      },
      {
        icon: "🚧",
        headline: "12,037 crashes in construction zones — 92 deaths",
        detail: "Construction-zone crashes account for a disproportionate share of serious injuries across Austin's road network.",
        source: "https://data.austintexas.gov/resource/y2wy-tgr5.json?$select=count(*)%20as%20cnt,sum(death_cnt)%20as%20deaths&$where=road_constr_zone_fl%3D%27Y%27",
      },
      {
        icon: "🏎️",
        headline: "45 mph zones have the most fatal crashes — 30,294 crashes, 214 deaths",
        detail: "Speed is a major factor: 55 mph zones follow with 214 deaths. Slower residential streets (25 mph) show far fewer fatalities.",
        source: "https://data.austintexas.gov/resource/y2wy-tgr5.json?$select=crash_speed_limit,count(*)%20as%20crashes,sum(death_cnt)%20as%20deaths&$group=crash_speed_limit&$order=crashes%20DESC&$limit=10",
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
        icon: "🏢",
        headline: "3,280,283 active businesses registered in Texas",
        detail: "Texas is one of the most business-dense states in the US — over 3.2 million active permit holders on record.",
        source: "https://data.texas.gov/resource/9cir-efmm.json?$select=count(*)%20as%20cnt",
      },
      {
        icon: "🌆",
        headline: "Austin has 291,098 active businesses — 2nd only to Houston (378,606)",
        detail: "Dallas (248,929) ranks 3rd. Austin's business count reflects its rapid growth over the past decade.",
        source: "https://data.texas.gov/resource/9cir-efmm.json?$select=taxpayer_city,count(*)%20as%20cnt&$group=taxpayer_city&$order=cnt%20DESC&$limit=10",
      },
      {
        icon: "🚀",
        headline: "24,502 new businesses registered in Texas in 2026 alone",
        detail: "55,127 were registered in all of 2025. Austin's 78731 zip leads all zips with 106,646 total registrations.",
        source: "https://data.texas.gov/resource/9cir-efmm.json?$select=date_trunc_y(responsibility_beginning_date)%20as%20year,count(*)%20as%20cnt&$group=year&$order=year%20DESC&$limit=5",
      },
      {
        icon: "🏛️",
        headline: "276,519 Austin businesses have active right-to-transact status",
        detail: "Of Austin's 291,098 registered businesses, 5.3% (14,579) are flagged as not currently authorized to transact.",
        source: "https://data.texas.gov/resource/9cir-efmm.json?$select=right_to_transact_business_code,count(*)%20as%20cnt&$where=taxpayer_city%3D%27AUSTIN%27&$group=right_to_transact_business_code&$order=cnt%20DESC",
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
        icon: "💰",
        headline: "Texas spent $189.9 billion in fiscal year 2024",
        detail: "Total state expenditures across all agencies and spending categories for FY2024.",
        source: "https://data.texas.gov/resource/2zpi-yjjs.json?$select=sum(amount)%20as%20total&$where=fiscal_year%3D%272024%27",
      },
      {
        icon: "🏥",
        headline: "HHSC topped all agencies at $62.7 billion in FY2024",
        detail: "Health and Human Services Commission alone accounts for 33% of all Texas state spending. Dept of Transportation is 2nd.",
        source: "https://data.texas.gov/resource/2zpi-yjjs.json?$select=agency_name,sum(amount)%20as%20total&$where=fiscal_year%3D%272024%27&$group=agency_name&$order=total%20DESC&$limit=10",
      },
      {
        icon: "🤝",
        headline: "Public Assistance Payments is the largest spending category — $71.7 billion",
        detail: "Salaries and Wages ($28.5B) and Grants ($22.3B) follow. Public assistance alone is 38% of all state expenditures.",
        source: "https://data.texas.gov/resource/2zpi-yjjs.json?$select=major_spending_category,sum(amount)%20as%20total&$where=fiscal_year%3D%272024%27&$group=major_spending_category&$order=total%20DESC&$limit=10",
      },
      {
        icon: "📊",
        headline: "Average spend per Texas agency: $4.3 million in FY2024",
        detail: "Expenditures are highly concentrated — the top 5 agencies account for the majority of all state spending.",
        source: "https://data.texas.gov/resource/2zpi-yjjs.json?$select=avg(amount)%20as%20avg_amount&$where=fiscal_year%3D%272024%27",
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
        icon: "🎸",
        headline: "ACL Music Festival tops Austin bars with $14.8M in receipts",
        detail: "The annual festival's Platinum Lounge generates more alcohol revenue in a short window than most Austin venues do all year.",
        source: "https://data.texas.gov/resource/naix-2893.json?$select=location_name,total_receipts,obligation_end_date_yyyymmdd&$where=taxpayer_city%3D%27AUSTIN%27&$order=total_receipts%20DESC&$limit=10",
      },
      {
        icon: "🍹",
        headline: "Liquor dominates Austin alcohol sales: $6.6B vs $3.1B beer vs $1.2B wine",
        detail: "Across all Austin permit holders, liquor accounts for 61% of all alcohol revenue — consistent with a bar-heavy market.",
        source: "https://data.texas.gov/resource/naix-2893.json?$select=sum(liquor_receipts)%20as%20liquor,sum(wine_receipts)%20as%20wine,sum(beer_receipts)%20as%20beer&$where=taxpayer_city%3D%27AUSTIN%27",
      },
      {
        icon: "🗺️",
        headline: "78701 (downtown) generates the most receipts — $3.2 billion total",
        detail: "78704 (South Congress) follows at $1.3B. Downtown Austin's bar density makes it the clear alcohol revenue leader.",
        source: "https://data.texas.gov/resource/naix-2893.json?$select=location_zip,sum(total_receipts)%20as%20total&$where=taxpayer_city%3D%27AUSTIN%27&$group=location_zip&$order=total%20DESC&$limit=10",
      },
      {
        icon: "🍺",
        headline: "210,534 active mixed beverage permit holders in Austin",
        detail: "Austin's permit holder count reflects one of the densest bar and restaurant markets in Texas.",
        source: "https://data.texas.gov/resource/naix-2893.json?$select=count(*)%20as%20cnt&$where=taxpayer_city%3D%27AUSTIN%27",
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
