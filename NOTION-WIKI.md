# Notion Wiki: The Agent's Knowledge Base

The wiki is the agent's persistent, compounding memory. Instead of being stateless between runs — forgetting everything it learned about people, projects, and patterns — the agent maintains a structured knowledge base in Notion that gets richer with every interaction.

Inspired by the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f): the agent incrementally builds and maintains a structured, interlinked collection of pages that sits between the raw data sources and the agent's decision-making. Cross-references are already there. Synthesis already reflects everything it's seen.

---

## Table of Contents

1. [Why a wiki](#1-why-a-wiki)
2. [Three-layer architecture](#2-three-layer-architecture)
3. [Notion database schema](#3-notion-database-schema)
4. [Page types and templates](#4-page-types-and-templates)
5. [Write operations (when the agent updates the wiki)](#5-write-operations)
6. [Read operations (when the agent queries the wiki)](#6-read-operations)
7. [Maintenance operations](#7-maintenance-operations)
8. [How the wiki connects to the pipeline](#8-how-the-wiki-connects-to-the-pipeline)
9. [Setup instructions](#9-setup-instructions)

---

## 1. Why a wiki

Without the wiki, the agent is a stateless triage machine. It classifies based on rules and a VIP list, but it doesn't *know* anything. Every run starts from zero context.

With the wiki, the agent compounds knowledge over time:

| Without wiki | With wiki |
|-------------|-----------|
| "This email is from sam@acme.com" | "Sam Park at Acme Corp. Prefers email over Slack. Last discussed Q3 timeline on June 15. Has followed up twice about the API integration. Acme's contract renewal is in August." |
| "This Slack thread has 5 replies" | "This thread is about the platform migration — Phase 2 deadline slipped twice already. Mark flagged risk last week. Related to the board update Sarah asked about." |
| "Meeting with 4 people about product" | "Recurring weekly sync with the product team. Last 3 meetings focused on launch blockers. Jane committed to the design review 2 weeks ago and hasn't delivered." |

The wiki turns the agent from a classifier into an assistant that has institutional memory.

### What the wiki is NOT

- **Not a CRM.** It doesn't replace your CRM or contact management tool. It stores communication-relevant context, not deal pipelines or sales data.
- **Not a project management tool.** Tasks still go in your task databases. The wiki stores *context about* projects, not project plans.
- **Not an archive.** Raw messages stay in Gmail and Slack. The wiki stores synthesized knowledge extracted from those messages, not copies of them.

---

## 2. Three-layer architecture

Following the LLM Wiki pattern, the system has three layers:

### Layer 1: Raw sources (immutable)

Gmail, Slack, Granola, and Notion — the original messages, transcripts, and pages. The agent reads from these but the wiki never modifies them. They are the source of truth.

### Layer 2: The wiki (agent-maintained)

A dedicated Notion database where the agent creates and updates structured pages. The agent owns this layer entirely — it creates pages, updates them with new information, maintains cross-references, and flags contradictions. The human can read and correct pages, but day-to-day maintenance is the agent's job.

### Layer 3: The schema (configuration)

The rules defined in the system prompt and this document that tell the agent how to maintain the wiki — what page types exist, when to create vs. update, how to cross-reference, and when to flag something for human attention. This is what makes the agent a disciplined wiki maintainer rather than a generic note-taker.

---

## 3. Notion database schema

The wiki lives in a single Notion database called **"Assistant Wiki"** with the following properties:

### Database properties

| Property | Type | Purpose |
|----------|------|---------|
| Title | Title | Page name (e.g., "Sam Park", "Q3 Product Launch", "Board meeting cadence") |
| Page type | Select | One of: `Person`, `Organization`, `Project`, `Topic`, `Pattern`, `Decision`, `Open question` |
| Status | Select | `Active`, `Stale`, `Archived` |
| Last updated by agent | Date | When the agent last touched this page |
| Last verified | Date | When the content was last confirmed accurate (by agent or human) |
| Confidence | Select | `High`, `Medium`, `Low` — how confident the agent is in the information |
| Related pages | Relation | Links to other wiki pages (self-referencing relation) |
| Source count | Number | How many raw sources contributed to this page |
| Tags | Multi-select | Freeform tags for grouping (e.g., "client", "board", "engineering", "hiring") |

### Views

Create these views in the database for easy browsing:

| View | Filter | Sort | Purpose |
|------|--------|------|---------|
| All active | Status = Active | Last updated, newest first | Default view |
| People | Page type = Person | Title A-Z | Contact directory |
| Projects | Page type = Project | Last updated | Active project context |
| Stale pages | Status = Stale | Last verified, oldest first | Pages needing refresh |
| Recently updated | All | Last updated by agent, newest first | See what the agent has been learning |
| Low confidence | Confidence = Low | Last updated | Pages the agent is unsure about |

---

## 4. Page types and templates

### Person

Tracks communication context about a specific individual.

```markdown
# [Name]

## Identity
- **Email:** sam.park@acmecorp.com
- **Slack:** @sam.park
- **Organization:** Acme Corp (Client)
- **Role:** VP of Engineering
- **VIP status:** Yes — key client contact
- **Relationship to user:** Primary point of contact for Acme engagement

## Communication preferences
- Prefers email for formal decisions, Slack for quick questions
- Responds fastest in mornings (EST)
- Typically concise — mirrors short messages
- Formal tone in group threads, casual in 1:1

## Recent context
- [2026-06-20] Followed up on API integration timeline — waiting for user's response
- [2026-06-18] Discussed Q3 roadmap alignment in product sync
- [2026-06-15] Raised concern about data migration path during weekly standup
- [2026-06-10] Sent contract amendment for review (user forwarded to legal)

## Key topics
- API integration (active — deadline July 15)
- Data migration (blocked — waiting on security review)
- Contract renewal (upcoming — August)

## Open items
- Awaiting user's response on API integration timeline (since June 20)
- Contract amendment still with legal (since June 10)

## Notes
- Reports to CTO at Acme. Decision-maker for technical partnerships.
- Previously worked at Globex — may know Lisa Wang.
```

### Organization

Tracks context about a company or group the user interacts with.

```markdown
# [Organization Name]

## Overview
- **Type:** Client / Vendor / Partner / Internal team
- **Key contacts:** [[Sam Park]], [[Lisa Wang]]
- **Engagement status:** Active client since March 2026
- **Contract:** Annual, renews August 2026

## Active workstreams
- API integration (owner: [[Sam Park]], deadline: July 15)
- Data migration (blocked on security review)
- Training program (scheduled for Q4)

## Communication patterns
- Weekly product sync (Tuesdays, 2pm)
- Monthly executive check-in (first Monday)
- Slack channel: #client-acme

## Recent developments
- [2026-06-18] Raised Q3 roadmap concerns — may request timeline extension
- [2026-06-10] Sent contract amendment for review

## Relationship health
- Overall: Good, but tension on API timeline
- Risk: If July 15 deadline slips, may affect renewal conversation
```

### Project

Tracks context about an active project beyond what's in the project management tool.

```markdown
# [Project Name]

## Overview
- **Status:** Active
- **Owner:** [[User name]]
- **Notion tracker:** [link to project database]
- **Key deadline:** July 15, 2026
- **Stakeholders:** [[Sam Park]], [[Jane Smith]], [[Mark Johnson]]

## Current state
- Phase 2 of 3 — integration testing
- 2 of 5 milestones complete
- On track but tight — no buffer for delays

## Key decisions made
- [2026-06-15] Decided to use REST over GraphQL for client API — Sam preferred REST for team familiarity
- [2026-06-08] Approved additional engineering hire to meet deadline — Jane authorized headcount
- [2026-06-01] Scoped down Phase 2 to exclude admin dashboard — moved to Phase 3

## Risks and blockers
- Security review for data migration not started (blocking Phase 2 completion)
- Sam's team needs API docs by June 25 — not yet written
- Mark raised concerns about test coverage in last standup

## Related threads
- Gmail: "Q3 API Integration — Timeline Update" (June 20)
- Slack: #product thread on migration path (June 18)
- Granola: Product sync notes (June 18)

## Lessons / context for future
- This client prefers phased rollouts — don't propose big-bang launches
- Previous project (Q1 dashboard) was delivered 2 weeks late — set expectations early this time
```

### Topic

Tracks recurring themes or subjects that come up across conversations.

```markdown
# [Topic Name]

## Summary
Brief description of what this topic covers and why it matters.

## Key positions
- [[Jane Smith]] believes X
- [[Mark Johnson]] prefers Y
- Team consensus is leaning toward Z

## Timeline of developments
- [2026-06-20] New data from client supports approach Z
- [2026-06-15] Mark raised concern about approach Y at standup
- [2026-06-10] Jane proposed approach X in leadership meeting

## Related projects
- [[Q3 Product Launch]] — directly affected by this decision
- [[Platform Migration]] — indirectly affected

## Open questions
- Has anyone validated approach Z with the security team?
- What's the cost difference between X and Y?
```

### Pattern

Tracks recurring behaviors, preferences, or rhythms the agent has observed.

```markdown
# [Pattern Name]

## Observation
What the agent has noticed over time.

## Evidence
- [Date] Example 1
- [Date] Example 2
- [Date] Example 3

## Confidence
High / Medium / Low — based on how many times the pattern has been observed.

## How this affects triage
How the agent should use this pattern in classification and scoring.
```

Example patterns:
- "Monday morning email surge" — volume spikes 3x on Monday mornings, most items are catch-up from the weekend and can be P2
- "Board members email before board meetings" — board members tend to send emails 2-3 days before scheduled board meetings, often P0
- "Client escalation cycle" — when Sam follows up twice, a call request comes within 48 hours

### Decision

Tracks important decisions made so the agent doesn't contradict them or miss their implications.

```markdown
# [Decision Name]

## Decision
What was decided, stated clearly.

## Date
When it was decided.

## Decision maker(s)
Who made the call.

## Context
Why this decision was made — what alternatives were considered.

## Implications
What this means for ongoing work.

## Status
Active / Superseded by [[other decision]]
```

### Open question

Tracks unresolved questions the agent has noticed across conversations.

```markdown
# [Question]

## First raised
When and where this question first came up.

## Who's asking
Who needs the answer.

## Who can answer
Who likely has the answer.

## Status
Open / Answered on [date]

## Related pages
Links to relevant wiki pages.
```

---

## 5. Write operations

The agent updates the wiki during these events:

### During email triage (every hour)

For each item processed:

1. **Person pages**: If the sender has a wiki page, append to "Recent context" with today's interaction summary. If no page exists and the sender has appeared 3+ times in the last 7 days, create a new Person page.

2. **Project pages**: If the item matches an active project, update the project's "Related threads" section and, if the content contains a decision or blocker, update those sections too.

3. **Open questions**: If the item raises a question that nobody has answered, check if an Open Question page exists. If not, and the question has come up more than once, create one.

4. **Pattern detection**: If the agent notices a recurring pattern (e.g., a sender always emails at the same time, or a topic keeps resurfacing), update or create a Pattern page.

### After meeting processing

For each meeting processed via Granola:

1. **Person pages**: Update "Recent context" for all meeting participants.
2. **Project pages**: Update relevant projects with decisions made and action items.
3. **Decision pages**: If a clear decision was made in the meeting, create a Decision page.
4. **Topic pages**: If a topic was discussed at length, update or create a Topic page with the latest positions.
5. **Open questions**: If questions were raised but not answered, create or update Open Question pages.

### During daily digest compilation

The morning digest is a natural moment for the agent to review the wiki:

1. **Stale detection**: Mark any page as "Stale" if it hasn't been updated or verified in 14 days.
2. **Confidence decay**: Downgrade confidence from High → Medium if the page hasn't been reinforced by new sources in 21 days. Medium → Low after 30 days.
3. **Cross-reference check**: When composing meeting prep, link relevant wiki pages to give the user richer context.

### Write rules

1. **Never overwrite, always append.** When updating a page, add new information to the existing content. Don't delete previous entries — they're the history.

2. **Date every entry.** Every piece of context added must include the date it was observed: `[2026-06-21] Sam asked about API timeline again`.

3. **Cite the source.** Note where the information came from: `(Gmail thread: "Q3 Timeline Update")` or `(Granola: Product sync June 18)`.

4. **Create conservatively.** Don't create a Person page for every sender — wait until someone has appeared 3+ times. Don't create a Topic page for a one-off mention.

5. **Cross-reference aggressively.** When creating or updating a page, link to all related pages using `[[Page Name]]` notation (Notion relations). The value of the wiki compounds through connections.

6. **Flag uncertainty.** If the agent extracts information but isn't confident it's correct, mark the entry with `[unverified]` and set page confidence to Low.

7. **Respect the human.** If a human edits a wiki page, the agent treats that content as authoritative and doesn't overwrite it. Human corrections take precedence.

---

## 6. Read operations

The agent reads from the wiki during these pipeline stages:

### During classification (Step 3)

Before classifying an item, the agent queries the wiki:

1. **Person lookup**: Search for the sender's wiki page. If found, read:
   - VIP status and relationship context
   - Communication preferences (informs draft tone)
   - Open items (is this a follow-up to something pending?)
   - Recent context (what have they been talking about lately?)

2. **Project lookup**: If the item mentions a known project, read:
   - Current status and key deadlines
   - Risks and blockers (is this about a known issue?)
   - Key stakeholders (does this involve important people?)

3. **Pattern lookup**: Check if any known patterns apply:
   - "Monday morning surge" → don't over-classify routine catch-up emails
   - "Board member pre-meeting emails" → classify higher than default
   - "Client escalation cycle" → if this is a second follow-up, escalate

### During priority scoring (Step 4)

The wiki provides enrichment signals:

| Wiki signal | Scoring impact |
|-------------|---------------|
| Sender has open items waiting for user | +5 staleness points |
| Item relates to a project with deadline this week | +5 deadline points |
| Sender's page shows escalation pattern forming | +3 thread heat points |
| Topic has an unresolved Open Question page | +3 relevance points |
| Pattern suggests this is routine/low-signal | -3 relevance points |

### During draft response generation (Step 6)

The wiki informs how drafts are written:

1. **Communication preferences**: If the sender's page says they prefer concise messages, keep the draft short. If they're formal, match that.
2. **Relationship context**: Reference recent interactions naturally: "Following up on our discussion about the API timeline..."
3. **Open items**: If the sender is asking about something the user owes them, acknowledge it directly rather than being vague.
4. **Decision history**: If the item relates to a decision already made, reference it: "As we decided in the June 15 sync, we're going with REST for the client API."

### During daily digest compilation

The wiki enriches the digest:

1. **Meeting prep**: For each meeting today, pull the wiki pages for all attendees and related projects. Include a "context" section with recent interactions, open items, and relevant decisions.
2. **Stale items awareness**: If the EOD wrap shows items waiting for the user's response, cross-reference with the sender's wiki page to add context about how long they've been waiting and how important the relationship is.
3. **Pattern insights**: If the digest is being compiled on a Monday, note the "Monday morning surge" pattern and reassure the user that volume will normalize.

---

## 7. Maintenance operations

### Automated maintenance (agent-driven)

All automated maintenance runs on **Claude Haiku 4** via a dedicated cron at 6:45 AM (before the morning digest). These are structured, mechanical operations — database queries, date comparisons, status updates — that Haiku handles accurately at ~75% lower cost than Sonnet.

**Staleness detection** (runs at 6:45 AM via `wiki_maintain` cron):
- Pages not updated in 14 days → Status set to "Stale"
- Pages not updated in 30 days → Confidence downgraded one level
- Pages not updated in 60 days → Status set to "Archived" (but not deleted)

**Contradiction detection** (runs during triage when updating pages):
- If new information contradicts existing wiki content, the agent:
  1. Does NOT overwrite the existing content
  2. Adds the new information with a `[contradicts previous entry]` flag
  3. Sets page confidence to Low
  4. Adds a note to the next digest: "Wiki conflict detected: [page name] — please review"

**Orphan detection** (runs weekly):
- Pages with no related pages linked → flag for review
- Pages with zero source citations → flag as potentially fabricated
- Open Questions with Status = Open for 30+ days → include in weekly digest for user to resolve or close

**Merge detection** (runs during page creation):
- Before creating a new page, search for existing pages with similar titles or content
- If a likely duplicate exists, update the existing page instead of creating a new one
- If two existing pages cover the same ground, flag them for the user to merge

### Manual maintenance (human-driven)

The user can and should:
- **Correct inaccuracies**: Edit any page. The agent treats human edits as authoritative.
- **Merge duplicates**: Combine pages the agent couldn't confidently merge on its own.
- **Archive completed projects**: Mark them as Archived so they stop influencing scoring.
- **Update VIP status**: If someone's importance changes, update their Person page — the agent will pick up the change.
- **Resolve open questions**: Mark Open Questions as answered when resolved.

---

## 8. How the wiki connects to the pipeline

The wiki is not a bolt-on — it's woven into every stage of the processing pipeline.

### Updated pipeline flow

```
Cron fires
    │
    ▼
Read cursors from state store
    │
    ▼
┌─────────────────────────────────┐
│  INGEST from Gmail, Slack,      │
│  Granola, Notion                │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  DEDUPLICATE + MERGE            │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  ENRICH from wiki               │◄─── READ: Person, Project, Pattern pages
│  (sender context, project       │     inform classification input
│   status, known patterns)       │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  CLASSIFY (P0-P3)               │     Wiki context improves accuracy
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  SCORE (priority ranking)       │◄─── READ: Wiki enrichment signals
│                                 │     add/subtract scoring points
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  ROUTE to actions               │
└───────┬───┬───┬───┬─────────────┘
        │   │   │   │
        ▼   │   │   ▼
   Alerts   │   │   Digest queue
        │   ▼   ▼        │
        │ Drafts Tasks    │
        │   │   │         │
        │   │   │         │
        ▼   ▼   ▼         ▼
┌─────────────────────────────────┐
│  UPDATE WIKI                    │──── WRITE: Person, Project, Topic,
│  (new context from this run)    │     Decision, Pattern, Open Question pages
└─────────────────────────────────┘
```

### What changed from the original pipeline

1. **New step: ENRICH** — inserted between Dedup and Classify. The agent queries the wiki for sender, project, and pattern context before classifying.

2. **New step: UPDATE WIKI** — added at the end of every run. The agent writes what it learned back to the wiki.

3. **Classification accuracy improves** — because the agent has context it didn't have before. A second follow-up from Sam hits harder when the agent knows Sam's first follow-up is already waiting.

4. **Draft quality improves** — because the agent knows communication preferences, relationship context, and recent history.

5. **Digest gets richer** — meeting prep sections now include wiki context for each attendee and topic.

---

## 9. Setup instructions

### Step 1: Create the wiki database in Notion

1. Open Notion
2. Create a new full-page database called **"Assistant Wiki"**
3. Add the properties from the [database schema](#3-notion-database-schema) above:
   - Title (default)
   - Page type (Select): Person, Organization, Project, Topic, Pattern, Decision, Open question
   - Status (Select): Active, Stale, Archived
   - Last updated by agent (Date)
   - Last verified (Date)
   - Confidence (Select): High, Medium, Low
   - Related pages (Relation → self)
   - Source count (Number)
   - Tags (Multi-select)
4. Create the [database views](#views) listed above
5. Make sure the Notion MCP connector has access to this database

### Step 2: Seed the wiki with initial pages

Before the agent starts running, create starter pages for:

1. **Your VIP contacts** — create a Person page for each VIP with whatever you know about their communication preferences and current context. The agent will enrich these over time.

2. **Active projects** — create a Project page for each active project with current status, key deadlines, and stakeholders.

3. **Your organization** (if applicable) — create an Organization page for your own company and for key clients/partners.

You don't need to create pages for everyone — the agent will create new pages as it encounters people 3+ times. But seeding the VIPs gives the agent a head start.

### Step 3: Update the system prompt

Add the wiki-related instructions to your system prompt. See [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md) for the updated prompt that includes wiki read and write operations.

### Step 4: Grant Notion access

Make sure the Notion MCP connector has read + write access to the Assistant Wiki database. The agent needs to:
- Query pages (read)
- Create new pages (write)
- Update existing pages (write)
- Create relations between pages (write)

### Step 5: Test

1. Trigger a manual triage run
2. Check the wiki database — the agent should have created or updated pages for senders it encountered
3. Check the agent logs — you should see wiki read and write operations logged
4. Verify cross-references — Person pages should link to related Project pages

### Estimated cost impact

The wiki adds Notion API calls to every triage run. All wiki operations run on **Haiku** for cost efficiency:
- **Read operations**: 2-5 queries per run (searching for sender, project, patterns)
- **Write operations**: 1-3 page creates/updates per run (only when new context is found)
- **Maintenance**: Dedicated 6:45 AM cron on Haiku (staleness, confidence, lint)
- **Token impact**: ~500-1,500 additional tokens per run for wiki read/write
- **Monthly cost increase**: ~$0.50-1.50/month (on Haiku — would be ~$2-5/month on Sonnet)

This is modest for the value it provides. The wiki makes the agent meaningfully smarter over time. Model delegation to Haiku keeps wiki costs at ~75% less than if everything ran on Sonnet.
