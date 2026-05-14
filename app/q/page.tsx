// /q — the single public surface.
// Three states based on ?q=:
//   no q          → list view (all cached investigations)
//   q matches     → detail view (live agent replay + finding + evidence)
//   q is uncached → gate view (BYOK / suggest — no public fresh runs)

import Link from "next/link";

import { Shell } from "@/app/components/ds";
import { HomeHero } from "@/app/components/HomeHero";
import { loadDiscovery } from "@/app/lib/catalog-discovered";
import {
  findRun,
  listRuns,
  slugifyQuery,
  type SavedRun,
} from "@/app/lib/run-archive";

import { AgentRunner } from "./AgentRunner";
import { WatchStar } from "./WatchStar";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type ToolEvent = {
  phase?: string;
  step?: number;
  tool?: string;
  args?: Record<string, unknown>;
  rationale?: string;
  result?: unknown;
  status?: string;
  source?: string;
  duration_ms?: number;
};

function timeAgo(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  if (d < 7 * 86_400_000) return `${Math.floor(d / 86_400_000)}d ago`;
  return new Date(ms).toISOString().slice(0, 10);
}

function extractFinding(run: SavedRun): string {
  if (!run.answer) return "";
  const firstPara = run.answer.split(/\n\n+/)[0] ?? run.answer;
  return firstPara.slice(0, 220).trim();
}

function extractDataset(run: SavedRun): string | null {
  const events = (run.events ?? []) as ToolEvent[];
  for (const ev of events) {
    if (ev.phase === "executing" && ev.args && typeof ev.args === "object") {
      const dsId = (ev.args as Record<string, unknown>).datasetId;
      if (typeof dsId === "string") return dsId;
    }
  }
  return null;
}

function extractEvidence(
  run: SavedRun,
): Array<{ datasetId: string; klass: "authoritative" | "modeled" | "community" }> {
  const events = (run.events ?? []) as ToolEvent[];
  const seen = new Map<string, "authoritative" | "modeled" | "community">();
  for (const ev of events) {
    if (ev.phase === "executing" && ev.args && typeof ev.args === "object") {
      const dsId = (ev.args as Record<string, unknown>).datasetId;
      if (typeof dsId === "string" && !seen.has(dsId)) {
        seen.set(dsId, "authoritative");
      }
    }
  }
  return Array.from(seen.entries()).map(([datasetId, klass]) => ({ datasetId, klass }));
}

// ------- views -------

function ListView({
  runs,
  totalCount,
  currentPage,
  totalPages,
  datasetCount,
}: {
  runs: SavedRun[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  datasetCount: number;
}) {
  const pageSize = 25;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(totalCount, start + runs.length - 1);
  return (
    <Shell active="/q">
      <HomeHero datasetCount={datasetCount} searchOnly />

      <section className="bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1200px] px-6 pt-10 md:px-8">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
                All lookups
              </p>
              <h2 className="mt-2 text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-white md:text-[30px]">
                {totalCount} answered. Click a row to replay.
              </h2>
            </div>
            <p className="hidden font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-dim)] md:block">
              Showing <span className="text-white">{start}&ndash;{end}</span> of {totalCount}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1200px] px-6 py-8 md:px-8">
          {runs.length === 0 ? (
            <div className="rounded-sm border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-8 text-center">
              <p className="text-[var(--ds-text-mute)]">No lookups yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-deep)]">
                    <th className="px-4 py-3 text-left font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                      Question
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                      Dataset
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                      Time
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                      Asked
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
                      Status
                    </th>
                    <th className="px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const dataset = extractDataset(r);
                    return (
                      <tr key={r.hash} className="group border-b border-[var(--ds-border)] last:border-0 transition-colors hover:bg-[var(--ds-bg)]">
                        <td className="max-w-[520px] px-4 py-3 align-top">
                          <Link href={`/q?q=${encodeURIComponent(r.query)}`} className="block text-[14px] font-medium leading-snug text-white group-hover:text-[var(--ds-accent)]">
                            {r.query}
                          </Link>
                        </td>
                        <td className="px-4 py-3 align-top font-mono text-[11px] uppercase tracking-wider text-[var(--ds-accent)]">
                          {dataset || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-top font-mono text-[11px] text-[var(--ds-text-mute)] tabular-nums">
                          {(r.durationMs / 1000).toFixed(1)}s
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-top font-mono text-[11px] text-[var(--ds-text-mute)]">
                          {timeAgo(r.savedAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-top">
                          {r.status === "good" ? (
                            <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-good)]">verified</span>
                          ) : (
                            <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 pr-4 text-right align-top">
                          <WatchStar slug={slugifyQuery(r.query)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} />
          )}
        </div>
      </section>

    </Shell>
  );
}

function Pagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const pages: (number | "ellipsis")[] = [];
  // Always show first + last; window of 1 around current; ellipsis between gaps.
  const window = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  let prev = 0;
  for (let i = 1; i <= totalPages; i++) {
    if (!window.has(i)) continue;
    if (i - prev > 1) pages.push("ellipsis");
    pages.push(i);
    prev = i;
  }
  const linkFor = (n: number) => (n === 1 ? "/q" : `/q?page=${n}`);
  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Pagination">
      <Link
        href={currentPage > 1 ? linkFor(currentPage - 1) : "#"}
        aria-disabled={currentPage === 1}
        className={`rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider ${
          currentPage === 1
            ? "pointer-events-none border-[var(--ds-border)] text-[var(--ds-text-dim)]"
            : "border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] text-white hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
        }`}
      >
        ← Prev
      </Link>
      <ul className="flex items-center gap-1.5">
        {pages.map((p, idx) =>
          p === "ellipsis" ? (
            <li key={`e${idx}`} className="px-1 font-mono text-[12px] text-[var(--ds-text-dim)]">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={linkFor(p)}
                aria-current={p === currentPage ? "page" : undefined}
                className={`flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 font-mono text-[12px] tabular-nums ${
                  p === currentPage
                    ? "bg-white text-[var(--ds-bg)]"
                    : "border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] text-white hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
                }`}
              >
                {p}
              </Link>
            </li>
          ),
        )}
      </ul>
      <Link
        href={currentPage < totalPages ? linkFor(currentPage + 1) : "#"}
        aria-disabled={currentPage === totalPages}
        className={`rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider ${
          currentPage === totalPages
            ? "pointer-events-none border-[var(--ds-border)] text-[var(--ds-text-dim)]"
            : "border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] text-white hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
        }`}
      >
        Next →
      </Link>
    </nav>
  );
}

function pickRelated(current: SavedRun, all: SavedRun[]): SavedRun[] {
  // Score by overlap: shared dataset weight 3, shared 4+char word weight 1.
  const myEv = extractEvidence(current).map((e) => e.datasetId);
  const myWords = new Set(
    current.query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4),
  );
  type Scored = { run: SavedRun; score: number };
  const scored: Scored[] = [];
  for (const r of all) {
    if (r.hash === current.hash || !r.answer || r.status === "bad") continue;
    let score = 0;
    const ev = extractEvidence(r).map((e) => e.datasetId);
    for (const d of ev) if (myEv.includes(d)) score += 3;
    const words = r.query.toLowerCase().split(/[^a-z0-9]+/);
    for (const w of words) if (w.length >= 4 && myWords.has(w)) score += 1;
    if (score > 0) scored.push({ run: r, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6).map((s) => s.run);
}

function DetailView({ run }: { run: SavedRun }) {
  // Cached and fresh runs render IDENTICALLY — no extra sections, no
  // "Related lookups", no "Watch toggle". AgentRunner in fallback mode
  // streams the saved events; the visitor sees the same UI a live run
  // produces. Cache is invisible.
  return (
    <Shell active="/q">
      <AgentRunner query={run.query} mode="fallback" />
    </Shell>
  );
}

function GateView({ query, libraryCount }: { query: string; libraryCount: number }) {
  return (
    <Shell active="/q">
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[820px] px-6 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
            Not in the library yet
          </p>
          <h1 className="mt-4 text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[44px]">
            &quot;{query}&quot;
          </h1>
          <p className="mt-5 max-w-[58ch] text-[16px] leading-[1.65] text-[var(--ds-text-mute)]">
            We curate the public library by hand. This question hasn&apos;t been answered yet — two ways to get to one:
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Link
              href={`/byok`}
              className="block rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-6 transition-colors hover:border-[var(--ds-accent)]"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-good)]">
                Bring your own key
              </p>
              <p className="mt-2 text-[15px] text-[var(--ds-text)]">
                Paste an OpenAI key, run the loop on your wallet. ~$0.05 per question.
              </p>
            </Link>
            <Link
              href={`/suggest?q=${encodeURIComponent(query)}`}
              className="block rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-6 transition-colors hover:border-[var(--ds-accent)]"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-warm)]">
                Suggest it
              </p>
              <p className="mt-2 text-[15px] text-[var(--ds-text)]">
                Leave us your email. We&apos;ll run high-signal questions on our balance and notify you when they land.
              </p>
            </Link>
          </div>
          <p className="mt-10 font-mono text-[11px] text-[var(--ds-text-mute)]">
            Or{" "}
            <Link href="/q" className="text-[var(--ds-accent)] hover:underline">
              browse the {libraryCount} existing lookups →
            </Link>
          </p>
        </div>
      </section>
    </Shell>
  );
}

// ------- entry -------

export default async function QPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const query = q?.trim() || "";

  if (!query) {
    const [allRuns, discovery] = await Promise.all([
      listRuns(500).then((all) => all.filter((r) => r.status !== "bad" && r.answer)),
      loadDiscovery(),
    ]);
    const pageSize = 25;
    const totalPages = Math.max(1, Math.ceil(allRuns.length / pageSize));
    const requestedPage = Math.max(1, Math.min(totalPages, Number.parseInt(page || "1", 10) || 1));
    const start = (requestedPage - 1) * pageSize;
    const runs = allRuns.slice(start, start + pageSize);
    return (
      <ListView
        runs={runs}
        totalCount={allRuns.length}
        currentPage={requestedPage}
        totalPages={totalPages}
        datasetCount={discovery.totalKnown}
      />
    );
  }

  const cached = await findRun(query);
  if (cached && cached.answer) {
    return <DetailView run={cached} />;
  }

  const libraryCount = (await listRuns(200)).length;
  return <GateView query={query} libraryCount={libraryCount} />;
}
