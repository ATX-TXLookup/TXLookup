// Shell — page chrome (header + footer) for any post-redesign page.
// Single source of truth for the wordmark, nav, GitHub CTA, and footer.

import Link from "next/link";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/q", label: "Ask" },
  { href: "/chat", label: "Chat" },
  { href: "/datasets", label: "Datasets" },
  { href: "/reports", label: "Reports" },
  { href: "/agents", label: "Agents" },
  { href: "/use-as-agent", label: "Install" },
  { href: "/docs", label: "Docs" },
  { href: "/developer", label: "Developer" },
  { href: "/about", label: "About" },
];

export function ShellHeader({ active }: { active?: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--ds-border)] bg-[var(--ds-bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-3.5 md:px-8">
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
            const isActive = active === n.href || (n.href !== "/" && active?.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`transition-colors ${
                  isActive ? "text-[var(--ds-text)]" : "text-[var(--ds-text-mute)] hover:text-[var(--ds-text)]"
                }`}
              >
                {n.label}
              </Link>
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
      <div className="mx-auto max-w-[1200px] px-6 py-10 md:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p className="text-[13px] font-semibold text-[var(--ds-text)]">TXLookup</p>
          <nav className="flex items-center gap-5 text-[12px]">
            {NAV.map((n) => (
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
