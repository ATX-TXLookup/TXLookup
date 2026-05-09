import Link from "next/link";

const SAMPLE_PERMITS = [
  { id: "BP-2026-04812", addr: "1845 E 6th St", type: "Mobile Food Vendor", issued: "2026-03-15", status: "Issued" },
  { id: "BP-2026-04501", addr: "1502 E 7th St", type: "Food Truck Parking", issued: "2026-02-28", status: "Issued" },
  { id: "BP-2026-04297", addr: "2400 Cesar Chavez St", type: "Temporary Event Food", issued: "2026-02-12", status: "Expires soon" },
  { id: "BP-2026-04050", addr: "1902 E 7th St", type: "Mobile Food Vendor", issued: "2026-01-30", status: "Issued" },
  { id: "BP-2026-03811", addr: "701 Tillery St", type: "Mobile Food Vendor", issued: "2026-01-12", status: "Issued" },
  { id: "BP-2026-03654", addr: "2200 E 7th St", type: "Food Truck Parking", issued: "2025-12-22", status: "Issued" },
];

function CivicHeader() {
  return (
    <>
      <div className="bg-[#0B2545] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-2 text-[13px] md:px-10">
          <span>An open-source agent for Texas public data.</span>
          <span className="hidden font-mono text-[11px] uppercase tracking-wider text-white/70 md:inline">
            v0.1 · alpha
          </span>
        </div>
      </div>
      <header className="border-b border-[#1A1F2A]/10 bg-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-5 md:px-10 md:py-6">
          <Link href="/" className="flex items-center gap-3">
            <span aria-hidden="true" className="block h-8 w-8 rounded-sm bg-[#0B2545]" />
            <div className="flex flex-col leading-tight">
              <span className="font-display text-[22px] font-extrabold tracking-tight text-[#0B2545]">
                TXLookup
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#1A1F2A]/55">
                Texas open data · cited
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-7 font-display text-sm font-semibold">
            <Link href="/" className="hover:text-[#0B5FFF]">
              New search
            </Link>
            <Link href="/#datasets" className="hidden hover:text-[#0B5FFF] md:inline">
              Datasets
            </Link>
            <a
              href="https://github.com/ATX-TXLookup/TXLookup"
              className="rounded-sm bg-[#0B2545] px-4 py-2 font-medium text-white hover:bg-[#0B5FFF]"
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>
    </>
  );
}

function statusPill(status: string) {
  const danger = status.toLowerCase().includes("expires");
  return (
    <span
      className={`inline-block rounded-sm border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
        danger
          ? "border-[#A06200]/40 bg-[#FFF3D9] text-[#A06200]"
          : "border-[#1E7A47]/40 bg-[#E5F5EC] text-[#1E7A47]"
      }`}
    >
      {status}
    </span>
  );
}

export default async function QueryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dataset?: string }>;
}) {
  const { q, dataset } = await searchParams;
  const query = q?.trim() || "";
  const looksLikePermits = /food.?truck|permit|78702/i.test(query);

  return (
    <main className="min-h-screen bg-white text-[#1A1F2A] font-body">
      <CivicHeader />

      {/* Question recap + new search */}
      <section className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
        <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10 md:py-14">
          <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
            Question
          </p>
          <h1 className="mt-3 max-w-[68ch] font-display text-2xl font-extrabold leading-tight tracking-tight text-[#0B2545] md:text-4xl">
            {query || "Type a question on the home page to begin."}
          </h1>
          {dataset && (
            <p className="mt-2 font-mono text-xs uppercase tracking-wider text-[#1A1F2A]/55">
              Scoped to dataset · {dataset}
            </p>
          )}

          <form
            action="/q"
            method="GET"
            className="mt-6 flex max-w-[820px] gap-2 rounded-md border border-[#1A1F2A]/15 bg-white p-2"
          >
            <input
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Refine your question…"
              className="flex-1 rounded-sm bg-white px-3 py-2 text-sm text-[#1A1F2A] placeholder:text-[#1A1F2A]/45 focus:outline-none md:text-base"
            />
            <button
              type="submit"
              className="rounded-sm bg-[#0B5FFF] px-5 py-2 font-display text-sm font-semibold text-white hover:bg-[#0B2545]"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Agent step trace */}
      <section className="border-b border-[#1A1F2A]/10 bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10">
          <div className="grid grid-cols-4 gap-3">
            {[
              { n: "01", title: "Reason", status: "Done", color: "#0B5FFF", active: true },
              { n: "02", title: "Plan", status: "Done", color: "#0B5FFF", active: true },
              { n: "03", title: "Tool", status: looksLikePermits ? "Done" : "Pending", color: looksLikePermits ? "#0B5FFF" : "#1A1F2A", active: looksLikePermits },
              { n: "04", title: "Complete", status: looksLikePermits ? "Done" : "Waiting", color: looksLikePermits ? "#1E7A47" : "#1A1F2A", active: looksLikePermits },
            ].map((s) => (
              <div
                key={s.n}
                className={`rounded-md border px-4 py-4 ${
                  s.active
                    ? "border-[#0B5FFF]/30 bg-[#F4F6FB]"
                    : "border-[#1A1F2A]/10 bg-white"
                }`}
              >
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: s.color }}>
                  Step {s.n}
                </p>
                <h3 className="mt-2 font-display text-lg font-bold tracking-tight text-[#0B2545]">
                  {s.title}
                </h3>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
                  {s.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Result */}
      {looksLikePermits ? (
        <section className="border-b border-[#1A1F2A]/10 bg-white">
          <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
            <div className="grid gap-10 md:grid-cols-12">
              <div className="md:col-span-8">
                <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                  Answer
                </p>
                <p className="mt-3 max-w-[64ch] text-xl font-medium leading-relaxed text-[#0B2545] md:text-2xl">
                  47 food-related permits were issued in 78702 between Nov 5,
                  2025 and May 5, 2026 — running 22% above the prior 6-month
                  average. Mobile Food Vendor is the dominant type (51%).
                  Three permits expire within 30 days.
                </p>

                <h2 className="mt-10 font-display text-xl font-bold tracking-tight text-[#0B2545]">
                  Top six permits
                </h2>
                <div className="mt-4 overflow-x-auto rounded-md border border-[#1A1F2A]/10 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[#1A1F2A]/10 bg-[#F4F6FB]">
                      <tr className="font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/65">
                        <th className="px-4 py-3 font-semibold">Permit ID</th>
                        <th className="px-4 py-3 font-semibold">Address</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">Issued</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SAMPLE_PERMITS.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-[#1A1F2A]/10 last:border-b-0 hover:bg-[#F4F6FB]"
                        >
                          <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                          <td className="px-4 py-3 font-medium text-[#0B2545]">{p.addr}</td>
                          <td className="px-4 py-3 text-[#1A1F2A]/85">{p.type}</td>
                          <td className="px-4 py-3 font-mono text-xs text-[#1A1F2A]/70">
                            {p.issued}
                          </td>
                          <td className="px-4 py-3">{statusPill(p.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="md:col-span-4">
                <div className="rounded-md border border-[#1A1F2A]/10 bg-[#F4F6FB] p-5">
                  <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                    Citation
                  </p>
                  <p className="mt-3 text-sm">
                    Source: <span className="font-semibold text-[#0B2545]">City of Austin</span>{" "}
                    · Issued Construction Permits
                  </p>
                  <p className="mt-1 font-mono text-xs">(3syk-w9eu)</p>
                  <p className="mt-2 font-mono text-xs text-[#1A1F2A]/65">
                    Last refreshed: 2026-05-09 02:26 UTC
                  </p>
                  <Link
                    href="/datasets/3syk-w9eu"
                    className="mt-4 inline-block text-sm font-medium text-[#0B5FFF] hover:underline"
                  >
                    Open dataset →
                  </Link>
                </div>

                <div className="mt-5 rounded-md border border-[#1A1F2A]/10 bg-white p-5">
                  <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                    Filters used
                  </p>
                  <ul className="mt-3 space-y-1 font-mono text-xs text-[#1A1F2A]/85">
                    <li>$where: original_zip = '78702'</li>
                    <li>$where: issued_date ≥ 2025-11-05</li>
                    <li>$where: permit_type matches food</li>
                    <li>$limit: 100</li>
                  </ul>
                </div>

                <div className="mt-5 rounded-md border border-[#0B5FFF]/30 bg-[#F4F6FB] p-5">
                  <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
                    Try next
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li>
                      <Link
                        href={`/q?q=${encodeURIComponent("Compare permits in 78702 vs 78704")}`}
                        className="text-[#0B5FFF] hover:underline"
                      >
                        Compare 78702 vs 78704 →
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`/q?q=${encodeURIComponent("Show permits expiring this month")}`}
                        className="text-[#0B5FFF] hover:underline"
                      >
                        Permits expiring this month →
                      </Link>
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-[#1A1F2A]/10 bg-white">
          <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
            <p className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
              Live agent — coming online
            </p>
            <h2 className="mt-3 max-w-[28ch] font-display text-3xl font-extrabold leading-tight tracking-tight text-[#0B2545] md:text-5xl">
              The agent loop is being wired right now.
            </h2>
            <p className="mt-5 max-w-[64ch] text-base leading-relaxed text-[#1A1F2A]/80 md:text-lg">
              The TXLookup agent (Codex-driven) is being connected end-to-end
              for arbitrary questions. In the meantime, you can browse the
              registered datasets directly — schema, sample rows, freshness —
              at the links below. The food-truck-permits-in-78702 question
              has a fully-rendered sample answer if you want to see what a
              completed query looks like.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/#datasets"
                className="rounded-sm bg-[#0B5FFF] px-6 py-3 font-display text-sm font-semibold text-white hover:bg-[#0B2545]"
              >
                Browse datasets →
              </Link>
              <Link
                href={`/q?q=${encodeURIComponent("Food truck permits issued in 78702 in the last six months")}`}
                className="rounded-sm border border-[#1A1F2A]/20 bg-white px-6 py-3 font-display text-sm font-semibold text-[#0B2545] hover:border-[#0B5FFF] hover:text-[#0B5FFF]"
              >
                See sample answer →
              </Link>
            </div>
          </div>
        </section>
      )}

      <footer className="bg-[#06182F] text-white/85">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">
          <p>All data sourced from public Texas open-data portals · Attribution enforced</p>
          <Link href="/" className="hover:text-white">
            ← Back to TXLookup
          </Link>
        </div>
      </footer>
    </main>
  );
}
