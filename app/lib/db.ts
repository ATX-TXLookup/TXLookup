// db.ts — thin Neon Postgres layer for the demand / upvote queue.
//
// Provider-swappable on purpose: everything goes through `sql` here, so
// moving off Neon is a connection-string change, not a rewrite. Degrades
// gracefully — if DATABASE_URL is unset (local dev without a DB, or a
// deploy that hasn't been provisioned yet), every helper is a safe no-op
// and the rest of the site is unaffected. Mirrors the getKv() pattern in
// run-archive.ts.
//
// Schema is created lazily on first use (CREATE TABLE IF NOT EXISTS), so
// there's no separate migration step — provision Neon, set DATABASE_URL,
// done.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null | undefined;
let _schemaReady = false;

function getSql(): NeonQueryFunction<false, false> | null {
  if (_sql !== undefined) return _sql;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return (_sql = null);
  try {
    return (_sql = neon(url));
  } catch (e) {
    console.warn("[db] neon() failed:", e instanceof Error ? e.message : String(e));
    return (_sql = null);
  }
}

/** True when a database is configured. UI can use this to show setup hints. */
export function dbConfigured(): boolean {
  return getSql() !== null;
}

async function ensureSchema(sql: NeonQueryFunction<false, false>): Promise<void> {
  if (_schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS query_demand (
      query_hash   TEXT PRIMARY KEY,
      query_text   TEXT NOT NULL,
      first_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
      hit_count    INTEGER NOT NULL DEFAULT 1,
      upvotes      INTEGER NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'pending',
      run_hash     TEXT,
      answered_at  TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS query_votes (
      query_hash         TEXT NOT NULL,
      voter_fingerprint  TEXT NOT NULL,
      voted_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (query_hash, voter_fingerprint)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS query_demand_pending_idx
      ON query_demand (status, upvotes DESC, hit_count DESC)
  `;
  _schemaReady = true;
}

/**
 * Run a callback with a ready `sql` handle. Returns `fallback` (default
 * null) when no database is configured — callers stay simple and the site
 * never crashes for want of a DB.
 */
export async function withDb<T>(
  fn: (sql: NeonQueryFunction<false, false>) => Promise<T>,
  fallback: T = null as T,
): Promise<T> {
  const sql = getSql();
  if (!sql) return fallback;
  try {
    await ensureSchema(sql);
    return await fn(sql);
  } catch (e) {
    console.warn("[db] query failed:", e instanceof Error ? e.message : String(e));
    return fallback;
  }
}
