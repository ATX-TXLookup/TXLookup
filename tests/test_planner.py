"""Tests for `agent.planner`.

Two unit tests use a mocked OpenAI client. One live smoke test hits the real
API and is skipped when `OPENAI_OFFLINE` is set (CI / no-credit envs).
"""

from __future__ import annotations

import json
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from agent.planner import Plan, Step, reason_and_plan, replan


# --------------------------------------------------------------------------- #
# Helpers                                                                      #
# --------------------------------------------------------------------------- #


def _fake_completion(payload: dict) -> SimpleNamespace:
    """Shape a fake OpenAI ChatCompletion response carrying `payload` as JSON."""
    msg = SimpleNamespace(content=json.dumps(payload))
    choice = SimpleNamespace(message=msg)
    return SimpleNamespace(choices=[choice])


_VALID_PLAN_PAYLOAD = {
    "intent": {
        "intent": "data_analysis",
        "data_domain": "health_inspections",
        "geography": "Austin",
        "time_range": "last 6 months",
        "analysis_type": "ranking",
    },
    "steps": [
        {
            "tool": "discover_datasets",
            "args": {"query": "Austin restaurant health inspections"},
        },
        {
            "tool": "get_dataset_schema",
            "args": {"dataset_id": "ecmv-9xxi"},
        },
        {
            "tool": "fetch_data",
            "args": {
                "portal": "data.austintexas.gov",
                "dataset_id": "ecmv-9xxi",
                "where": "score < 70",
                "limit": 500,
            },
        },
        {
            "tool": "cite_dataset",
            "args": {"dataset_id": "ecmv-9xxi"},
        },
    ],
}


# --------------------------------------------------------------------------- #
# Unit tests (mocked OpenAI)                                                   #
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_reason_and_plan_parses_structured_output():
    """`reason_and_plan` returns a validated Plan matching the mocked payload."""
    fake_resp = _fake_completion(_VALID_PLAN_PAYLOAD)
    fake_client = SimpleNamespace(
        chat=SimpleNamespace(
            completions=SimpleNamespace(create=AsyncMock(return_value=fake_resp))
        )
    )

    with patch("agent.planner._get_client", return_value=fake_client):
        plan = await reason_and_plan(
            "Show me Austin restaurant inspections that scored below 70 "
            "in the last 6 months."
        )

    assert isinstance(plan, Plan)
    assert plan.intent.data_domain == "health_inspections"
    assert plan.intent.geography == "Austin"
    assert len(plan.steps) == 4
    assert plan.steps[0].tool == "discover_datasets"
    assert plan.steps[-1].tool == "cite_dataset"
    fake_client.chat.completions.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_replan_preserves_structure():
    """`replan` returns a structurally valid Plan after a step fails."""
    original = Plan.model_validate(_VALID_PLAN_PAYLOAD)

    replanned_payload = {
        "intent": _VALID_PLAN_PAYLOAD["intent"],
        "steps": [
            {
                "tool": "discover_datasets",
                "args": {"query": "Austin food establishment inspections", "city": "austin"},
            },
            {
                "tool": "fetch_data",
                "args": {
                    "portal": "data.austintexas.gov",
                    "dataset_id": "FROM_STEP_1",
                    "limit": 200,
                },
            },
            {
                "tool": "cite_dataset",
                "args": {"dataset_id": "FROM_STEP_1"},
            },
        ],
    }
    fake_resp = _fake_completion(replanned_payload)
    fake_client = SimpleNamespace(
        chat=SimpleNamespace(
            completions=SimpleNamespace(create=AsyncMock(return_value=fake_resp))
        )
    )

    with patch("agent.planner._get_client", return_value=fake_client):
        new_plan = await replan(
            query="Show me Austin restaurant inspections that scored below 70.",
            original_plan=original,
            failed_step_index=2,
            error="HTTP 404 — dataset_id ecmv-9xxi not found",
        )

    assert isinstance(new_plan, Plan)
    assert all(isinstance(s, Step) for s in new_plan.steps)
    assert new_plan.steps[0].tool == "discover_datasets"
    failed = original.steps[2]
    assert not any(
        s.tool == failed.tool and s.args == failed.args for s in new_plan.steps
    )


# --------------------------------------------------------------------------- #
# Live smoke test (gated)                                                      #
# --------------------------------------------------------------------------- #


@pytest.mark.skipif(
    os.environ.get("OPENAI_OFFLINE"),
    reason="OPENAI_OFFLINE set — skipping live OpenAI smoke test",
)
@pytest.mark.skipif(
    not os.environ.get("OPENAI_API_KEY"),
    reason="OPENAI_API_KEY not set — skipping live smoke test",
)
@pytest.mark.asyncio
async def test_reason_and_plan_live_sarah_query():
    """Live OpenAI call. Sarah asks about Austin restaurant inspections."""
    plan = await reason_and_plan(
        "I'm a parent in 78704 — which restaurants near me failed their last "
        "health inspection?"
    )
    assert isinstance(plan, Plan)
    assert len(plan.steps) >= 1
    assert plan.steps[0].tool == "discover_datasets"
