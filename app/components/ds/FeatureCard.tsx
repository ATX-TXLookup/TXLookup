// FeatureCard — Undervolt-style. Colored icon top-left, title, body, optional
// CTA link. The icon is rendered as a small colored square with a glyph or
// initial. Card has a subtle border + bg-elev background.

import Link from "next/link";

type Tone = "accent" | "warm" | "good" | "warn" | "bad" | "purple" | "neutral";

const TONE: Record<Tone, { bg: string; ring: string; fg: string }> = {
  accent:  { bg: "rgba(91,141,239,0.14)",  ring: "rgba(91,141,239,0.4)",  fg: "var(--ds-accent)" },
  warm:    { bg: "rgba(249,115,22,0.14)",  ring: "rgba(249,115,22,0.4)",  fg: "var(--ds-warm)" },
  good:    { bg: "rgba(16,185,129,0.14)",  ring: "rgba(16,185,129,0.4)",  fg: "var(--ds-good)" },
  warn:    { bg: "rgba(245,158,11,0.14)",  ring: "rgba(245,158,11,0.4)",  fg: "var(--ds-warn)" },
  bad:     { bg: "rgba(239,68,68,0.14)",   ring: "rgba(239,68,68,0.4)",   fg: "var(--ds-bad)" },
  purple:  { bg: "rgba(168,85,247,0.14)",  ring: "rgba(168,85,247,0.4)",  fg: "var(--ds-purple)" },
  neutral: { bg: "var(--ds-bg-deep)",      ring: "var(--ds-border)",      fg: "var(--ds-text)" },
};

export function FeatureCard({
  icon,
  title,
  body,
  href,
  ctaLabel = "Learn more →",
  tone = "accent",
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  href?: string;
  ctaLabel?: string;
  tone?: Tone;
}) {
  const t = TONE[tone];
  const Inner = (
    <div className="flex h-full flex-col rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 transition-colors hover:border-[var(--ds-border-strong)]">
      <div
        className="grid h-9 w-9 place-items-center rounded-md"
        style={{ background: t.bg, color: t.fg, border: `1px solid ${t.ring}` }}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-[15px] font-semibold leading-tight text-[var(--ds-text)]">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--ds-text-mute)]">{body}</p>
      {href && (
        <p className="mt-4 text-[12px] font-medium" style={{ color: t.fg }}>
          {ctaLabel}
        </p>
      )}
    </div>
  );
  if (href) {
    if (href.startsWith("http")) {
      return (
        <a href={href} className="group block h-full">
          {Inner}
        </a>
      );
    }
    return (
      <Link href={href} className="group block h-full">
        {Inner}
      </Link>
    );
  }
  return Inner;
}
