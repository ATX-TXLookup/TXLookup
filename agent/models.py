"""
Pydantic models shared across TXLookup agent tools.

These describe the structured data the agent passes between Reason → Plan →
Execute → Complete and what the MCP server returns to clients.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class Column(BaseModel):
    """A single column in a Socrata dataset schema.

    ``name`` is the SoQL-queryable ``fieldName`` (e.g. ``permittype``).
    ``display_name`` is the human label (e.g. ``Permit Type``). The two
    differ on most Socrata datasets — fieldName collapses spaces and
    sometimes drops underscores.
    """

    name: str
    type: str
    description: str = ""
    display_name: str = ""


class Dataset(BaseModel):
    """A catalog entry for a known TX/Austin dataset.

    Returned by ``discover()`` ranked by NL-match score.
    """

    id: str
    name: str
    portal: str
    key_columns: list[str] = Field(default_factory=list)
    updated: str = ""
    city: Optional[str] = None
    score: float = 0.0


class Schema(BaseModel):
    """Live schema + freshness metadata for a Socrata dataset.

    Returned by ``describe()`` after hitting ``/api/views/{id}.json``.
    """

    id: str
    name: str
    portal: str
    description: str = ""
    columns: list[Column] = Field(default_factory=list)
    sample_rows: list[dict[str, Any]] = Field(default_factory=list)
    row_count: Optional[int] = None
    last_updated: Optional[int] = None
    url: str = ""


class Citation(BaseModel):
    """A stable citation for a dataset.

    Returned by ``cite()`` and ``cite_with_freshness()``. Every user-facing
    answer that pulls from open-data portals should carry one of these so
    attribution stays attached to the result. ``last_refreshed`` is the
    ISO-8601 timestamp from the portal's metadata when known; ``cite()``
    leaves it None, ``cite_with_freshness()`` populates it via ``describe()``.
    """

    portal: str               # human label e.g. "City of Austin"
    portal_host: str          # hostname e.g. "data.austintexas.gov"
    dataset_name: str
    dataset_id: str
    url: str                  # canonical landing page url
    api_url: str              # the Socrata resource API url
    last_refreshed: Optional[str] = None  # ISO datetime if known
