// Server-rendered admin console — datasets table + question form + run archive.
// Gated by middleware basic-auth (TXLOOKUP_BASIC_AUTH).

import Link from "next/link";

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
    <main className="min-h-screen bg-[#F4F6FB] text-[#1A1F2A] font-body">
      <header className="border-b border-[#1A1F2A]/10 bg-[#0B2545] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-4 md:px-10">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="block h-7 w-7 rounded-sm bg-white/90" />
            <div className="flex flex-col leading-tight">
              <span className="font-display text-[18px] font-extrabold tracking-tight">TXLookup · Admin</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/65">ops console · run archive · #59</span>
            </div>
          </div>
          <nav className="flex items-center gap-5 font-display text-sm font-semibold">
            <Link href="/" className="text-white/85 hover:text-white">Public site</Link>
            <Link href="/q" className="text-white/85 hover:text-white">Search UI</Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-[#1A1F2A]/10 bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">Datasets · {CATALOG.length}</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#1A1F2A]/55">live count · revalidate 60s</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="border-b border-[#1A1F2A]/15 bg-[#F4F6FB]">
                <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/65">
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
                  <tr key={d.id} className="border-b border-[#1A1F2A]/10 align-top">
                    <td className="px-3 py-2 font-mono text-xs text-[#0B2545]"><Link href={`/datasets/${d.id}`} className="hover:underline">{d.id}</Link></td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[#1A1F2A]/75">{d.portal}</td>
                    <td className="px-3 py-2 font-semibold text-[#0B2545]">{d.title}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[#1A1F2A]/65">
                      {d.keyColumns.slice(0, 4).join(", ")}{d.keyColumns.length > 4 && "…"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-[#0B2545]">
                      {d.error ? <span className="text-[#A0231C]" title={d.error}>err</span> : (d.rowCount === null ? "—" : d.rowCount.toLocaleString())}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[#1A1F2A]/55">{timeAgo(d.fetchedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AdminConsole runs={runs} />

      <footer className="bg-[#06182F] text-white/85">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-6 text-sm md:px-10">
          <p className="font-mono text-[11px] uppercase tracking-wider">admin · gated by basic-auth</p>
          <Link href="/" className="hover:text-white">← Public</Link>
        </div>
      </footer>
    </main>
  );
}
