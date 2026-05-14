// HomeHero — shared entry hero used on / and /q.
// Eyebrow + headline + body + search unit + topic tiles.
// Server component — no client state, safe to render anywhere.

import Link from "next/link";

const TOPIC_TILES: {
  key: string;
  label: string;
  blurb: string;
  count: string;
  color: string;
  seedQuery: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "housing",
    label: "Permits & Housing",
    blurb: "Where is Austin building, and where isn't it?",
    count: "2.3M permits",
    color: "#F97316",
    seedQuery: "Where are construction permits clustering in Austin in the last 30 days?",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d="M3 10 L11 3 L19 10 L19 19 L13 19 L13 13 L9 13 L9 19 L3 19 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "health",
    label: "Restaurant inspections",
    blurb: "Which kitchens failed and which keep failing.",
    count: "120K inspections",
    color: "#10B981",
    seedQuery: "Restaurants near 78704 with failing inspections this year",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d="M7 3 L7 11 M11 3 L11 11 M15 3 L15 11 M11 11 L11 19 M5 19 L17 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "salaries",
    label: "Salaries & contracts",
    blurb: "Who got paid what by your city government.",
    count: "60K records",
    color: "#A855F7",
    seedQuery: "Who got the biggest city contract in Austin last year?",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="7.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 7 L11 15 M8.5 9 C8.5 7.9 9.6 7 11 7 C12.4 7 13.5 7.9 13.5 9 C13.5 10.1 12.4 11 11 11 C9.6 11 8.5 11.9 8.5 13 C8.5 14.1 9.6 15 11 15 C12.4 15 13.5 14.1 13.5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "civic",
    label: "311 & code violations",
    blurb: "Potholes, noise, illegal dumping. What got reported.",
    count: "1.5M requests",
    color: "#5B8DEF",
    seedQuery: "Where do 311 requests and code violations spike together in Austin this year?",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d="M3.5 5.5 C3.5 4.4 4.4 3.5 5.5 3.5 L16.5 3.5 C17.6 3.5 18.5 4.4 18.5 5.5 L18.5 13 C18.5 14.1 17.6 15 16.5 15 L9 15 L5 18.5 L5 15 L5.5 15 C4.4 15 3.5 14.1 3.5 13 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "transit",
    label: "Roads & traffic",
    blurb: "Crashes, Vision Zero, mobility patterns.",
    count: "1K+ fatal crashes",
    color: "#F59E0B",
    seedQuery: "Most dangerous intersections in Austin by traffic fatality count",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d="M5 16 L5 11 L8 7 L14 7 L17 11 L17 16 M5 16 L5 17.5 L7 17.5 L7 16 M15 16 L15 17.5 L17 17.5 L17 16 M5 16 L17 16 M7.5 12 L14.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "schools",
    label: "Schools & education",
    blurb: "Enrollment, ratings, district funding flows.",
    count: "1,200+ TX districts",
    color: "#EF4444",
    seedQuery: "How does Pflugerville ISD funding compare to nearby districts?",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d="M2.5 8 L11 4 L19.5 8 L11 12 L2.5 8 Z M6 9.8 L6 13.5 C6 14.9 8.5 16 11 16 C13.5 16 16 14.9 16 13.5 L16 9.8 M19.5 8 L19.5 13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function HomeHero({ datasetCount, compact }: { datasetCount: number; compact?: boolean }) {
  const padY = compact ? "py-10 md:py-14" : "py-16 md:py-24";
  return (
    <section className="relative overflow-hidden border-b border-[var(--ds-border)]">
      <div className={`relative mx-auto max-w-[920px] px-6 md:px-8 ${padY}`}>
        <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
          For curious Texans, journalists, and city staff
        </p>
        <h1 className={`mt-5 max-w-[14ch] font-bold leading-[1.02] tracking-[-0.03em] text-white ${compact ? "text-[40px] md:text-[64px]" : "text-[52px] md:text-[96px]"}`}>
          Look up Texas.
        </h1>
        <p className={`mt-7 max-w-[58ch] text-white ${compact ? "text-[17px] leading-[1.5] md:text-[19px]" : "text-[20px] leading-[1.55] md:text-[23px] md:leading-[1.5]"}`}>
          The records are public. The <span className="font-semibold">{datasetCount.toLocaleString()} spreadsheets</span> they live in aren&rsquo;t. Ask who&rsquo;s on the city payroll, which restaurants failed inspection, where the permits piled up. We find the answer in seconds and <span className="font-semibold">show you exactly where it came from</span>.
        </p>

        {/* Search unit */}
        <form action="/q" method="GET" className={compact ? "mt-8" : "mt-10"}>
          <div className="rounded-xl border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] p-2.5 transition-colors focus-within:border-[var(--ds-accent)]">
            <div className="flex items-stretch gap-2">
              <input
                name="q"
                type="text"
                required
                placeholder="Ask anything about Texas..."
                className="flex-1 bg-transparent px-3 py-3 text-[17px] leading-tight text-white placeholder:text-[#9ca3af] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-white px-7 text-[16px] font-semibold text-[var(--ds-bg)] hover:opacity-90"
              >
                Ask
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2.5 border-t border-[var(--ds-border)] px-3 pb-1 pt-2.5 text-[13.5px] text-[var(--ds-text-mute)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ds-good)]" />
              <span>Live across <span className="font-semibold text-white">{datasetCount.toLocaleString()}</span> Texas datasets</span>
              <span className="ml-auto text-[var(--ds-text-dim)]">Free. No login.</span>
            </div>
          </div>
        </form>

        {/* Browse by topic */}
        <div className={compact ? "mt-8" : "mt-10"}>
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-text-dim)]">
              Browse by topic
            </p>
            <Link href="/datasets" className="text-[13px] text-white hover:text-[var(--ds-accent)]">
              9 curated datasets →
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOPIC_TILES.map((t) => (
              <li key={t.key}>
                <Link
                  href={`/q?q=${encodeURIComponent(t.seedQuery)}`}
                  className="group flex h-full items-start gap-3 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-4 transition-colors hover:border-[var(--ds-accent)]"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--ds-bg-deep)] group-hover:bg-[var(--ds-bg)]"
                    style={{ color: t.color }}
                  >
                    {t.icon}
                  </span>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold text-white">{t.label}</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--ds-text-mute)]">{t.blurb}</p>
                    <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-wider text-[var(--ds-text-dim)]">{t.count}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
