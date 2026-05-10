// StatBlock — big number + label + optional delta + caption.
// BRAND.md §7 card pattern: cream surface, hairline border, navy display number.
// Number set in DM Serif Display per the reports brand brief; label in Syne caps.

type Props = {
  label: string;
  value: string | number | null;
  delta?: string;
  caption?: string;
  unavailable?: boolean;
};

export function StatBlock({ label, value, delta, caption, unavailable }: Props) {
  const display =
    unavailable || value === null || value === undefined
      ? "—"
      : typeof value === "number"
        ? value.toLocaleString()
        : value;
  return (
    <figure className="my-8 rounded-[10px] border border-[color:var(--tx-border)] bg-tx-cream p-6">
      <figcaption className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-tx-rust">
        {label}
      </figcaption>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="font-display text-5xl font-normal tabular-nums leading-none text-tx-navy md:text-6xl">
          {display}
        </span>
        {delta && !unavailable && (
          <span className="font-mono text-sm font-semibold text-tx-sky">
            {delta}
          </span>
        )}
      </div>
      {(caption || unavailable) && (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-tx-muted">
          {unavailable ? "Data temporarily unavailable" : caption}
        </p>
      )}
    </figure>
  );
}
