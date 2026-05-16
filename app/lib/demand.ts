// demand.ts — the query-demand + upvote-queue domain layer.
//
// Every uncached query that hits the gate gets recorded here, so the
// "what do people want answered" signal is captured in full (not just the
// handful who fill the suggest form). Visitors upvote pending queries; the
// hourly cron runs the top-voted one and flips it to answered.

import { createHash } from "node:crypto";

import { withDb, dbConfigured } from "@/app/lib/db";

export type DemandRow = {
  query_hash: string;
  query_text: string;
  first_seen: string;
  last_seen: string;
  hit_count: number;
  upvotes: number;
  status: "pending" | "answered" | "rejected";
  run_hash: string | null;
  answered_at: string | null;
};

export { dbConfigured };

/** Stable hash for a query string — matches hashQuery() semantics in run-archive. */
export function demandHash(query: string): string {
  return createHash("sha256")
    .update(query.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

/** Hash an IP (or any identifier) into an opaque vote fingerprint — we never store raw IPs. */
export function voterFingerprint(ip: string): string {
  return createHash("sha256").update(`txl-vote:${ip}`).digest("hex").slice(0, 24);
}

/**
 * Record an uncached query attempt. Upserts by hash: first sighting inserts
 * the row, repeat sightings bump hit_count + last_seen. Fire-and-forget —
 * callers should not await this on a hot path.
 */
export async function recordGateHit(query: string): Promise<void> {
  const q = query.trim();
  if (q.length < 3 || q.length > 1000) return;
  const hash = demandHash(q);
  await withDb(async (sql) => {
    await sql`
      INSERT INTO query_demand (query_hash, query_text, hit_count)
      VALUES (${hash}, ${q}, 1)
      ON CONFLICT (query_hash) DO UPDATE
        SET hit_count = query_demand.hit_count + 1,
            last_seen = now()
    `;
    return null;
  });
}

/**
 * Register a suggestion (from the /suggest form). Same table as gate-hits —
 * a suggestion is just a demand row someone explicitly cared enough to type.
 * Seeds it with one upvote so it surfaces above never-upvoted gate-hits.
 */
export async function recordSuggestion(query: string): Promise<void> {
  const q = query.trim();
  if (q.length < 10 || q.length > 1000) return;
  const hash = demandHash(q);
  await withDb(async (sql) => {
    await sql`
      INSERT INTO query_demand (query_hash, query_text, hit_count, upvotes)
      VALUES (${hash}, ${q}, 1, 1)
      ON CONFLICT (query_hash) DO UPDATE
        SET hit_count = query_demand.hit_count + 1,
            last_seen = now()
    `;
    return null;
  });
}

/**
 * Cast a vote. Returns the new upvote count, or null if the voter already
 * voted for this query (unique constraint on (query_hash, fingerprint)).
 */
export async function upvote(
  query: string,
  fingerprint: string,
): Promise<number | null> {
  const hash = demandHash(query);
  return withDb<number | null>(async (sql) => {
    // Reject duplicate votes via the unique PK on query_votes.
    const inserted = (await sql`
      INSERT INTO query_votes (query_hash, voter_fingerprint)
      VALUES (${hash}, ${fingerprint})
      ON CONFLICT (query_hash, voter_fingerprint) DO NOTHING
      RETURNING query_hash
    `) as Array<{ query_hash: string }>;
    if (inserted.length === 0) return null; // already voted

    const rows = (await sql`
      UPDATE query_demand
        SET upvotes = upvotes + 1
        WHERE query_hash = ${hash}
        RETURNING upvotes
    `) as Array<{ upvotes: number }>;
    return rows[0]?.upvotes ?? null;
  }, null);
}

/** Pending queries for the public /wanted queue — most-wanted first. */
export async function listPending(limit = 40): Promise<DemandRow[]> {
  return withDb<DemandRow[]>(async (sql) => {
    return (await sql`
      SELECT * FROM query_demand
        WHERE status = 'pending'
        ORDER BY upvotes DESC, hit_count DESC, first_seen ASC
        LIMIT ${limit}
    `) as DemandRow[];
  }, []);
}

/** Recently answered queries — the payoff feed on /wanted. */
export async function listAnswered(limit = 12): Promise<DemandRow[]> {
  return withDb<DemandRow[]>(async (sql) => {
    return (await sql`
      SELECT * FROM query_demand
        WHERE status = 'answered'
        ORDER BY answered_at DESC NULLS LAST
        LIMIT ${limit}
    `) as DemandRow[];
  }, []);
}

/**
 * Poison-query backoff (#162): a row that has failed this many times in a
 * row gets flipped to 'rejected' and stops cycling through cron picks.
 */
export const POISON_ATTEMPT_LIMIT = 5;

/**
 * Cool-down (#162): even before hitting the hard limit, don't re-attempt
 * a failing row within this many minutes — prevents a doom-loop where one
 * stuck query monopolizes every cron tick.
 */
export const RETRY_COOLDOWN_MINUTES = 30;

/**
 * The single highest-priority pending query with at least `minUpvotes`
 * votes — what the hourly cron runs. Returns null when nothing clears the
 * bar, so quiet hours don't spend.
 *
 * #162: skips rows that were attempted within RETRY_COOLDOWN_MINUTES
 * (recently failed → let them rest) and rows over POISON_ATTEMPT_LIMIT
 * (permanently failed → status='rejected' by markAttemptFailed).
 */
export async function topPending(minUpvotes = 1): Promise<DemandRow | null> {
  return withDb<DemandRow | null>(async (sql) => {
    const rows = (await sql`
      SELECT * FROM query_demand
        WHERE status = 'pending'
          AND upvotes >= ${minUpvotes}
          AND attempts < ${POISON_ATTEMPT_LIMIT}
          AND (
            last_attempt_at IS NULL
            OR last_attempt_at < now() - (${RETRY_COOLDOWN_MINUTES}::int * interval '1 minute')
          )
        ORDER BY upvotes DESC, hit_count DESC, first_seen ASC
        LIMIT 1
    `) as DemandRow[];
    return rows[0] ?? null;
  }, null);
}

/** Flip a demand row to answered and link the saved run. */
export async function markAnswered(
  query: string,
  runHash: string,
): Promise<void> {
  const hash = demandHash(query);
  await withDb(async (sql) => {
    await sql`
      UPDATE query_demand
        SET status = 'answered', run_hash = ${runHash}, answered_at = now()
        WHERE query_hash = ${hash}
    `;
    return null;
  });
}

/**
 * #162 — record a failed cron attempt on a demand row. Increments attempts,
 * stamps last_attempt_at, and flips status='rejected' once the row crosses
 * POISON_ATTEMPT_LIMIT so it stops getting picked up. Caller is the cron;
 * pure-DB side effect, no return value needed.
 */
export async function markAttemptFailed(query: string): Promise<void> {
  const hash = demandHash(query);
  await withDb(async (sql) => {
    await sql`
      UPDATE query_demand
        SET
          attempts = attempts + 1,
          last_attempt_at = now(),
          status = CASE
            WHEN attempts + 1 >= ${POISON_ATTEMPT_LIMIT} THEN 'rejected'
            ELSE status
          END
        WHERE query_hash = ${hash}
    `;
    return null;
  });
}
