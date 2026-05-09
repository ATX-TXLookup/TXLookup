// Shared site chrome — utility bar + header.
// Used by every public page so the wordmark and nav-link list stay identical.
//
// Canonical nav: New search · Datasets · Reports · GitHub
// Active-state logic: a link with href matching the current path gets the
// accent color; rendered as a <Link> for internal hrefs and <a> for external.
//
// The /components dev showcase intentionally does NOT use this header.

import Link from "next/link";

export interface SiteHeaderProps {
  /** Active path used for the active-state logic (e.g. "/", "/reports"). */
  activePath?: string;
  /** Text rendered in the dark utility bar above the header. */
  utilityNote?: string;
}

interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

// Single source of truth for the nav. If you add a link here, every page
// picks it up automatically. Tests assert this list is identical across pages.
export const NAV_LINKS: ReadonlyArray<NavLink> = [
  { href: "/", label: "New search" },
  { href: "/#datasets", label: "Datasets" },
  { href: "/reports", label: "Reports" },
  {
    href: "https://github.com/ATX-TXLookup/TXLookup",
    label: "GitHub",
    external: true,
  },
];

function isActive(linkHref: string, activePath?: string): boolean {
  if (!activePath) return false;
  // "/" only highlights on home; "/#datasets" never highlights.
  if (linkHref === "/") return activePath === "/";
  if (linkHref.startsWith("/#")) return false;
  return activePath === linkHref || activePath.startsWith(linkHref + "/");
}

export function SiteHeader({
  activePath,
  utilityNote = "An open-source agent for Texas public data.",
}: SiteHeaderProps) {
  return (
    <>
      {/* Top utility bar */}
      <div className="bg-[#0B2545] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-2 text-[13px] md:px-10">
          <span>{utilityNote}</span>
          <span className="hidden font-mono text-[11px] uppercase tracking-wider text-white/70 md:inline">
            v0.1 · alpha
          </span>
        </div>
      </div>

      {/* Header */}
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
          <nav
            className="flex items-center gap-7 font-display text-sm font-semibold"
            data-testid="site-nav"
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href, activePath);
              const baseClass = link.external
                ? "rounded-sm bg-[#0B2545] px-4 py-2 font-medium text-white hover:bg-[#0B5FFF]"
                : active
                ? "text-[#0B5FFF]"
                : "hover:text-[#0B5FFF]";
              if (link.external) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={baseClass}
                    data-nav-href={link.href}
                  >
                    {link.label} {link.label === "GitHub" ? "↗" : null}
                  </a>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={baseClass}
                  data-nav-href={link.href}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}
