// Server-rendered admin console — datasets table + question form + run archive.
// Gated by middleware basic-auth (TXLOOKUP_BASIC_AUTH).

import Link from "next/link";

import { Shell } from "@/app/components/ds";
import { CATALOG, type CatalogDataset } from "@/app/lib/catalog";
import { listRuns } from "@/app/lib/run-archive";
import { AdminConsole } from "./AdminConsole";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type DatasetRow = CatalogDataset & {
  rowCount: number | null;
  fetchedAt: string;
  error: string | null;
};

async function fetchRowCount(d: CatalogDataset): Promise<DatasetRow> {
  const url = `https://${d.portal}/resource/${d.id}.json?$select=count(*)`;
  const headers: Record<string, string> = {};
  const id = process.env.SOCRATA_KEY_ID;
  const secret = process.env.SOCRATA_KEY_SECRET;
  if (id && secret) {
    headers["Authorization"] = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
  }
  const fetchedAt = new Date().toISOString();
  try {
    const r = await fetch(url, { headers, next: { revalidate: 60 } });
    if (!r.ok) return { ...d, rowCount: null, fetchedAt, error: `HTTP ${r.status}` };
    const rows = (await r.json()) as Record<string, string>[];
    const raw = rows[0]?.count ?? rows[0]?.count_1 ?? Object.values(rows[0] ?? {})[0];
    const n = typeof raw === "string" ? parseInt(raw, 10) : null;
    return { ...d, rowCount: Number.isFinite(n) ? (n as number) : null, fetchedAt, error: null };
  } catch (e) {
    return { ...d, rowCount: null, fetchedAt, error: e instanceof Error ? e.message : String(e) };
  }
}

function timeAgo(iso: string): string {
  const d = Date.now() - Date.parse(iso);
  if (d < 60_000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  return `${Math.floor(d / 3_600_000)}h ago`;
}

export default async function AdminPage() {
  const [datasetRows, runs] = await Promise.all([
    Promise.all(CATALOG.map(fetchRowCount)),
    listRuns(50),
  ]);

  return (
    <Shell active="/admin">
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-accent)]">Datasets · {CATALOG.length}</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-mute)]">live count · revalidate 60s</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
                <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-mute)]">
                  <th className="px-3 py-2 font-semibold">id</th>
                  <th className="px-3 py-2 font-semibold">portal</th>
                  <th className="px-3 py-2 font-semibold">title</th>
                  <th className="px-3 py-2 font-semibold">key columns</th>
                  <th className="px-3 py-2 text-right font-semibold">rows</th>
                  <th className="px-3 py-2 font-semibold">fetched</th>
                </tr>
              </thead>
              <tbody>
                {datasetRows.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--ds-border)] align-top">
                    <td className="px-3 py-2 font-mono text-xs text-[var(--ds-text)]"><Link href={`/datasets/${d.id}`} className="hover:underline">{d.id}</Link></td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--ds-text-mute)]">{d.portal}</td>
                    <td className="px-3 py-2 font-semibold text-[var(--ds-text)]">{d.title}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--ds-text-mute)]">
                      {d.keyColumns.slice(0, 4).join(", ")}{d.keyColumns.length > 4 && "…"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--ds-text)]">
                      {d.error ? <span className="text-[var(--ds-bad)]" title={d.error}>err</span> : (d.rowCount === null ? "—" : d.rowCount.toLocaleString())}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--ds-text-mute)]">{timeAgo(d.fetchedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AdminConsole runs={runs} />
    </Shell>
  );
}
