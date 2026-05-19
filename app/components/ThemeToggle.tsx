"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const nextTheme: Theme = theme === "dark" ? "light" : "dark";
  const label = `Switch to ${nextTheme} theme`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        document.documentElement.dataset.theme = nextTheme;
        document.cookie = `txlookup-theme=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
        setTheme(nextTheme);
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] text-[var(--ds-text)] transition-colors hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)]"
    >
      {theme === "dark" ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2.5V5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20.2 15.6A8.4 8.4 0 0 1 8.4 3.8a8.8 8.8 0 1 0 11.8 11.8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
