# Rules

Complete classification rules, priority scoring weights, and action routing logic for the Personal Assistant agent.

---

## Table of Contents

1. [Classification rules](#1-classification-rules)
2. [Priority scoring](#2-priority-scoring)
3. [Action routing](#3-action-routing)
4. [Edge cases and overrides](#4-edge-cases-and-overrides)

---

## 1. Classification rules

Every item ingested by the agent is classified into one of four urgency tiers. Classification happens in a single inference call that evaluates sender, content, context, and timing together.

### Pre-classification: Wiki enrichment

Before applying tier rules, the agent queries the Assistant Wiki for context:
1. Look up the sender's Person page — get VIP status, relationship, open items, communication patterns
2. Look up any matching Project pages — get status, deadlines, risks
3. Check Pattern pages — does a known behavioral pattern apply?
4. Check Open Question pages — is this related to a known unresolved question?

This context is attached to the item and informs all classification signals below.

### Tier definitions

#### P0 — Urgent
**Action required within 1 hour.**

An item is P0 if ANY of the following are true:
- Sender is on the VIP list (CEO, founders, board, key clients)
- Wiki Person page shows sender is in an escalation cycle (Pattern page match)
- Content contains explicit deadline for today with escalation language
- Content contains crisis or incident language ("outage", "data breach", "legal issue", "press inquiry")
- The thread has been escalated (sender references previous unanswered messages with frustration)
- A deadline mentioned in a previous message is now within 2 hours
- The item is a reply to something the user sent marked as urgent

**Exception:** VIP messages that are clearly trivial ("Thanks!", "Sounds good", emoji-only reactions) may be downgraded to P1 but never lower.

#### P1 — Respond
**Reply expected today.**

An item is P1 if ANY of the following are true:
- Contains a direct question to the user requiring their specific input
- Is client-facing (from or about a client/customer)
- Is a follow-up to a meeting that happened today (action items, shared notes)
- Contains a decision request with a deadline this week
- Is from a direct report requesting guidance or approval
- Sender has been waiting more than 24 hours for a response (check wiki Person page for open items)
- References an active project with an approaching milestone (check wiki Project page)
- Wiki Person page shows open items the user owes this sender

#### P2 — FYI
**Awareness only. No response needed.**

An item is P2 if ALL of the following are true:
- No direct question to the user
- No deadline within the next 48 hours
- User is CC'd, @mentioned in a group context, or the item is a status update
- Content is informational: announcements, shared documents, status reports, project updates

Common P2 patterns:
- CC'd on an email thread between other people
- Status update posts in Slack channels
- Notion page updates by team members
- Announcements and company-wide communications
- Shared documents or links without a specific ask

#### P3 — Low
**Batch for later. No urgency.**

An item is P3 if ALL of the following are true:
- Automated notification (GitHub, Jira, calendar, CI/CD)
- Marketing or promotional email
- Newsletter or digest from external source
- Non-urgent internal communication (social channels, general chatter)
- System-generated alerts that don't require human action

### Classification decision tree

```
Is sender on VIP list?
├── YES → Is content trivial? (thanks, emoji, acknowledgment only)
│   ├── YES → P1
│   └── NO → P0
└── NO → Continue...

Does content contain crisis/incident language?
├── YES → P0
└── NO → Continue...

Is there a deadline within 2 hours?
├── YES → P0
└── NO → Continue...

Is there a direct question requiring the user's input?
├── YES → Is it client-facing OR deadline this week?
│   ├── YES → P1
│   └── NO → Is it from a direct report or active project?
│       ├── YES → P1
│       └── NO → P2
└── NO → Continue...

Is the user CC'd or @mentioned in a group context?
├── YES → P2
└── NO → Continue...

Is this an automated notification or marketing?
├── YES → P3
└── NO → P2 (default for unclassifiable items)
```

### Confidence scoring

Each classification includes a confidence score (0.0 to 1.0):

| Confidence | Meaning | Action |
|------------|---------|--------|
| 0.9 - 1.0 | Very confident | Route normally |
| 0.7 - 0.89 | Confident | Route normally |
| 0.5 - 0.69 | Moderate | Route normally but note uncertainty in logs |
| Below 0.5 | Low confidence | Default to P2 (FYI). Never over-escalate on low confidence. |

---

## 2. Priority scoring

Within each tier, items are ranked by a weighted composite score from 0 to 100.

### Scoring weights

| Signal | Weight | Description |
|--------|--------|-------------|
| Sender importance | 30% | How important is the sender? |
| Deadline proximity | 25% | How soon is the deadline? |
| Topic relevance | 20% | Does this relate to active projects? |
| Thread heat | 15% | How active is this conversation? |
| Staleness | 10% | How long has this been waiting? |

### Signal scoring details

#### Sender importance (30 points max)

| Condition | Points |
|-----------|--------|
| On VIP list | 30 |
| Direct report to user | 22 |
| Client or external partner | 22 |
| Same team/department | 15 |
| Same organization, different team | 10 |
| External, not a client | 5 |
| Automated/system sender | 0 |

#### Deadline proximity (25 points max)

| Condition | Points |
|-----------|--------|
| Deadline within 2 hours | 25 |
| Deadline today | 20 |
| Deadline tomorrow | 15 |
| Deadline this week | 10 |
| Deadline next week | 5 |
| No explicit deadline | 0 |

Time-sensitive language boosters (add to deadline score, cap at 25):
- "ASAP" / "urgent" / "critical" → +10
- "when you get a chance" → +0
- "no rush" → -5 (can bring score to 0, not negative)

#### Topic relevance (20 points max)

| Condition | Points |
|-----------|--------|
| Matches an active project with deadline this week | 20 |
| Matches an active project | 15 |
| Related to a recent Granola meeting topic | 12 |
| Matches a Notion database the user frequently edits | 8 |
| General work topic | 3 |
| Off-topic / personal / social | 0 |

#### Thread heat (15 points max)

| Condition | Points |
|-----------|--------|
| 5+ replies in the last hour | 15 |
| 3-4 replies in the last hour | 12 |
| User was @mentioned or directly addressed | 10 |
| Multiple reactions (emoji) on a message | 5 |
| Single reply, no reactions | 2 |
| No thread activity | 0 |

#### Staleness (10 points max)

| Condition | Points |
|-----------|--------|
| Sender has followed up 2+ times | 10 |
| Waiting for user's response > 48 hours | 8 |
| Waiting for user's response > 24 hours | 5 |
| Waiting for user's response > 12 hours | 3 |
| New message, no wait time | 0 |

### Score calculation example

```
Item: Email from a client asking about project timeline
- Sender importance: Client → 22 points
- Deadline proximity: "by end of week" → 10 points
- Topic relevance: Matches "Q3 Product Launch" project → 15 points
- Thread heat: 2 replies today → 5 points
- Staleness: First message, no wait → 0 points

Total: 22 + 10 + 15 + 5 + 0 = 52/100

Classification: P1 (direct question, client-facing)
Priority within P1: 52/100 (ranked against other P1 items)
```

### Cross-source and wiki enrichment

Before finalizing the score, check for cross-source and wiki context:

1. **Granola enrichment**: If the sender was in a recent meeting (last 7 days), check if the current message relates to something discussed. If yes, boost topic relevance by +5.

2. **Notion enrichment**: If the topic matches a Notion project, check the project's status and deadline. If the project has a milestone this week, boost deadline proximity by +5.

3. **Cross-channel enrichment**: If the same topic appears in both email and Slack, use the higher score from either source (after merging the items in dedup).

4. **Wiki Person page enrichment**: If the sender's wiki page shows open items waiting for the user's response, add +5 staleness points. If the wiki shows the sender is in an escalation pattern, add +3 thread heat points.

5. **Wiki Project page enrichment**: If the wiki Project page shows the project is at risk or a milestone is approaching, add +5 deadline proximity points.

6. **Wiki Pattern enrichment**: If a Pattern page suggests this type of item is typically low-signal (e.g., "Monday morning catch-up emails"), subtract -3 relevance points. If the pattern suggests escalation, add +3 thread heat points.

7. **Wiki Open Question enrichment**: If the item relates to a known Open Question, add +3 relevance points — someone may be providing the answer.

---

## 3. Action routing

Each classified and scored item maps to specific output actions.

### Routing table

| Tier | Draft response? | Slack alert? | Digest inclusion? | Notion task? | Wiki update? |
|------|----------------|-------------|-------------------|-------------|-------------|
| P0 Urgent | Yes — immediate | Yes — Slack DM right away | Yes — in "Urgent" section | Only if meeting-related | Yes — Person + Project pages |
| P1 Respond | Yes — queued | No | Yes — in "Needs response" section | Only if meeting-related | Yes — Person + Project pages |
| P2 FYI | No | No | Yes — in "Awareness" section | No | Yes — Person page if 3+ appearances |
| P3 Low | No | No | No (weekly rollup only) | No | No |
| Meeting (any tier) | Follow-up drafts if needed | No | Yes — in "Meeting prep" | Yes — action items | Yes — Person, Project, Decision, Open Question pages |

### Draft response routing details

**P0 drafts:**
- Created immediately during the triage run
- Saved to Gmail drafts (in the correct thread) or logged as Slack draft
- Included in the urgent Slack DM alert with a direct link
- Tone: Direct, action-oriented, ready to send with minimal editing

**P1 drafts:**
- Created during the triage run
- Saved to Gmail drafts or logged for Slack
- Included in the daily digest under "Draft queue"
- Tone: Covers key points, leaves room for the user to add detail

### Alert routing details

Only P0 items generate real-time alerts. The Slack DM alert format:

```
:red_circle: *Urgent: [one-line summary]*

*From:* [sender name]
*Source:* [Gmail/Slack] — [link to source]
*Why urgent:* [one-sentence reasoning]

*Suggested action:* [what you recommend]
*Draft ready:* [Yes — link to draft / No]
```

### Digest routing details

Items are queued for the digest with their classification and score. The daily_digest skill reads from this queue when composing the briefing. Items are organized by tier, then by score within each tier (highest score first).

### Notion task routing details

Tasks are created in Notion only for:
1. Action items extracted from Granola meetings (via task_extraction skill)
2. Follow-ups identified during meeting_followup

Tasks are NOT created for:
- Every email that needs a response (that's what drafts are for)
- FYI items
- Low-priority items

---

## 4. Edge cases and overrides

### Edge case: VIP sends trivial message
- A "thanks!" from the CEO is still P1 (downgraded from P0)
- A VIP message is never lower than P1

### Edge case: Conflicting signals
- If sender is VIP but content says "no rush" → P1 (VIP floor of P1, but don't escalate to P0)
- If deadline is today but sender is unknown → P1 (deadline bumps it up, but not to P0 without VIP or crisis)
- If thread is hot but content is social → P2 (content type takes precedence over activity)

### Edge case: Same thread, multiple tiers
- If a thread has messages spanning multiple tiers (started as P3, now has a P0 reply), classify based on the NEWEST unprocessed message
- The thread's overall tier is the highest tier of any unprocessed message in it

### Edge case: First run (no cursor)
- Look back 24 hours
- Process everything, but cap the digest at the 20 highest-scored items to avoid information overload
- Set the cursor after processing

### Edge case: Source unavailable
- If an MCP connector fails during triage, skip that source and continue
- Log the failure
- Include a note in the digest: "Note: [source] was unavailable during this triage cycle"
- Do NOT retry in the same session — the next cron run will pick it up

### Edge case: Classification confidence below 0.5
- Default to P2 (FYI)
- Never over-escalate on low confidence
- Log the item with a note that classification was uncertain
- Include in the digest with a flag: "[classification uncertain]"

### Edge case: Duplicate across sources
- Same conversation in Gmail and Slack: merge into one item
- Use the source with more context as primary (usually email for long threads, Slack for quick exchanges)
- Keep both source links in the merged item

### Override: User corrections
- If the user responds to a digest saying "this should have been P0" or similar, log the correction
- Over time, these corrections should inform the VIP list and channel filter updates
- The agent does not self-modify its rules, but corrections should be noted for the human configuring the agent to update
