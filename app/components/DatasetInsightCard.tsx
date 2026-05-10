// Per-dataset insight card — surfaces canonical sample questions and (when
// available) a live "what's happening right now" stat. Server component,
// uses the --ds-* design system tokens to stay consistent with the dark Shell.
//
// Mounted inside `app/datasets/[id]/page.tsx` between the Schema section and
// the Sample-rows section. Loads no client-side JS.

import Link from "next/link";

type LiveInsight = {
  value: string;
  label: string;
  delta?: string;
};

type Props = {
  datasetId: string;
  title: string;
  portal: string;
  sampleQuestions: string[];
  liveInsight?: LiveInsight | null;
  reportSlug?: string | null;
};

function buildIssueUrl(datasetId: string, title: string): string {
  const t = encodeURIComponent(`Request a report for ${title}`);
  const body = encodeURIComponent(
    `Dataset: ${title} (${datasetId})\n\nWhat I want to know:\n- \n\nWhy it matters:\n- \n`,
  );
  return `https://github.com/ATX-TXLookup/TXLookup/issues/new?title=${t}&body=${body}&labels=report-request`;
}

export default function DatasetInsightCard({
  datasetId,
  title,
  portal: _portal,
  sampleQuestions,
  liveInsight,
  reportSlug,
}: Props) {
  const chips = sampleQuestions.slice(0, 3);
  const more = sampleQuestions.slice(3);
  const hasInsight = liveInsight != null;

  return (
    <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
      <div className="mx-auto max-w-[1320px] px-6 py-12 md:px-10 md:py-16">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-warm)]">
          What to ask
        </p>
        <h2 className="mt-2 text-[28px] font-normal tracking-tight text-[var(--ds-text)] md:text-[32px]">
          Start with one of these.
        </h2>

        <div
          className={`mt-7 grid gap-6 ${
            hasInsight ? "md:grid-cols-[1fr_320px]" : "md:grid-cols-1"
          }`}
        >
          {/* ── Question chips ── */}
          <div>
            <ul className="flex flex-col gap-3">
              {chips.map((q, i) => (
                <li key={i}>
                  <Link
                    href={`/q?q=${encodeURIComponent(q)}&dataset=${encodeURIComponent(
                      datasetId,
                    )}`}
                    className="group flex items-center justify-between gap-4 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-bg)] px-5 py-4 transition hover:border-[var(--ds-warm)] hover:bg-[var(--ds-bg-elev)]"
                  >
                    <span className="text-[15px] font-medium leading-snug text-[var(--ds-text)] md:text-base">
                      {q}
                    </span>
                    <span
                      aria-hidden
                      className="font-mono text-sm text-[var(--ds-warm)] transition group-hover:translate-x-0.5"
                    >
                      ask →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {more.length > 0 && (
              <details className="mt-5 group">
                <summary className="cursor-pointer list-none font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-accent)] hover:text-[var(--ds-warm)]">
                  More questions ({more.length}) <span aria-hidden>+</span>
                </summary>
                <ul className="mt-3 flex flex-col gap-2">
                  {more.map((q, i) => (
                    <li key={i}>
                      <Link
                        href={`/q?q=${encodeURIComponent(q)}&dataset=${encodeURIComponent(
                          datasetId,
                        )}`}
                        className="block rounded-sm border-l-2 border-[var(--ds-warn)] bg-[var(--ds-bg)] px-4 py-2 text-sm text-[var(--ds-text-mute)] hover:border-[var(--ds-warm)] hover:bg-[var(--ds-bg-elev)] hover:text-[var(--ds-text)]"
                      >
                        {q}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* ── Live insight stat tile ── */}
          {hasInsight && (
            <aside
              className="flex flex-col rounded-[10px] border-l-[3px] border-[var(--ds-warm)] bg-[var(--ds-bg)] p-6 text-[var(--ds-text)]"
              aria-label="Live insight from this dataset"
            >
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warn)]">
                Live · right now
              </p>
              <p className="mt-3 text-[44px] font-normal leading-none tracking-tight text-[var(--ds-text)] md:text-[52px]">
                {liveInsight!.value}
              </p>
              <p className="mt-3 text-sm leading-snug text-[var(--ds-text-mute)]">
                {liveInsight!.label}
              </p>
              {liveInsight!.delta && (
                <p className="mt-4 inline-block w-fit rounded-sm bg-[var(--ds-bg-elev)] px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ds-warn)]">
                  {liveInsight!.delta}
                </p>
              )}
            </aside>
          )}
        </div>

        {/* ── Report CTA ── */}
        <div className="mt-8 border-t border-[var(--ds-border)] pt-5 text-sm">
          {reportSlug ? (
            <Link
              href={`/reports/${reportSlug}`}
              className="font-semibold text-[var(--ds-warm)] hover:text-[var(--ds-text)] hover:underline"
            >
              Read the full report →
            </Link>
          ) : (
            <a
              href={buildIssueUrl(datasetId, title)}
              className="font-semibold text-[var(--ds-accent)] hover:text-[var(--ds-warm)] hover:underline"
            >
              Want a report? Tell us →
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
