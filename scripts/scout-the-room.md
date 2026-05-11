# Scout the room — competitive + sponsor signal sweep

> **What this is:** a prompt + checklist for a dedicated "intelligence
> scout" agent that pulls signals from the open web during the
> hackathon so the build team doesn't miss anything.
>
> **Why it matters:** at the 2026 AITX × Codex hackathon, we missed
> two real signals: (1) the winning team's framing as "evidence
> workstation" was visible on their public repo by Saturday afternoon
> if anyone had looked; (2) a Miro $500 bounty had additional
> Miroverse-template requirements we didn't fully address. Both were
> findable. Neither was found.
>
> **When to fire:** every 12 hours during the hackathon — Day 0
> evening, Day 1 noon, Day 1 evening, Day 2 morning.
>
> **Who runs it:** one team member runs the scout once. Output goes
> into a Slack/Discord channel for the team. ~30 min per run.

---

## The prompt (paste into a fresh Codex or Claude Code session)

```
You are the intelligence scout for our hackathon team. Run an open-web
sweep and surface signals from competitors, sponsors, judges, and the
broader community that we might be missing.

Hackathon: <HACKATHON_NAME>
Our project: <PROJECT_NAME>
Our public repo: <REPO_URL>
Our pitch in one sentence: <ONE_LINE_PITCH>
Tracks we're competing in: <TRACKS>
Sponsors we're using or pursuing bounties from: <SPONSOR_LIST>

Use web search, GitHub search, social search. Where you can't reach
something directly, list it as "needs human check."

== 1. Competitor scouting ==

Find every project plausibly competing in our tracks. For each:
  - Repo URL + last push time
  - One-line description of what they're building
  - Surfaces they've shipped (web app? CLI? mobile? agent? API?)
  - Their narrative framing (the headline on their README)
  - Anything they have that we don't

Search patterns:
  - `topic:<hackathon-tag>` on GitHub
  - `<hackathon-name> 2026` on Twitter/X + LinkedIn
  - Public Discord/Slack channels for the hackathon
  - Devpost / Major League Hacking listings if the hackathon uses them

Rank competitors by threat. For each top-5 threat, flag:
  - Their strongest framing
  - The gap they're filling that we're not
  - Any signal that judges or sponsors have publicly noticed them

== 2. Sponsor + bounty signals ==

For each sponsor on our list, look for:
  - Bounty requirements (re-read the bounty page even if you read it
    on Day 0 — sponsors sometimes update mid-hackathon)
  - Additional submission requirements beyond the main form
    (Miroverse template? Smithery listing? specific install path?
    judging criteria addendum?)
  - Sponsor employee social posts during the hackathon — sponsors
    often signal what they want to see in the demos
  - Any "office hours" or mentor sessions we might be missing

Output: a list of "things our submission should mention but currently
doesn't" — phrased as concrete edits to docs/hackathon-form-copy.md.

== 3. Judge signal ==

If judges are named publicly, search their:
  - Recent tweets / LinkedIn posts (last 30 days)
  - Recent blog posts or talks
  - Open-source projects they maintain

Look for: what kinds of projects do they retweet? what frameworks
do they bias toward? what hackathon projects have they praised
publicly in the past? This shapes how we present.

== 4. Community signal ==

Look for the hackathon's:
  - Public Discord activity (`#announcements`, `#general`,
    `#track-*` channels)
  - Last-minute schedule changes
  - Submission-portal issues other teams are reporting
  - "What I wish I knew" threads from previous hackathons in the same
    series

== 5. Trend signal (the macro read) ==

A few high-leverage queries:
  - "what hackathons recently rewarded in this category"
  - "which projects on Show HN this week match our framing"
  - "any breaking news in our sponsors' ecosystems that we should
    mention in the pitch"

== Output format ==

A single Markdown brief, 1-2 pages max, with:

1. **Top 3 competitor threats** (rank, framing, gap to fill)
2. **Sponsor signals we should act on before freeze** (concrete edits)
3. **Judge / community context** that should shape the demo
4. **Three things to add to docs/hackathon-form-copy.md tonight**
5. **One thing to deprioritize** because the field has it covered

Then a punch list ranked by ROI.
```

## What this typically finds

From a retrospective on AITX × Codex 2026:

- **Atlas TX's "evidence workstation" framing** was visible by Saturday afternoon. A scout run would have flagged: "this team is positioning as a product for investigators, we're positioning as a tool for normal users. Decide if we want to differentiate or match."

- **Miro $500 bounty** had a Miroverse-template requirement beyond what the headline bounty page said. A scout run reading the bounty page twice would have caught it. We mentioned the bounty but never satisfied the template requirement.

- **Smithery's submission docs pointed at `smithery-ai/registry`** which had retired in favor of `modelcontextprotocol/registry` the week before. A scout would have caught the doc drift and saved us 30 min of wrong-direction.

- **Multiple teams in the Codex track** were emphasizing MCP-server installability. We did the same. A scout run would have noted "MCP installability is table stakes, not a differentiator — drop it from the headline pitch."

## Tactical notes

- **Run from a fresh agent session.** Same logic as the pre-submission review — fresh eyes catch what builders defend.
- **Output to a shared doc, not just chat.** The team needs to read the brief at their own pace.
- **Don't have the scout build features.** Their job is signals, not commits. The builders triage.
- **Time-box at 30 min.** Diminishing returns past that. Better to run again 12h later than to go deeper.

## Reusable search queries

```
# Competitors
site:github.com topic:<hackathon-tag> created:>2026-05-08
site:github.com pushed:>2026-05-09 "<hackathon-name>"
"<hackathon-name>" -site:<organizer-domain>     # finds team blog posts

# Sponsors
site:<sponsor>.com bounty hackathon 2026
"<sponsor>" "<hackathon-name>" submission requirements

# Judges (replace <judge-handle> per judge)
from:<judge-handle> since:2026-04-08 hackathon
from:<judge-handle> civic data OR open data OR MCP

# Community
"<hackathon-name>" subreddit
"<hackathon-name>" devpost
```

## Calendar

| When | Run | Watch for |
|---|---|---|
| Day 0 evening | Initial sweep | What tracks are crowded, sponsor docs you missed |
| Day 1 noon | Mid-hackathon | New competitors visible, mentor-session signals |
| Day 1 evening | Pre-sleep sweep | Late-day repo pushes, sponsor employees signaling intent |
| Day 2 morning | Final sweep | Last-minute submission requirements, judge social posts about the cohort |
