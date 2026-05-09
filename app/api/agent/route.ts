// Streaming agent endpoint. SSE.
// POST { query: string } → stream of phase / step / result events.
//
// Loop: Reason → Plan → Tool* → (Replan if any step failed, ≤2 attempts) → Complete.
// Adds a doom-loop guard around the executing-loop so a stuck agent gets a
// corrective system prompt + replan instead of endlessly repeating itself.

import { NextRequest } from "next/server";

import {
  executeStep,
  reasonAndPlan,
  replan,
  synthesize,
  Plan,
  ToolEnvelope,
  TokenUsage,
} from "@/app/lib/agent";
import { DoomLoopGuard, type DoomLoopHit } from "@/app/lib/doomLoop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REPLANS = 2;

type Event =
  | { phase: "reasoning"; message: string }
  | { phase: "planning"; plan: unknown; thinking?: string; usage?: TokenUsage }
  | {
      phase: "executing";
      step: number;
      total: number;
      tool: string;
      args: unknown;
      rationale?: string;
    }
  | {
      phase: "step_done";
      step: number;
      status: string;
      preview: string;
      error: string | null;
      duration_ms: number;
    }
  | {
      phase: "doom_loop";
      step: number;
      kind: DoomLoopHit["kind"];
      detail: string;
    }
  | {
      phase: "replanning";
      failedStep: number;
      failedTool: string;
      error: string | null;
      reason?: "step_failed" | "doom_loop";
    }
  | {
      phase: "replanned";
      plan: unknown;
      diagnosis?: string;
      thinking?: string;
      usage?: TokenUsage;
    }
  | { phase: "completing"; message: string }
  | {
      phase: "done";
      answer: string;
      citation: unknown;
      artifacts: string[];
      usage_total: TokenUsage;
      duration_ms: number;
    }
  | { phase: "error"; error: string };

function sse(ev: Event): string {
  return `data: ${JSON.stringify(ev)}\n\n`;
}

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    prompt: a.prompt + b.prompt,
    completion: a.completion + b.completion,
    total: a.total + b.total,
  };
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

      const startedAt = Date.now();
      const guard = new DoomLoopGuard();
      let usageTotal: TokenUsage = { prompt: 0, completion: 0, total: 0 };

      try {
        send({ phase: "reasoning", message: query });

        const planned = await reasonAndPlan(query);
        let currentPlan: Plan = planned.plan;
        usageTotal = addUsage(usageTotal, planned.usage);
        send({
          phase: "planning",
          plan: currentPlan,
          thinking: (currentPlan.intent as { thinking?: string })?.thinking,
          usage: planned.usage,
        });

        const results: ToolEnvelope[] = [];
        let citation: unknown = null;
        const artifacts: string[] = [];
        let replanCount = 0;
        let i = 0;

        while (i < currentPlan.steps.length) {
          const step = currentPlan.steps[i];

          // Doom-loop check BEFORE executing — if the planner just emitted
          // a step we've already run twice, short-circuit into a replan.
          const hit = guard.observe(step.tool, step.args);
          if (hit && replanCount < MAX_REPLANS) {
            replanCount += 1;
            send({
              phase: "doom_loop",
              step: i + 1,
              kind: hit.kind,
              detail: hit.detail,
            });
            send({
              phase: "replanning",
              failedStep: i + 1,
              failedTool: step.tool,
              error: hit.detail,
              reason: "doom_loop",
            });
            try {
              // Build a synthetic failure envelope so replan() has context.
              const syntheticFailure: ToolEnvelope = {
                status: "failed",
                result: null,
                error: `doom-loop: ${hit.detail}`,
              };
              const re = await replan(
                query,
                currentPlan,
                i,
                syntheticFailure,
                undefined,
                hit.message,
              );
              usageTotal = addUsage(usageTotal, re.usage);
              send({
                phase: "replanned",
                plan: re.plan,
                diagnosis: re.plan.diagnosis,
                thinking: (re.plan.intent as { thinking?: string })?.thinking,
                usage: re.usage,
              });
              currentPlan = {
                ...re.plan,
                steps: [...currentPlan.steps.slice(0, i), ...re.plan.steps],
              };
              guard.reset();
              continue;
            } catch (e) {
              send({
                phase: "step_done",
                step: i + 1,
                status: "failed",
                preview: "",
                error: `doom-loop replan failed: ${e instanceof Error ? e.message : String(e)}`,
                duration_ms: 0,
              });
              i += 1;
              continue;
            }
          }

          send({
            phase: "executing",
            step: i + 1,
            total: currentPlan.steps.length,
            tool: step.tool,
            args: step.args,
            rationale: step.rationale,
          });

          const stepStart = Date.now();
          const r = await executeStep(step);
          const duration_ms = Date.now() - stepStart;
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
            duration_ms,
          });

          // Replan on a failure if we have budget left.
          if (r.status === "failed" && replanCount < MAX_REPLANS) {
            replanCount += 1;
            send({
              phase: "replanning",
              failedStep: i + 1,
              failedTool: step.tool,
              error: r.error,
              reason: "step_failed",
            });
            try {
              const re = await replan(query, currentPlan, i, r);
              usageTotal = addUsage(usageTotal, re.usage);
              send({
                phase: "replanned",
                plan: re.plan,
                diagnosis: re.plan.diagnosis,
                thinking: (re.plan.intent as { thinking?: string })?.thinking,
                usage: re.usage,
              });
              currentPlan = {
                ...re.plan,
                steps: [...currentPlan.steps.slice(0, i), ...re.plan.steps],
              };
              guard.reset();
              continue;
            } catch (e) {
              send({
                phase: "step_done",
                step: i + 1,
                status: "failed",
                preview: "",
                error: `replan failed: ${e instanceof Error ? e.message : String(e)}`,
                duration_ms: 0,
              });
            }
          }

          i += 1;
        }

        send({ phase: "completing", message: "Synthesizing answer..." });
        const synth = await synthesize(query, currentPlan, results);
        usageTotal = addUsage(usageTotal, synth.usage);

        send({
          phase: "done",
          answer: synth.answer,
          citation,
          artifacts,
          usage_total: usageTotal,
          duration_ms: Date.now() - startedAt,
        });
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
