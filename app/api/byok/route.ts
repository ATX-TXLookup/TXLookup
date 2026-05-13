// POST /api/byok { key } → verify key against OpenAI's /models, set
// HTTP-only cookie txl_byok=<key> on success.
// DELETE /api/byok → clear the cookie.

import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "txl_byok";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { key?: string };
  const key = (body.key ?? "").trim();
  if (!key || !key.startsWith("sk-")) {
    return Response.json({ error: "Invalid key format" }, { status: 400 });
  }

  // Verify against OpenAI — proves the key is live before we cookie it
  try {
    const r = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      return Response.json(
        { error: `OpenAI rejected the key (HTTP ${r.status}). Make sure it's active.` },
        { status: 400 },
      );
    }
  } catch (e) {
    return Response.json(
      { error: `Couldn't reach OpenAI: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }

  const jar = await cookies();
  jar.set(COOKIE_NAME, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  return Response.json({ ok: true });
}
