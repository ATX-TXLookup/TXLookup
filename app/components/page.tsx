"use client";

/**
 * /components — storybook-style demo page.
 *
 * Renders every state of AgentStepTrace plus the CitationBlock with
 * Marcus's permits sample data. Used by reviewers to eyeball the
 * components without booting the full result page.
 */

import { AgentStepTrace, type AgentStep } from "./AgentStepTrace";
import { CitationBlock } from "./CitationBlock";

interface TraceCase {
  step: AgentStep;
  progress: number;
  label: string;
  blurb: string;
}

const TRACE_CASES: ReadonlyArray<TraceCase> = [
  {
    step: 0,
    progress: 0.25,
    label: "Reasoning",
    blurb:
      "Agent has parsed the query and is deciding which open datasets to consult.",
  },
  {
    step: 1,
    progress: 0.5,
    label: "Planning",
    blurb:
      "Agent has chosen Issued Construction Permits and is composing a Socrata query for 78702.",
  },
  {
    step: 2,
    progress: 0.75,
    label: "Tool execution",
    blurb:
      "Agent is calling the Socrata SODA endpoint and waiting on the response.",
  },
  {
    step: 3,
    progress: 1,
    label: "Complete",
    blurb:
      "Agent has the rows, the citation, and the summary ready for the user.",
  },
];

export default function ComponentsPage() {
  return (
    <main
      style={{
        background: "#FCF9F8",
        minHeight: "100vh",
        padding: "48px 32px",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#1C1B1B",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <header style={{ marginBottom: 48 }}>
          <p
            style={{
              fontFamily: "Manrope, system-ui, sans-serif",
              fontSize: "0.6875rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#594238",
              margin: 0,
              marginBottom: 12,
            }}
          >
            Components &middot; Issue #15
          </p>
          <h1
            style={{
              fontFamily: "Manrope, system-ui, sans-serif",
              fontSize: "2.25rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            AgentStepTrace &amp; CitationBlock
          </h1>
          <p
            style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "#594238",
              maxWidth: "65ch",
              marginTop: 12,
            }}
          >
            Storybook-style demo. Four AgentStepTrace states followed by the
            CitationBlock used on every result view.
          </p>
        </header>

        <section
          aria-labelledby="trace-heading"
          style={{ marginBottom: 64 }}
        >
          <h2
            id="trace-heading"
            style={{
              fontFamily: "Manrope, system-ui, sans-serif",
              fontSize: "1.375rem",
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
              marginBottom: 24,
            }}
          >
            AgentStepTrace
          </h2>

          <div style={{ display: "grid", gap: 32 }}>
            {TRACE_CASES.map((c) => (
              <article
                key={c.step}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 16,
                  padding: 24,
                  boxShadow: "0 1px 0 rgba(140,113,102,0.12)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "Manrope, system-ui, sans-serif",
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    Step {c.step} &middot; {c.label}
                  </h3>
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, ui-monospace, monospace",
                      fontSize: "0.85rem",
                      color: "#594238",
                    }}
                  >
                    progress={c.progress.toFixed(2)}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    lineHeight: 1.55,
                    color: "#594238",
                    margin: 0,
                    marginBottom: 16,
                    maxWidth: "65ch",
                  }}
                >
                  {c.blurb}
                </p>
                <AgentStepTrace currentStep={c.step} progress={c.progress} />
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="cite-heading" style={{ marginBottom: 64 }}>
          <h2
            id="cite-heading"
            style={{
              fontFamily: "Manrope, system-ui, sans-serif",
              fontSize: "1.375rem",
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
              marginBottom: 8,
            }}
          >
            CitationBlock
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.55,
              color: "#594238",
              margin: 0,
              marginBottom: 24,
              maxWidth: "65ch",
            }}
          >
            Sample data: Marcus&rsquo;s &ldquo;food-truck permits issued in
            78702&rdquo; query, sourced from the Issued Construction Permits
            dataset on the City of Austin portal.
          </p>
          <CitationBlock
            portal="City of Austin"
            datasetName="Issued Construction Permits"
            datasetId="3syk-w9eu"
            datasetUrl="https://data.austintexas.gov/Building-and-Development/Issued-Construction-Permits/3syk-w9eu"
            lastRefreshed="2026-05-08T14:00:00Z"
          />
        </section>
      </div>
    </main>
  );
}
