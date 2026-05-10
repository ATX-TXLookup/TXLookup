// Read-side for the discovered Texas catalog.
//
// scripts/fetch-discovered-catalog.mjs writes one JSON per portal into
// data/catalog/<portal>.json. This module reads them at request time and
// surfaces the universe of indexed datasets so /datasets can show
// "5,815 Texas datasets indexed" rather than just the 9 we hand-curate.
//
// File-resilient: reads /var/task on Vercel, project root in dev. Returns
// an empty result if files are missing — the curated catalog still works.

import { promises as fs } from "fs";
import path from "path";

const CANDIDATES = [
  path.join(process.cwd(), "data", "catalog"),
  "/var/task/data/catalog",
];

export type DiscoveredDataset = {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string | null;
  updated_at: string | null;
  tags: string[];
  page_views: number;
  portal: string;
  url?: string | null;
};

export type PortalSummary = {
  portal: string;
  total_known: number;
  fetched: number;
  fetched_at: string;
};

export type DiscoveryResult = {
  totalKnown: number;     // sum across portals (catalog API resultSetSize)
  totalFetched: number;   // sum of what we have on disk
  portals: PortalSummary[];
  fetchedAt: string | null;
  // Top N most-viewed datasets across all portals — for the /datasets list.
  popular: DiscoveredDataset[];
};

const FILE_TO_PORTAL: Record<string, string> = {
  "austin.json": "data.austintexas.gov",
  "austin-hub.json": "datahub.austintexas.gov",
  "dallas.json": "www.dallasopendata.com",
  "tx-state.json": "data.texas.gov",
  "san-antonio.json": "data.sanantonio.gov",
  "houston.json": "data.houstontx.gov",
};

async function readPortalFile(dir: string, file: string): Promise<{
  portal: string;
  total_known: number;
  fetched: number;
  fetched_at: string;
  datasets: DiscoveredDataset[];
} | null> {
  try {
    const buf = await fs.readFile(path.join(dir, file), "utf8");
    const json = JSON.parse(buf) as {
      portal: string;
      total_known: number;
      fetched: number;
      fetched_at: string;
      datasets: Omit<DiscoveredDataset, "portal">[];
    };
    return {
      ...json,
      datasets: json.datasets.map((d) => ({ ...d, portal: json.portal })),
    };
  } catch {
    return null;
  }
}

let _cache: DiscoveryResult | null = null;

export async function loadDiscovery(): Promise<DiscoveryResult> {
  if (_cache) return _cache;
  for (const dir of CANDIDATES) {
    const portals: PortalSummary[] = [];
    const all: DiscoveredDataset[] = [];
    let fetchedAt: string | null = null;
    let any = false;
    for (const [file, portal] of Object.entries(FILE_TO_PORTAL)) {
      const data = await readPortalFile(dir, file);
      if (!data) continue;
      any = true;
      portals.push({
        portal,
        total_known: data.total_known,
        fetched: data.fetched,
        fetched_at: data.fetched_at,
      });
      if (!fetchedAt || data.fetched_at > fetchedAt) fetchedAt = data.fetched_at;
      all.push(...data.datasets);
    }
    if (!any) continue;
    const popular = [...all]
      .sort((a, b) => (b.page_views ?? 0) - (a.page_views ?? 0))
      .slice(0, 60);
    _cache = {
      totalKnown: portals.reduce((s, p) => s + p.total_known, 0),
      totalFetched: portals.reduce((s, p) => s + p.fetched, 0),
      portals,
      fetchedAt,
      popular,
    };
    return _cache;
  }
  _cache = {
    totalKnown: 0,
    totalFetched: 0,
    portals: [],
    fetchedAt: null,
    popular: [],
  };
  return _cache;
}

/** Filter the discovered datasets by free-text query. Cheap in-memory scan. */
export async function searchDiscovery(q: string, limit = 30): Promise<DiscoveredDataset[]> {
  const r = await loadDiscovery();
  const needle = q.trim().toLowerCase();
  if (!needle) return r.popular.slice(0, limit);
  const all: DiscoveredDataset[] = [];
  for (const dir of CANDIDATES) {
    for (const [file, portal] of Object.entries(FILE_TO_PORTAL)) {
      const data = await readPortalFile(dir, file);
      if (!data) continue;
      for (const d of data.datasets) {
        if (
          d.id.toLowerCase().includes(needle) ||
          d.name.toLowerCase().includes(needle) ||
          d.description.toLowerCase().includes(needle) ||
          (d.category ?? "").toLowerCase().includes(needle) ||
          d.tags.some((t) => t.toLowerCase().includes(needle))
        ) {
          all.push({ ...d, portal });
          if (all.length >= limit * 4) return all.slice(0, limit);
        }
      }
    }
    if (all.length > 0) break;
  }
  return all.slice(0, limit);
}
