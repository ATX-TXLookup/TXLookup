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
    keyColumns: ["permittype", "status_current", "original_address1", "original_zip", "issue_date"],
    rows: "2,354,632",
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
    keyColumns: ["restaurant_name", "score", "inspection_date", "address", "zip_code"],
    rows: "120,000+",
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
    keyColumns: ["sr_type_desc", "sr_status_desc", "sr_location_zip_code", "sr_created_date", "sr_department_desc"],
    rows: "1,500,000+",
  },
  {
    id: "6wtj-zbtb",
    title: "Code Violation Cases",
    agency: "Code Department",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "daily",
    blurb: "Open and closed building, zoning, and short-term-rental violations.",
    keyColumns: ["case_type", "case_status", "location", "opened_date"],
    rows: "300,000+",
  },
  {
    id: "fdj4-gpfu",
    title: "Crime Reports",
    agency: "Austin Police Department",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "weekly",
    blurb: "Reported crimes by type, location, and time. APD case-level data.",
    keyColumns: ["crime_type", "location_type", "occurred_date", "zip_code"],
    rows: "2,000,000+",
  },
  {
    id: "y2wy-tgr5",
    title: "Austin Traffic Fatalities",
    agency: "Austin Transportation",
    city: "Austin",
    portal: "data.austintexas.gov",
    cadence: "monthly",
    blurb: "Fatal traffic crashes by location, mode, and year.",
    keyColumns: ["case_status", "location", "date", "mode"],
    rows: "1,000+",
  },
  {
    id: "9cir-efmm",
    title: "Active Franchise Tax Permit Holders",
    agency: "Texas Comptroller of Public Accounts",
    city: "Texas",
    portal: "data.texas.gov",
    cadence: "quarterly",
    blurb:
      "Every active franchise tax permit holder in Texas — taxpayer name, address, organizational type, county.",
    keyColumns: ["taxpayer_name", "taxpayer_city", "taxpayer_state", "taxpayer_organizational_type"],
    rows: "1,800,000+",
  },
  {
    id: "2zpi-yjjs",
    title: "Texas State Expenditures By County 2024",
    agency: "Texas Comptroller of Public Accounts",
    city: "Texas",
    portal: "data.texas.gov",
    cadence: "monthly",
    blurb:
      "State of Texas spending by agency, county, and major spending category — fiscal year 2024.",
    keyColumns: ["fiscal_year", "agency_name", "county", "major_spending_category", "amount"],
    rows: "100,000+",
  },
  {
    id: "naix-2893",
    title: "Mixed Beverage Gross Receipts",
    agency: "Texas Comptroller of Public Accounts",
    city: "Texas",
    portal: "data.texas.gov",
    cadence: "monthly",
    blurb:
      "Liquor, wine, beer, and cover-charge receipts reported by every mixed-beverage permit holder in Texas.",
    keyColumns: ["location_name", "location_city", "total_receipts", "obligation_end_date_yyyymmdd"],
    rows: "5,000,000+",
  },
];

// Portal label for the citation block.
export const PORTAL_LABELS: Record<string, string> = {
  "data.austintexas.gov": "City of Austin",
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
