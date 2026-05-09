"""Smoke: import the executor + planner against the real repo tree."""
import asyncio
import os
import sys

sys.path.insert(0, "/Users/red/Documents/github/TXLookup/.scratch/issue-10-11-deliverable")
sys.path.insert(0, "/Users/red/Documents/github/TXLookup")
os.environ["OPENAI_OFFLINE"] = "1"

from agent.executor import default_registry, execute_step, execute_plan
from agent.planner import Plan, Step, Intent

reg = default_registry()
print("registry keys:", sorted(reg))

# Build a dummy Plan that exercises an unknown tool + a sync-wrapped helper.
plan = Plan(
    intent=Intent(intent="data_analysis"),
    steps=[
        Step(tool="discover_datasets", args={"query": "Austin permits", "city": "austin"}),
        Step(tool="cite_dataset", args={"dataset_id": "3syk-w9eu"}),
    ],
)

results = asyncio.run(execute_plan(plan, reg, timeout_s=5))
for i, env in enumerate(results):
    print(f"step {i}: status={env['status']}  error={env['error']}")
    r = env["result"]
    if isinstance(r, list):
        print(f"  result = list[{len(r)}] -> first: {r[0] if r else None}")
    else:
        print(f"  result = {r}")

# Unknown-tool path
bad = asyncio.run(execute_step(Step(tool="nope", args={}), reg))
print("unknown-tool envelope:", bad)
