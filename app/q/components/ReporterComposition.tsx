"use client";

// ReporterComposition — renders the reporter specialist's structured report
// envelope as an inline newsletter-style article in the /q answer area.
// Mirrors the layout pattern from app/reports/[slug]/page.tsx:
//   - DM Serif headline (composition.title)
//   - Italic gold dek (composition.dek)
//   - 3-up hero-stat row using StatBlock for hero_stats[]
//   - Section list with DM Serif heading + Syne body for each sections[]
//   - Footer composed_by + method_footer in IBM Plex Mono muted
//
// Brand:
//   - Cream surface (BRAND.md §7 card pattern).
//   - Headline DM Serif Display, navy ink.
//   - Italic gold dek matching /reports hero treatment.
//   - All colors via tx-* tokens / CSS vars — no inline hex.

import { StatBlock } from "../../components/reports/StatBlock";

export type ReporterHeroStat = {
  value?: string | number;
  label?: string;
  delta?: string;
};

export type ReporterSection = {
  heading?: string;
  prose?: string;
  key_numbers?: Array<{ label?: string; value?: string | number }>;
};

export type ReporterSource = {
  portal?: string;
  dataset_id?: string;
  url?: string;
  last_refreshed?: string;
};

export type ReporterResult = {
  agent: "reporter";
  slug?: string;
  category?: string;
  title?: string;
  dek?: string;
  hero_stats?: ReporterHeroStat[];
  sections?: ReporterSection[];
  sources?: ReporterSource[];
  composed_by?: { agent?: string; composed_at?: string };
  method_footer?: string;
};

export function ReporterComposition({ result }: { result: ReporterResult }) {
  const heroStats = Array.isArray(result.hero_stats)
    ? result.hero_stats.slice(0, 3)
    : [];
  const sections = Array.isArray(result.sections) ? result.sections : [];

  return (
    <article
      className="mt-2 rounded-[10px] bg-tx-cream p-6 md:p-8"
      style={{ border: "0.5px solid var(--tx-border)" }}
    >
      {/* Eyebrow — category in mono rust caps */}
      {result.category && (
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
          {result.category}
        </p>
      )}

      {/* Headline — DM Serif, navy */}
      {result.title && (
        <h2 className="mt-3 max-w-[58ch] font-display text-[28px] font-normal leading-tight tracking-tight text-tx-navy md:text-[36px]">
          {result.title}
        </h2>
      )}

      {/* Dek — italic gold, DM Serif */}
      {result.dek && (
        <p className="mt-4 max-w-[58ch] font-display text-lg italic text-tx-gold md:text-xl">
          {result.dek}
        </p>
      )}

      {/* Hero stats — 3-up StatBlock row */}
      {heroStats.length > 0 && (
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {heroStats.map((s, i) => (
            <StatBlock
              key={`hero-${i}`}
              label={s.label ?? ""}
              value={s.value ?? null}
              delta={s.delta}
            />
          ))}
        </div>
      )}

      {/* Section list — DM Serif heading + Syne body */}
      {sections.length > 0 && (
        <div className="mt-8 space-y-8">
          {sections.map((sec, i) => (
            <section key={`sec-${i}`}>
              {sec.heading && (
                <h3 className="font-display text-2xl font-normal tracking-tight text-tx-navy md:text-[26px]">
                  {sec.heading}
                </h3>
              )}
              {sec.prose && (
                <p className="mt-3 max-w-[68ch] font-body text-base leading-[1.7] text-tx-ink/85 md:text-lg">
                  {sec.prose}
                </p>
              )}
              {Array.isArray(sec.key_numbers) && sec.key_numbers.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                  {sec.key_numbers.map((k, j) => (
                    <div
                      key={`kn-${i}-${j}`}
                      className="pl-3"
                      style={{ borderLeft: "3px solid var(--tx-gold)" }}
                    >
                      <div className="font-display text-2xl font-normal leading-none tabular-nums text-tx-navy md:text-[28px]">
                        {k.value !== undefined && k.value !== null
                          ? String(k.value)
                          : "—"}
                      </div>
                      <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-tx-muted">
                        {k.label ?? ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Sources list — IBM Plex Mono muted */}
      {Array.isArray(result.sources) && result.sources.length > 0 && (
        <div className="mt-8 border-t border-tx-ink/10 pt-5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
            Sources
          </p>
          <ul className="mt-3 space-y-1 font-mono text-[12px] text-tx-muted">
            {result.sources.map((s, i) => (
              <li key={`src-${i}`}>
                {s.portal ? `${s.portal} · ` : ""}
                {s.dataset_id ?? ""}
                {s.url ? (
                  <>
                    {" · "}
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener"
                      className="text-tx-sky hover:text-tx-rust"
                    >
                      query
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer — composed_by + method_footer in IBM Plex Mono muted */}
      {(result.composed_by || result.method_footer) && (
        <div className="mt-6 border-t border-tx-ink/10 pt-4 font-mono text-[11px] leading-relaxed text-tx-muted">
          {result.composed_by?.agent && (
            <p>
              <span className="uppercase tracking-[0.12em] text-tx-rust">
                Composed by
              </span>{" "}
              <span className="text-tx-navy">{result.composed_by.agent}</span>
              {result.composed_by.composed_at && (
                <>
                  {" · "}
                  <span className="tabular-nums">
                    {result.composed_by.composed_at.slice(0, 10)}
                  </span>
                </>
              )}
            </p>
          )}
          {result.method_footer && <p className="mt-1">{result.method_footer}</p>}
        </div>
      )}
    </article>
  );
}
