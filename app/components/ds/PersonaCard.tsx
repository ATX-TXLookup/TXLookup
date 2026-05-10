// PersonaCard — Undervolt's "Who is this for" treatment. Gradient color bg,
// icon top, title, body. Used in 3-up grids only.

type Tone = "blue" | "warm" | "purple" | "green";

const GRAD: Record<Tone, string> = {
  blue:   "linear-gradient(155deg, rgba(91,141,239,0.22) 0%, rgba(91,141,239,0.06) 100%)",
  warm:   "linear-gradient(155deg, rgba(249,115,22,0.22) 0%, rgba(249,115,22,0.06) 100%)",
  purple: "linear-gradient(155deg, rgba(168,85,247,0.22) 0%, rgba(168,85,247,0.06) 100%)",
  green:  "linear-gradient(155deg, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.06) 100%)",
};

const RING: Record<Tone, string> = {
  blue:   "rgba(91,141,239,0.35)",
  warm:   "rgba(249,115,22,0.35)",
  purple: "rgba(168,85,247,0.35)",
  green:  "rgba(16,185,129,0.35)",
};

export function PersonaCard({
  icon,
  title,
  body,
  tone = "blue",
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div
      className="relative flex h-full flex-col rounded-md p-6"
      style={{ background: GRAD[tone], border: `1px solid ${RING[tone]}` }}
    >
      <div className="text-[28px] leading-none">{icon}</div>
      <h3 className="mt-4 text-[18px] font-bold leading-tight text-[var(--ds-text)]">{title}</h3>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--ds-text-mute)]">{body}</p>
    </div>
  );
}
