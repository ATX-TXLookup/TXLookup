# Analytics

We use Google Analytics 4 (GA4) for traffic + agent-run telemetry. The wiring
is intentionally minimal: a gtag bootstrap in `<body>` (`app/components/Analytics.tsx`)
plus three custom events fired from `AgentRunner.tsx` via `app/lib/analytics-events.ts`.

## What we track

Standard GA4 page_view events (automatic from `gtag.js`), plus:

| Event          | Params                                          | Fired when                    |
| -------------- | ----------------------------------------------- | ----------------------------- |
| `agent_start`  | `query_length` (int)                            | User submits a question       |
| `agent_done`   | `duration_ms`, `replan_count`, `token_total`    | SSE `phase: done` arrives     |
| `agent_error`  | `error_class` (sanitized, ≤64 chars)            | SSE `phase: error` arrives    |

That's it. No custom dimensions beyond those, no user identifiers.

## What we DO NOT track

- **No query text content.** We send `query_length` only. The actual question
  the user typed never leaves the browser via analytics.
- **No PII.** No email, name, IP (we set `anonymize_ip: true`), no user ID.
- **No raw error strings.** `agent_error` sends a sanitized `error_class`
  (alphanumeric + `_-`, truncated to 64 chars) so we can bucket failure modes
  without leaking dataset IDs, query fragments, or stack traces.
- **No artifacts, citations, or answers.** The agent's output stays in the UI.

If you ever add an event, keep this contract. Reviewers should reject any
change that sends raw user input or backend response text to GA.

## Setup — Vercel

1. Create a GA4 property at <https://analytics.google.com>. Pick a Web data
   stream pointed at the production URL. Copy the Measurement ID (`G-XXXXXXXXXX`).
2. In the Vercel project → Settings → Environment Variables, add:

   ```
   NEXT_PUBLIC_GA_ID = G-XXXXXXXXXX
   ```

   Apply to **Production** and **Preview**. Skip Development — local dev
   should stay analytics-free.
3. Redeploy. The `<Analytics />` component reads the var at render time;
   if it's unset the component returns `null` (no script tag, no console
   noise).

## Where to view

- **Realtime traffic:** GA4 → Reports → Realtime. Useful during the demo.
- **Agent events:** GA4 → Reports → Engagement → Events. Look for
  `agent_start`, `agent_done`, `agent_error`. The `duration_ms` /
  `token_total` params are visible in the event detail view, and can be
  promoted to custom metrics in Admin → Custom definitions if we want
  charts on them.
- **Funnel:** Admin → Explorations → blank exploration → step 1
  `agent_start`, step 2 `agent_done`. That's the success rate.

## Local dev

`NEXT_PUBLIC_GA_ID` is unset locally → no script loads → no events fire →
no console errors. If you need to test the wiring, set it in `.env.local`
to a throwaway property and check Realtime.
