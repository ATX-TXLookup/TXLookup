// /wanted — the public demand queue. Every uncached question people asked
// lands here; visitors upvote the ones they want; the hourly cron runs the
// top-voted one and it moves to "Recently answered". Turns the gate from a
// dead-end into a social loop.

import Link from "next/link";

import { Shell } from "@/app/components/ds";
import { listPending, listAnswered, dbConfigured } from "@/app/lib/demand";
import { UpvoteButton } from "./UpvoteButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function WantedPage() {
  const [pending, answered, hasDb] = await Promise.all([
    listPending(40),
    listAnswered(12),
    Promise.resolve(dbConfigured()),
  ]);

  return (
    <Shell active="/wanted">
      <section className="border-b border-[var(--ds-border)] bg-[var(--ds-bg)]">
        <div className="mx-auto max-w-[1000px] px-6 py-14 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-warm)]">
            The demand queue
          </p>
          <h1 className="mt-4 max-w-[20ch] text-[40px] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--ds-text)] md:text-[60px]">
            Vote on what we look up next.
          </h1>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-[1.55] text-[var(--ds-text-mute)] md:text-[19px]">
            Every question people ask that isn&rsquo;t in the library yet shows up here. Upvote the ones you want answered. At the top of every hour, the most-requested question runs and joins the library.
          </p>
        </div>
      </section>

      {!hasDb && (
        <section className="bg-[var(--ds-bg)]">
          <div className="mx-auto max-w-[1000px] px-6 py-10 md:px-8">
            <div className="rounded-md border border-[var(--ds-warn)]/40 bg-[var(--ds-bg-elev)] p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ds-warn)]">
                Queue not yet live
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--ds-text-mute)]">
                The demand queue needs a database. Set <span className="font-mono text-[var(--ds-text)]">DATABASE_URL</span> (Neon Postgres) in the environment and the queue activates automatically &mdash; the schema is created on first use, no migration step.
              </p>
            </div>
          </div>
        </section>
      )}

      {hasDb && (
        <section className="bg-[var(--ds-bg)]">
          <div className="mx-auto max-w-[1000px] px-6 py-10 md:px-8">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-accent)]">
              Pending &middot; most-requested first
            </p>
            {pending.length === 0 ? (
              <p className="mt-4 text-[15px] text-[var(--ds-text-mute)]">
                Nothing in the queue yet. Ask a question that isn&rsquo;t in the library and it lands here.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-[var(--ds-border)] border-y border-[var(--ds-border)]">
                {pending.map((row) => (
                  <li key={row.query_hash} className="flex items-center gap-4 py-4">
                    <UpvoteButton query={row.query_text} initialCount={row.upvotes} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15.5px] font-medium leading-snug text-[var(--ds-text)]">
                        {row.query_text}
                      </p>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                        asked {row.hit_count}&times; &middot; first seen {timeAgo(row.first_seen)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {hasDb && answered.length > 0 && (
        <section className="border-t border-[var(--ds-border)] bg-[var(--ds-bg-elev)]">
          <div className="mx-auto max-w-[1000px] px-6 py-10 md:px-8">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ds-good)]">
              Recently answered &middot; from the queue
            </p>
            <ul className="mt-5 divide-y divide-[var(--ds-border)] border-y border-[var(--ds-border)]">
              {answered.map((row) => (
                <li key={row.query_hash}>
                  <Link
                    href={`/q?q=${encodeURIComponent(row.query_text)}`}
                    className="group flex items-center gap-4 py-4 transition-colors hover:bg-[var(--ds-bg)]"
                  >
                    <span className="font-mono text-[12px] text-[var(--ds-good)]">&#10003;</span>
                    <span className="min-w-0 flex-1 text-[15px] leading-snug text-[var(--ds-text)] group-hover:text-[var(--ds-accent)]">
                      {row.query_text}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-[var(--ds-text-dim)]">
                      {row.upvotes} votes &middot; answered {timeAgo(row.answered_at)} &rarr;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </Shell>
  );
}
