// Shell — page chrome (header + footer) for any post-redesign page.
// Single source of truth for the wordmark, nav, GitHub CTA, and footer.

import Link from "next/link";

type NavGroup =
  | { kind: "link"; href: string; label: string }
  | { kind: "group"; label: string; items: { href: string; label: string; blurb?: string }[] };

const NAV: NavGroup[] = [
  { kind: "link", href: "/", label: "Home" },
  { kind: "link", href: "/q", label: "Lookups" },
  { kind: "link", href: "/byok", label: "Ask your own" },
  { kind: "link", href: "/datasets", label: "Datasets" },
  { kind: "link", href: "/reports", label: "Reports" },
  { kind: "link", href: "/agents", label: "Agents" },
  {
    kind: "group",
    label: "Developer resources",
    items: [
      { href: "/use-as-agent", label: "Install", blurb: "Add the MCP server to Claude Code, Cursor, Codex." },
      { href: "/architecture", label: "Architecture", blurb: "Dataset → Ingest → Cache → Agent → UI. The whole system." },
      { href: "/docs", label: "Docs", blurb: "Tools, skill, integration. Long-form reference." },
      { href: "/developer", label: "Developer", blurb: "API reference + replay console." },
      { href: "/sources", label: "Sources", blurb: "Datasets, glossaries, license, attribution." },
    ],
  },
  { kind: "link", href: "/about", label: "About" },
];

// Flat list for the footer + active-state matching
const FLAT_NAV: { href: string; label: string }[] = NAV.flatMap((n) =>
  n.kind === "link" ? [{ href: n.href, label: n.label }] : n.items.map((i) => ({ href: i.href, label: i.label })),
);

function isActive(href: string, active?: string): boolean {
  if (!active) return false;
  if (active === href) return true;
  if (href === "/") return false;
  return active.startsWith(href);
}

export function ShellHeader({ active }: { active?: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--ds-border)] bg-[var(--ds-bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-6 py-3.5 md:px-8">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-[17px] font-bold tracking-tight text-[var(--ds-text)]">
            TXLookup
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)] md:inline">
            v0.1
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-[13px] md:flex">
          {NAV.map((n) => {
            if (n.kind === "link") {
              const a = isActive(n.href, active);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`transition-colors ${
                    a ? "text-[var(--ds-text)]" : "text-[var(--ds-text-mute)] hover:text-[var(--ds-text)]"
                  }`}
                >
                  {n.label}
                </Link>
              );
            }
            // Group: render a hover-only dropdown trigger.
            const anyActive = n.items.some((i) => isActive(i.href, active));
            return (
              <div key={n.label} className="group relative">
                <button
                  type="button"
                  className={`flex items-center gap-1 transition-colors ${
                    anyActive ? "text-[var(--ds-text)]" : "text-[var(--ds-text-mute)] hover:text-[var(--ds-text)]"
                  }`}
                  aria-haspopup="menu"
                >
                  <span>{n.label}</span>
                  <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden className="opacity-70">
                    <path d="M1 3 L4.5 6.5 L8 3" stroke="currentColor" strokeWidth="1.2" fill="none" />
                  </svg>
                </button>
                {/* Dropdown — opens on hover or focus-within */}
                <div
                  role="menu"
                  className="invisible absolute right-0 top-full z-50 mt-2 w-[300px] -translate-y-1 rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elev)] p-2 opacity-0 shadow-2xl transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
                >
                  {n.items.map((i) => {
                    const a = isActive(i.href, active);
                    return (
                      <Link
                        key={i.href}
                        href={i.href}
                        role="menuitem"
                        className={`block rounded px-3 py-2 text-[13px] transition-colors ${
                          a
                            ? "bg-[var(--ds-bg)] text-[var(--ds-accent)]"
                            : "text-[var(--ds-text)] hover:bg-[var(--ds-bg)] hover:text-[var(--ds-accent)]"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-semibold">{i.label}</span>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                            {i.href}
                          </span>
                        </div>
                        {i.blurb && (
                          <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--ds-text-mute)]">
                            {i.blurb}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <a
          href="https://github.com/ATX-TXLookup/TXLookup"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--ds-text)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--ds-bg)] hover:bg-[var(--ds-text-mute)]"
        >
          GitHub ↗
        </a>
      </div>
    </header>
  );
}

export function ShellFooter() {
  return (
    <footer className="border-t border-[var(--ds-border)]">
      <div className="mx-auto max-w-[1240px] px-6 py-10 md:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p className="text-[13px] font-semibold text-[var(--ds-text)]">TXLookup</p>
          <nav className="flex flex-wrap items-center gap-5 text-[12px]">
            {FLAT_NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-[var(--ds-text-dim)] hover:text-[var(--ds-text)]">
                {n.label}
              </Link>
            ))}
            <a href="https://github.com/ATX-TXLookup/TXLookup" className="text-[var(--ds-text-dim)] hover:text-[var(--ds-text)]">
              GitHub ↗
            </a>
          </nav>
        </div>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ds-text-dim)]">
          MIT · 2026 · Sourced from public Texas open-data portals · Attribution enforced
        </p>
      </div>
    </footer>
  );
}

export function Shell({ active, children }: { active?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--ds-bg)] text-[var(--ds-text)] antialiased">
      <ShellHeader active={active} />
      {children}
      <ShellFooter />
    </main>
  );
}
