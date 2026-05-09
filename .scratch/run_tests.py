"""Run the planner unit tests against the scratch deliverable."""
import os
import sys

SCRATCH = "/Users/red/Documents/github/TXLookup/.scratch/issue-10-11-deliverable"
sys.path.insert(0, SCRATCH)
os.environ["OPENAI_OFFLINE"] = "1"
# Drop OPENAI_API_KEY to avoid accidentally hitting the live test path.
os.environ.pop("OPENAI_API_KEY", None)

import pytest

raise SystemExit(
    pytest.main(
        [
            f"{SCRATCH}/tests/test_planner.py",
            "-v",
            "--asyncio-mode=auto",
        ]
    )
)
