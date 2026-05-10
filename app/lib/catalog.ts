// Dataset catalog — single source of truth for the frontend.
// `config/datasets.yaml` (Python side) must be kept in sync with this file.

export type CatalogDataset = {
  id: string;
  title: string;
  agency: string;
  city: string;
  portal: string; // e.g. "data.austintexas.gov"
  cadence: "daily" | "weekly" | "monthly" | "quarterly";
  blurb: string;
  keyColumns: string[];
  rows?: string; // human-readable row-count estimate for UI cards
  sample_questions: string[]; // 4-6 canonical questions surfaced on the dataset page
};

export const CATALOG: CatalogDataset[] = [
  {
    id: "3syk-w9eu",
    title: "Issued Construction Permits",
    agency: "Development Services Department",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "daily",
    blurb:
      "Every construction permit issued by the City of Austin since the 1980s — type, address, contractor, status, value.",
    keyColumns: ["permittype", "status_current", "original_address1", "original_zip", "issue_date", "work_class", "permit_class_mapped", "contractor_company_name", "total_job_valuation"],
    rows: "2,354,632",
    sample_questions: [
      "Which permit types are growing fastest year-over-year?",
      "Total construction value approved in 2026 so far",
      "Busiest contractors by zip this year",
      "Top 5 zips by permit count, last 12 months",
      "Permit mix shift residential vs commercial since 2024",
      "Average days to permit close by district",
    ],
  },
  {
    id: "ecmv-9xxi",
    title: "Food Establishment Inspection Scores",
    agency: "Austin Public Health",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "weekly",
    blurb:
      "Health-inspection scores and violations for Austin restaurants, food trucks, and grocery stores.",
    keyColumns: ["restaurant_name", "score", "inspection_date", "address", "zip_code", "process_description"],
    rows: "120,000+",
    sample_questions: [
      "Restaurants in 78704 with failing inspections this year",
      "Repeat offenders by address last 12 months",
      "Average inspection score by zip — best and worst 5",
      "Trend in failure rate quarter-over-quarter",
      "Which zip has the most critical violations",
      "Top 10 most-improved restaurants over 2 years",
    ],
  },
  {
    id: "xwdj-i9he",
    title: "Austin 311 Public Data",
    agency: "Communications & Public Information",
    city: "Austin",
    portal: "datahub.austintexas.gov",
    cadence: "daily",
    blurb:
      "Every non-emergency 311 call logged in Austin — pothole, graffiti, animal services, code complaints, by zip and department.",
    keyColumns: ["sr_type_desc", "sr_status_desc", "sr_location_zip_code", "sr_created_date", "sr_department_desc", "sr_location"],
    rows: "1,500,000+",
    sample_questions: [
      "311 response times across all 10 council districts",
      "Top complaint type in District 3 this year",
      "Slowest response category in 2026",
      "Compare 311 volume in flood-prone zips vs city average",
      "Year-over-year change in noise complaints by zip",
      "Which zips have the most loose-dog reports",
    ],
  },
  {
    // status values: Active | Closed | Pending  (NOT 'Open')
    id: "6wtj-zbtb",
    title: "Austin Code Complaint Cases",
    agency: "Code Department",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "daily",
    blurb: "Active, closed, and pending building/zoning/STR code complaint cases — address, type, priority, department, and open date.",
    keyColumns: ["case_type", "status", "address", "zip_code", "opened_date", "priority", "department"],
    rows: "300,000+",
    sample_questions: [
      "Which violation types are closing fastest?",
      "Repeat violators by address this year",
      "Open violations by department backlog snapshot",
      "Average days from open to close by violation type",
      "Districts with the most active code violations",
      "Code violations correlated with permit volume by zip",
    ],
  },
  {
    // Use category_description for readable labels (Theft, Burglary, etc.)
    // ucr_category contains numeric UCR codes (23F, 220, etc.) — not human readable
    // occ_date is the correct date field (NOT occurred_date)
    id: "fdj4-gpfu",
    title: "Crime Reports",
    agency: "Austin Police Department",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "weekly",
    blurb: "Reported crimes by type, location, and time. APD case-level data with UCR categories and clearance status.",
    keyColumns: ["crime_type", "category_description", "location_type", "occ_date", "council_district", "clearance_status", "family_violence"],
    rows: "2,000,000+",
    sample_questions: [
      "Crime hotspots where building permits are still being issued",
      "Trend in incident severity year over year",
      "Top crime types by district",
      "Districts with declining vs rising crime rates",
      "Hour-of-day patterns for violent vs property crime",
      "Compare crime severity by zip vs same zip's permit volume",
    ],
  },
  {
    // crash_fatal_fl = 'true'/'false' string; use death_cnt for fatality count
    // This is all crash records, not just fatalities
    id: "y2wy-tgr5",
    title: "Austin Crash Report Data",
    agency: "Austin Transportation",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "monthly",
    blurb: "All crash-level records — fatalities, serious injuries, pedestrian/bicycle/motorcycle breakdowns, speed limits, collision types.",
    keyColumns: ["crash_fatal_fl", "death_cnt", "tot_injry_cnt", "rpt_street_name", "crash_speed_limit", "crash_timestamp", "pedestrian_death_count", "bicycle_death_count", "collsn_desc"],
    rows: "1,000+",
    sample_questions: [
      "Traffic fatalities by zip last 24 months",
      "Mode of transport: pedestrian vs bicycle vs vehicle trend",
      "Districts with the highest fatality density",
      "Time-of-day patterns for fatal crashes",
      "Year-over-year change in fatalities",
      "Comparison of fatalities to permit growth by district",
    ],
  },
  {
    id: "9cir-efmm",
    title: "Active Franchise Tax Permit Holders",
    agency: "Texas Comptroller of Public Accounts",
    city: "Texas",
    portal: "data.texas.gov",
    cadence: "quarterly",
    blurb:
      "Every active franchise tax permit holder in Texas — business name, city, zip, org type, county, right-to-transact status.",
    keyColumns: ["taxpayer_name", "taxpayer_city", "taxpayer_state", "taxpayer_zip", "taxpayer_organizational_type", "taxpayer_county_code", "responsibility_beginning_date"],
    rows: "1,800,000+",
    sample_questions: [
      "Which Texas cities have the most active franchise tax permit holders?",
      "Distribution of organizational types across the state",
      "New franchise tax permits by county this year",
      "Top zip codes by active permit-holder density",
    ],
  },
  {
    // county field does not exist — use agency_name + major_spending_category + amount
    id: "2zpi-yjjs",
    title: "Texas State Expenditures By County 2024",
    agency: "Texas Comptroller of Public Accounts",
    city: "Texas",
    portal: "data.texas.gov",
    cadence: "monthly",
    blurb:
      "State of Texas spending by agency and major spending category — fiscal year 2024.",
    keyColumns: ["fiscal_year", "agency_name", "major_spending_category", "amount"],
    rows: "100,000+",
    sample_questions: [
      "Top 10 state agencies by total 2024 expenditures",
      "Largest spending categories statewide in 2024",
      "Agency-level breakdown for the largest spending category",
      "Which agencies grew their share of state spending?",
    ],
  },
  {
    // location_city does not exist — use taxpayer_city; total_receipts is the sum field
    id: "naix-2893",
    title: "Mixed Beverage Gross Receipts",
    agency: "Texas Comptroller of Public Accounts",
    city: "Texas",
    portal: "data.texas.gov",
    cadence: "monthly",
    blurb:
      "Liquor, wine, beer, and cover-charge receipts reported by every mixed-beverage permit holder in Texas.",
    keyColumns: ["location_name", "taxpayer_city", "total_receipts", "liquor_receipts", "beer_receipts", "wine_receipts", "obligation_end_date_yyyymmdd"],
    rows: "5,000,000+",
    sample_questions: [
      "Top 10 cities by total mixed-beverage receipts",
      "Liquor vs beer vs wine share statewide",
      "Highest-grossing single locations in the last 12 months",
      "Year-over-year change in total receipts by city",
    ],
  },
  {
    id: "9fxf-t2tr",
    title: "Dallas Police Active Calls",
    agency: "Dallas Police Department",
    city: "Dallas",
    portal: "www.dallasopendata.com",
    cadence: "daily",
    blurb:
      "Live feed of active Dallas Police calls — incident type, division, priority, location, and status.",
    keyColumns: ["division", "nature_of_call", "priority", "date", "block", "location", "beat", "status"],
    rows: "60,000+",
    sample_questions: [
      "Most common active call types right now",
      "Active-call volume by division",
      "Highest-priority calls in the last 24 hours",
      "Beats with the heaviest active workload",
    ],
  },
  {
    id: "gc4d-8a49",
    title: "Dallas 311 Service Requests",
    agency: "Dallas 311 Customer Service",
    city: "Dallas",
    portal: "www.dallasopendata.com",
    cadence: "daily",
    blurb:
      "Every non-emergency 311 service request filed in Dallas — type, department, council district, status, response time.",
    keyColumns: ["service_request_type", "department", "city_council_district", "status", "created_date", "priority"],
    rows: "1,200,000+",
    sample_questions: [
      "Top 311 request types in Dallas this year",
      "Council districts with the highest 311 volume",
      "Departments with the longest response backlog",
      "Year-over-year trend in total 311 requests",
    ],
  },
];

// Portal label for the citation block.
export const PORTAL_LABELS: Record<string, string> = {
  "data.austintexas.gov": "City of Austin",
  "datahub.austintexas.gov": "City of Austin",
  "data.texas.gov": "State of Texas",
  "www.dallasopendata.com": "City of Dallas",
  "data.sanantonio.gov": "City of San Antonio",
  "data.houstontx.gov": "City of Houston",
};

export function findById(id: string): CatalogDataset | undefined {
  return CATALOG.find((d) => d.id === id);
}

// Simple Jaccard token overlap — same scoring as the Python implementation.
function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const uni = a.size + b.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

export function discover(query: string, city?: string): CatalogDataset[] {
  const q = tokenize(query);
  const candidates = city
    ? CATALOG.filter((d) => d.city.toLowerCase() === city.toLowerCase())
    : CATALOG;
  return candidates
    .map((d) => {
      const text = `${d.title} ${d.blurb} ${d.keyColumns.join(" ")}`;
      return { d, score: jaccard(q, tokenize(text)) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.d);
}
