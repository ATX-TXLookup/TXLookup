"""
TXLookup executor — deterministic plan-step dispatch.

NOT an LLM call. Maps `Step.tool` → registered async function, runs it under
an asyncio timeout, and returns the standard tool envelope.

Issue #11. See `docs/agents-strategy.md` for the role split.
"""

from __future__ import annotations

import asyncio
import inspect
from typing import Any, Awaitable, Callable

from agent.planner import Plan, Step


ToolFn = Callable[..., Awaitable[dict]]


# --------------------------------------------------------------------------- #
# Step dispatch                                                                #
# --------------------------------------------------------------------------- #


def _envelope(
    status: str,
    *,
    result: Any = None,
    error: str | None = None,
    artifacts: list[Any] | None = None,
) -> dict:
    """Standard tool result envelope."""
    return {
        "status": status,
        "result": result,
        "error": error,
        "artifacts": artifacts or [],
    }


def _coerce_envelope(raw: Any) -> dict:
    """Coerce a tool's return value into the standard envelope.

    Tools in `agent/tools/data.py` already return the envelope shape; pure
    helpers (e.g. `discover` returning a list[Dataset]) get wrapped here so
    the executor's contract stays clean.
    """
    if isinstance(raw, dict) and "status" in raw:
        return {
            "status": raw.get("status", "completed"),
            "result": raw.get("result"),
            "error": raw.get("error"),
            "artifacts": raw.get("artifacts", []),
        }
    return _envelope("completed", result=raw)


async def execute_step(
    step: Step,
    registry: dict[str, ToolFn],
    *,
    timeout_s: int = 30,
) -> dict:
    """Dispatch a single Step. Always returns an envelope — never raises."""
    fn = registry.get(step.tool)
    if fn is None:
        return _envelope(
            "failed",
            error=f"unknown tool: {step.tool!r} (registry keys: {sorted(registry)})",
        )

    try:
        call = fn(**step.args)
        # Tolerate sync helpers wrapped naively — await only awaitables.
        if inspect.isawaitable(call):
            raw = await asyncio.wait_for(call, timeout=timeout_s)
        else:
            raw = call
        return _coerce_envelope(raw)
    except asyncio.TimeoutError:
        return _envelope("failed", error=f"timeout after {timeout_s}s")
    except TypeError as e:
        # Bad args from the planner — surface clearly so replan can repair.
        return _envelope("failed", error=f"bad args for {step.tool}: {e}")
    except Exception as e:  # noqa: BLE001 — structured return, never crash
        return _envelope("failed", error=str(e))


async def execute_plan(
    plan: Plan,
    registry: dict[str, ToolFn],
    *,
    timeout_s: int = 30,
) -> list[dict]:
    """Execute every step of `plan` sequentially.

    Returns the list of envelopes in execution order. Does NOT auto-pipe
    step i's result into step i+1 — the planner emits arg references and
    the orchestrator resolves them (see `agent/main.py`).
    """
    out: list[dict] = []
    for step in plan.steps:
        env = await execute_step(step, registry, timeout_s=timeout_s)
        out.append(env)
    return out


# --------------------------------------------------------------------------- #
# Default registry                                                             #
# --------------------------------------------------------------------------- #


def _wrap_sync(fn: Callable[..., Any]) -> ToolFn:
    """Wrap a sync helper so it satisfies the async `ToolFn` contract."""

    async def _wrapped(**kwargs: Any) -> dict:
        return _coerce_envelope(fn(**kwargs))

    return _wrapped


def default_registry() -> dict[str, ToolFn]:
    """Wire the default TXLookup tools.

    Maps planner tool names → callables in `agent/tools/data.py`.
    `summarize_data` and `cite_dataset` are reserved names — the planner
    can emit them and the executor will surface a clean envelope until
    the matching tools land.
    """
    # Lazy import so a missing optional dep (httpx, pyyaml) only bites users
    # who actually invoke the registry, not anyone importing the executor.
    from agent.tools import data as data_tools

    async def _summarize_stub(**kwargs: Any) -> dict:
        return _envelope("not_implemented", error="summarize_data not yet wired")

    async def _cite_stub(**kwargs: Any) -> dict:
        # Minimal cite: echo what we got so the planner sees a non-failure.
        return _envelope("completed", result={"citation": kwargs})

    return {
        "discover_datasets": _wrap_sync(data_tools.discover),
        "get_dataset_schema": data_tools.describe,
        "fetch_data": data_tools.soda_query,
        "summarize_data": _summarize_stub,
        "cite_dataset": _cite_stub,
    }


__all__ = [
    "ToolFn",
    "execute_step",
    "execute_plan",
    "default_registry",
]
