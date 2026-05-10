// Pull the full catalog metadata from each Texas Socrata portal we cover.
// Writes one JSON file per portal to data/catalog/<portal-slug>.json. Used by
// /datasets to show the real "indexed dataset count" — orders of magnitude
// larger than the 9 we hand-curate for the demo.
//
// Run: node scripts/fetch-discovered-catalog.mjs
// Cron: not yet — call this manually pre-deploy until we wire it to a workflow.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const PORTALS = [
  // Socrata-backed (Austin / Dallas / TX state)
  { slug: "austin",      host: "data.austintexas.gov",       kind: "socrata" },
  { slug: "austin-hub",  host: "datahub.austintexas.gov",    kind: "socrata" },
  { slug: "dallas",      host: "www.dallasopendata.com",     kind: "socrata" },
  { slug: "tx-state",    host: "data.texas.gov",             kind: "socrata" },
  // CKAN-backed (San Antonio + Houston)
  { slug: "san-antonio", host: "data.sanantonio.gov",        kind: "ckan" },
  { slug: "houston",     host: "data.houstontx.gov",         kind: "ckan" },
];

const PAGE_SIZE = 100;
const HARD_CAP = 1500; // keep file size sane per portal

function basicAuthHeaders() {
  const id = process.env.SOCRATA_KEY_ID;
  const secret = process.env.SOCRATA_KEY_SECRET;
  if (id && secret) {
    const token = Buffer.from(`${id}:${secret}`).toString("base64");
    return { Authorization: `Basic ${token}` };
  }
  return {};
}

// ── Socrata fetcher ─────────────────────────────────────────────────────────
async function fetchSocrataPage(host, offset) {
  const url =
    `https://${host}/api/catalog/v1?` +
    `search_context=${host}` +
    `&only=datasets,maps,charts,calendars,filters` +
    `&limit=${PAGE_SIZE}` +
    `&offset=${offset}` +
    `&order=updatedAt`;
  const r = await fetch(url, {
    headers: { ...basicAuthHeaders(), "user-agent": "txlookup-catalog-discovery/0.1" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return r.json();
}

function shapeSocrata(rec, portalHost) {
  const r = rec.resource ?? {};
  const c = rec.classification ?? {};
  return {
    id: r.id ?? null,
    name: r.name ?? "",
    description: (r.description ?? "").slice(0, 280),
    type: r.type ?? "dataset",
    category: c.domain_category ?? c.parent_category ?? null,
    updated_at: r.updatedAt ?? r.data_updated_at ?? null,
    tags: (c.domain_tags ?? []).slice(0, 6),
    page_views: r.page_views?.page_views_total ?? 0,
    url: r.id ? `https://${portalHost}/d/${r.id}` : null,
  };
}

// ── CKAN fetcher (data.sanantonio.gov, data.houstontx.gov) ──────────────────
async function fetchCkanPage(host, start) {
  const url =
    `https://${host}/api/3/action/package_search?` +
    `rows=${PAGE_SIZE}&start=${start}`;
  const r = await fetch(url, {
    headers: { "user-agent": "txlookup-catalog-discovery/0.1" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  const json = await r.json();
  if (!json.success) throw new Error(`CKAN error on ${url}`);
  return json.result; // { count, results: [...] }
}

function shapeCkan(rec, portalHost) {
  const tags = Array.isArray(rec.tags) ? rec.tags.slice(0, 6).map((t) => t.display_name ?? t.name).filter(Boolean) : [];
  const groups = Array.isArray(rec.groups) ? rec.groups[0]?.display_name : null;
  return {
    id: rec.id ?? rec.name ?? null,
    name: rec.title ?? rec.name ?? "",
    description: (rec.notes ?? "").slice(0, 280),
    type: "dataset",
    category: groups ?? rec.organization?.title ?? null,
    updated_at: rec.metadata_modified ?? rec.metadata_created ?? null,
    tags,
    page_views: 0,
    url: rec.name ? `https://${portalHost}/dataset/${rec.name}` : null,
  };
}

async function fetchPortal(portal) {
  console.log(`[catalog] ${portal.host} (${portal.kind}) — fetching…`);
  const rows = [];
  let total = 0;
  if (portal.kind === "socrata") {
    const first = await fetchSocrataPage(portal.host, 0);
    total = first.resultSetSize ?? 0;
    rows.push(...(first.results ?? []));
    let offset = rows.length;
    while (offset < Math.min(total, HARD_CAP)) {
      const page = await fetchSocrataPage(portal.host, offset);
      const got = page.results ?? [];
      if (got.length === 0) break;
      rows.push(...got);
      offset += got.length;
    }
    const shaped = rows.map((r) => shapeSocrata(r, portal.host)).filter((r) => r.id);
    return {
      portal: portal.host,
      kind: portal.kind,
      total_known: total,
      fetched: shaped.length,
      fetched_at: new Date().toISOString(),
      datasets: shaped,
    };
  }
  // CKAN
  const first = await fetchCkanPage(portal.host, 0);
  total = first.count ?? 0;
  rows.push(...(first.results ?? []));
  let start = rows.length;
  while (start < Math.min(total, HARD_CAP)) {
    const page = await fetchCkanPage(portal.host, start);
    const got = page.results ?? [];
    if (got.length === 0) break;
    rows.push(...got);
    start += got.length;
  }
  const shaped = rows.map((r) => shapeCkan(r, portal.host)).filter((r) => r.id);
  return {
    portal: portal.host,
    kind: portal.kind,
    total_known: total,
    fetched: shaped.length,
    fetched_at: new Date().toISOString(),
    datasets: shaped,
  };
}

async function main() {
  const outDir = path.join(process.cwd(), "data", "catalog");
  await mkdir(outDir, { recursive: true });

  const summary = { fetched_at: new Date().toISOString(), portals: [] };
  for (const p of PORTALS) {
    try {
      const result = await fetchPortal(p);
      const outPath = path.join(outDir, `${p.slug}.json`);
      await writeFile(outPath, JSON.stringify(result));
      summary.portals.push({
        slug: p.slug,
        host: p.host,
        total_known: result.total_known,
        fetched: result.fetched,
      });
      console.log(`[catalog] ${p.host} → ${result.fetched} of ${result.total_known} → ${outPath}`);
    } catch (e) {
      console.error(`[catalog] ${p.host} FAILED:`, e instanceof Error ? e.message : e);
      summary.portals.push({ slug: p.slug, host: p.host, error: String(e) });
    }
  }
  await writeFile(path.join(outDir, "discovery-index.json"), JSON.stringify(summary, null, 2));
  console.log("\n[catalog] summary:", JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
