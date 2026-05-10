// /sources — All citations: datasets, glossaries, portals, dependencies.
// Single-page provenance view. Every dataset, every portal, every column
// the agent understands, every software dependency that powers the loop.

import Link from "next/link";
import { Shell } from "@/app/components/ds";
import { CATALOG, type CatalogDataset } from "@/app/lib/catalog";
import { loadDiscovery } from "@/app/lib/catalog-discovered";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export const metadata = {
  title: "Sources & Citations — TXLookup",
  description:
    "Every dataset, portal, column definition, and software dependency that powers TXLookup. The full provenance ledger.",
};

// Plain-English glossary keyed by column name. Curated; covers the columns
// that show up in agent answers + report charts. Other columns degrade
// gracefully — agent reads the schema live and proceeds without a glossary
// entry.
const GLOSSARY: Record<string, string> = {
  // Permits (3syk-w9eu)
  permittype: "Short permit code (e.g. BP=Building, EP=Electrical, MP=Mechanical, PP=Plumbing).",
  permit_class_mapped: "High-level category — Residential, Commercial, Mixed-Use, etc.",
  status_current: "Current state — Active, Final, Issued, Expired, Cancelled, Withdrawn, Hold.",
  original_address1: "Street address as filed on the permit application.",
  original_zip: "5-digit ZIP code where the permit was issued.",
  issue_date: "Date the permit was officially issued by the city.",
  work_class: "Specific work category — New, Addition, Remodel, Demolition.",
  contractor_company_name: "Contractor of record. Useful for contractor-by-volume rankings.",
  total_job_valuation: "Declared dollar value of the work.",
  // Inspections (ecmv-9xxi)
  restaurant_name: "Establishment name as registered with the health department.",
  score: "Inspection score, 0-100. Below 70 is a failing grade in Austin.",
  inspection_date: "Date the inspection was conducted.",
  address: "Street address of the establishment (across multiple datasets).",
  zip_code: "5-digit ZIP code (across multiple datasets).",
  process_description: "Inspection type — Routine, Follow-up, Complaint-based, Pre-opening.",
  facility_id: "Internal facility identifier, used for joining repeat-inspection sequences.",
  // 311 (xwdj-i9he)
  sr_type_desc: "Service-request category — Loose Dog, Pothole, Code Violation, Bulk Trash, etc.",
  sr_status_desc: "Status of the request — Open, Closed, In Progress, Cancelled.",
  sr_location_zip_code: "ZIP code where the request was reported.",
  sr_created_date: "When the resident filed the 311 request.",
  sr_department_desc: "City department that owns the request (Watershed, Animal Services, etc.).",
  // Code violations (6wtj-zbtb)
  case_id: "Internal code-enforcement case number.",
  case_type: "Violation category — Brush, Junk, Inoperable Vehicle, Substandard Structure.",
  status: "Case state — Active, Pending, Closed.",
  opened_date: "When the case was opened.",
  priority: "Severity — Routine, High, Critical.",
  department: "Owning department within Code Enforcement.",
  // TX franchise (9cir-efmm)
  taxpayer_number: "Comptroller-assigned taxpayer identifier (11 digits).",
  taxpayer_name: "Registered business name.",
  taxpayer_city: "City where the entity is registered.",
  taxpayer_zip: "ZIP code of registered address.",
  taxpayer_county_code: "Numeric county code; 227 = Travis County.",
  responsibility_beginning_date: "Date the entity became responsible for franchise tax.",
  right_to_transact_business_code: "Y = active right to transact, N = revoked / inactive.",
  // Dallas 311 (gc4d-8a49)
  service_request_number: "Unique 311 case ID.",
  created_date: "When the Dallas 311 case was filed.",
};

const PORTALS = [
  {
    host: "data.austintexas.gov",
    label: "City of Austin · Open Data Portal",
    type: "Socrata SODA v2.1",
    license: "Public domain (City of Austin terms of use)",
    attribution: "Source data ©  City of Austin · used per public-records terms",
  },
  {
    host: "datahub.austintexas.gov",
    label: "Austin Data Hub",
    type: "Socrata SODA v2.1",
    license: "Public domain (City of Austin)",
    attribution: "Source data ©  City of Austin · used per public-records terms",
  },
  {
    host: "data.texas.gov",
    label: "State of Texas · Open Data",
    type: "Socrata SODA v2.1",
    license: "Public domain (Texas Public Information Act)",
    attribution: "Source data ©  State of Texas · used per Texas Public Information Act",
  },
  {
    host: "www.dallasopendata.com",
    label: "City of Dallas · Open Data",
    type: "Socrata SODA v2.1",
    license: "Public domain (City of Dallas)",
    attribution: "Source data ©  City of Dallas · used per public-records terms",
  },
  {
    host: "data.sanantonio.gov",
    label: "City of San Antonio · Open Data",
    type: "CKAN v3",
    license: "City of San Antonio open data terms",
    attribution: "Source data ©  City of San Antonio",
  },
  {
    host: "data.houstontx.gov",
    label: "City of Houston · Open Data",
    type: "CKAN v3",
    license: "City of Houston open data terms",
    attribution: "Source data ©  City of Houston",
  },
];

const DEPENDENCIES = [
  { name: "OpenAI (Codex / GPT-4o)", role: "Reasoning · planning · synthesis · critic", url: "https://openai.com/" },
  { name: "Featherless", role: "Open-source LLM fallback path", url: "https://featherless.ai/" },
  { name: "Model Context Protocol", role: "Server transport (stdio); installable in Claude Code, Cursor, Codex", url: "https://modelcontextprotocol.io/" },
  { name: "Smithery", role: "MCP marketplace listing", url: "https://smithery.ai/" },
  { name: "Miro REST API", role: "A2A handoff target — multi-agent topology + run-trace boards", url: "https://developers.miro.com/" },
  { name: "Socrata SODA", role: "Primary query API for Austin / Dallas / TX state portals", url: "https://dev.socrata.com/" },
  { name: "CKAN", role: "Catalog + query API for San Antonio + Houston portals", url: "https://docs.ckan.org/" },
  { name: "Vercel", role: "Hosted Next.js deployment", url: "https://vercel.com/" },
  { name: "Next.js 14", role: "App Router · server components · ISR", url: "https://nextjs.org/" },
];

function CitationCard({ ds }: { ds: CatalogDataset }) {
  const sodaUrl = `https://${ds.portal}/resource/${ds.id}.json`;
  const portalUrl = `https://${ds.portal}/d/${ds.id}`;
  return (
    <li className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[18px] font-bold leading-snug tracking-tight text-[var(--ds-text)] md:text-[20px]">
          {ds.title}
        </h3>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ds-good)]">
          curated
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">
        <span>{ds.id}</span>
        <span>·</span>
        <span>{ds.portal}</span>
        <span>·</span>
        <span>{ds.agency}</span>
        <span>·</span>
        <span>{ds.cadence}</span>
        {ds.rows && (
          <>
            <span>·</span>
            <span>{ds.rows} rows</span>
          </>
        )}
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--ds-text-mute)]">{ds.blurb}</p>

      <div className="mt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-purple)]">
          Glossary · key columns
        </p>
        <dl className="mt-2 grid gap-1 text-[12.5px] md:grid-cols-2">
          {ds.keyColumns.map((col) => (
            <div key={col} className="flex flex-col rounded border border-[var(--ds-border)]/40 bg-[var(--ds-bg)] p-2.5">
              <dt className="font-mono text-[11px] font-semibold text-[var(--ds-text)]">{col}</dt>
              <dd className="mt-1 text-[11.5px] leading-snug text-[var(--ds-text-mute)]">
                {GLOSSARY[col] ?? <span className="italic text-[var(--ds-text-dim)]">— agent reads schema live</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--ds-purple)]/[0.16] px-3 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-purple)] hover:bg-[var(--ds-purple)]/[0.24]"
        >
          Open in portal ↗
        </a>
        <a
          href={`${sodaUrl}?$limit=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg)] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ds-text-mute)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-text)]"
        >
          SODA endpoint ↗
        </a>
        <Link
          href={`/datasets/${ds.id}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg)] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ds-text-mute)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-text)]"
        >
          Detail page →
        </Link>
      </div>
    </li>
  );
}

export default async function SourcesPage() {
  const discovery = await loadDiscovery();

  return (
    <Shell active="/sources">
      {/* HERO */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
            Sources & citations · the provenance ledger
          </p>
          <h1 className="mt-4 max-w-[24ch] text-[44px] font-bold leading-[1.04] tracking-[-0.025em] text-[var(--ds-text)] md:text-[64px]">
            Every dataset. Every column. Every dependency.
          </h1>
          <p className="mt-6 max-w-[64ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">
            <span className="text-[var(--ds-text)]">{discovery.totalKnown.toLocaleString()} datasets indexed</span> across {discovery.portals.length} portals. <span className="text-[var(--ds-text)]">{CATALOG.length} deeply curated</span> with column-level glossaries. Every claim the agent makes routes back through this ledger — portal, dataset id, column definition, the SODA URL it ran.
          </p>

          <div className="mt-7 grid gap-3 md:grid-cols-4">
            {[
              { label: "Indexed datasets", value: discovery.totalKnown.toLocaleString(), tone: "var(--ds-accent)" },
              { label: "Curated", value: String(CATALOG.length), tone: "var(--ds-good)" },
              { label: "Portals", value: String(discovery.portals.length), tone: "var(--ds-purple)" },
              { label: "Glossary terms", value: String(Object.keys(GLOSSARY).length), tone: "var(--ds-warm)" },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4">
                <p className="text-[28px] font-bold tabular-nums tracking-tight md:text-[36px]" style={{ color: s.tone }}>
                  {s.value}
                </p>
                <p className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PORTALS */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
            Portals
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[36px]">
            Six portals. Two API styles. Public data only.
          </h2>
          <p className="mt-3 max-w-[60ch] text-[14.5px] leading-relaxed text-[var(--ds-text-mute)]">
            Every dataset on this site comes from one of these public open-data portals. We never scrape or re-host — every query routes back to the portal as the source of truth.
          </p>

          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {PORTALS.map((p) => {
              const live = discovery.portals.find((d) => d.portal === p.host);
              return (
                <li key={p.host} className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[16px] font-bold text-[var(--ds-text)]">{p.label}</h3>
                    {live && (
                      <span className="font-mono text-[11px] tabular-nums text-[var(--ds-good)]">
                        {live.total_known.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ds-text-dim)]">
                    {p.host} · {p.type}
                  </p>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--ds-text-mute)]">
                    <span className="text-[var(--ds-text)]">License:</span> {p.license}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ds-text-mute)]">
                    {p.attribution}
                  </p>
                  <a
                    href={`https://${p.host}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ds-accent)] hover:text-[var(--ds-text)]"
                  >
                    Visit portal ↗
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* CITATIONS — curated datasets with glossaries */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-good)]">
            Citations · the curated {CATALOG.length}
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[36px]">
            Every dataset the agent deeply knows.
          </h2>
          <p className="mt-3 max-w-[60ch] text-[14.5px] leading-relaxed text-[var(--ds-text-mute)]">
            These {CATALOG.length} datasets carry full schema knowledge — hand-picked SoQL, glossary entries per key column, locally-mirrored rows. Anything else from the {discovery.totalKnown.toLocaleString()}-dataset universe is answered on demand: agent reads the schema live, plans a query, runs it.
          </p>

          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {CATALOG.map((ds) => (
              <CitationCard key={ds.id} ds={ds} />
            ))}
          </ul>
        </div>
      </section>

      {/* SOFTWARE DEPENDENCIES */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
            Software dependencies
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[36px]">
            Built on open standards.
          </h2>
          <ul className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {DEPENDENCIES.map((d) => (
              <li key={d.name} className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4">
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14.5px] font-bold text-[var(--ds-text)] hover:text-[var(--ds-accent)]"
                >
                  {d.name} ↗
                </a>
                <p className="mt-1 text-[12px] text-[var(--ds-text-mute)]">{d.role}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* LICENSE */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
            License & attribution
          </p>
          <h2 className="mt-3 max-w-[28ch] text-[24px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text)] md:text-[32px]">
            Code: MIT. Data: city + state public-records terms.
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ds-text-dim)]">Code license</p>
              <p className="mt-2 text-[14px] text-[var(--ds-text-mute)]">
                MIT License · Copyright (c) 2026 ATX-TXLookup contributors. See <a href="https://github.com/ATX-TXLookup/TXLookup/blob/main/LICENSE" className="text-[var(--ds-accent)] hover:underline">LICENSE</a> for full terms.
              </p>
            </div>
            <div className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ds-text-dim)]">Data attribution</p>
              <p className="mt-2 text-[14px] text-[var(--ds-text-mute)]">
                All data is the property of its issuing agency, used under public-records terms. TXLookup does not claim ownership of any source data. Each portal is linked above with its specific license.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
