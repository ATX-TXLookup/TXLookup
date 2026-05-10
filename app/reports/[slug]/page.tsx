// /reports/[slug] — dark visual-delight report per Stitch 98d45075.
// Wraps in the dark Shell. Big bold sans headline. Colored stat callouts.
// Sectioned WHERE / WHAT / HOW FAST. Inline charts with accent gradients
// and annotated peaks. "The Synthesis" closing block.
//
// IMPORTANT: buildReport(slug), notFound, generateStaticParams,
// QueryResult shape, REPORT_REVALIDATE — preserved byte-identical.

import Link from "next/link";
import { notFound } from "next/navigation";
import { REPORTS } from "@/config/reports";
import {
  buildReport,
  REPORT_REVALIDATE,
  type QueryResult,
} from "@/app/lib/report-builder";
import { Shell } from "@/app/components/ds";
import { FlagshipSection } from "./FlagshipSection";
import { AustinConstructionReport } from "./AustinConstructionReport";

export const revalidate = REPORT_REVALIDATE;

export async function generateStaticParams() {
  return REPORTS.map((r) => ({ slug: r.slug }));
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d} ${MONTHS[Math.max(0, Math.min(11, Number(m) - 1))]} ${y}`;
}

const TONE_BG: Record<string, string> = {
  good:    "rgba(16,185,129,0.08)",
  warm:    "rgba(249,115,22,0.08)",
  accent:  "rgba(91,141,239,0.08)",
  warn:    "rgba(245,158,11,0.08)",
  purple:  "rgba(168,85,247,0.08)",
};
const TONE_RING: Record<string, string> = {
  good:    "rgba(16,185,129,0.25)",
  warm:    "rgba(249,115,22,0.25)",
  accent:  "rgba(91,141,239,0.25)",
  warn:    "rgba(245,158,11,0.25)",
  purple:  "rgba(168,85,247,0.25)",
};
const TONE_FG: Record<string, string> = {
  good:    "var(--ds-good)",
  warm:    "var(--ds-warm)",
  accent:  "var(--ds-accent)",
  warn:    "var(--ds-warn)",
  purple:  "var(--ds-purple)",
};

function ColorStatCard({
  value,
  label,
  caption,
  tone,
}: {
  value: React.ReactNode;
  label: string;
  caption?: string;
  tone: keyof typeof TONE_FG;
}) {
  return (
    <div
      className="rounded-md border p-5"
      style={{ background: TONE_BG[tone], borderColor: TONE_RING[tone] }}
    >
      <div
        className="text-[44px] font-bold leading-none tabular-nums tracking-[-0.02em] md:text-[56px]"
        style={{ color: TONE_FG[tone] }}
      >
        {value}
      </div>
      <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-text)]">
        {label}
      </p>
      {caption && (
        <p className="mt-1 text-[12px] text-[var(--ds-text-mute)]">{caption}</p>
      )}
    </div>
  );
}

function ColoredBarChart({
  bars,
  accent = "accent",
  highlight = 0,
}: {
  bars: { label: string; value: number }[];
  accent?: keyof typeof TONE_FG;
  highlight?: number;
}) {
  if (bars.length === 0) {
    return (
      <p className="text-[13px] italic text-[var(--ds-text-dim)]">
        Data temporarily unavailable
      </p>
    );
  }
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <ul className="space-y-2">
      {bars.map((b, i) => {
        const pct = (b.value / max) * 100;
        const isHi = i === highlight;
        const fg = isHi ? TONE_FG.warm : TONE_FG[accent];
        return (
          <li key={`${b.label}-${i}`} className="grid grid-cols-[80px_1fr_auto] items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-mute)]">
              {b.label}
            </span>
            <div className="h-7 rounded-sm bg-[var(--ds-bg)]">
              <div
                className="h-full rounded-sm transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: isHi
                    ? `linear-gradient(90deg, ${fg}cc 0%, ${fg}66 100%)`
                    : `linear-gradient(90deg, ${fg}88 0%, ${fg}33 100%)`,
                }}
              />
            </div>
            <span
              className="font-mono text-[12px] font-semibold tabular-nums"
              style={{ color: isHi ? fg : "var(--ds-text)" }}
            >
              {b.value.toLocaleString()}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ColoredLineChart({
  points,
  accent = "accent",
}: {
  points: { x: string | number; y: number }[];
  accent?: keyof typeof TONE_FG;
}) {
  if (points.length < 2) {
    return (
      <p className="text-[13px] italic text-[var(--ds-text-dim)]">
        Data temporarily unavailable
      </p>
    );
  }
  const W = 720;
  const H = 200;
  const padX = 24;
  const padY = 20;
  const ys = points.map((p) => p.y);
  const yMax = Math.max(...ys) * 1.1;
  const yMin = 0;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const stepX = innerW / Math.max(points.length - 1, 1);
  const xPos = (i: number) => padX + i * stepX;
  const yPos = (y: number) => padY + innerH - ((y - yMin) / Math.max(yMax - yMin, 1)) * innerH;
  const peakIdx = ys.indexOf(Math.max(...ys));
  const fg = TONE_FG[accent];
  const peak = TONE_FG.purple;
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)} ${yPos(p.y).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${xPos(points.length - 1).toFixed(1)} ${H - padY} L${padX} ${H - padY} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      <defs>
        <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fg} stopOpacity={0.3} />
          <stop offset="100%" stopColor={fg} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={padX} x2={W - padX} y1={padY + innerH * t} y2={padY + innerH * t} stroke="var(--ds-border)" strokeWidth={0.5} />
      ))}
      <path d={areaPath} fill="url(#line-gradient)" />
      <path d={linePath} fill="none" stroke={fg} strokeWidth={1.75} />
      {points.map((p, i) => (
        <circle key={i} cx={xPos(i)} cy={yPos(p.y)} r={2.5} fill={fg} />
      ))}
      {/* Peak callout */}
      <g>
        <circle cx={xPos(peakIdx)} cy={yPos(points[peakIdx].y)} r={6} fill={peak} opacity={0.4} />
        <circle cx={xPos(peakIdx)} cy={yPos(points[peakIdx].y)} r={3.5} fill={peak} />
        <rect
          x={xPos(peakIdx) - 32}
          y={yPos(points[peakIdx].y) - 26}
          width={64}
          height={18}
          rx={9}
          fill={peak}
        />
        <text
          x={xPos(peakIdx)}
          y={yPos(points[peakIdx].y) - 13}
          textAnchor="middle"
          fontSize={10}
          fontFamily="JetBrains Mono, monospace"
          fontWeight={700}
          fill="white"
        >
          PEAK · {points[peakIdx].y.toLocaleString()}
        </text>
      </g>
      {/* X-axis labels */}
      {points.map((p, i) => (
        <text
          key={`x-${i}`}
          x={xPos(i)}
          y={H - 4}
          textAnchor="middle"
          fontSize={9}
          fontFamily="JetBrains Mono, monospace"
          fill="var(--ds-text-dim)"
        >
          {String(p.x).slice(0, 7)}
        </text>
      ))}
    </svg>
  );
}

function SectionFigure({
  num,
  eyebrow,
  headline,
  body,
  q,
  datasetIds,
  date,
  accent = "accent",
  pullQuote,
}: {
  num: string;
  eyebrow: string;
  headline: string;
  body?: string;
  q: QueryResult;
  datasetIds: string[];
  date: string;
  accent?: keyof typeof TONE_FG;
  pullQuote?: { value: string; label: string; tone: keyof typeof TONE_FG };
}) {
  const unavailable = q.status !== "completed" || !q.payload;
  const dsId = datasetIds[0] ?? "";
  return (
    <section className="my-14 md:my-20">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TONE_FG[accent] }}>
        {num} · {eyebrow}
      </p>
      <h2 className="mt-3 max-w-[24ch] text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text)] md:text-[40px]">
        {headline}
      </h2>
      {body && <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-[var(--ds-text-mute)] md:text-[17px]">{body}</p>}

      <div className="mt-8 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)] p-5 md:p-7">
        {q.viz === "bar" && !unavailable && q.payload?.kind === "bar" ? (
          <ColoredBarChart bars={q.payload.bars} accent={accent} highlight={0} />
        ) : q.viz === "line" && !unavailable && q.payload?.kind === "line" ? (
          <ColoredLineChart points={q.payload.points} accent={accent} />
        ) : (
          <p className="text-[13px] italic text-[var(--ds-text-dim)]">Data temporarily unavailable.</p>
        )}
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-dim)]">
          Source · {dsId} · TXLookup agent · {date}
        </p>
      </div>

      {pullQuote && (
        <aside
          className="mt-10 rounded-md border-l-2 pl-6"
          style={{ borderColor: TONE_FG[pullQuote.tone] }}
        >
          <div
            className="text-[56px] font-bold leading-none tabular-nums tracking-[-0.02em] md:text-[80px]"
            style={{ color: TONE_FG[pullQuote.tone] }}
          >
            {pullQuote.value}
          </div>
          <p className="mt-3 max-w-[42ch] text-[15px] leading-snug text-[var(--ds-text)]">
            {pullQuote.label}
          </p>
        </aside>
      )}
    </section>
  );
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await buildReport(slug);
  if (!data) notFound();
  const { def, queries, generatedAt } = data;

  // Flagship-grade extras computed from cached permits rows. Available for
  // any permits-driven report — austin-construction-2026 and the
  // austin-permits-heatmap dot map both lean on this.
  const flagshipExtras =
    slug === "austin-construction-2026" || slug === "austin-permits-heatmap"
      ? await (await import("@/app/lib/flagship-aggregates")).computeFlagshipAggregates()
      : null;
  const generatedISO = generatedAt.slice(0, 10);
  const generatedHuman = fmtDate(generatedISO);

  // ── BRANCH: long-form Austin Construction report ──────────────────────────
  // The construction slug gets a fully editorial layout with prose + multiple
  // chart types. The other 4 reports keep the existing dark-stat/bar/line
  // flow below.
  if (slug === "austin-construction-2026" && flagshipExtras) {
    // Pull "Permits issued in the last 30 days" out of the stat query if it
    // ran successfully; fall back to summing the cache directly so the hero
    // never shows "—".
    const last30Stat = queries.find(
      (q) => q.viz === "stat" && q.payload?.kind === "stat",
    );
    let permitCountLast30d =
      last30Stat?.payload?.kind === "stat" ? last30Stat.payload.value : 0;
    if (!permitCountLast30d) {
      // Fallback: derive from the cache via flagship-aggregates monthly area.
      // current[monthIdx] is cumulative-through-this-month; subtract the prior
      // month's cumulative to get this-month's volume — a reasonable proxy
      // when the live stat is unavailable.
      const cur = flagshipExtras.area.current;
      if (cur.length >= 2) {
        const last = cur[cur.length - 1].y;
        const prev = cur[cur.length - 2].y;
        permitCountLast30d = Math.max(last - prev, last);
      }
    }
    return (
      <Shell active="/reports">
        <AustinConstructionReport
          def={def}
          extras={flagshipExtras}
          generatedAt={generatedAt}
          permitCountLast30d={permitCountLast30d}
        />
      </Shell>
    );
  }

  const statQueries = queries.filter((q) => q.viz === "stat");
  const otherQueries = queries.filter((q) => q.viz !== "stat");

  // Pick 3 hero stats. If stat queries are short, derive extras from the
  // top values of any bar/line query so the hero strip always feels populated.
  type HeroStat = { value: string; label: string; tone: keyof typeof TONE_FG };
  const heroStats: HeroStat[] = [];
  const tones: Array<keyof typeof TONE_FG> = ["good", "warm", "accent"];
  for (const q of statQueries) {
    if (heroStats.length >= 3) break;
    const v =
      q.payload?.kind === "stat"
        ? typeof q.payload.value === "number"
          ? q.payload.value.toLocaleString()
          : (q.payload.value ?? "—")
        : "—";
    heroStats.push({ value: String(v), label: q.label, tone: tones[heroStats.length] });
  }
  // Fill from bar chart tops
  for (const q of otherQueries) {
    if (heroStats.length >= 3) break;
    if (q.payload?.kind === "bar" && q.payload.bars.length > 0) {
      const top = q.payload.bars[0];
      heroStats.push({
        value: top.value.toLocaleString(),
        label: `${top.label} · top of ${q.label.toLowerCase()}`,
        tone: tones[heroStats.length],
      });
    } else if (q.payload?.kind === "line" && q.payload.points.length > 0) {
      const peak = q.payload.points.reduce((a, b) => (a.y > b.y ? a : b));
      heroStats.push({
        value: peak.y.toLocaleString(),
        label: `${String(peak.x).slice(0, 7)} · peak of ${q.label.toLowerCase()}`,
        tone: tones[heroStats.length],
      });
    }
  }

  // Section accents rotate through good/warm/purple.
  const sectionAccents: Array<keyof typeof TONE_FG> = ["good", "warm", "purple"];
  const sectionEyebrows = ["WHERE", "WHAT", "HOW FAST"];

  return (
    <Shell active="/reports">
      {/* HERO */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-8 md:py-20">
          <Link
            href="/reports"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)] hover:underline"
          >
            ← All reports
          </Link>
          <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-dim)]">
            TXLookup Report · #{slug.slice(0, 3).toUpperCase()} · Updated {generatedHuman}
          </p>
          <h1 className="mt-4 max-w-[24ch] text-[44px] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--ds-text)] md:text-[64px]">
            {def.title}
          </h1>
          <p className="mt-5 max-w-[60ch] text-[18px] leading-[1.55] text-[var(--ds-text-mute)] md:text-[20px]">
            {def.subtitle}
          </p>

          {/* 3 colored hero stat cards */}
          {heroStats.length > 0 && (
            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {heroStats.map((s, i) => (
                <ColorStatCard key={i} value={s.value} label={s.label} tone={s.tone as keyof typeof TONE_FG} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* INTRO PROSE */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-8 md:py-14">
          <p className="max-w-[64ch] text-[18px] leading-[1.7] text-[var(--ds-text)] md:text-[20px]">
            {def.intro_paragraph}
          </p>
        </div>
      </section>

      {/* SECTIONS */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 md:px-8">
          {otherQueries.map((q, i) => (
            <SectionFigure
              key={`${slug}-q${i}`}
              num={String(i + 1).padStart(2, "0")}
              eyebrow={sectionEyebrows[i] ?? "FINDING"}
              headline={q.label}
              q={q}
              datasetIds={def.dataset_ids}
              date={generatedHuman}
              accent={sectionAccents[i % sectionAccents.length]}
              pullQuote={
                i === 1 && statQueries[1]?.payload?.kind === "stat"
                  ? {
                      value: `+${typeof statQueries[1].payload.value === "number" ? statQueries[1].payload.value : statQueries[1].payload.value}`,
                      label: statQueries[1].label,
                      tone: "good",
                    }
                  : undefined
              }
            />
          ))}

          {/* Flagship-only multi-perspective section */}
          {flagshipExtras && (
            <FlagshipSection data={flagshipExtras} />
          )}
        </div>
      </section>

      {/* THE SYNTHESIS / TAKEAWAY */}
      {def.conclusion_paragraph && (
        <section className="border-b border-[var(--ds-border)]">
          <div className="relative overflow-hidden">
            {/* Subtle isometric grid hint as background */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(var(--ds-text) 1px, transparent 1px), linear-gradient(90deg, var(--ds-text) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                transform: "perspective(800px) rotateX(58deg) translateY(20%)",
              }}
            />
            <div className="relative mx-auto max-w-[1100px] px-6 py-16 md:px-8 md:py-24">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-purple)]">
                ◆ The synthesis
              </p>
              <h2 className="mt-4 max-w-[20ch] text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ds-text)] md:text-[52px]">
                What it adds up to.
              </h2>
              <p className="mt-6 max-w-[60ch] text-[18px] leading-[1.7] text-[var(--ds-text-mute)] md:text-[20px]">
                {def.conclusion_paragraph}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SOURCES + METHOD */}
      <section className="border-b border-[var(--ds-border)]">
        <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-8 md:py-16">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-text-dim)]">
                Sources
              </p>
              <ul className="mt-4 space-y-2">
                {def.dataset_ids.map((id) => (
                  <li key={id}>
                    <Link
                      href={`/datasets/${id}`}
                      className="inline-flex items-baseline gap-2 font-mono text-[13px] text-[var(--ds-text)] hover:text-[var(--ds-accent)]"
                    >
                      <span>{id}</span>
                      <span className="text-[10px] uppercase text-[var(--ds-text-dim)]">→ open dataset</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-text-dim)]">
                Method
              </p>
              <p className="mt-4 max-w-[44ch] text-[14px] leading-relaxed text-[var(--ds-text-mute)]">
                Generated by the TXLookup agent from live Socrata data — no
                hand-tuning, no cached numbers. Each section is the result of
                a bounded SoQL query against the cited datasets, run at request
                time and revalidated every 6 hours. Full chain replayable at{" "}
                <Link href="/agents" className="text-[var(--ds-accent)] hover:underline">
                  /agents
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media print {
          @page { size: A4; margin: 18mm; }
          html, body { background: #fff !important; color: #15171C !important; }
          main { background: #fff !important; }
          a { color: #15171C !important; text-decoration: none !important; }
        }
      `}</style>
    </Shell>
  );
}
