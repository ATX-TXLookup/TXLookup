"""
TXLookup planner — Codex-driven Reason + Plan + Replan.

Single OpenAI call per phase. Uses structured outputs (json_schema) so the
returned Plan is guaranteed-valid and can be fed straight to the executor.

Issue #10. See `docs/agents-strategy.md` for the five Codex roles.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Optional

from openai import AsyncOpenAI
from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# Models                                                                       #
# --------------------------------------------------------------------------- #


class Intent(BaseModel):
    """Structured understanding of the user's question."""

    intent: str
    data_domain: Optional[str] = None
    geography: Optional[str] = None
    time_range: Optional[str] = None
    analysis_type: Optional[str] = None


# Tool names the executor knows how to dispatch. Keep in sync with
# `default_registry()` in agent/executor.py and the MCP server's tool list.
ALLOWED_TOOLS = (
    "discover_datasets",
    "get_dataset_schema",
    "fetch_data",
    "summarize_data",
    "cite_dataset",
)


class Step(BaseModel):
    tool: str
    args: dict[str, Any] = Field(default_factory=dict)


class Plan(BaseModel):
    intent: Intent
    steps: list[Step]


# --------------------------------------------------------------------------- #
# Lazy client + prompt loading                                                 #
# --------------------------------------------------------------------------- #


_CLIENT: Optional[AsyncOpenAI] = None
_REPO_ROOT = Path(__file__).resolve().parents[1]
_PLANNER_PROMPT_PATH = _REPO_ROOT / "prompts" / "planner.md"

_FALLBACK_PROMPT = """\
You are a data analysis planning agent for TXLookup. Given a user question
about Texas / Austin public data, identify the relevant dataset(s) and emit
an ordered, executable plan.

Your output MUST be a JSON object that conforms to the supplied schema:
- `intent`: structured understanding of the question.
- `steps`: ordered list of `{tool, args}` entries.

Rules:
1. Always start with `discover_datasets` unless a dataset_id is explicitly
   given.
2. Use `get_dataset_schema` before any non-trivial `fetch_data` to confirm
   column names.
3. End with `cite_dataset` so the user-facing answer carries attribution.
4. Keep plans <= 6 steps. Each step uses exactly one tool.
5. Allowed tool names: discover_datasets, get_dataset_schema, fetch_data,
   summarize_data, cite_dataset.
"""


def _get_client() -> AsyncOpenAI:
    """Lazy-init the OpenAI client. Module-load init breaks Vercel cold starts."""
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = AsyncOpenAI()
    return _CLIENT


def _load_system_prompt() -> str:
    """Read prompts/planner.md, falling back to the embedded prompt if missing."""
    try:
        if _PLANNER_PROMPT_PATH.exists():
            text = _PLANNER_PROMPT_PATH.read_text(encoding="utf-8").strip()
            if text:
                return text
    except OSError:
        pass
    return _FALLBACK_PROMPT


# --------------------------------------------------------------------------- #
# JSON schema for structured outputs                                           #
# --------------------------------------------------------------------------- #


def _plan_json_schema() -> dict[str, Any]:
    """JSON schema for the Plan model — used as `response_format`."""
    return {
        "name": "txlookup_plan",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "required": ["intent", "steps"],
            "properties": {
                "intent": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": [
                        "intent",
                        "data_domain",
                        "geography",
                        "time_range",
                        "analysis_type",
                    ],
                    "properties": {
                        "intent": {"type": "string"},
                        "data_domain": {"type": ["string", "null"]},
                        "geography": {"type": ["string", "null"]},
                        "time_range": {"type": ["string", "null"]},
                        "analysis_type": {"type": ["string", "null"]},
                    },
                },
                "steps": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["tool", "args"],
                        "properties": {
                            "tool": {
                                "type": "string",
                                "enum": list(ALLOWED_TOOLS),
                            },
                            "args": {"type": "object"},
                        },
                    },
                },
            },
        },
    }


# --------------------------------------------------------------------------- #
# Public API                                                                   #
# --------------------------------------------------------------------------- #


async def _call_codex(messages: list[dict[str, str]], model: str) -> Plan:
    """One OpenAI call w/ structured outputs + 1 retry on JSON-parse failure."""
    client = _get_client()
    last_err: Optional[Exception] = None

    for attempt in range(2):
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={
                    "type": "json_schema",
                    "json_schema": _plan_json_schema(),
                },
                temperature=0.2,
            )
            raw = resp.choices[0].message.content or ""
            data = json.loads(raw)
            return Plan.model_validate(data)
        except Exception as e:  # noqa: BLE001
            last_err = e
            if attempt == 0:
                # On retry, nudge the model to repair its JSON.
                messages = list(messages) + [
                    {
                        "role": "system",
                        "content": (
                            "Your previous response was not valid JSON for the "
                            "Plan schema. Re-emit a valid Plan now."
                        ),
                    }
                ]
                continue
            raise

    # Defensive: should be unreachable.
    raise RuntimeError(f"reason_and_plan failed: {last_err}")


async def reason_and_plan(
    query: str,
    *,
    model: str = "gpt-4o-2024-11-20",
) -> Plan:
    """Single OpenAI call returning a structured Plan for `query`.

    Loads `prompts/planner.md` as the system message and constrains the
    model output via `response_format=json_schema`.

    Args:
        query: Natural-language data question from the user.
        model: OpenAI model id. Defaults to `gpt-4o-2024-11-20`.

    Returns:
        Validated `Plan`.

    Raises:
        Exception: After one retry if the model can't produce valid JSON.
    """
    system = _load_system_prompt()
    messages = [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": (
                f"User question: {query}\n\n"
                "Emit a Plan as JSON conforming to the supplied schema."
            ),
        },
    ]
    return await _call_codex(messages, model=model)


async def replan(
    query: str,
    original_plan: Plan,
    failed_step_index: int,
    error: str,
    *,
    model: str = "gpt-4o-2024-11-20",
) -> Plan:
    """Ask Codex for a new plan, given that step `failed_step_index` failed.

    Args:
        query: The original user question.
        original_plan: The plan we were executing.
        failed_step_index: 0-based index of the step that failed.
        error: Short description of the failure (from the executor envelope).
        model: OpenAI model id.

    Returns:
        A fresh `Plan` whose `steps` cover the remaining work.
    """
    system = _load_system_prompt()
    failed_repr: Any = None
    if 0 <= failed_step_index < len(original_plan.steps):
        failed_repr = original_plan.steps[failed_step_index].model_dump()
    replan_wrapper = (
        "REPLAN MODE\n"
        f"Original user question: {query}\n"
        f"Failed step index: {failed_step_index}\n"
        f"Failed step: {failed_repr}\n"
        f"Error: {error}\n\n"
        "Original plan (for context):\n"
        f"{original_plan.model_dump_json(indent=2)}\n\n"
        "Emit a NEW Plan whose steps cover the remaining work — "
        "either a different dataset, a different tool, or a relaxed query. "
        "Preserve the original intent. Do not repeat the failed step verbatim."
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": replan_wrapper},
    ]
    return await _call_codex(messages, model=model)


# --------------------------------------------------------------------------- #
# Scope validation                                                             #
# --------------------------------------------------------------------------- #

# Mirrors `validatePlanScope` in app/lib/agent.ts. Catches ungrounded plans —
# the LLM occasionally emits a 1-step `summarize_data` with no `where` for a
# scoped question ("Restaurants in 78704 this year"). We surface that here
# so callers can re-prompt instead of letting it through.
_SCOPED_TOOLS = frozenset({"summarize_data", "fetch_data", "render_to_miro"})

_DATE_PHRASES: tuple[tuple[str, str], ...] = (
    (r"\bthis year\b", "this year"),
    (r"\blast (six|6) months\b", "last six months"),
    (r"\blast 30 days\b", "last 30 days"),
    (r"\blast (twelve|12) months\b", "last twelve months"),
    (r"\blast (24|twenty[- ]?four) months\b", "last 24 months"),
    (r"\bover the last \d+ (month|quarter|year)s?\b", "rolling window"),
    (r"\bytd\b", "year to date"),
)

_DATE_COLUMNS: tuple[str, ...] = (
    "issue_date",
    "issued_date",
    "inspection_date",
    "sr_created_date",
    "opened_date",
    "occ_date",
    "crash_timestamp",
    "obligation_end_date_yyyymmdd",
    "responsibility_beginning_date",
)

# Council-district columns that actually exist on TX civic datasets. A
# "District N" question must scope on one of these. The 2026-05-13 corpus
# audit found the agent repeatedly pinning "District 3" onto a department
# column (Austin 311, xwdj-i9he, has no district column at all), which
# silently returns zero rows and the agent then fabricates a finding.
_DISTRICT_COLUMNS: tuple[str, ...] = (
    "council_district",
    "city_council_district",
)
# A where-clause that pins a district onto a non-district column.
_DISTRICT_MISMAP_RE = re.compile(
    r"(sr_department_desc|department|dept)\s*=\s*'?\s*(council\s+)?district",
    re.IGNORECASE,
)
_DISTRICT_QUERY_RE = re.compile(r"\b(council\s+)?district\s+\d+\b", re.IGNORECASE)
# "join X with Y" — a question that needs >= 2 datasets merged.
_JOIN_QUERY_RE = re.compile(r"\b(join|combine|merge)\b", re.IGNORECASE)
# Ranking / outlier questions — the scoped step must carry an `order` arg.
_RANKING_QUERY_RE = re.compile(
    r"\b(top\s+\d+|outliers?|highest|lowest|fastest|slowest|largest|"
    r"smallest|ranked?|leading)\b",
    re.IGNORECASE,
)


def _dataset_id_of(step: "Step") -> str:
    """Read a step's dataset id, tolerating camelCase and snake_case."""
    return str(step.args.get("datasetId") or step.args.get("dataset_id") or "")


def validate_plan_scope(query: str, plan: Plan) -> list[dict[str, Any]]:
    """Return a list of scope-violation issues. Empty list = plan looks scoped.

    Catches the ungrounded-plan classes found in the 2026-05-13 corpus audit:
    unscoped zip/date queries, "District N" mis-mapped onto a department
    column, "join" queries that touch only one dataset, and ranking/outlier
    queries with no `order` argument.
    """
    issues: list[dict[str, Any]] = []
    zip_match = re.search(r"\b(\d{5})\b", query)
    date_hit: Optional[str] = None
    for pat, label in _DATE_PHRASES:
        if re.search(pat, query, re.IGNORECASE):
            date_hit = label
            break

    if (zip_match or date_hit) and len(plan.steps) == 1:
        only = plan.steps[0]
        if only.tool in _SCOPED_TOOLS:
            issues.append(
                {
                    "step": 1,
                    "tool": only.tool,
                    "reason": "1-step plan for a scoped query (zip or date range present in question)",
                }
            )

    for i, step in enumerate(plan.steps):
        if step.tool not in _SCOPED_TOOLS:
            continue
        where = str(step.args.get("where", "")).lower()
        if zip_match and zip_match.group(1) not in where:
            issues.append(
                {
                    "step": i + 1,
                    "tool": step.tool,
                    "reason": (
                        f"user mentioned zip {zip_match.group(1)} but "
                        "step.where does not contain it"
                    ),
                }
            )
        if date_hit and not any(c in where for c in _DATE_COLUMNS):
            issues.append(
                {
                    "step": i + 1,
                    "tool": step.tool,
                    "reason": (
                        f'user mentioned "{date_hit}" but step.where has no '
                        "date-column constraint"
                    ),
                }
            )

    # --- District scoping (audit 2026-05-13) ---
    if _DISTRICT_QUERY_RE.search(query):
        district_scoped = False
        district_mismapped = False
        for i, step in enumerate(plan.steps):
            if step.tool not in _SCOPED_TOOLS:
                continue
            where = str(step.args.get("where", ""))
            if _DISTRICT_MISMAP_RE.search(where):
                district_mismapped = True
                issues.append(
                    {
                        "step": i + 1,
                        "tool": step.tool,
                        "reason": (
                            "question scopes to a council district but "
                            "step.where pins the district onto a department "
                            "column — that is not a district field and "
                            "returns zero rows"
                        ),
                    }
                )
            if any(c in where.lower() for c in _DISTRICT_COLUMNS):
                district_scoped = True
        if not district_scoped and not district_mismapped:
            issues.append(
                {
                    "step": 0,
                    "tool": "(plan)",
                    "reason": (
                        "question names a council district but no scoped "
                        "step constrains a council_district column"
                    ),
                }
            )

    # --- Join queries need >= 2 datasets (audit 2026-05-13) ---
    if _JOIN_QUERY_RE.search(query):
        dataset_ids = {
            _dataset_id_of(s) for s in plan.steps if s.tool in _SCOPED_TOOLS
        }
        dataset_ids.discard("")
        if len(dataset_ids) < 2:
            issues.append(
                {
                    "step": 0,
                    "tool": "(plan)",
                    "reason": (
                        f"question asks to join/combine datasets but the "
                        f"plan touches {len(dataset_ids)} dataset(s) — a real "
                        "join needs at least two"
                    ),
                }
            )

    # --- Ranking / outlier queries need an explicit order (audit 2026-05-13) ---
    if _RANKING_QUERY_RE.search(query):
        has_order = any(
            step.tool in _SCOPED_TOOLS
            and str(step.args.get("order", "")).strip()
            for step in plan.steps
        )
        if not has_order:
            issues.append(
                {
                    "step": 0,
                    "tool": "(plan)",
                    "reason": (
                        "question asks for a ranking/outliers (top N / "
                        "highest / outliers) but no scoped step carries an "
                        "`order` argument — results will not be sorted by "
                        "the relevant metric"
                    ),
                }
            )

    return issues


__all__ = [
    "Intent",
    "Step",
    "Plan",
    "ALLOWED_TOOLS",
    "reason_and_plan",
    "replan",
    "validate_plan_scope",
]
