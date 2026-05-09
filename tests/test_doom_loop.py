"""Unit tests for agent/doom_loop.py."""
from __future__ import annotations

from agent.doom_loop import DoomLoopGuard, detect


def test_identical_three_in_a_row_triggers():
    g = DoomLoopGuard()
    g.observe("discover_datasets", {"q": "x"})
    g.observe("discover_datasets", {"q": "x"})
    hit = g.observe("discover_datasets", {"q": "x"})
    assert hit is not None
    assert hit.kind == "identical"
    assert hit.repeats == 3
    assert "same call repeated" in hit.detail


def test_two_identical_does_not_trigger():
    g = DoomLoopGuard()
    g.observe("discover_datasets", {"q": "x"})
    hit = g.observe("discover_datasets", {"q": "x"})
    assert hit is None


def test_different_args_does_not_trigger():
    g = DoomLoopGuard()
    g.observe("discover_datasets", {"q": "x"})
    g.observe("discover_datasets", {"q": "y"})
    hit = g.observe("discover_datasets", {"q": "z"})
    assert hit is None


def test_repeating_sequence_ABAB_triggers():
    history = [
        ("fetch_data", {"id": "A"}),
        ("describe", {"id": "B"}),
        ("fetch_data", {"id": "A"}),
        ("describe", {"id": "B"}),
    ]
    hit = detect(history)
    assert hit is not None
    assert hit.kind == "sequence"
    assert hit.repeats == 2


def test_three_cycle_repeating_sequence_ABCABC():
    history = [
        ("fetch_data", {"id": "A"}),
        ("describe", {"id": "B"}),
        ("summarize", {"id": "C"}),
        ("fetch_data", {"id": "A"}),
        ("describe", {"id": "B"}),
        ("summarize", {"id": "C"}),
    ]
    hit = detect(history)
    assert hit is not None
    assert hit.kind == "sequence"
    assert hit.repeats == 2


def test_unique_calls_no_loop():
    history = [
        ("discover_datasets", {"q": "permits"}),
        ("get_dataset_schema", {"id": "3syk-w9eu"}),
        ("fetch_data", {"id": "3syk-w9eu", "where": "x"}),
        ("cite_dataset", {"id": "3syk-w9eu"}),
    ]
    assert detect(history) is None


def test_corrective_message_includes_detail():
    g = DoomLoopGuard()
    g.observe("x", 1)
    g.observe("x", 1)
    hit = g.observe("x", 1)
    assert hit is not None
    assert "STOP" in hit.message
    assert "different approach" in hit.message
    assert hit.detail in hit.message


def test_reset_clears_history():
    g = DoomLoopGuard()
    g.observe("x", 1)
    g.observe("x", 1)
    g.reset()
    assert g.history_len == 0
    # After reset, two more identical calls should NOT yet trigger
    g.observe("x", 1)
    hit = g.observe("x", 1)
    assert hit is None


def test_history_capped():
    g = DoomLoopGuard(max_history=5)
    for i in range(20):
        g.observe("x", i)
    assert g.history_len == 5


def test_args_with_different_types_serialize_safely():
    g = DoomLoopGuard()
    # Tuples and lists should fingerprint-equal because of json default=str
    g.observe("t", [1, 2, 3])
    g.observe("t", [1, 2, 3])
    hit = g.observe("t", [1, 2, 3])
    assert hit is not None


def test_window_must_vary_internally():
    """[A, A, A, A] is identical, not a sequence — sequence requires variation."""
    g = DoomLoopGuard()
    g.observe("x", 1)
    g.observe("x", 1)
    hit = g.observe("x", 1)
    assert hit is not None
    # Check classified as identical, not sequence
    assert hit.kind == "identical"


def test_AABBA_not_a_doom_loop():
    """A→A→B→B→A — pairs of two but no full repeating window — must NOT trip.

    This is a real benign pattern: agent retries A once, then tries B twice,
    then circles back to A as a sanity check. There's no [A,B] or [A,A,B,B]
    cycle that has fully repeated, so neither identical-3-in-a-row nor any
    sequence rule should fire.
    """
    history = [
        ("fetch_data", {"id": "A"}),
        ("fetch_data", {"id": "A"}),
        ("fetch_data", {"id": "B"}),
        ("fetch_data", {"id": "B"}),
        ("fetch_data", {"id": "A"}),
    ]
    assert detect(history) is None

    # Same thing through the live guard — must remain quiet step-by-step.
    g = DoomLoopGuard()
    for tool, args in history:
        hit = g.observe(tool, args)
        assert hit is None, f"unexpected trip on {history}: {hit}"
