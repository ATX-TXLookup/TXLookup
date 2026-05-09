// CitationFooter — list of {portal, dataset_id, dataset_name, url}.

import { findById, PORTAL_LABELS } from "@/app/lib/catalog";

type Props = {
  datasetIds: string[];
};

export function CitationFooter({ datasetIds }: Props) {
  const rows = datasetIds
    .map((id) => findById(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));
  return (
    <section className="mt-12 border-t border-[#1A1F2A]/15 pt-6">
      <h2 className="font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
        Sources
      </h2>
      <ul className="mt-3 space-y-2">
        {rows.map((d) => {
          const portalLabel = PORTAL_LABELS[d.portal] ?? d.portal;
          const url = `https://${d.portal}/resource/${d.id}.json`;
          return (
            <li
              key={d.id}
              className="flex flex-wrap items-baseline gap-x-3 border-b border-[#1A1F2A]/10 pb-2 text-sm"
            >
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
                {portalLabel}
              </span>
              <span className="font-display font-semibold text-[#0B2545]">
                {d.title}
              </span>
              <span className="font-mono text-[11px] text-[#1A1F2A]/55">
                {d.id}
              </span>
              <a
                href={url}
                className="ml-auto font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0B5FFF] hover:underline"
              >
                Open dataset →
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
