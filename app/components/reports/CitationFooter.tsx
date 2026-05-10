// CitationFooter — list of {portal, dataset_id, dataset_name, url}.
// Brand: navy panel with cream type, gold accent on the portal CTA.
// Per the reports brief: bg-tx-navy text-tx-cream with each source listed in
// font-mono and a "view source on portal →" link in tx-gold.

import { findById, PORTAL_LABELS } from "@/app/lib/catalog";

type Props = {
  datasetIds: string[];
};

export function CitationFooter({ datasetIds }: Props) {
  const rows = datasetIds
    .map((id) => findById(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));
  return (
    <section className="mt-12 rounded-[10px] bg-tx-navy p-6 text-tx-cream md:p-7">
      <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-gold">
        Sources
      </h2>
      <ul className="mt-4 space-y-3">
        {rows.map((d) => {
          const portalLabel = PORTAL_LABELS[d.portal] ?? d.portal;
          const url = `https://${d.portal}/resource/${d.id}.json`;
          return (
            <li
              key={d.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-tx-cream/10 pb-3 text-sm last:border-b-0 last:pb-0"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-tx-cream/55">
                {portalLabel}
              </span>
              <span className="font-display text-base font-normal text-tx-cream">
                {d.title}
              </span>
              <span className="font-mono text-[11px] text-tx-cream/45">
                {d.id}
              </span>
              <a
                href={url}
                className="ml-auto font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-tx-gold hover:text-tx-gold-dark"
              >
                View source on portal →
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
