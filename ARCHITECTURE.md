# Architecture

Technical architecture overview and data flow for the Personal Assistant agent. For the visual diagram, see `assets/architecture-diagram.html` (open in a browser) or `assets/architecture-diagram.pdf`.

---

## System overview

The Personal Assistant is a **Claude Managed Agent** — a stateful, autonomous AI agent hosted entirely on Anthropic's infrastructure. It requires no servers, containers, or cloud infrastructure from the user. It maintains a persistent wiki in Notion — a compounding knowledge base that makes the agent smarter with every run.

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Managed Agent                       │
│                  (Anthropic-hosted, always-on)                │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  System   │  │  Skills  │  │Credential│  │   Cron   │    │
│  │  Prompt   │  │          │  │  Vault   │  │Scheduler │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Processing Pipeline                    │   │
│  │  Ingest → Dedup → Enrich → Classify → Score → Route  │   │
│  │                     ▲                            │     │   │
│  │                     │    ┌──────────────┐        │     │   │
│  │                     └────│ Assistant    │◄───────┘     │   │
│  │                          │ Wiki (Notion)│              │   │
│  │                          └──────────────┘              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Gmail   │  │  Slack   │  │ Granola  │  │  Notion  │    │
│  │   MCP    │  │   MCP    │  │   MCP    │  │   MCP    │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
└───────┼──────────────┼──────────────┼──────────────┼─────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │  Gmail  │   │  Slack  │   │ Granola │   │ Notion  │
   │   API   │   │   API   │   │   API   │   │   API   │
   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

---

## Agent infrastructure components

### 1. System prompt

The agent's "brain" — a detailed set of instructions that define:
- Who the agent works for (identity)
- What data sources to use
- How to classify items (rules)
- How to score priorities (weights)
- How to draft responses (writing style)
- What to never do (constraints)

The system prompt is loaded into the agent's context at the start of every session. It's the single source of truth for all agent behavior.

**Size**: ~3,000-5,000 tokens (loaded on every run, so keeping it concise saves cost)

### 2. Skills

Named capabilities the agent can perform. Each skill is a focused routine with its own:
- Input parameters
- Processing steps
- Output format
- Rules and constraints

Six core skills:
| Skill | Model | Trigger | Purpose |
|-------|-------|---------|---------|
| `email_triage` | Sonnet | Every 10 min (urgent) / every hour (full) | Pull, enrich from wiki, classify, score, route items, update wiki |
| `meeting_followup` | Sonnet | Called by email_triage when meetings found | Process meeting transcripts, update wiki with decisions and context |
| `daily_digest` | Sonnet | 7 AM (morning) / 5 PM (EOD) | Compile wiki-enriched briefings (reads wiki maintenance results) |
| `task_extraction` | Sonnet | Called by meeting_followup | Create Notion tasks from meetings |
| `draft_response` | Sonnet | Called by email_triage for P0/P1 items | Generate wiki-informed draft replies |
| `wiki_maintain` | **Haiku** | 6:45 AM weekdays (own cron) / weekly lint | Stale detection, confidence decay, lint, orphan/contradiction detection |

**Model delegation**: Sonnet handles judgment-heavy work (classification, scoring, drafting). Haiku handles all wiki I/O — reads, writes, and maintenance — at ~75% lower token cost. Wiki operations within Sonnet skills (e.g., reading a Person page during triage) delegate to Haiku-tier reasoning internally.

### 3. Credential vault

Encrypted storage for OAuth tokens:
- **AES-256 encryption at rest** in Anthropic's vault
- **Automatic token refresh** when tokens expire
- **Scoped permissions** — each connector only has the access you granted
- **No passwords in config** — everything is OAuth-based
- **Revocable** — disconnect from the source service at any time

### 4. Cron scheduler

Automated triggers that wake the agent on a set cadence:
- Each trigger fires at its scheduled time
- A new agent session starts with the appropriate model (Sonnet or Haiku)
- The session runs the specified skill with the given parameters
- The session ends and the agent goes back to sleep
- State (cursors, queues, wiki) persists between sessions
- Five schedules: urgent scan (10 min), full triage (hourly), wiki maintenance (6:45 AM, Haiku), morning digest (7 AM), EOD wrap (5 PM)

---

## Data flow: Processing pipeline

### Step-by-step flow

```
                        ┌──────────────┐
                        │  Cron fires  │
                        └──────┬───────┘
                               │
                               ▼
                     ┌─────────────────┐
                     │ Read cursors    │
                     │ from state store│
                     └────────┬────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼             ▼
          ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
          │  Gmail   │ │  Slack   │ │ Granola  │ │  Notion  │
          │  fetch   │ │  fetch   │ │  fetch   │ │  fetch   │
          └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
               │            │            │            │
               └─────────┬──┴────────────┴──┬─────────┘
                          │                 │
                          ▼                 │
                 ┌──────────────┐           │
                 │  Normalize   │           │
                 │  to common   │           │
                 │   schema     │           │
                 └──────┬───────┘           │
                        │                   │
                        ▼                   │
                 ┌──────────────┐           │
                 │ Deduplicate  │           │
                 │  + merge     │           │
                 └──────┬───────┘           │
                        │                   │
                        ▼                   │
                 ┌──────────────┐     ┌──────────────┐
                 │  Enrich from │◄────│ Assistant    │
                 │  wiki        │     │ Wiki (Notion)│
                 └──────┬───────┘     └──────┬───────┘
                        │                    ▲
                        ▼                    │
                 ┌──────────────┐            │
                 │  Classify    │◄───────────┘
                 │  (P0-P3)     │    (wiki context: Person,
                 └──────┬───────┘     Project, Pattern pages)
                        │
               ┌────────┼────────┐────────┐
               ▼        ▼        ▼        ▼
           ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
           │  P0  │ │  P1  │ │  P2  │ │  P3  │
           └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘
              │        │        │        │
              ▼        ▼        ▼        ▼
         ┌──────────────────────────────────┐
         │         Priority scorer          │
         │  (weighted composite: sender,    │
         │   deadline, topic, heat, stale   │
         │   + wiki enrichment signals)     │
         └──────────────┬───────────────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │ Action router│
                 └──┬──┬──┬──┬─┘
                    │  │  │  │
         ┌──────────┘  │  │  └──────────┐
         ▼             ▼  ▼             ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │  Urgent  │ │  Draft   │ │  Notion  │ │  Daily   │
   │  alert   │ │  queue   │ │  tasks   │ │  digest  │
   │(Slack DM)│ │ (Gmail)  │ │          │ │  queue   │
   └──────────┘ └──────────┘ └──────────┘ └──────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │ Update wiki  │──── Write Person, Project,
                 │              │     Decision, Pattern, and
                 │              │     Open Question pages
                 └──────────────┘
```

### Common schema

Every item from every source is normalized into this schema before classification:

```json
{
  "item_id": "unique-identifier",
  "source": "gmail | slack | granola | notion",
  "sender": {
    "name": "Jane Smith",
    "email": "jane@company.com",
    "slack_handle": "@jane.smith",
    "is_vip": true
  },
  "timestamp": "2026-06-21T14:30:00-04:00",
  "content": {
    "subject": "Q3 launch timeline",
    "body": "Full message body...",
    "summary": "One-line summary for digest"
  },
  "thread_id": "source-specific-thread-id",
  "metadata": {
    "labels": ["Client/Active", "IMPORTANT"],
    "channel": "#product",
    "reactions": [":thumbsup:", ":eyes:"],
    "participants": ["Jane Smith", "Mark Johnson"],
    "attachments": ["Q3_timeline.pdf"],
    "meeting_title": "Q3 Planning Sync",
    "action_items": ["Review timeline by Friday"],
    "reply_count": 5,
    "last_reply_at": "2026-06-21T14:25:00-04:00"
  }
}
```

### Deduplication logic

```
For each pair of items (A, B):
  If A.source != B.source:  (cross-source)
    If overlap(A.participants, B.participants) >= 2:
      If similarity(A.content, B.content) > 0.7:
        MERGE → keep richer source as primary, link both
      If A.thread_id references B.thread_id (or vice versa):
        MERGE → same conversation across platforms

  If A.source == B.source:  (same source)
    If hash(A.content) == hash(B.content):
      SKIP → already processed (cursor backup)
    If A.thread_id == B.thread_id:
      MERGE → only process new messages in the thread
```

### Cross-source enrichment

Before scoring, the agent enriches items with context from other sources:

```
For each classified item:
  1. Check Granola:
     - Was there a recent meeting with the same sender/participants?
     - Were there action items from that meeting related to this topic?
     - If yes → boost topic relevance by +5

  2. Check Notion:
     - Does this item match an active project?
     - Is the project's milestone deadline approaching?
     - If yes → boost deadline proximity by +5

  3. Check cross-channel:
     - Is the same topic being discussed in another channel/source?
     - If yes → use the higher score from either source
```

---

## Output surfaces

### 1. Urgent alert (Slack DM)

**When**: Real-time, whenever a P0 item is detected
**Where**: User's Slack DM
**Format**:
```
:red_circle: *Urgent: [one-line summary]*

*From:* [sender name]
*Source:* [Gmail/Slack] — [link]
*Why urgent:* [one-sentence reasoning]

*Suggested action:* [recommendation]
*Draft ready:* [Yes — link / No]
```

### 2. Draft queue (Gmail drafts)

**When**: Batched during triage runs
**Where**: Gmail drafts (in the correct thread)
**Contents**: Response drafted in the user's writing style with "[Draft by assistant — please review before sending]" footer

### 3. Notion tasks

**When**: After each meeting is processed
**Where**: Appropriate Notion project database
**Contents**: Task with title, assignee, due date, priority, source link, and context

### 4. Daily digest (Slack DM)

**When**: 7 AM (morning) / 5 PM (EOD) on weekdays
**Where**: User's Slack DM
**Contents**: Structured briefing with prioritized items, wiki-enriched meeting prep, wiki insights, and draft queue status

### 5. Assistant Wiki (Notion)

**When**: Updated at the end of every triage run; maintained during morning digest
**Where**: Dedicated Notion database ("Assistant Wiki")
**Contents**: Persistent, compounding knowledge base with 7 page types:
- **Person** — communication context for individuals (preferences, recent interactions, open items)
- **Organization** — company/team context (contacts, active workstreams, relationship health)
- **Project** — project context beyond the PM tool (decisions, risks, lessons, related threads)
- **Topic** — recurring themes with evolving positions and context
- **Pattern** — observed behavioral patterns (email rhythms, escalation cycles, volume spikes)
- **Decision** — important decisions with context, implications, and status
- **Open Question** — unresolved questions with ownership and timeline

The wiki is the agent's institutional memory. It makes classification more accurate, drafts more contextual, and digests more insightful over time.

---

## Security model

### Data handling

- All data processing happens within Anthropic's infrastructure
- Short-term state (cursors, queues) is stored in Anthropic's managed state store
- Long-term knowledge (wiki) is stored in the user's own Notion workspace — the user owns and controls this data
- Full message content is processed in-memory during the session and not persisted in the state store
- The wiki stores synthesized context and summaries, never raw message content
- Only metadata (IDs, timestamps, tiers, scores) is stored in the agent state between sessions

### Access control

- OAuth tokens are the only credentials — no passwords or API keys
- Each MCP connector has minimum required scopes
- Write access is used ONLY for creating drafts and tasks, never for sending
- The agent can only DM the configured user, never other people

### Audit trail

- Every agent run is logged with timestamp, actions taken, and items processed
- Classification decisions include confidence scores and reasoning
- All drafts include a "[Draft by assistant]" marker
- Tasks created by the agent are tagged "Created by: Assistant"

---

## Infrastructure summary

| Component | Provided by | Managed by |
|-----------|-------------|------------|
| Agent runtime | Anthropic (Claude Managed Agents) | Anthropic |
| System prompt | Written by Baseline, customized per user | User (via Console) |
| Skills | Defined by Baseline | User (via Console) |
| MCP connectors | Anthropic MCP protocol | User (OAuth setup) |
| Credential storage | Anthropic encrypted vault | Anthropic |
| Cron scheduling | Anthropic scheduler | User (via Console) |
| State store | Anthropic managed storage | Agent (automatic) |
| Assistant Wiki | User's Notion workspace | Agent (maintains) + User (corrects) |
| Billing/monitoring | Anthropic Console | User |

**Total infrastructure the user manages: One Notion database.** Everything else runs on Anthropic's platform. The wiki lives in the user's Notion workspace — they own the data, the agent maintains it.
