"use client";

// SupportChips — renders the support specialist's `next_actions` array as
// brand-styled disambiguation chips. Used when the user asked something
// ambiguous (e.g. "south austin") and support returned a list of canonical
// follow-ups. Clicking a chip navigates to /q?q=<chip.query> via Next router.
//
// Brand: BRAND.md §7 primary CTA (rust bg, white Syne bold), shrunk per the
// brief (text-sm rounded-md px-4 py-1.5). Heading uses the standard rust
// uppercase mono label, body message uses navy DM Serif for a soft display
// touch consistent with the rest of /q.

import { useRouter } from "next/navigation";

export type SupportNextAction = { label: string; query: string };

export type SupportResult = {
  agent: "support";
  message?: string;
  needs_input?: boolean;
  next_actions?: SupportNextAction[];
};

export function SupportChips({ result }: { result: SupportResult }) {
  const router = useRouter();
  const actions = Array.isArray(result.next_actions) ? result.next_actions : [];
  if (actions.length === 0) return null;

  return (
    <div
      className="mt-4 rounded-[10px] bg-tx-cream p-5"
      style={{ border: "0.5px solid var(--tx-border)" }}
    >
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-rust">
        Pick one
      </p>
      {result.message && (
        <p className="mt-2 max-w-[60ch] text-lg font-normal leading-snug tracking-tight text-tx-navy">
          {result.message}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((a, i) => (
          <button
            key={`${a.label}-${i}`}
            type="button"
            onClick={() => {
              router.push(`/q?q=${encodeURIComponent(a.query)}`);
            }}
            className="rounded-md bg-tx-rust px-4 py-1.5 text-sm font-bold text-white hover:bg-tx-rust-dark"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
