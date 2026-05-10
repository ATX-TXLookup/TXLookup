// Eyebrow label — the small uppercase mono prefix that appears above section
// headlines. Single-purpose. Color override via `tone`.

type Tone = "dim" | "accent" | "warm" | "good" | "warn" | "bad" | "purple";

const COLOR: Record<Tone, string> = {
  dim:    "var(--ds-text-dim)",
  accent: "var(--ds-accent)",
  warm:   "var(--ds-warm)",
  good:   "var(--ds-good)",
  warn:   "var(--ds-warn)",
  bad:    "var(--ds-bad)",
  purple: "var(--ds-purple)",
};

export function EyebrowLabel({ children, tone = "dim" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <p
      className="font-mono text-[11px] font-medium uppercase tracking-[0.16em]"
      style={{ color: COLOR[tone] }}
    >
      {children}
    </p>
  );
}
