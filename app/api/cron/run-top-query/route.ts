// GET /api/cron/run-top-query — hourly: run the most-upvoted pending query.
//
// Wired to a Vercel cron (see vercel.json). Picks the top pending query
// with at least one upvote (so dead hours don't spend), runs it through
// the real agent via an internal /api/agent call, then flips the demand
// row to answered. One query per hour, on the owner's balance.

import { NextRequest } from "next/server";

import { topPending, markAnswered } from "@/app/lib/demand";
import { hashQuery } from "@/app/lib/run-archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // agent runs take ~30-60s

function baseUrl(req: NextRequest): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = req.headers.get("host");
  if (host) return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  return "http://localhost:3000";
}

export async function GET(req: NextRequest) {
  // Vercel cron sends `Authorization: Bearer ${CRON_SECRET}` when the env
  // var is set. Require it when configured; allow (with a warning) when not,
  // so the route is still testable in dev.
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[cron] CRON_SECRET not set — route is unprotected");
  }

  const top = await topPending(1);
  if (!top) {
    return Response.json({
      ran: false,
      reason: "no pending query with >=1 upvote",
    });
  }

  // Run it through the real agent loop (fresh run + saveRun) via an
  // internal call, so we reuse all of the planner/executor/critic logic.
  let errored = false;
  try {
    const res = await fetch(`${baseUrl(req)}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: top.query_text }),
    });
    // Consume the SSE stream to completion — the run is saveRun'd by the
    // time the stream closes. Watch for an error phase.
    const text = await res.text();
    if (!res.ok || /"phase":"error"/.test(text)) errored = true;
  } catch (e) {
    console.warn("[cron] agent run failed:", e instanceof Error ? e.message : String(e));
    errored = true;
  }

  if (errored) {
    // Leave the row pending — it'll be retried next hour.
    return Response.json({
      ran: false,
      reason: "agent run errored",
      query: top.query_text,
    });
  }

  const runHash = hashQuery(top.query_text);
  await markAnswered(top.query_text, runHash);

  return Response.json({
    ran: true,
    query: top.query_text,
    upvotes: top.upvotes,
    run_hash: runHash,
  });
}
