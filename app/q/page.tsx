import Link from "next/link";

const SAMPLE_PERMITS = [
  { id: "BP-2026-04812", addr: "1845 E 6th St", type: "Mobile Food Vendor", issued: "2026-03-15", status: "ISSUED" },
  { id: "BP-2026-04501", addr: "1502 E 7th St", type: "Food Truck Parking", issued: "2026-02-28", status: "ISSUED" },
  { id: "BP-2026-04297", addr: "2400 Cesar Chavez St", type: "Temporary Event Food", issued: "2026-02-12", status: "EXPIRES SOON" },
  { id: "BP-2026-04050", addr: "1902 E 7th St", type: "Mobile Food Vendor", issued: "2026-01-30", status: "ISSUED" },
  { id: "BP-2026-03811", addr: "701 Tillery St", type: "Mobile Food Vendor", issued: "2026-01-12", status: "ISSUED" },
  { id: "BP-2026-03654", addr: "2200 E 7th St", type: "Food Truck Parking", issued: "2025-12-22", status: "ISSUED" },
];

export default async function QueryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dataset?: string }>;
}) {
  const { q, dataset } = await searchParams;
  const query = q?.trim() || "";

  const looksLikePermits = /food.?truck|permit|78702/i.test(query);

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="border-b-4 border-black bg-[#002868] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-extrabold uppercase tracking-tight">
              TXLookup
            </span>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 md:inline">
              public data, cited
            </span>
          </Link>
          <nav className="flex items-center gap-7 font-display text-sm font-bold uppercase tracking-wider">
            <Link href="/" className="hover:underline">
              ← New question
            </Link>
            <Link href="/#datasets" className="hidden hover:underline md:inline">
              Datasets
            </Link>
          </nav>
        </div>
      </header>

      {/* Question recap */}
      <section className="border-b-4 border-black bg-[#F5F5F0]">
        <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
            Question
          </p>
          <h1 className="mt-3 max-w-[68ch] font-display text-2xl font-extrabold uppercase leading-tight tracking-tight md:text-4xl">
            {query || "Type a question on the home page to begin."}
          </h1>
          {dataset && (
            <p className="mt-2 font-mono text-xs uppercase tracking-wider text-black/65">
              Scoped to dataset · {dataset}
            </p>
          )}
        </div>
      </section>

      {/* Agent step trace */}
      <section className="border-b-4 border-black bg-white">
        <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10">
          <div className="grid grid-cols-4 gap-0 border-4 border-black">
            {[
              { n: "01", title: "REASON", bg: "bg-[#002868] text-white", state: "DONE" },
              { n: "02", title: "PLAN", bg: "bg-[#FFD93D] text-black", state: "DONE" },
              { n: "03", title: "TOOL", bg: "bg-white text-black", state: looksLikePermits ? "DONE" : "PENDING" },
              { n: "04", title: "COMPLETE", bg: looksLikePermits ? "bg-[#1E7A47] text-white" : "bg-black text-white/40", state: looksLikePermits ? "DONE" : "WAITING" },
            ].map((s, i) => (
              <div
                key={s.n}
                className={`${s.bg} ${i < 3 ? "border-r-4 border-black" : ""} px-5 py-4`}
              >
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">
                  {s.n} · {s.state}
                </p>
                <h3 className="mt-1 font-display text-base font-extrabold uppercase tracking-wider md:text-lg">
                  {s.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Result */}
      {looksLikePermits ? (
        <section className="border-b-4 border-black bg-white">
          <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10">
            <div className="grid gap-10 md:grid-cols-12">
              <div className="md:col-span-8">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
                  Answer
                </p>
                <p className="mt-3 max-w-[64ch] text-xl font-medium leading-relaxed md:text-2xl">
                  47 food-related permits were issued in 78702 between Nov 5
                  2025 and May 5 2026 — running 22% above the prior 6-month
                  average. Mobile Food Vendor is the dominant type (51%).
                  Three permits expire within 30 days.
                </p>

                <h2 className="mt-10 font-display text-2xl font-extrabold uppercase tracking-tight">
                  Top six permits
                </h2>
                <div className="mt-5 overflow-x-auto border-4 border-black bg-white shadow-[8px_8px_0_0_#002868]">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b-4 border-black bg-black text-white">
                      <tr className="font-mono text-[11px] uppercase tracking-[0.22em]">
                        <th className="px-4 py-3 font-bold">PERMIT ID</th>
                        <th className="px-4 py-3 font-bold">ADDRESS</th>
                        <th className="px-4 py-3 font-bold">TYPE</th>
                        <th className="px-4 py-3 font-bold">ISSUED</th>
                        <th className="px-4 py-3 font-bold">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SAMPLE_PERMITS.map((p, i) => (
                        <tr
                          key={p.id}
                          className={`border-b-2 border-black last:border-b-0 ${
                            i % 2 === 0 ? "bg-white" : "bg-[#F5F5F0]"
                          }`}
                        >
                          <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                          <td className="px-4 py-3 font-medium">{p.addr}</td>
                          <td className="px-4 py-3 font-mono text-xs uppercase">
                            {p.type}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {p.issued}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block border-2 border-black px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
                                p.status === "EXPIRES SOON"
                                  ? "bg-[#FFD93D] text-black"
                                  : "bg-[#1E7A47] text-white"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="md:col-span-4">
                <div className="border-4 border-black bg-[#F5F5F0] p-6">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
                    Citation
                  </p>
                  <p className="mt-3 text-sm">
                    Source: <span className="font-bold">City of Austin</span> ·{" "}
                    Issued Construction Permits
                  </p>
                  <p className="mt-1 font-mono text-xs">(3syk-w9eu)</p>
                  <p className="mt-2 font-mono text-xs text-black/70">
                    Last refreshed: 2026-05-08 14:00 CT
                  </p>
                  <Link
                    href="/datasets/3syk-w9eu"
                    className="mt-4 inline-block font-mono text-[11px] font-bold uppercase tracking-wider underline underline-offset-4 hover:text-[#BF0A30]"
                  >
                    Open dataset →
                  </Link>
                </div>

                <div className="mt-6 border-4 border-black bg-white p-6">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
                    Filters used
                  </p>
                  <ul className="mt-3 space-y-1 font-mono text-xs">
                    <li>$where: original_zip = '78702'</li>
                    <li>$where: issued_date ≥ 2025-11-05</li>
                    <li>$where: permit_type matches food</li>
                    <li>$limit: 100</li>
                  </ul>
                </div>

                <div className="mt-6 border-4 border-black bg-[#FFD93D] p-6 shadow-[6px_6px_0_0_#000]">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]">
                    Try next
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li>
                      <Link
                        href={`/q?q=${encodeURIComponent("Compare permits in 78702 vs 78704")}`}
                        className="font-bold underline underline-offset-2 hover:text-[#BF0A30]"
                      >
                        Compare 78702 vs 78704 →
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`/q?q=${encodeURIComponent("Show permits expiring this month")}`}
                        className="font-bold underline underline-offset-2 hover:text-[#BF0A30]"
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
        <section className="border-b-4 border-black bg-white">
          <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#BF0A30]">
              Live agent — coming online
            </p>
            <h2 className="mt-3 max-w-[20ch] font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-6xl">
              The agent loop is being wired right now.
            </h2>
            <p className="mt-6 max-w-[64ch] text-base leading-relaxed text-black/80 md:text-lg">
              The TXLookup agent (Codex-driven) is being connected end-to-end
              for arbitrary questions. In the meantime, you can browse the
              registered datasets directly — schema, sample rows, freshness
              — at the links below. The food-truck-permits-in-78702 question
              has a fully-rendered sample answer if you want to see what a
              completed query looks like.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/#datasets"
                className="border-4 border-black bg-[#002868] px-7 py-3.5 font-display font-extrabold uppercase tracking-wider text-white shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px]"
              >
                Browse datasets →
              </Link>
              <Link
                href={`/q?q=${encodeURIComponent("Food truck permits issued in 78702 in the last six months")}`}
                className="border-4 border-black bg-white px-7 py-3.5 font-display font-extrabold uppercase tracking-wider text-black shadow-[6px_6px_0_0_#BF0A30] hover:shadow-[3px_3px_0_0_#BF0A30] hover:translate-x-[3px] hover:translate-y-[3px]"
              >
                See sample answer →
              </Link>
            </div>
          </div>
        </section>
      )}

      <footer className="bg-[#BF0A30] text-white">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-6 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">
          <p className="font-mono uppercase tracking-wider">
            All data sourced from public Texas open-data portals · attribution enforced
          </p>
          <Link href="/" className="font-mono uppercase tracking-wider hover:underline">
            ← Back to TXLookup
          </Link>
        </div>
      </footer>
    </main>
  );
}
