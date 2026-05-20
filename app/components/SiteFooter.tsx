// Shared slim footer used by /q, /datasets/[id], /architecture, /reports,
// /reports/[slug]. The home page renders its own richer footer but still
// includes the canonical attribution string so cross-page footer assertions
// hold.

import Link from "next/link";

export const FOOTER_ATTRIBUTION =
  "All data sourced from public Texas open-data portals · Attribution enforced";

export function SiteFooter() {
  return (
    <footer className="bg-[#06182F] text-white/85">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-6 py-8 text-[15px] md:flex-row md:items-center md:justify-between md:px-10">
        <p>{FOOTER_ATTRIBUTION}</p>
        <Link href="/" className="hover:text-white">
          ← Back to TXLookup
        </Link>
      </div>
    </footer>
  );
}
