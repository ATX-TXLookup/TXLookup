// /api/chat — conversational endpoint backed by the support specialist.
//
// Single POST that takes a turn (the latest user message + prior history)
// and returns the support specialist's reply. Conversation state lives on
// the client (no server session) — the client posts the full history each
// turn, we pass it as `context.history` so the specialist can reference
// what came before.

import { NextResponse } from "next/server";
import { callSpecialist } from "@/app/lib/specialists";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Turn = { role: "user" | "assistant"; content: string };

type Body = {
  message: string;
  history?: Turn[];
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];

  const env = await callSpecialist("support", {
    query: message,
    context: { history },
  });

  // Normalize to a flat shape the client can render.
  const result = env.result as
    | { message?: string; datasets?: { id: string; title: string }[] }
    | null;
  return NextResponse.json({
    status: env.status,
    reply: result?.message ?? "(no reply)",
    next_actions: env.next_actions ?? [],
    datasets: result?.datasets ?? [],
  });
}
