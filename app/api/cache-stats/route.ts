// /api/cache-stats — diagnostic endpoint for the SQLite mirror.
// Reports whether the cache is reachable on the deployed function,
// how many datasets it knows, and how old the oldest entry is.
//
// Useful for: judges inspecting the resilience layer; us debugging
// "why is every tile showing Live?" on Vercel.

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { cacheStats } from "@/app/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "data", "cache.db"),
    path.join(cwd, "data/cache.db"),
    "/var/task/data/cache.db",
  ];
  const fileChecks = await Promise.all(
    candidates.map(async (p) => {
      try {
        const s = await fs.stat(p);
        return { path: p, exists: true, size: s.size };
      } catch {
        return { path: p, exists: false, size: 0 };
      }
    }),
  );
  const stats = await cacheStats();
  return NextResponse.json({
    cwd,
    fileChecks,
    cacheStats: stats,
    betterSqlite3: betterSqlite3Check(),
  });
}

function betterSqlite3Check(): { available: boolean; error?: string; meta?: unknown } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3") as new (
      path: string,
      opts?: { readonly?: boolean; fileMustExist?: boolean },
    ) => {
      prepare: (sql: string) => { all: () => unknown[] };
      close: () => void;
    };
    // Try to actually open the cache file.
    for (const p of [
      path.join(process.cwd(), "data", "cache.db"),
      "/var/task/data/cache.db",
    ]) {
      try {
        const db = new Database(p, { readonly: true, fileMustExist: true });
        const meta = db.prepare("SELECT dataset_id, row_count FROM cache_meta").all();
        db.close();
        return { available: true, meta };
      } catch (e) {
        // try next
        const err = e instanceof Error ? e.message : String(e);
        if (!err.includes("does not exist")) {
          return { available: false, error: `${p}: ${err}` };
        }
      }
    }
    return { available: false, error: "no candidate path opened" };
  } catch (e) {
    return { available: false, error: e instanceof Error ? e.message : String(e) };
  }
}
