// Cross-page nav + footer consistency.
//
// Crawls every public page and asserts that:
//   1. Each page returns HTTP 200.
//   2. Each page renders the wordmark "TXLookup".
//   3. Each page renders the canonical footer attribution string.
//   4. Each page contains a Reports link (the most recent nav addition).
//   5. The header nav-link list is IDENTICAL across all pages — same count,
//      same hrefs, same labels, in the same order. This is the regression
//      test for the kind of drift where one page (e.g. /architecture) is
//      missing a freshly-shipped nav entry.
//
// `/components` is the dev-only storybook showcase and is intentionally
// excluded from cross-page consistency — it has its own bare layout.
//
// Usage:
//   BASE=http://localhost:3004 node --test tests/e2e_nav_consistency.mjs
//   node --test tests/e2e_nav_consistency.mjs   # default http://localhost:3004

import test, { describe } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE || "http://localhost:3004";

const PAGES = [
  "/",
  "/q",
  "/datasets/3syk-w9eu",
  "/architecture",
  "/reports",
  "/reports/austin-construction-2026",
];

// Pages whose body must contain the canonical attribution string.
const FOOTER_STR =
  "All data sourced from public Texas open-data portals";

const WORDMARK = "TXLookup";

async function fetchHTML(path) {
  const r = await fetch(`${BASE}${path}`);
  const body = await r.text();
  return { status: r.status, body };
}

// Extract the contents of <nav data-testid="site-nav"> ... </nav>.
// Returns the raw inner HTML or null if the marker isn't present.
function extractSiteNav(html) {
  const startTag = `data-testid="site-nav"`;
  const startIdx = html.indexOf(startTag);
  if (startIdx === -1) return null;
  // Walk forward to the closing </nav>.
  const closeIdx = html.indexOf("</nav>", startIdx);
  if (closeIdx === -1) return null;
  return html.slice(startIdx, closeIdx);
}

// Pull the list of nav link descriptors out of the inner HTML.
// Returns an array of { href, label } in document order.
function parseNavLinks(navInner) {
  const links = [];
  // data-nav-href is set on every nav <a>/<Link> we render — the marker
  // survives Tailwind class soup and React hydration.
  const re = /data-nav-href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(navInner)) !== null) {
    const href = m[1];
    const label = m[2].replace(/<[^>]*>/g, "").trim();
    links.push({ href, label });
  }
  return links;
}

describe("public pages return 200 + wordmark + footer + Reports link", () => {
  for (const path of PAGES) {
    test(`GET ${path}`, async () => {
      const { status, body } = await fetchHTML(path);
      assert.equal(status, 200, `expected 200 for ${path}, got ${status}`);
      assert.ok(
        body.includes(WORDMARK),
        `${path} body missing wordmark "${WORDMARK}"`,
      );
      assert.ok(
        body.includes(FOOTER_STR),
        `${path} body missing footer attribution string`,
      );
      assert.ok(
        body.includes("/reports"),
        `${path} body missing /reports link (this is the bab1a2d nav addition)`,
      );
      assert.ok(
        body.includes("/datasets") || body.includes("#datasets"),
        `${path} body missing /datasets link`,
      );
    });
  }
});

describe("header nav is identical across every public page", () => {
  test("each page exposes a parseable site-nav with the canonical link list", async () => {
    const perPage = {};
    for (const path of PAGES) {
      const { body } = await fetchHTML(path);
      const navInner = extractSiteNav(body);
      assert.ok(
        navInner,
        `${path} has no <nav data-testid="site-nav"> — page is not using the shared SiteHeader`,
      );
      const links = parseNavLinks(navInner);
      perPage[path] = links;
    }

    // Pick the home page as the reference.
    const reference = perPage["/"];
    assert.ok(reference.length >= 4, `home page has < 4 nav links`);

    const referenceHrefs = reference.map((l) => l.href).join("|");
    const referenceLabels = reference.map((l) => l.label).join("|");

    for (const path of PAGES) {
      const links = perPage[path];
      const hrefs = links.map((l) => l.href).join("|");
      const labels = links.map((l) => l.label).join("|");
      assert.equal(
        hrefs,
        referenceHrefs,
        `${path} nav hrefs differ from /: got "${hrefs}", expected "${referenceHrefs}"`,
      );
      assert.equal(
        labels,
        referenceLabels,
        `${path} nav labels differ from /: got "${labels}", expected "${referenceLabels}"`,
      );
    }

    // And explicitly assert /reports is in the canonical list.
    const reportsLink = reference.find((l) => l.href === "/reports");
    assert.ok(
      reportsLink,
      `canonical nav missing /reports — bab1a2d nav update lost`,
    );
  });
});
