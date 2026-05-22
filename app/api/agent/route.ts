// Streaming agent endpoint. SSE.
// POST { query: string } → stream of phase / step / result events.
//
// Loop: Reason → Plan → Tool* → (Replan if any step failed, ≤2 attempts) → Complete.
// Adds a doom-loop guard around the executing-loop so a stuck agent gets a
// corrective system prompt + replan instead of endlessly repeating itself.

import { NextRequest } from "next/server";

import {
  criticize,
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
import { findRun, saveRun, type SavedRun } from "@/app/lib/run-archive";
import { runWithKey } from "@/app/lib/agent";
import { findById } from "@/app/lib/catalog";
import { callSpecialist } from "@/app/lib/specialists";

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
      // Multi-agent attribution (issue #67). "orchestrator" for raw tool
      // calls; specialist name for delegate_to results. UI Flow tab will
      // color-code by this in a follow-up PR.
      agent?: string;
      // Issue #90 — origin of the data (cache hit / live fetch / fallback).
      // Only set on Socrata-touching tool steps.
      tool_source?: "cache" | "live" | "cache-fallback" | "unknown";
      // Full structured result envelope, ONLY emitted for delegate_to steps
      // where the UI needs to render the specialist payload (chips,
      // findings, composed report). The 240-char `preview` field above is
      // kept byte-identical for backwards compat — `result_json` is purely
      // additive and consumers that don't know about it ignore it.
      result_json?: unknown;
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
  | {
      // Issue #90 — critic verdict on the plan or the answer.
      phase: "critique";
      target: "plan" | "answer";
      score: number;
      approve: boolean;
      issues: string[];
    }
  | {
      // Issue #90 — orchestrator is re-running a phase the critic rejected.
      phase: "revising";
      target: "plan" | "answer";
      reason: string;
    }
  | {
      // Issue #90 — fan-out to N parallel branches (delegate_to_parallel).
      phase: "parallel_dispatch";
      step: number;
      branches: Array<{ id: string; tool: string; args: unknown }>;
    }
  | {
      // Issue #90 — all branches in a parallel_dispatch have settled.
      phase: "parallel_join";
      step: number;
      branch_ids: string[];
      results_count: number;
    }
  | {
      // Issue #90 — specialist handoff (delegate_to). Surfaces the agent name
      // and the input summary for the DAG before the actual work runs.
      phase: "delegate_start";
      step: number;
      agent: string;
      input_summary: string;
    }
  | {
      phase: "delegate_done";
      step: number;
      agent: string;
      status: "completed" | "failed" | "needs_input";
      output_summary: string;
    }
  | {
      // Issue #90 + #97 — Socrata fetched live, served from cache, or fell
      // back to live after a cache miss.
      phase: "tool_source";
      step: number;
      source: "cache" | "live" | "cache-fallback" | "unknown";
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

// Replay a previously-saved run (from /api/admin or fallback path) at
// realistic-ish timing so the SSE consumer animates correctly.
//
// Historical save shape quirk: saveRun is called BEFORE the final `done`
// event is captured (so /admin sees the record the moment the done event
// fires for the consumer). That means run.events typically ends at
// `revising` / `completing` / `step_done`, NOT at `done`. AgentRunner stays
// stuck on "Composing" forever if we don't synthesize the missing terminal.
//
// Fix: after streaming captured events, if no `done` event landed, emit a
// synthetic one built from the run record (answer + citation + duration +
// tokenTotal). This makes cached and live flows finish identically.
function replaySavedRun(run: SavedRun): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const events = Array.isArray(run.events) ? run.events : [];
      let sawDone = false;
      for (const ev of events) {
        send(ev);
        const phase = (ev as { phase?: string }).phase;
        if (phase === "done") sawDone = true;
        // Tighter pacing than fixture replay — these are real events the user
        // already paid the latency for.
        await wait(phase === "executing" ? 250 : phase === "step_done" ? 200 : 120);
      }
      if (!sawDone && run.answer) {
        await wait(200);
        // Recover artifacts from the saved events. The run is saved BEFORE the
        // real `done` event fires, so the top-level run has no artifacts and
        // no done event — but tool outputs (e.g. the render_to_miro board
        // link) live inside step_done `preview`/`artifacts` fields. Scan for
        // any artifact-like URLs so the synthetic done carries them; without
        // this the Miro embed (gated on a miro.com artifact) never renders on
        // a cached replay.
        const recovered: string[] = [];
        const urlRe = /https?:\/\/[^\s"'\\]+/g;
        for (const ev of events) {
          const evRec = ev as Record<string, unknown>;
          if (Array.isArray(evRec.artifacts)) {
            for (const a of evRec.artifacts) {
              if (typeof a === "string") recovered.push(a);
            }
          }
          const preview = evRec.preview;
          if (typeof preview === "string") {
            const matches = preview.match(urlRe);
            if (matches) recovered.push(...matches);
          }
        }
        const artifacts = [...new Set(recovered)];
        send({
          phase: "done",
          answer: run.answer,
          citation: run.citation ?? null,
          artifacts,
          usage_total: { prompt: 0, completion: 0, total: run.tokenTotal ?? 0 },
          duration_ms: run.durationMs ?? 0,
        });
      }
      controller.close();
    },
  });
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
      const captured: unknown[] = [];
      const send = (obj: unknown) => {
        captured.push(obj);
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

      send({ phase: "reasoning", message: query });
      await wait(400);

      send({
        phase: "planning",
        plan: { intent: fx.intent, steps: fx.steps },
        thinking: fx.intent.thinking,
      });
      await wait(500);

      // Issue #90 — inject critic-on-plan event if the fixture defines one.
      const planCritique = fx.critiques?.find((c) => c.after === "plan");
      if (planCritique) {
        send({
          phase: "critique",
          target: "plan",
          score: planCritique.score,
          approve: planCritique.approve,
          issues: planCritique.issues,
        });
        await wait(300);
        if (!planCritique.approve && planCritique.revise) {
          send({
            phase: "revising",
            target: "plan",
            reason: planCritique.issues.join("; "),
          });
          await wait(400);
          // Replay the planning event so the DAG sees the corrected plan.
          send({
            phase: "planning",
            plan: { intent: fx.intent, steps: fx.steps },
            thinking: fx.intent.thinking,
          });
          await wait(300);
        }
      }

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

        // Issue #90 — surface delegate / parallel-fork BEFORE the work runs.
        if (s.tool === "delegate_to") {
          send({
            phase: "delegate_start",
            step: i + 1,
            agent: s.agent ?? "unknown",
            input_summary: JSON.stringify(s.args).slice(0, 180),
          });
        } else if (s.tool === "delegate_to_parallel" && s.parallel_branches) {
          send({
            phase: "parallel_dispatch",
            step: i + 1,
            branches: s.parallel_branches,
          });
        }

        await wait(s.delay_ms ?? 600);

        // Tool source pill, if defined.
        if (s.tool_source) {
          send({ phase: "tool_source", step: i + 1, source: s.tool_source });
        }

        // Parallel join + delegate done events, before step_done.
        if (s.tool === "delegate_to_parallel" && s.parallel_branches) {
          send({
            phase: "parallel_join",
            step: i + 1,
            branch_ids: s.parallel_branches.map((b) => b.id),
            results_count: s.parallel_branches.length,
          });
        } else if (s.tool === "delegate_to") {
          send({
            phase: "delegate_done",
            step: i + 1,
            agent: s.agent ?? "unknown",
            status: s.status,
            output_summary: s.resultPreview.slice(0, 180),
          });
        }

        send({
          phase: "step_done",
          step: i + 1,
          status: s.status,
          preview: s.resultPreview.slice(0, 240),
          error: s.error ?? null,
          duration_ms: s.delay_ms ?? 600,
          ...(s.agent ? { agent: s.agent } : {}),
          ...(s.tool_source ? { tool_source: s.tool_source } : {}),
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
      // Issue #90 — answer critic, if the fixture defines one.
      const answerCritique = fx.critiques?.find((c) => c.after === "answer");
      if (answerCritique) {
        send({
          phase: "critique",
          target: "answer",
          score: answerCritique.score,
          approve: answerCritique.approve,
          issues: answerCritique.issues,
        });
        await wait(300);
        if (!answerCritique.approve && answerCritique.revise) {
          send({
            phase: "revising",
            target: "answer",
            reason: answerCritique.issues.join("; "),
          });
          await wait(300);
        }
      }
      send({
        phase: "done",
        answer: fx.answer,
        citation: fx.citation,
        artifacts: fx.artifacts,
        usage_total: { prompt: 0, completion: 0, total: 0 },
        duration_ms: 0,
      });
      // Persist the fixture run to the archive so /admin can list/replay it.
      // Fire-and-forget; never breaks the stream.
      try {
        await saveRun(query, { intent: fx.intent, steps: fx.steps }, captured, fx.answer, fx.citation, 0, 0);
      } catch (e) {
        console.warn("[agent] saveRun (demo) failed:", e);
      }
      controller.close();
    },
  });
}

async function handlePost(req: NextRequest): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    query?: string;
    demo?: boolean;
    fallback?: boolean;
    dataset?: string;
  };
  const query = (body.query ?? "").trim();
  const datasetId = (body.dataset ?? "").trim();
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

  // Fallback mode — replay the last successful saved run for this query.
  // Used when we know the live agent is down (rate limit, OpenAI outage) and
  // need to keep the demo flowing. Toggled by ?fallback=1 or { fallback: true }.
  const fallbackMode =
    body.fallback === true || url.searchParams.get("fallback") === "1";
  if (fallbackMode) {
    const saved = await findRun(query);
    if (saved) {
      return new Response(replaySavedRun(saved), {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "X-Accel-Buffering": "no",
          "X-TXLookup-Mode": "fallback",
          Connection: "keep-alive",
        },
      });
    }
    // No saved run for this query — fall through to a live run (which will
    // also persist itself so the next fallback attempt succeeds).
  }

  const stream = new ReadableStream({
    async start(controller) {
      const captured: Event[] = [];
      const send = (ev: Event) => {
        captured.push(ev);
        controller.enqueue(new TextEncoder().encode(sse(ev)));
      };

      const startedAt = Date.now();
      const guard = new DoomLoopGuard();
      let usageTotal: TokenUsage = { prompt: 0, completion: 0, total: 0 };
      let finalPlan: Plan | null = null;

      try {
        send({ phase: "reasoning", message: query });

        // If the UI pre-selected a dataset (user asked from /datasets/[id]),
        // tell the planner to anchor on it. This OVERRIDES the SCOPING RULES
        // "must start with discover_datasets" requirement for these requests
        // only — the discovery step has already been done by the UI, and
        // re-running it wastes a tool call (and one Codex turn) that the
        // user explicitly skipped by clicking into a specific dataset.
        const scoped = datasetId ? findById(datasetId) : null;
        const scopeNote = scoped
          ? `OVERRIDE THE PRECEDING SCOPING RULES: the UI has already pre-selected ` +
            `dataset "${scoped.title}" (id: ${scoped.id}, portal: ${scoped.portal}, ` +
            `key columns: ${scoped.keyColumns.join(", ")}). The discovery step is DONE — ` +
            `do not call discover_datasets. Start the plan with ` +
            `get_dataset_schema({datasetId:"${scoped.id}"}), then summarize_data or ` +
            `fetch_data on the same datasetId with whatever where-clause the user's ` +
            `wording requires (zip/date filters from the SCOPING RULES still apply), ` +
            `then cite_dataset({datasetId:"${scoped.id}"}). Every step's args.datasetId ` +
            `MUST be exactly "${scoped.id}".`
          : undefined;

        const planned = await reasonAndPlan(query, undefined, scopeNote);
        let currentPlan: Plan = planned.plan;
        usageTotal = addUsage(usageTotal, planned.usage);
        send({
          phase: "planning",
          plan: currentPlan,
          thinking: (currentPlan.intent as { thinking?: string })?.thinking,
          usage: planned.usage,
        });

        // Issue #90 — critic on the plan. If the critic rejects, re-run the
        // planner ONCE with a corrective system prompt sourced from the
        // critic's issues list, then continue regardless of the second verdict
        // (bounded retries — critic is advisory, not blocking).
        try {
          const planCritique = await criticize(
            "plan",
            currentPlan,
            query,
          );
          usageTotal = addUsage(usageTotal, planCritique.usage);
          send({
            phase: "critique",
            target: "plan",
            score: planCritique.critique.score,
            approve: planCritique.critique.approve,
            issues: planCritique.critique.issues,
          });
          if (!planCritique.critique.approve) {
            send({
              phase: "revising",
              target: "plan",
              reason: planCritique.critique.issues.join("; ") || "low score",
            });
            const corrective = `The critic flagged your previous plan. Address these issues and re-emit:\n${planCritique.critique.issues.map((s) => `- ${s}`).join("\n")}`;
            const revised = await reasonAndPlan(query, undefined, corrective);
            usageTotal = addUsage(usageTotal, revised.usage);
            currentPlan = revised.plan;
            send({
              phase: "planning",
              plan: currentPlan,
              thinking: (currentPlan.intent as { thinking?: string })?.thinking,
              usage: revised.usage,
            });
          }
        } catch (e) {
          // Critic failure is never fatal.
          console.warn("[agent] plan critique failed:", e);
        }

        const results: ToolEnvelope[] = [];
        const stepTrace: Array<{
          tool: string;
          status: "completed" | "failed";
          duration_ms?: number;
        }> = [];
        let citation: unknown = null;
        const artifacts: string[] = [];
        let replanCount = 0;
        let i = 0;
        // Track whether any "data step" — the kind that can produce groundable
        // material for the synthesizer — ever returned successfully. Schema
        // lookups and discovery don't count. If this stays false through the
        // whole loop AND we exhausted replans, the synthesizer would
        // hallucinate from catalog blurbs; delegate to support's
        // failure-explanation mode instead.
        const DATA_TOOLS = new Set(["summarize_data", "fetch_data", "delegate_to"]);
        let anyDataStepSucceeded = false;

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
                agent: "orchestrator",
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

          // Issue #90 — surface delegate / parallel dispatch as DAG-friendly
          // events BEFORE the work runs, so the visualization can light up
          // the right nodes immediately rather than waiting for completion.
          if (step.tool === "delegate_to") {
            const sa = step.args as {
              specialist?: string;
              input?: Record<string, unknown>;
            };
            send({
              phase: "delegate_start",
              step: i + 1,
              agent: sa.specialist ?? "unknown",
              input_summary: JSON.stringify(sa.input ?? {}).slice(0, 180),
            });
          } else if (step.tool === "delegate_to_parallel") {
            const sa = step.args as {
              branches?: Array<{
                specialist?: string;
                input?: Record<string, unknown>;
              }>;
            };
            const branches = (sa.branches ?? []).map((b, bi) => ({
              id: `s${i + 1}.b${bi + 1}`,
              tool: `delegate_to(${b.specialist ?? "unknown"})`,
              args: b.input ?? {},
            }));
            send({
              phase: "parallel_dispatch",
              step: i + 1,
              branches,
            });
          }

          const stepStart = Date.now();
          // Pull the most recent successful data step's rows so render_to_miro
          // can fall back when the planner forgets the `records` arg.
          const lastDataRecords = (() => {
            for (let j = results.length - 1; j >= 0; j--) {
              const env = results[j];
              if (env.status !== "completed") continue;
              const res = env.result as
                | { rows?: Array<Record<string, unknown>>; records?: Array<Record<string, unknown>> }
                | null;
              if (Array.isArray(res?.rows) && res!.rows!.length > 0) return res!.rows;
              if (Array.isArray(res?.records) && res!.records!.length > 0) return res!.records;
            }
            return undefined;
          })();
          const r = await executeStep(step, {
            priorSteps: stepTrace,
            lastDataRecords,
            query,
          });
          const duration_ms = Date.now() - stepStart;
          stepTrace.push({ tool: step.tool, status: r.status, duration_ms });

          // Issue #90 + #97 — Socrata wrapper flags the source on the result
          // envelope (`_source: "cache" | "live" | "cache-fallback" | "unknown"`). The
          // cache layer landed in #97; every Socrata tool must declare its
          // source. If a Socrata tool result is missing `_source`, that's a
          // tool-side bug — surface it as `unknown` so the DAG renders an
          // explicit "?" pill instead of silently masking the omission.
          const SOCRATA_TOOLS = new Set([
            "summarize_data",
            "fetch_data",
            "get_dataset_schema",
          ]);
          if (SOCRATA_TOOLS.has(step.tool)) {
            const declared =
              r.result &&
              typeof r.result === "object" &&
              "_source" in (r.result as Record<string, unknown>)
                ? String((r.result as { _source: unknown })._source)
                : null;
            const source: "cache" | "live" | "cache-fallback" | "unknown" | "unknown" =
              declared === "cache" ||
              declared === "live" ||
              declared === "cache-fallback"
                ? (declared as "cache" | "live" | "cache-fallback")
                : "unknown";
            if (source === "unknown") {
              console.warn(
                `[agent] Socrata tool '${step.tool}' returned result without _source — should declare cache | live | cache-fallback`,
              );
            }
            send({ phase: "tool_source", step: i + 1, source });
          }

          if (step.tool === "delegate_to") {
            send({
              phase: "delegate_done",
              step: i + 1,
              agent:
                typeof r.result === "object" &&
                r.result !== null &&
                "agent" in (r.result as Record<string, unknown>)
                  ? String((r.result as { agent: unknown }).agent)
                  : "unknown",
              status: r.status as "completed" | "failed" | "needs_input",
              output_summary: JSON.stringify(r.result).slice(0, 180),
            });
          } else if (step.tool === "delegate_to_parallel") {
            const branches =
              r.result &&
              typeof r.result === "object" &&
              "branches" in (r.result as Record<string, unknown>)
                ? ((r.result as { branches: unknown[] }).branches as Array<{
                    specialist?: string;
                  }>)
                : [];
            const branchIds = branches.map(
              (_, bi) => `s${i + 1}.b${bi + 1}`,
            );
            send({
              phase: "parallel_join",
              step: i + 1,
              branch_ids: branchIds,
              results_count: branches.length,
            });
          }
          results.push(r);
          if (r.status === "completed" && DATA_TOOLS.has(step.tool)) {
            anyDataStepSucceeded = true;
          }
          if (step.tool === "cite_dataset" && r.status === "completed") {
            citation = r.result;
          }
          if (Array.isArray(r.artifacts)) artifacts.push(...r.artifacts);
          // Multi-agent attribution: delegate_to steps surface the specialist
          // name from the result envelope; everything else is the orchestrator.
          const stepAgent =
            step.tool === "delegate_to" &&
            typeof r.result === "object" &&
            r.result !== null &&
            "agent" in (r.result as Record<string, unknown>)
              ? String((r.result as { agent: unknown }).agent)
              : "orchestrator";
          // For delegate_to steps the UI needs the full specialist envelope
          // (chips, findings, composed report) which won't fit in the 240-char
          // preview. Surface it as `result_json` alongside the truncated
          // preview — additive, byte-identical preview for backwards compat.
          const resultJson =
            step.tool === "delegate_to" ? r.result : undefined;
          // Mirror the same source detection used for the standalone
          // tool_source event, so the DAG node can read it off step_done too.
          const declaredSource =
            r.result &&
            typeof r.result === "object" &&
            "_source" in (r.result as Record<string, unknown>)
              ? String((r.result as { _source: unknown })._source)
              : null;
          const stepToolSource = ((): "cache" | "live" | "cache-fallback" | undefined => {
            const SOCRATA = new Set([
              "summarize_data",
              "fetch_data",
              "get_dataset_schema",
            ]);
            if (!SOCRATA.has(step.tool)) return undefined;
            if (
              declaredSource === "cache" ||
              declaredSource === "live" ||
              declaredSource === "cache-fallback"
            )
              return declaredSource;
            return "live";
          })();
          send({
            phase: "step_done",
            step: i + 1,
            status: r.status,
            preview: JSON.stringify(r.result).slice(0, 240),
            error: r.error,
            duration_ms,
            agent: stepAgent,
            ...(resultJson !== undefined ? { result_json: resultJson } : {}),
            ...(stepToolSource !== undefined
              ? { tool_source: stepToolSource }
              : {}),
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
                agent: "orchestrator",
              });
            }
          }

          i += 1;
        }

        // Failure-fallback: if we exhausted replans AND no data step ever
        // succeeded, the synthesizer has nothing real to ground in and would
        // produce something like "I'm sorry, I couldn't retrieve...". Hand off
        // to support's failure-explanation mode instead — it returns a plain-
        // English message about what went wrong + how to rephrase. (Closes
        // the last open item on #66.)
        if (replanCount >= MAX_REPLANS && !anyDataStepSucceeded) {
          // Reach back through results for the most informative failure.
          const lastFailed = [...results].reverse().find((r) => r.status === "failed");
          const lastFailedIdx = results.length - 1 - [...results].reverse().findIndex((r) => r.status === "failed");
          const lastFailedStep = lastFailedIdx >= 0 ? currentPlan.steps[lastFailedIdx] : null;
          const fallbackStart = Date.now();
          send({
            phase: "executing",
            step: currentPlan.steps.length + 1,
            total: currentPlan.steps.length + 1,
            tool: "delegate_to",
            args: { specialist: "support", input: { context: { failed: true } } },
            rationale: "Plan exhausted its replan budget — handing off to support for a plain-English explanation.",
          });
          const supportEnv = await callSpecialist("support", {
            context: {
              failed: true,
              failedTool: lastFailedStep?.tool ?? "a step",
              error: lastFailed?.error ?? "no detail",
            },
          });
          const supportMsg =
            (supportEnv.result && typeof supportEnv.result === "object" && "message" in supportEnv.result
              ? String((supportEnv.result as { message: unknown }).message)
              : null) ??
            "The agent couldn't recover from this query. Try rephrasing — broaden the geography, drop a filter, or pick a different time window.";
          send({
            phase: "step_done",
            step: currentPlan.steps.length + 1,
            status: supportEnv.status === "completed" ? "completed" : "failed",
            preview: JSON.stringify(supportEnv.result).slice(0, 240),
            error: supportEnv.error,
            duration_ms: Date.now() - fallbackStart,
            agent: "support",
            result_json: supportEnv.result,
          });
          finalPlan = currentPlan;
          send({
            phase: "done",
            answer: supportMsg,
            citation,
            artifacts,
            usage_total: usageTotal,
            duration_ms: Date.now() - startedAt,
          });
          // Persist + close before bailing out of the try-block early.
          try {
            await saveRun(
              query,
              finalPlan,
              captured,
              supportMsg,
              citation,
              Date.now() - startedAt,
              usageTotal.total,
            );
          } catch (e) {
            console.warn("[agent] saveRun (failure-fallback) failed:", e);
          }
          controller.close();
          return;
        }

        send({ phase: "completing", message: "Synthesizing answer..." });
        let synth = await synthesize(query, currentPlan, results);
        usageTotal = addUsage(usageTotal, synth.usage);

        // Issue #90 — critic on the answer. Same pattern as the plan critic:
        // re-run synth ONCE with a corrective prompt sourced from the
        // critic's issues, then ship whatever comes out.
        try {
          const ctxSummary = currentPlan.steps
            .map((s, i) => {
              const r = results[i];
              if (!r) return null;
              return `${s.tool}(${JSON.stringify(s.args).slice(0, 80)}) → ${r.status}`;
            })
            .filter(Boolean)
            .join("\n");
          const ansCritique = await criticize(
            "answer",
            synth.answer,
            query,
            ctxSummary,
          );
          usageTotal = addUsage(usageTotal, ansCritique.usage);
          send({
            phase: "critique",
            target: "answer",
            score: ansCritique.critique.score,
            approve: ansCritique.critique.approve,
            issues: ansCritique.critique.issues,
          });
          if (!ansCritique.critique.approve) {
            send({
              phase: "revising",
              target: "answer",
              reason: ansCritique.critique.issues.join("; ") || "low score",
            });
            // Re-run synth — synthesize() doesn't take a corrective prompt
            // arg today, so we re-run vanilla and accept it. Adding a
            // corrective synth path is an issue-#90 follow-up.
            const revised = await synthesize(query, currentPlan, results);
            usageTotal = addUsage(usageTotal, revised.usage);
            synth = revised;
          }
        } catch (e) {
          console.warn("[agent] answer critique failed:", e);
        }

        finalPlan = currentPlan;

        const durationMs = Date.now() - startedAt;
        // Persist the run BEFORE sending the done event so a `done` consumer
        // immediately seeing /admin will find it. Fire-and-forget on errors —
        // a save failure should never bubble up and break the stream.
        try {
          await saveRun(
            query,
            finalPlan,
            captured,
            synth.answer,
            citation,
            durationMs,
            usageTotal.total,
          );
        } catch (e) {
          console.warn("[agent] saveRun failed:", e);
        }

        send({
          phase: "done",
          answer: synth.answer,
          citation,
          artifacts,
          usage_total: usageTotal,
          duration_ms: durationMs,
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

function hasInternalCronAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// Public entry point. Cached fallback replay is public. Fresh user-triggered
// runs must bring their own OpenAI key; owner-funded runs are cron-only.
export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.clone().json().catch(() => ({}))) as {
    query?: string;
    demo?: boolean;
    fallback?: boolean;
  };
  const url = new URL(req.url);
  const fallbackMode =
    body.fallback === true || url.searchParams.get("fallback") === "1";

  if (fallbackMode) {
    const query = (body.query ?? "").trim();
    const saved = query ? await findRun(query) : null;
    if (saved) {
      return new Response(replaySavedRun(saved), {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "X-Accel-Buffering": "no",
          "X-TXLookup-Mode": "fallback",
          Connection: "keep-alive",
        },
      });
    }
    return Response.json(
      {
        error: "Cached run not found",
        message: "This replay is not in the public cache yet.",
      },
      { status: 404 },
    );
  }

  const query = (body.query ?? "").trim();
  const demoMode =
    body.demo === true ||
    url.searchParams.get("demo") === "1" ||
    req.headers.get("x-txlookup-demo") === "1";
  if (demoMode && query && findFixture(query)) {
    return handlePost(req);
  }

  const byok = req.cookies.get("txl_byok")?.value;
  if (byok && byok.startsWith("sk-")) {
    return runWithKey(byok, () => handlePost(req));
  }
  if (hasInternalCronAuth(req)) {
    return handlePost(req);
  }
  return Response.json(
    {
      error: "BYOK required",
      message: "Fresh agent runs require your own OpenAI API key. Cached public lookups remain available.",
      byok_url: "/byok",
    },
    { status: 402 },
  );
}
