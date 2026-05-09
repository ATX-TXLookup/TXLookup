"use client";

/**
 * AgentStepTrace
 *
 * Horizontal row of four chips representing the agent's loop state
 * (Reason → Plan → Tool → Complete) with a thin progress bar underneath.
 *
 * Pure presentational component. No state, no fetch, no animation timer.
 * Caller passes `currentStep` and an optional `progress` (0-1).
 *
 * Token source: /DESIGN.md (`agent-step-active`, `agent-step`).
 */

import type { CSSProperties } from "react";

export type AgentStep = 0 | 1 | 2 | 3;

export interface AgentStepTraceProps {
  /** 0 = Reason, 1 = Plan, 2 = Tool, 3 = Complete */
  currentStep: AgentStep;
  /** Bar fill, 0..1. Defaults to (currentStep + 1) / 4. */
  progress?: number;
  className?: string;
}

const STEPS: ReadonlyArray<string> = ["Reason", "Plan", "Tool", "Complete"];

interface ChipStyle {
  background: string;
  color: string;
  opacity?: number;
}

function chipStyle(stepIndex: number, currentStep: AgentStep): ChipStyle {
  if (stepIndex === currentStep) {
    // Active — primary-fixed (peach) / on-primary-fixed (deep orange)
    return { background: "#FFDBCD", color: "#351000" };
  }
  if (stepIndex < currentStep) {
    // Past — surface-low / on-surface-variant
    return { background: "#F6F3F2", color: "#594238" };
  }
  // Future — surface-container at 50% opacity
  return { background: "#F0EDEC", color: "#594238", opacity: 0.5 };
}

export function AgentStepTrace({
  currentStep,
  progress,
  className,
}: AgentStepTraceProps) {
  const safeProgress = Math.max(
    0,
    Math.min(1, progress ?? (currentStep + 1) / STEPS.length),
  );

  const containerStyle: CSSProperties = { width: "100%" };
  const rowStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
  };
  const chipBase: CSSProperties = {
    fontFamily: "Manrope, system-ui, sans-serif",
    fontSize: "0.6875rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    padding: "12px 16px",
    borderRadius: "12px",
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const trackStyle: CSSProperties = {
    marginTop: "12px",
    height: "2px",
    width: "100%",
    background: "#F0EDEC",
    borderRadius: "9999px",
    overflow: "hidden",
  };
  const fillStyle: CSSProperties = {
    height: "100%",
    width: `${safeProgress * 100}%`,
    background: "#3D5AAB",
    transition: "width 200ms ease-out",
  };

  return (
    <div
      role="group"
      aria-label="Agent step trace"
      className={className}
      style={containerStyle}
    >
      <div style={rowStyle}>
        {STEPS.map((label, i) => {
          const s = chipStyle(i, currentStep);
          const isActive = i === currentStep;
          return (
            <span
              key={label}
              aria-current={isActive ? "step" : undefined}
              style={{
                ...chipBase,
                background: s.background,
                color: s.color,
                opacity: s.opacity,
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={safeProgress}
        style={trackStyle}
      >
        <div style={fillStyle} />
      </div>
    </div>
  );
}

export default AgentStepTrace;
