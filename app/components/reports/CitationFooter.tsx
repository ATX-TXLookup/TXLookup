// CitationFooter — secondary, low-prominence source list. Sources are now
// surfaced inline beneath each chart's <figcaption>; this footer is the
// authoritative dataset roll-call at the article's tail. Visually subdued
// (no fills, no accent panel) so it doesn't compete with the editorial body.

import { findById, PORTAL_LABELS } from "@/app/lib/catalog";

type Props = {
  datasetIds: string[];
};

export function CitationFooter({ datasetIds }: Props) {
  const rows = datasetIds
    .map((id) => findById(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#86827A]">
        Sources
      </h2>
      <ul className="mt-3 space-y-2">
        {rows.map((d) => {
          const portalLabel = PORTAL_LABELS[d.portal] ?? d.portal;
          const url = `https://${d.portal}/resource/${d.id}.json`;
          return (
            <li
              key={d.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13px] leading-snug"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#86827A]">
                {portalLabel}
              </span>
              <span className="text-[var(--rep-text)]">{d.title}</span>
              <span className="font-mono text-[10.5px] text-[#86827A]">
                {d.id}
              </span>
              <a
                href={url}
                className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--rep-accent)] hover:underline"
              >
                View ↗
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
