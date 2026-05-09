// Specialist registry — plumbing for the multi-agent architecture (issue #67).
//
// The orchestrator's `delegate_to` step type (in `executeStep`) routes to the
// matching specialist via this registry. Specialists are landed independently:
//   #64 — data_analyst (statistical SoQL, yoy/qoq deltas, anomalies)
//   #65 — reporter (compose_report → JSON snapshot for /reports/[slug])
//   #66 — support (disambiguation, meta-questions, no Socrata)
//
// Until those land, this file ships **stub specialists** that return a clear
// "not yet implemented" envelope. That way the orchestrator's `delegate_to`
// case can be merged + tested without depending on the specialists being
// finished — and the planner prompt does NOT yet route to delegate_to (it
// only learns the routing rules when each specialist lands and registers
// itself, see the per-specialist PRs).
//
// To plug in a real specialist (in #64/#65/#66):
//   1. Replace the corresponding stub below with the real call (Python module
//      via MCP, or a TS implementation if it's the support specialist which
//      doesn't need Socrata).
//   2. In that PR, also update the planner prompt in app/lib/agent.ts to add
//      the routing rule for that specialist's question shape.

export type SpecialistName = "data_analyst" | "reporter" | "support";

// Envelope returned by every specialist. Compatible with ToolEnvelope so the
// SSE step_done event can flow through unchanged, with optional extras the
// specialists fill in (confidence, caveats, agent identity).
export type SpecialistEnvelope = {
  agent: SpecialistName;
  status: "completed" | "failed" | "needs_input";
  result: unknown;
  error: string | null;
  artifacts?: string[];
  // Forward-looking fields from #64/#65/#66 specs. Optional today; required
  // once those PRs land.
  confidence?: number;
  caveats?: string[];
  next_actions?: Array<{ label: string; query: string }>;
};

export type Specialist = (
  input: Record<string, unknown>,
) => Promise<SpecialistEnvelope>;

// --- Stubs ----------------------------------------------------------------
// Each returns the "not yet implemented" envelope. Once the per-specialist
// PR lands, swap the stub here for a real call (and update the planner
// prompt to actually route to it).

const NOT_YET: (name: SpecialistName) => SpecialistEnvelope = (name) => ({
  agent: name,
  status: "failed",
  result: null,
  error: `specialist "${name}" is registered but not yet implemented — see the corresponding PR for the live wire-up`,
});

const dataAnalystStub: Specialist = async () => NOT_YET("data_analyst");
const reporterStub: Specialist = async () => NOT_YET("reporter");
const supportStub: Specialist = async () => NOT_YET("support");

// --- Registry -------------------------------------------------------------

const REGISTRY: Record<SpecialistName, Specialist> = {
  data_analyst: dataAnalystStub,
  reporter: reporterStub,
  support: supportStub,
};

const KNOWN: ReadonlySet<SpecialistName> = new Set([
  "data_analyst",
  "reporter",
  "support",
]);

export function isSpecialistName(name: string): name is SpecialistName {
  return KNOWN.has(name as SpecialistName);
}

export async function callSpecialist(
  name: SpecialistName,
  input: Record<string, unknown>,
): Promise<SpecialistEnvelope> {
  const handler = REGISTRY[name];
  return handler(input);
}

// Test seam — lets unit tests swap a stub for a fixture without monkey-patching.
// Production code MUST NOT use this; the per-specialist PRs replace stubs by
// editing this file's top-half directly.
export function _setSpecialistForTest(
  name: SpecialistName,
  fn: Specialist,
): void {
  REGISTRY[name] = fn;
}

export function _resetSpecialistsForTest(): void {
  REGISTRY.data_analyst = dataAnalystStub;
  REGISTRY.reporter = reporterStub;
  REGISTRY.support = supportStub;
}
