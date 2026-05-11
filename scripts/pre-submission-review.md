# Pre-submission review — Codex audit prompt

> **What this is:** a prompt template you paste into a fresh Codex (or
> Claude Code) session ~2 hours before the hackathon freeze. The agent
> reviews the whole project against the four judging axes + submission
> docs + live deploy, surfaces every weakness it can find, and gives
> you a prioritized punch list.
>
> **Why it works:** the agent that built the project has bias. A fresh
> agent reviewing the work with explicit "find what's broken or
> aspirational" framing finds things you can't see anymore.
>
> **When to fire:** T-2 hours from freeze. Block off 30 minutes for the
> review + 30 minutes to triage findings.

---

## The prompt (paste this verbatim into a fresh Codex session)

```
You are doing a pre-submission audit of a hackathon project before the
freeze deadline. Be brutally honest. Find what's broken, aspirational,
or weak. Do not be nice.

The repo is at <REPO_PATH>. The live site is at <LIVE_URL>. The
hackathon judges score on 4 axes, 25 pts each:

1. Technical Execution & Completeness
2. Partner Ecosystem & Utility
3. Value & Impact
4. Innovation & Execution

For each axis, do the following:

(a) Open the submission doc (docs/hackathon-form-copy.md or equivalent)
    and list every CLAIM the project makes for that axis.

(b) For each claim, verify it against:
    - The actual code (grep for the function/file/feature)
    - The live deploy (curl the route, check the response)
    - The tests (do they pass? do they test what the claim says?)

(c) Flag every claim that is:
    - FAKE (a number that doesn't come from code or live data)
    - ASPIRATIONAL (a feature described as live but actually a stub or
      "coming soon")
    - BROKEN (a route or tool that 404s, errors, or hangs)
    - DRIFTED (a number or fact that was true once but no longer matches
      reality — e.g., README says "9 datasets" but catalog.ts has 11)
    - OVERSTATED (a claim that's technically true but presented in a
      way that exceeds what's actually demonstrable)

(d) For each finding, give:
    - The claim text (exact quote from submission doc)
    - The reality (what the code/site actually does)
    - Severity: BLOCKER (judges will catch this) / WEAK (judges might
      catch this) / POLISH (only we will notice)
    - Fix complexity: 5min / 30min / 2hr / out-of-scope

Then audit the demo readiness:

(e) Try the live URL. Does the homepage load in <3 seconds? Cold-start
    latency? Any console errors? Any layout breaks at 1280x800?

(f) Fire the marquee demo question through the live agent. Does it
    return an answer in <10 seconds? Is the citation real? Can you
    click the source link?

(g) Open the deployed MCP install path (if applicable). Does the
    install command actually work? Run it in a fresh shell.

(h) Open the demo board / artifact (Miro, screenshot, video). Does the
    link still resolve? Is the content current?

Then audit the submission package:

(i) Does docs/hackathon-form-copy.md have every required form field?
    Check the actual submission form's required fields. Any missing?

(j) Does the team list have full names, emails, GitHub handles, and
    LinkedIns for every team member?

(k) Is the repo PUBLIC? Is the license file present? Is the README
    open-source quality (status badges, quick start, license)?

(l) Are there any leaked secrets in the public repo? Grep for "sk-",
    "Bearer eyJ", API key patterns. Check .env files in git history.

Output format: a single Markdown table sorted by severity (BLOCKER
first), then by axis. End with a punch list of fixes ranked by
ROI (highest-impact + lowest-cost first).

Do not propose new features. Only find what's broken, drifted, or
overstated about what we already claim to ship.
```

## What this typically finds

From actual use on TXLookup v1.0.0 (run 2h before freeze would have caught):

- "9 deeply curated" in README → CATALOG.length was actually 11 (DRIFT)
- "8 MCP tools" advertised on /use-as-agent but only 5 implemented in manifest.json (OVERSTATED, fixed in PR #112's audit)
- "Codex install" command using `--add-mcp` flag → flag was deprecated (BROKEN, fixed in same audit)
- `kicker` prop passed to SectionHeader → component has no such prop (BROKEN, would have caught PR #121's type error before submission)
- Made-up install-terminal numbers (`→ 47 mobile food vendor permits, 22% above prior 6mo`) → no data backed this (FAKE)
- AgentTopologyShowcase claims 7 specialists but renders 5 lanes (DRIFTED)

That's six BLOCKER/WEAK findings in a 30-minute audit. Without it, those go in front of judges.

## Tactical notes

- **Run this in a fresh agent session.** A session that helped build the project will defend its own work.
- **Don't pre-filter.** Let the agent surface everything. Triage after.
- **Auto mode + parallel subagents** (Claude Code): kick off the four axis audits in parallel.
- **Time-box at 30 min** for the audit itself, 30 min for fixes. Anything not fixed in 30 min becomes "known limitation" in the submission.
