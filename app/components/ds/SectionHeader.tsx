// SectionHeader — eyebrow + display headline + optional sub-line.
// Display headline is Geist 700 by default; pass `serif` to use Instrument
// Serif italic (Undervolt-ATX hero treatment).

import { EyebrowLabel } from "./EyebrowLabel";

type Tone = "dim" | "accent" | "warm" | "good" | "warn" | "bad" | "purple";

export function SectionHeader({
  eyebrow,
  eyebrowTone = "accent",
  headline,
  serif = false,
  sub,
  align = "left",
  size = "lg",
}: {
  eyebrow?: string;
  eyebrowTone?: Tone;
  headline: React.ReactNode;
  serif?: boolean;
  sub?: React.ReactNode;
  align?: "left" | "center";
  size?: "md" | "lg" | "xl";
}) {
  const sizeClass =
    size === "xl"
      ? "text-[40px] md:text-[68px] leading-[1.02]"
      : size === "lg"
        ? "text-[32px] md:text-[48px] leading-[1.08]"
        : "text-[24px] md:text-[32px] leading-[1.15]";
  const alignClass = align === "center" ? "text-center mx-auto" : "";

  return (
    <div className={alignClass}>
      {eyebrow && <EyebrowLabel tone={eyebrowTone}>{eyebrow}</EyebrowLabel>}
      <h2
        className={`mt-3 max-w-[24ch] font-bold tracking-[-0.02em] ${sizeClass} ${
          align === "center" ? "mx-auto" : ""
        } text-[var(--ds-text)]`}
      >
        {serif ? (
          <span className="font-display-serif font-normal">{headline}</span>
        ) : (
          headline
        )}
      </h2>
      {sub && (
        <p
          className={`mt-5 max-w-[58ch] text-[15px] md:text-[16px] leading-relaxed text-[var(--ds-text-mute)] ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
