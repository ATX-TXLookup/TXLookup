// End-to-end smoke for the homepage + dataset pages against a running server.
// Asserts each route returns 200 with the substrings we care about — no
// console-error simulation, just curl-style fetch + grep.
//
// Usage:
//   PORT=3001 npx next start &
//   node tests/e2e_pages_smoke.mjs                     # default http://localhost:3001
//   node tests/e2e_pages_smoke.mjs http://localhost:3000

import test, { describe } from "node:test";
import assert from "node:assert/strict";

const BASE = process.argv[2] || process.env.PAGES_BASE || "http://localhost:3001";
const T = 30_000;

async function get(path) {
  const r = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(T) });
  return { status: r.status, body: await r.text() };
}

function hasAll(haystack, needles, ctx) {
  for (const n of needles) {
    assert.ok(haystack.includes(n), `${ctx}: missing ${JSON.stringify(n)}`);
  }
}

describe("/ (homepage)", () => {
  test("renders 200 with TXLookup brand, /reports nav, 4 sample-q chips, ticker numbers", async () => {
    const { status, body } = await get("/");
    assert.equal(status, 200);
    hasAll(body, ["TXLookup", "Texas open data", "Live · Austin civic data"], "/");
    // /reports nav landed in commit bab1a2d.
    assert.ok(body.includes('href="/reports"'), "/: missing /reports nav link");
    // 4 sample-question chips link to /q?q=…
    const chipMatches = body.match(/href="\/q\?q=[^"]+"/g) ?? [];
    assert.ok(chipMatches.length >= 4, `/: expected ≥4 /q?q= chips, got ${chipMatches.length}`);
    // Live ticker has at least one comma-formatted number, not all em-dashes.
    const realNumbers = body.match(/tabular-nums[^>]*>[+]?[\d,]{3,}/g) ?? [];
    assert.ok(realNumbers.length >= 2, `/: expected ≥2 real ticker numbers, got ${realNumbers.length}`);
  });
});

describe("/datasets/3syk-w9eu (Issued Construction Permits)", () => {
  test("renders title, schema rows, sample data, Open dataset link", async () => {
    const { status, body } = await get("/datasets/3syk-w9eu");
    assert.equal(status, 200);
    hasAll(body, ["Issued Construction Permits", "Development Services", "data.austintexas.gov", "3syk-w9eu"], "/datasets/3syk");
    // At least one schema row + one sample value (real Socrata data).
    assert.match(body, /permittype|permit_type_desc/, "schema row missing");
    assert.ok(
      body.includes('href="https://data.austintexas.gov/resource/3syk-w9eu.json"'),
      "Open dataset link to /resource/{id}.json missing",
    );
  });
});

describe("/datasets/ecmv-9xxi (Food Establishment Inspections)", () => {
  test("renders title + Open dataset link", async () => {
    const { status, body } = await get("/datasets/ecmv-9xxi");
    assert.equal(status, 200);
    hasAll(body, ["Food Establishment", "Austin Public Health", "ecmv-9xxi"], "/datasets/ecmv");
    assert.ok(
      body.includes('href="https://data.austintexas.gov/resource/ecmv-9xxi.json"'),
      "Open dataset link to /resource/{id}.json missing",
    );
  });
});
