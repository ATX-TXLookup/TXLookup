// Admin API for the run archive.
//   GET  /api/admin/runs           — list newest 50 runs
//   GET  /api/admin/runs?hash=xxx  — fetch one
//   POST /api/admin/runs { hash, status: "good" | "bad" | "pending" }
//
// Auth: relies on the basic-auth gate in middleware.ts. /api/admin/* IS
// included in the matcher; /api/agent stays bypassed.

import { NextRequest } from "next/server";

import { getRun, listRuns, markRun } from "@/app/lib/run-archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const hash = url.searchParams.get("hash");
  if (hash) {
    const r = await getRun(hash);
    if (!r) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    return Response.json(r);
  }
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const runs = await listRuns(limit);
  return Response.json({ runs });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    hash?: string;
    status?: "good" | "bad" | "pending";
  };
  if (!body.hash || !body.status) {
    return new Response(JSON.stringify({ error: "missing hash or status" }), { status: 400 });
  }
  if (!["good", "bad", "pending"].includes(body.status)) {
    return new Response(JSON.stringify({ error: "invalid status" }), { status: 400 });
  }
  const r = await markRun(body.hash, body.status);
  if (!r) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  return Response.json(r);
}
