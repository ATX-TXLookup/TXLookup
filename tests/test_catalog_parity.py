"""Offline parity checks for the Python and TypeScript dataset catalogs.

`config/datasets.yaml` feeds the Python agent path while `app/lib/catalog.ts`
feeds the frontend. These tests fail fast when a contributor updates one side
without keeping dataset IDs, portals, and key columns in sync.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
YAML_PATH = ROOT / "config" / "datasets.yaml"
TS_PATH = ROOT / "app" / "lib" / "catalog.ts"


def _strip_comment(line: str) -> str:
    """Remove comments from this catalog YAML's simple scalar/list lines."""
    return line.split("#", 1)[0].rstrip()


def _parse_inline_list(value: str) -> list[str]:
    value = value.strip()
    assert value.startswith("[") and value.endswith("]"), f"expected inline list, got {value!r}"
    body = value[1:-1].strip()
    if not body:
        return []
    return [item.strip().strip("\"'") for item in body.split(",")]


def _parse_yaml_catalog() -> dict[str, dict[str, Any]]:
    catalog: dict[str, dict[str, Any]] = {}
    current_city: str | None = None
    current_portal: str | None = None
    current_dataset: dict[str, Any] | None = None

    for raw_line in YAML_PATH.read_text(encoding="utf-8").splitlines():
        line = _strip_comment(raw_line)
        if not line.strip():
            continue

        indent = len(line) - len(line.lstrip(" "))
        stripped = line.strip()

        if indent == 0 and stripped.endswith(":"):
            current_city = stripped[:-1]
            current_portal = None
            current_dataset = None
            continue

        if current_city is None:
            continue

        if indent == 2 and stripped.startswith("portal:"):
            current_portal = stripped.split(":", 1)[1].strip()
            continue

        if indent == 4 and stripped.endswith(":"):
            current_dataset = {"city": current_city, "portal": current_portal}
            continue

        if indent == 6 and current_dataset is not None and ":" in stripped:
            key, value = stripped.split(":", 1)
            value = value.strip()
            if key == "id":
                current_dataset["id"] = value
                catalog[value] = current_dataset
            elif key == "portal":
                current_dataset["portal"] = value
            elif key == "key_columns":
                current_dataset["key_columns"] = _parse_inline_list(value)

    return catalog


def _catalog_array_body(source: str) -> str:
    marker = "export const CATALOG"
    start = source.index(marker)
    assignment = source.index("=", start)
    array_start = source.index("[", assignment)
    depth = 0
    for pos in range(array_start, len(source)):
        char = source[pos]
        if char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                return source[array_start + 1 : pos]
    raise AssertionError("Could not find CATALOG array body")


def _catalog_object_blocks(array_body: str) -> list[str]:
    blocks: list[str] = []
    depth = 0
    block_start: int | None = None

    for pos, char in enumerate(array_body):
        if char == "{":
            if depth == 0:
                block_start = pos
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0 and block_start is not None:
                blocks.append(array_body[block_start : pos + 1])
                block_start = None

    return blocks


def _string_field(block: str, field: str) -> str:
    match = re.search(rf"\b{field}:\s*\"([^\"]+)\"", block)
    assert match, f"missing {field} field in catalog block: {block[:120]!r}"
    return match.group(1)


def _string_list_field(block: str, field: str) -> list[str]:
    match = re.search(rf"\b{field}:\s*\[(.*?)\]", block, re.DOTALL)
    assert match, f"missing {field} field in catalog block: {block[:120]!r}"
    return re.findall(r"\"([^\"]+)\"", match.group(1))


def _parse_ts_catalog() -> dict[str, dict[str, Any]]:
    source = TS_PATH.read_text(encoding="utf-8")
    entries: dict[str, dict[str, Any]] = {}

    for block in _catalog_object_blocks(_catalog_array_body(source)):
        dataset_id = _string_field(block, "id")
        entries[dataset_id] = {
            "portal": _string_field(block, "portal"),
            "key_columns": _string_list_field(block, "keyColumns"),
        }

    return entries


def test_catalog_dataset_ids_match() -> None:
    yaml_catalog = _parse_yaml_catalog()
    ts_catalog = _parse_ts_catalog()

    assert set(yaml_catalog) == set(ts_catalog)


def test_catalog_portals_match() -> None:
    yaml_catalog = _parse_yaml_catalog()
    ts_catalog = _parse_ts_catalog()
    assert set(yaml_catalog) == set(ts_catalog)

    mismatches = {
        dataset_id: {
            "config/datasets.yaml": yaml_catalog[dataset_id]["portal"],
            "app/lib/catalog.ts": ts_catalog[dataset_id]["portal"],
        }
        for dataset_id in sorted(yaml_catalog)
        if yaml_catalog[dataset_id]["portal"] != ts_catalog[dataset_id]["portal"]
    }

    assert not mismatches


def test_catalog_key_columns_match() -> None:
    yaml_catalog = _parse_yaml_catalog()
    ts_catalog = _parse_ts_catalog()
    assert set(yaml_catalog) == set(ts_catalog)

    mismatches = {
        dataset_id: {
            "config/datasets.yaml": yaml_catalog[dataset_id]["key_columns"],
            "app/lib/catalog.ts": ts_catalog[dataset_id]["key_columns"],
        }
        for dataset_id in sorted(yaml_catalog)
        if yaml_catalog[dataset_id]["key_columns"] != ts_catalog[dataset_id]["key_columns"]
    }

    assert not mismatches
