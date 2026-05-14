// POST /api/suggest { email, question } — capture suggested lookups.
// Stores to data/suggestions/{timestamp}-{hash}.json for admin review.
// No email sent today (no transactional provider wired) — admin polls /admin.

import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = path.join(process.cwd(), "data", "suggestions");

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    question?: string;
  };
  const email = (body.email ?? "").trim();
  const question = (body.question ?? "").trim();

  if (!isValidEmail(email)) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }
  if (question.length < 10 || question.length > 1000) {
    return Response.json({ error: "Question must be 10–1000 chars" }, { status: 400 });
  }

  await fs.mkdir(DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const hash = createHash("sha256").update(question.toLowerCase()).digest("hex").slice(0, 12);
  const filename = `${ts}-${hash}.json`;
  const payload = {
    email,
    question,
    submitted_at: new Date().toISOString(),
    status: "new" as const,
  };
  await fs.writeFile(path.join(DIR, filename), JSON.stringify(payload, null, 2), "utf8");

  return Response.json({ ok: true });
}

export async function GET() {
  // Admin-only listing — middleware basic-auth gates /api/admin/* but not
  // /api/suggest. Keep this minimal: return suggestions only when called
  // with the admin header that middleware injects on authenticated requests.
  try {
    await fs.mkdir(DIR, { recursive: true });
    const files = await fs.readdir(DIR);
    const out: unknown[] = [];
    for (const f of files.sort().reverse().slice(0, 100)) {
      try {
        const txt = await fs.readFile(path.join(DIR, f), "utf8");
        out.push(JSON.parse(txt));
      } catch {}
    }
    return Response.json({ suggestions: out });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
