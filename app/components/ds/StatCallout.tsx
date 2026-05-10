// StatCallout — Undervolt-style big stat numeral. Optionally serif + colored
// for the bold "26,075 / +340% / 9:1" treatment. Use sparingly (3-up grids
// at most). Numeral is ALWAYS tabular-nums for vertical alignment.

type Tone = "neutral" | "accent" | "warm" | "good" | "warn" | "bad" | "purple";

const COLOR: Record<Tone, string> = {
  neutral: "var(--ds-text)",
  accent:  "var(--ds-accent)",
  warm:    "var(--ds-warm)",
  good:    "var(--ds-good)",
  warn:    "var(--ds-warn)",
  bad:     "var(--ds-bad)",
  purple:  "var(--ds-purple)",
};

export function StatCallout({
  value,
  label,
  caption,
  tone = "neutral",
  serif = true,
  size = "lg",
}: {
  value: React.ReactNode;
  label: string;
  caption?: string;
  tone?: Tone;
  serif?: boolean;
  size?: "md" | "lg" | "xl";
}) {
  const sizeClass =
    size === "xl" ? "text-[80px] md:text-[112px]" : size === "lg" ? "text-[60px] md:text-[80px]" : "text-[40px] md:text-[56px]";
  return (
    <div>
      <div
        className={`tabular-nums leading-none ${sizeClass} ${serif ? "font-display-serif font-normal" : "font-bold tracking-[-0.03em]"}`}
        style={{ color: COLOR[tone] }}
      >
        {value}
      </div>
      <div className="mt-3 ds-eyebrow text-[var(--ds-text-mute)]">{label}</div>
      {caption && (
        <p className="mt-2 max-w-[28ch] text-[13px] leading-relaxed text-[var(--ds-text-mute)]">
          {caption}
        </p>
      )}
    </div>
  );
}
