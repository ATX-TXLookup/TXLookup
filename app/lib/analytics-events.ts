/**
 * GA4 event helpers — thin wrappers over window.gtag.
 *
 * If gtag is undefined (NEXT_PUBLIC_GA_ID unset, dev, ad blocker, etc.)
 * every helper bails out silently. No PII flows through here — only
 * coarse run metadata (durations, counts, error class).
 */

type GtagFn = (
  command: "event",
  name: string,
  params?: Record<string, unknown>,
) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

function emit(name: string, params: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const g = window.gtag;
  if (typeof g !== "function") return;
  try {
    g("event", name, params);
  } catch {
    // never let analytics break the app
  }
}

/** Submit pressed — query length only, never the text itself. */
export function trackAgentStart(query: string): void {
  emit("agent_start", { query_length: query.length });
}

/** Phase=done — performance + cost telemetry. */
export function trackAgentDone(
  durationMs: number,
  replanCount: number,
  tokenTotal: number,
): void {
  emit("agent_done", {
    duration_ms: durationMs,
    replan_count: replanCount,
    token_total: tokenTotal,
  });
}

/** Phase=error — coarse class only, not the raw error string. */
export function trackAgentError(error: string): void {
  const errorClass = error.slice(0, 64).replace(/[^a-zA-Z0-9_-]/g, "_");
  emit("agent_error", { error_class: errorClass });
}
