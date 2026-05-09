// Doom-loop detection for the agent runtime.
// TS port of agent/doom_loop.py — same two patterns trigger the corrective:
//   1. identical (tool, args) called 3+ times consecutively
//   2. a window [A,B,A,B] (length 2-5) repeating 2+ times in a row

import { createHash } from "node:crypto";

export const CORRECTIVE_SYSTEM_PROMPT =
  "STOP. The agent is in a loop. The same tool call (or a short repeating " +
  "sequence) has fired multiple times. Take a fundamentally different " +
  "approach: pick a different dataset, change the where clause, change " +
  "the tool, or ask a clarifying question. Do NOT repeat the prior calls.";

export type DoomLoopHit = {
  kind: "identical" | "sequence";
  pattern: string[]; // the repeating fingerprints
  repeats: number; // how many times the pattern repeated
  detail: string; // human-readable summary
  message: string; // corrective system message to append
};

function fingerprint(tool: string, args: unknown): string {
  let payload: string;
  try {
    payload = JSON.stringify(args, Object.keys((args ?? {}) as object).sort());
  } catch {
    payload = String(args);
  }
  return createHash("sha1")
    .update(`${tool}::${payload}`)
    .digest("hex")
    .slice(0, 16);
}

function buildHit(
  kind: DoomLoopHit["kind"],
  pattern: string[],
  repeats: number,
  detail: string,
): DoomLoopHit {
  return {
    kind,
    pattern,
    repeats,
    detail,
    message: `${CORRECTIVE_SYSTEM_PROMPT} (${detail})`,
  };
}

function checkIdentical(history: string[]): DoomLoopHit | null {
  if (history.length < 3) return null;
  const last = history[history.length - 1];
  let n = 1;
  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i] === last) n += 1;
    else break;
  }
  if (n >= 3) {
    return buildHit("identical", [last], n, `same call repeated ${n} times`);
  }
  return null;
}

function checkSequence(history: string[]): DoomLoopHit | null {
  const n = history.length;
  for (const w of [2, 3, 4, 5]) {
    if (n < w * 2) continue;
    const maxRepeats = Math.floor(n / w);
    const upper = Math.min(maxRepeats, 4);
    for (let repeats = 2; repeats <= upper; repeats++) {
      const window = history.slice(n - w * repeats);
      const base = window.slice(0, w);
      let ok = true;
      for (let r = 0; r < repeats; r++) {
        for (let j = 0; j < w; j++) {
          if (window[r * w + j] !== base[j]) {
            ok = false;
            break;
          }
        }
        if (!ok) break;
      }
      if (ok && new Set(base).size > 1) {
        return buildHit(
          "sequence",
          base,
          repeats,
          `sequence of ${w} repeated ${repeats} times`,
        );
      }
    }
  }
  return null;
}

export class DoomLoopGuard {
  private fps: string[] = [];
  private readonly max: number;

  constructor(maxHistory = 60) {
    this.max = maxHistory;
  }

  observe(tool: string, args: unknown): DoomLoopHit | null {
    const fp = fingerprint(tool, args);
    this.fps.push(fp);
    if (this.fps.length > this.max) this.fps = this.fps.slice(-this.max);
    return checkIdentical(this.fps) ?? checkSequence(this.fps);
  }

  reset(): void {
    this.fps = [];
  }

  get historyLen(): number {
    return this.fps.length;
  }
}

export function detect(
  history: Array<readonly [string, unknown]>,
): DoomLoopHit | null {
  const fps = history.map(([t, a]) => fingerprint(t, a));
  return checkIdentical(fps) ?? checkSequence(fps);
}
