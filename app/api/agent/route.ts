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
import { findFixture } from "@/app/lib/demo-fixtures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Hobby tier defaults to 10s function timeout — extend to the Hobby max
// (60s) so long agent runs with replans don't get killed mid-stream.
// On Pro this can be raised to 300s if/when we upgrade.
export const maxDuration = 60;

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

// Demo-mode fixture replayer. When ?demo=1 (or { demo: true }) and the query
// matches a fixture in app/lib/demo-fixtures.ts, /api/agent serves a recorded
// SSE flow (with realistic step timings) instead of calling Codex + Socrata.
// Insurance against API blips during the 3-min stage demo.
function replayFixture(
  query: string,
  fx: NonNullable<ReturnType<typeof findFixture>>,
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

      send({ phase: "reasoning", message: query });
      await wait(400);

      send({
        phase: "planning",
        plan: { intent: fx.intent, steps: fx.steps },
        thinking: fx.intent.thinking,
      });
      await wait(500);

      const totalSteps = fx.steps.length;
      let didReplan = false;
      for (let i = 0; i < fx.steps.length; i++) {
        const s = fx.steps[i];
        send({
          phase: "executing",
          step: i + 1,
          total: totalSteps,
          tool: s.tool,
          args: s.args,
          rationale: s.rationale,
        });
        await wait(s.delay_ms ?? 600);
        send({
          phase: "step_done",
          step: i + 1,
          status: s.status,
          preview: s.resultPreview.slice(0, 240),
          error: s.error ?? null,
          duration_ms: s.delay_ms ?? 600,
        });

        // Inject a replan after the configured failAt step
        if (
          fx.failAt !== undefined &&
          !didReplan &&
          i + 1 === fx.failAt &&
          s.status === "failed"
        ) {
          didReplan = true;
          await wait(400);
          send({
            phase: "replanning",
            failedStep: i + 1,
            failedTool: s.tool,
            error: fx.failError ?? s.error ?? null,
            reason: "step_failed",
          });
          await wait(800);
          send({
            phase: "replanned",
            plan: {
              intent: fx.intent,
              steps: fx.steps.slice(i + 1),
              diagnosis: fx.diagnosis,
            },
            diagnosis: fx.diagnosis,
            thinking: fx.intent.thinking,
          });
          await wait(300);
        }
      }

      send({ phase: "completing", message: "Synthesizing answer..." });
      await wait(500);
      send({
        phase: "done",
        answer: fx.answer,
        citation: fx.citation,
        artifacts: fx.artifacts,
        usage_total: { prompt: 0, completion: 0, total: 0 },
        duration_ms: 0,
      });
      controller.close();
    },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    query?: string;
    demo?: boolean;
  };
  const query = (body.query ?? "").trim();
  if (!query) {
    return new Response(JSON.stringify({ error: "missing query" }), {
      status: 400,
    });
  }

  // Demo mode — replay a pre-recorded SSE flow if the query matches a fixture.
  // Toggled by ?demo=1 on the page or { demo: true } in the body.
  const url = new URL(req.url);
  const demoMode =
    body.demo === true ||
    url.searchParams.get("demo") === "1" ||
    req.headers.get("x-txlookup-demo") === "1";
  const fixture = demoMode ? findFixture(query) : null;
  if (fixture) {
    return new Response(replayFixture(query, fixture), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Accel-Buffering": "no",
        "X-TXLookup-Mode": "demo",
        Connection: "keep-alive",
      },
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
                results.slice(0, i),
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
              const re = await replan(query, currentPlan, i, r, results.slice(0, i));
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
              // Drop the failed step's result; results[0..i-1] now align
              // 1:1 with the rebuilt currentPlan.steps[0..i-1]. Without
              // this, results[i] still points at the OLD failed-step
              // envelope and any code reading results-by-index (the
              // replanner's "prior steps" block, the synthesizer) sees
              // the wrong row.
              results.length = i;
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
