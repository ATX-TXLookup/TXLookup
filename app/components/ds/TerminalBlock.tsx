// TerminalBlock — Mac-window styled mono code block on bg-deep. Used by the
// install pitch + anywhere we show a copy-paste command.

export function TerminalBlock({
  title = "~/txlookup",
  children,
  tone = "neutral",
}: {
  title?: string;
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "good";
}) {
  const dotColor = tone === "good" ? "var(--ds-good)" : tone === "accent" ? "var(--ds-accent)" : "var(--ds-border-strong)";
  return (
    <div className="overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-deep)]">
      <div className="flex items-center gap-2 border-b border-[var(--ds-border)] bg-[var(--ds-bg-elev)] px-4 py-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: dotColor, opacity: 0.6 }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: dotColor, opacity: 0.4 }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: dotColor, opacity: 0.25 }} />
        <span className="ml-2 ds-eyebrow text-[10px] text-[var(--ds-text-dim)]">{title}</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-[var(--ds-text)]">
        {children}
      </pre>
    </div>
  );
}
