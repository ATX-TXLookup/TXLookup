// StatBlock — USAFacts-grade pull-quote stat: big tabular numeral, terse label,
// small caption beneath. No card chrome, no border, no fill — the number IS the
// element. Lives inline in the editorial column. Used both for the "at a glance"
// strip and for mid-article pull-quotes between chart figures.

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
    <figure className="my-2">
      <div
        className="text-[44px] font-bold leading-[1.0] tracking-[-0.02em] tabular-nums text-[var(--rep-text)] md:text-[56px]"
        style={{ fontFeatureSettings: '"tnum" 1, "lnum" 1' }}
      >
        {display}
        {delta && !unavailable && (
          <span className="ml-2 align-baseline text-[14px] font-mono font-semibold text-[var(--rep-accent)]">
            {delta}
          </span>
        )}
      </div>
      <figcaption className="mt-2 text-[13px] font-medium leading-snug text-[var(--rep-text)]">
        {label}
      </figcaption>
      {(caption || unavailable) && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#86827A]">
          {unavailable ? "Data temporarily unavailable" : caption}
        </p>
      )}
    </figure>
  );
}
