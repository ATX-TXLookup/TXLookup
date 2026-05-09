// StatBlock — big number + label + optional delta + caption.
// Civic-portal palette: navy heading, action-blue accents, no shadows.

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
    <figure className="my-8 border border-[#1A1F2A]/10 bg-white p-6">
      <figcaption className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0B5FFF]">
        {label}
      </figcaption>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="font-display text-5xl font-black tabular-nums leading-none text-[#0B2545]">
          {display}
        </span>
        {delta && !unavailable && (
          <span className="font-mono text-sm font-semibold text-[#0B5FFF]">
            {delta}
          </span>
        )}
      </div>
      {(caption || unavailable) && (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-[#1A1F2A]/55">
          {unavailable ? "Data temporarily unavailable" : caption}
        </p>
      )}
    </figure>
  );
}
