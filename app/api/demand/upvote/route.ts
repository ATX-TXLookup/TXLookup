// POST /api/demand/upvote { query } — cast one upvote for a pending query.
//
// Dedup is two-layer: the client remembers votes in localStorage (instant
// UX), and the server enforces one-vote-per-(query, IP-hash) via a unique
// constraint in query_votes. Raw IPs are never stored — only a salted hash.

import { NextRequest } from "next/server";

import { upvote, voterFingerprint } from "@/app/lib/demand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { query?: string };
  const query = (body.query ?? "").trim();
  if (query.length < 3 || query.length > 1000) {
    return Response.json({ error: "invalid query" }, { status: 400 });
  }

  const fingerprint = voterFingerprint(clientIp(req));
  const newCount = await upvote(query, fingerprint);

  if (newCount === null) {
    // Either already voted from this IP, or no database configured.
    return Response.json(
      { ok: false, reason: "already_voted_or_no_db" },
      { status: 200 },
    );
  }
  return Response.json({ ok: true, upvotes: newCount });
}
