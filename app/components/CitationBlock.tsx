"use client";

/**
 * CitationBlock
 *
 * Mandatory attribution block under any data result. Three lines:
 *   1. Source · dataset name (id)
 *   2. Last refreshed timestamp in YYYY-MM-DD HH:mm CT
 *   3. "Open dataset →" link
 *
 * Required by the Open Data track rules — every user-facing answer must
 * carry attribution. Token source: /DESIGN.md (`citation`).
 */

import type { CSSProperties } from "react";

export interface CitationBlockProps {
  portal: string;
  datasetName: string;
  datasetId: string;
  datasetUrl: string;
  /** Date object or ISO 8601 string. Rendered in America/Chicago (CT). */
  lastRefreshed: Date | string;
  className?: string;
}

const CT_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatCT(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return String(input);
  // en-CA gives "YYYY-MM-DD, HH:mm" — normalize to "YYYY-MM-DD HH:mm CT"
  const parts = CT_FORMATTER.formatToParts(d).reduce<Record<string, string>>(
    (acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    },
    {},
  );
  const yyyy = parts.year;
  const mm = parts.month;
  const dd = parts.day;
  const hh = parts.hour === "24" ? "00" : parts.hour;
  const mi = parts.minute;
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} CT`;
}

export function CitationBlock({
  portal,
  datasetName,
  datasetId,
  datasetUrl,
  lastRefreshed,
  className,
}: CitationBlockProps) {
  const wrapStyle: CSSProperties = {
    background: "#F0EDEC",
    color: "#594238",
    borderRadius: "12px",
    padding: "16px",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "0.875rem",
    lineHeight: 1.55,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };

  const monoStyle: CSSProperties = {
    fontFamily: "JetBrains Mono, ui-monospace, monospace",
    fontSize: "0.85rem",
  };

  const linkStyle: CSSProperties = {
    color: "#3D5AAB",
    textDecoration: "none",
    fontWeight: 500,
  };

  return (
    <aside
      role="note"
      aria-label="Dataset citation"
      className={className}
      style={wrapStyle}
    >
      <div>
        <span>Source: </span>
        <span>{portal}</span>
        <span> &middot; </span>
        <span>{datasetName}</span>
        <span> (</span>
        <span style={monoStyle}>{datasetId}</span>
        <span>)</span>
      </div>
      <div>Last refreshed: {formatCT(lastRefreshed)}</div>
      <div>
        <a
          href={datasetUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
        >
          Open dataset &rarr;
        </a>
      </div>
    </aside>
  );
}

export default CitationBlock;
