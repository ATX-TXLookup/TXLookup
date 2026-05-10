// /api/cache-stats — diagnostic endpoint for the local JSON mirror.
// Reports whether the cache is reachable on the deployed function,
// how many datasets it knows, and how old the oldest entry is.
//
// Useful for: judges inspecting the resilience layer; us debugging
// "is my deploy actually serving from the local mirror?"

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { cacheStats, cacheLookup } from "@/app/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "data", "cache"),
    "/var/task/data/cache",
  ];
  const dirChecks = await Promise.all(
    candidates.map(async (dir) => {
      try {
        const entries = await fs.readdir(dir);
        return { dir, exists: true, files: entries };
      } catch (e) {
        return { dir, exists: false, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
  const stats = await cacheStats();
  // Smoke an actual cache lookup so we can see source + row_count.
  const sample = await cacheLookup("3syk-w9eu", {
    select:
      "permit_number,permittype,permit_class_mapped,status_current,original_address1,original_zip,issue_date,total_existing_bldg_sqft",
    order: "issue_date DESC",
    limit: 5000,
  });
  return NextResponse.json({
    cwd,
    dirChecks,
    cacheStats: stats,
    sampleLookup: {
      datasetId: "3syk-w9eu",
      source: sample.source,
      age_seconds: sample.age_seconds,
      row_count: sample.rows.length,
    },
  });
}
