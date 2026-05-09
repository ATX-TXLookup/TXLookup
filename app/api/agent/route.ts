// Streaming agent endpoint. SSE.
// POST { query: string } → stream of phase / step / result events.

import { NextRequest } from "next/server";

import { executeStep, reasonAndPlan, synthesize } from "@/app/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Event =
  | { phase: "reasoning"; message: string }
  | { phase: "planning"; plan: unknown }
  | { phase: "executing"; step: number; total: number; tool: string; args: unknown }
  | { phase: "step_done"; step: number; status: string; preview: string; error: string | null }
  | { phase: "completing"; message: string }
  | { phase: "done"; answer: string; citation: unknown; artifacts: string[] }
  | { phase: "error"; error: string };

function sse(ev: Event): string {
  return `data: ${JSON.stringify(ev)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { query?: string };
  const query = (body.query ?? "").trim();
  if (!query) {
    return new Response(JSON.stringify({ error: "missing query" }), {
      status: 400,
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: Event) =>
        controller.enqueue(new TextEncoder().encode(sse(ev)));
      try {
        send({ phase: "reasoning", message: query });

        const plan = await reasonAndPlan(query);
        send({ phase: "planning", plan });

        const results = [] as Awaited<ReturnType<typeof executeStep>>[];
        let citation: unknown = null;
        const artifacts: string[] = [];
        for (let i = 0; i < plan.steps.length; i++) {
          const step = plan.steps[i];
          send({
            phase: "executing",
            step: i + 1,
            total: plan.steps.length,
            tool: step.tool,
            args: step.args,
          });
          const r = await executeStep(step);
          results.push(r);
          if (step.tool === "cite_dataset" && r.status === "completed") {
            citation = r.result;
          }
          if (Array.isArray(r.artifacts)) artifacts.push(...r.artifacts);
          send({
            phase: "step_done",
            step: i + 1,
            status: r.status,
            preview: JSON.stringify(r.result).slice(0, 240),
            error: r.error,
          });
        }

        send({ phase: "completing", message: "Synthesizing answer..." });
        const answer = await synthesize(query, plan, results);

        send({ phase: "done", answer, citation, artifacts });
        controller.close();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        send({ phase: "error", error: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
