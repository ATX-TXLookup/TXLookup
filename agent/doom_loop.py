"""Doom-loop detection for the agent runtime.

Two patterns trigger the corrective system prompt:

1. **Identical-call repeat:** the same `(tool_name, args)` is called
   3+ times consecutively.
2. **Repeating sequence:** a window like `[A, B, A, B]` (length 2-5)
   appears 2+ times in a row.

When detected, `check()` returns a `DoomLoopHit` describing what was seen,
and the orchestrator should append the corrective message to its context
and try a fundamentally different approach. The function never raises —
defensive failure is the agent's #1 demo-day risk.

Pure stdlib. Synchronous. Deterministic. Trivial to unit-test.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Iterable, Optional


CORRECTIVE_SYSTEM_PROMPT = (
    "STOP. The agent is in a loop. The same tool call (or a short repeating "
    "sequence) has fired multiple times. Take a fundamentally different "
    "approach: pick a different dataset, change the where clause, change "
    "the tool, or ask a clarifying question. Do NOT repeat the prior calls."
)


def _fingerprint(tool: str, args: Any) -> str:
    """Stable hash of (tool, args) so 'same call' is detectable across types."""
    try:
        payload = json.dumps(args, sort_keys=True, default=str)
    except Exception:
        payload = str(args)
    return hashlib.sha1(f"{tool}::{payload}".encode("utf-8")).hexdigest()[:16]


@dataclass(frozen=True)
class DoomLoopHit:
    """A doom-loop pattern was detected in the recent call history."""

    kind: str  # "identical" or "sequence"
    pattern: tuple[str, ...]  # the repeating fingerprints
    repeats: int  # how many times the pattern repeated
    detail: str  # human-readable summary

    @property
    def message(self) -> str:
        """Corrective system message to append to the agent's context."""
        return f"{CORRECTIVE_SYSTEM_PROMPT} ({self.detail})"


def _check_identical(history: list[str]) -> Optional[DoomLoopHit]:
    """Detect 3+ identical consecutive fingerprints at the tail."""
    if len(history) < 3:
        return None
    last = history[-1]
    n = 1
    for fp in reversed(history[:-1]):
        if fp == last:
            n += 1
        else:
            break
    if n >= 3:
        return DoomLoopHit(
            kind="identical",
            pattern=(last,),
            repeats=n,
            detail=f"same call repeated {n} times",
        )
    return None


def _check_sequence(history: list[str]) -> Optional[DoomLoopHit]:
    """Detect [A,B,A,B] / [A,B,C,A,B,C] etc. repeating at the tail.

    Window size 2..5, must repeat at least 2 full cycles to count.
    """
    n = len(history)
    for w in (2, 3, 4, 5):
        if n < w * 2:
            continue
        # Check the last w*2, w*3, w*4 windows for repetition
        max_repeats = n // w
        for repeats in range(2, min(max_repeats, 4) + 1):
            window = history[-w * repeats :]
            base = tuple(window[:w])
            ok = all(tuple(window[i * w : (i + 1) * w]) == base for i in range(repeats))
            if ok and len(set(base)) > 1:  # window must vary internally
                return DoomLoopHit(
                    kind="sequence",
                    pattern=base,
                    repeats=repeats,
                    detail=f"sequence of {w} repeated {repeats} times",
                )
    return None


class DoomLoopGuard:
    """Stateful guard. Feed it every (tool, args) call as it happens.

    Usage in the orchestrator:

        guard = DoomLoopGuard()
        ...
        for step in plan.steps:
            hit = guard.observe(step.tool, step.args)
            if hit:
                # Append hit.message as a system message and replan.
                logger.warning("doom loop: %s", hit.detail)
                break
            await execute_step(step, registry)
    """

    def __init__(self, max_history: int = 60) -> None:
        self._fps: list[str] = []
        self._max = max_history

    def observe(self, tool: str, args: Any) -> Optional[DoomLoopHit]:
        """Record a call; return a DoomLoopHit if a pattern is detected."""
        fp = _fingerprint(tool, args)
        self._fps.append(fp)
        if len(self._fps) > self._max:
            self._fps = self._fps[-self._max :]
        return _check_identical(self._fps) or _check_sequence(self._fps)

    def reset(self) -> None:
        """Clear history. Call after a real diff in tool calls or after replanning."""
        self._fps.clear()

    @property
    def history_len(self) -> int:
        return len(self._fps)


def detect(history: Iterable[tuple[str, Any]]) -> Optional[DoomLoopHit]:
    """Convenience: scan an entire history at once. No state."""
    fps = [_fingerprint(t, a) for (t, a) in history]
    return _check_identical(fps) or _check_sequence(fps)
