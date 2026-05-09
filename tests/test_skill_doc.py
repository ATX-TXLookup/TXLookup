"""Tests for `skills/txlookup/SKILL.md`.

The SKILL.md is the contract between TXLookup and any agent that loads
this skill. If it drifts from the MCP server's actual tool surface, the
agent will pick tools that don't exist (or miss tools that do). These
tests pin the doc to the implementation.

Asserts:
  1. Frontmatter is present and includes `name` + `description`.
  2. Every tool registered in `mcp/server.py` is documented in SKILL.md
     (header-style ``` ### `tool_name(...)` ```).
  3. No tools documented that the MCP server doesn't expose.
  4. No broken markdown links — every `[text](url)` has a non-empty url
     and external `http(s)://` links don't have obvious typos.
  5. No emoji in the document (skill docs go to LLMs; emoji adds tokens
     and can confuse plain-text consumers).
"""
from __future__ import annotations

import asyncio
import importlib.util
import re
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent
SKILL_PATH = REPO_ROOT / "skills" / "txlookup" / "SKILL.md"


# --------------------------------------------------------------------------- #
# Helpers                                                                      #
# --------------------------------------------------------------------------- #


@pytest.fixture(scope="module")
def skill_text() -> str:
    assert SKILL_PATH.exists(), f"{SKILL_PATH} missing"
    return SKILL_PATH.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def mcp_tool_names() -> set[str]:
    """Boot mcp/server.py via importlib (avoiding the local-vs-PyPI mcp shadow)
    and return the set of registered tool names."""
    server_path = REPO_ROOT / "mcp" / "server.py"
    spec = importlib.util.spec_from_file_location("txlookup_mcp_server_skill", server_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    tools = asyncio.run(module.mcp.list_tools())
    return {t.name for t in tools}


def _parse_frontmatter(text: str) -> dict[str, str]:
    """Naive YAML-frontmatter parser — just key: value lines between --- markers."""
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end < 0:
        return {}
    block = text[3:end].strip()
    out: dict[str, str] = {}
    for line in block.splitlines():
        if ":" not in line:
            continue
        k, _, v = line.partition(":")
        out[k.strip()] = v.strip()
    return out


def _documented_tools(text: str) -> set[str]:
    """Pull every tool name from `### ` + backtick header. Tolerates `()` and signatures."""
    pattern = re.compile(r"^###\s+`([a-z_][a-z0-9_]*)\b", re.MULTILINE)
    return set(pattern.findall(text))


# --------------------------------------------------------------------------- #
# Tests                                                                        #
# --------------------------------------------------------------------------- #


def test_frontmatter_has_name_and_description(skill_text: str) -> None:
    fm = _parse_frontmatter(skill_text)
    assert fm.get("name"), "SKILL.md frontmatter must declare `name`"
    assert fm.get("description"), "SKILL.md frontmatter must declare `description`"
    assert fm["name"] == "txlookup", f"unexpected skill name: {fm['name']}"
    # Description should be a real sentence — not a placeholder.
    assert len(fm["description"]) >= 40, "description looks like a placeholder"


def test_documented_tools_match_mcp_server_exactly(
    skill_text: str, mcp_tool_names: set[str]
) -> None:
    """Bidirectional: every MCP tool is documented, and no doc references a
    tool the server doesn't actually expose."""
    documented = _documented_tools(skill_text)

    missing_from_doc = mcp_tool_names - documented
    extra_in_doc = documented - mcp_tool_names

    assert not missing_from_doc, (
        f"SKILL.md is missing documentation for tools registered in "
        f"mcp/server.py: {sorted(missing_from_doc)}"
    )
    assert not extra_in_doc, (
        f"SKILL.md documents tools that mcp/server.py does not expose: "
        f"{sorted(extra_in_doc)}"
    )


def test_no_broken_markdown_links(skill_text: str) -> None:
    """Each `[text](url)` must have a non-empty url. External http(s) links
    must look syntactically sane."""
    link_re = re.compile(r"\[([^\]]+)\]\(([^)]*)\)")
    bad: list[tuple[str, str]] = []
    for text, url in link_re.findall(skill_text):
        url = url.strip()
        if not url:
            bad.append((text, "<empty>"))
            continue
        if url.startswith("http://") or url.startswith("https://"):
            # Trivial sanity — must contain a dot in the host portion.
            host = url.split("//", 1)[1].split("/", 1)[0]
            if "." not in host:
                bad.append((text, url))
    assert not bad, f"broken markdown links: {bad}"


def test_no_emoji(skill_text: str) -> None:
    """Skill docs are LLM-facing — no emoji to keep tokens lean and parsing trivial."""
    # Emoji ranges (non-exhaustive but covers the common cases): symbols,
    # pictographs, transport, flags, dingbats, misc symbols.
    emoji_re = re.compile(
        "["
        "\U0001f300-\U0001f5ff"  # symbols & pictographs
        "\U0001f600-\U0001f64f"  # emoticons
        "\U0001f680-\U0001f6ff"  # transport & map
        "\U0001f700-\U0001f77f"
        "\U0001f900-\U0001f9ff"  # supplemental symbols & pictographs
        "\U0001fa70-\U0001faff"
        "☀-⛿"           # misc symbols
        "✀-➿"           # dingbats
        "]"
    )
    hits = emoji_re.findall(skill_text)
    assert not hits, f"SKILL.md contains emoji ({len(hits)}): {hits[:8]}"
