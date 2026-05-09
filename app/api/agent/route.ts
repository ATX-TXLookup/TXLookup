// Streaming agent endpoint. SSE.
// POST { query: string } → stream of phase / step / result events.
//
// Loop: Reason → Plan → Tool* → (Replan if any step failed, ≤2 attempts) → Complete.

import { NextRequest } from "next/server";

import { executeStep, reasonAndPlan, replan, synthesize, Plan, ToolEnvelope } from "@/app/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REPLANS = 2;

type Event =
  | { phase: "reasoning"; message: string }
  | { phase: "planning"; plan: unknown; thinking?: string }
  | { phase: "executing"; step: number; total: number; tool: string; args: unknown; rationale?: string }
  | { phase: "step_done"; step: number; status: string; preview: string; error: string | null }
  | { phase: "replanning"; failedStep: number; failedTool: string; error: string | null }
  | { phase: "replanned"; plan: unknown; diagnosis?: string; thinking?: string }
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

        let currentPlan: Plan = await reasonAndPlan(query);
        send({
          phase: "planning",
          plan: currentPlan,
          thinking: (currentPlan.intent as { thinking?: string })?.thinking,
        });

        const results: ToolEnvelope[] = [];
        let citation: unknown = null;
        const artifacts: string[] = [];
        let replanCount = 0;
        let i = 0;

        while (i < currentPlan.steps.length) {
          const step = currentPlan.steps[i];
          send({
            phase: "executing",
            step: i + 1,
            total: currentPlan.steps.length,
            tool: step.tool,
            args: step.args,
            rationale: step.rationale,
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

          // Replan on a failure if we have budget left.
          if (r.status === "failed" && replanCount < MAX_REPLANS) {
            replanCount += 1;
            send({
              phase: "replanning",
              failedStep: i + 1,
              failedTool: step.tool,
              error: r.error,
            });
            try {
              const newPlan = await replan(query, currentPlan, i, r);
              send({
                phase: "replanned",
                plan: newPlan,
                diagnosis: newPlan.diagnosis,
                thinking: (newPlan.intent as { thinking?: string })?.thinking,
              });
              // Replace remaining steps from the failed one onward with the new plan's steps.
              currentPlan = {
                ...newPlan,
                steps: [...currentPlan.steps.slice(0, i), ...newPlan.steps],
              };
              // Re-run starting at the failed-step index.
              continue;
            } catch (e) {
              // Replan itself failed — give up gracefully and continue.
              send({
                phase: "step_done",
                step: i + 1,
                status: "failed",
                preview: "",
                error: `replan failed: ${e instanceof Error ? e.message : String(e)}`,
              });
            }
          }

          i += 1;
        }

        send({ phase: "completing", message: "Synthesizing answer..." });
        const answer = await synthesize(query, currentPlan, results);

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
