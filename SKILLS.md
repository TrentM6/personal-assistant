# Skills

Skills are named capabilities the agent can perform. Each skill is a focused routine with its own rules, inputs, and output format. Add each skill in the **Skills** section of your agent configuration in the Claude Console.

---

## Table of Contents

1. [email_triage](#1-email_triage)
2. [meeting_followup](#2-meeting_followup)
3. [daily_digest](#3-daily_digest)
4. [task_extraction](#4-task_extraction)
5. [draft_response](#5-draft_response)

---

## 1. email_triage

The primary skill. Runs on every cron trigger to pull, classify, and route new communications.

### Skill definition

```
Name: email_triage
Description: Pull new items from all sources, classify by urgency, score, and route to appropriate outputs.

Parameters:
  - mode: "urgent" | "full"
    - "urgent": Only checks VIP senders and items with approaching deadlines. Used by the 10-minute cron.
    - "full": Processes all sources through the complete pipeline. Used by the hourly cron.

Instructions:

When invoked in "urgent" mode:
1. Read the last processing cursor from state
2. Pull new items from Gmail and Slack only (skip Granola and Notion for speed)
3. Filter to only:
   a. Items from senders on the VIP list
   b. Items containing deadline language for today ("by EOD", "today", "ASAP", "before [time]")
   c. Items with more than 3 replies in the last hour (hot threads)
4. Classify each matching item (should be P0 or P1 only, by definition)
5. For any P0 items found:
   a. Draft a response using the draft_response skill
   b. Send an immediate Slack DM alert to the user with:
      - One-line summary of the item
      - Why it's urgent
      - Suggested action
      - Link to the source (Gmail thread or Slack message)
6. Update the urgent-scan cursor
7. Target runtime: under 5 seconds

When invoked in "full" mode:
1. Read the last processing cursor from state
2. Pull new items from ALL four sources (Gmail, Slack, Granola, Notion)
3. Normalize all items into the common schema
4. Deduplicate and merge cross-source items
5. Classify every item into P0/P1/P2/P3
6. Score items within each tier using the priority scoring weights
7. Route each item to the appropriate output:
   - P0: Draft + immediate alert
   - P1: Draft + add to digest queue
   - P2: Add to digest queue
   - P3: Log only
8. For any Granola meetings found, invoke the task_extraction skill
9. Update the full-triage cursor
10. Target runtime: under 30 seconds

Output format (logged for each processed item):
{
  "item_id": "unique identifier",
  "source": "gmail|slack|granola|notion",
  "sender": "Name",
  "summary": "one-line summary",
  "tier": "P0|P1|P2|P3",
  "confidence": 0.0-1.0,
  "reasoning": "why this tier",
  "score": 0-100,
  "actions_taken": ["drafted_response", "sent_alert", "added_to_digest", "logged"],
  "draft_id": "if applicable"
}
```

---

## 2. meeting_followup

Processes completed meetings from Granola and generates follow-up actions.

### Skill definition

```
Name: meeting_followup
Description: Review completed meeting transcripts, extract action items, identify follow-ups needed, and create tasks.

Parameters:
  - meeting_id: (optional) Specific Granola meeting ID. If omitted, processes all new meetings since last cursor.

Instructions:

1. If meeting_id is provided, fetch that specific meeting. Otherwise, list all meetings since the last meeting cursor.

2. For each meeting, read the full transcript and notes from Granola.

3. Extract the following from each meeting:

   a. Action items — tasks that were explicitly assigned or committed to:
      - What: the specific task
      - Who: the person responsible (if mentioned)
      - When: the deadline (if mentioned)
      - Context: relevant discussion from the transcript

   b. Decisions made — conclusions reached during the meeting:
      - What was decided
      - Who made the decision
      - What alternatives were discussed

   c. Follow-ups needed — items that require the user's action after the meeting:
      - Emails to send
      - Documents to share
      - People to loop in
      - Information to gather

   d. Open questions — items that weren't resolved:
      - What's still unclear
      - Who needs to answer
      - By when

4. For each action item:
   a. Create a Notion task in the appropriate project database
   b. Set the task properties:
      - Title: clear, actionable task description
      - Assignee: the person responsible (if identifiable)
      - Due date: the deadline (if mentioned), otherwise default to 1 week from meeting date
      - Status: "Not started"
      - Source: link to the Granola meeting
      - Priority: based on the meeting context and project importance
   c. If the action item is assigned to the user, also add it to the daily digest queue

5. For each follow-up that requires the user to send a message:
   a. Draft the follow-up using the draft_response skill
   b. Include the meeting context in the draft

6. Update the meeting processing cursor.

Output format:
{
  "meeting_id": "granola meeting ID",
  "meeting_title": "title",
  "meeting_date": "ISO 8601",
  "participants": ["name1", "name2"],
  "action_items_created": 3,
  "tasks_created": [
    {
      "notion_page_id": "id",
      "title": "task title",
      "assignee": "name",
      "due_date": "date",
      "project": "project name"
    }
  ],
  "follow_ups_drafted": 1,
  "decisions_logged": 2,
  "open_questions": ["question 1"]
}
```

---

## 3. daily_digest

Compiles and delivers the morning briefing or EOD wrap.

### Skill definition

```
Name: daily_digest
Description: Compile a prioritized digest of all triaged items and deliver it via Slack DM.

Parameters:
  - variant: "morning" | "eod"
    - "morning": Full morning briefing with priorities, drafts, and meeting prep. Runs at 7 AM.
    - "eod": End-of-day wrap with pending items, stale threads, and tomorrow preview. Runs at 5 PM.

Instructions:

When variant is "morning":

1. Gather all items processed since the previous morning digest (or last 24 hours on first run).

2. Also pull today's calendar/meetings from available context (Granola scheduled meetings, email invites).

3. Compose the digest as a single Slack message with these sections:

   === Section 1: Urgent (P0) ===
   Items requiring immediate attention, sorted by priority score.
   For each item:
   - Emoji indicator: red_circle
   - One-line summary
   - Sender name
   - Source and link
   - Your recommended action
   - Whether a draft is ready (with link to draft)
   If no P0 items: "No urgent items. Nice."

   === Section 2: Needs response (P1) ===
   Items where a reply is expected today.
   For each item:
   - Emoji indicator: large_orange_diamond
   - One-line summary
   - Sender name
   - Whether a draft is ready
   If no P1 items: "All caught up on responses."

   === Section 3: For your awareness (P2) ===
   FYI items grouped by topic/project when possible.
   For each group:
   - Group header (project name or topic)
   - Bullet list of items with one-line summaries
   Keep this section concise — max 10 items, prioritized by relevance score.
   If no P2 items: omit this section entirely.

   === Section 4: Meeting prep ===
   Today's meetings with relevant context.
   For each meeting:
   - Time and title
   - Attendees
   - Relevant recent communications with those attendees
   - Last meeting notes (from Granola) if available
   - Any open action items from previous meetings with these people
   If no meetings today: "No meetings today."

   === Section 5: Draft queue ===
   All pending drafts organized by priority.
   For each draft:
   - Source (Gmail or Slack)
   - Recipient
   - Subject/topic
   - Link to the draft
   - When it was created

   === Footer ===
   "Digest covers [X] items across [list of sources]. [Y] drafts ready for review."

4. Send the composed message to the user's Slack DM.

When variant is "eod":

1. Gather the current state of all items processed today.

2. Compose the EOD wrap as a Slack message:

   === Section 1: Still pending ===
   P0/P1 items from today that haven't been resolved (draft not sent, no reply detected).
   For each: one-line summary, how long it's been pending, link.

   === Section 2: Stale items ===
   Items where someone has been waiting for the user's response for more than 24 hours.
   For each: sender, how long they've been waiting, original message summary.
   This section is critical — these are the balls being dropped.

   === Section 3: Draft status ===
   Drafts created today:
   - Sent: drafts that were sent (detected by checking if the draft still exists in Gmail)
   - Still pending: drafts still waiting for review
   - Expired: drafts for items that are no longer relevant

   === Section 4: Tomorrow preview ===
   - Meetings scheduled for tomorrow
   - Known deadlines for tomorrow
   - Items that will become stale by tomorrow if not addressed

   === Footer ===
   "EOD wrap for [date]. [X] items still pending, [Y] drafts waiting."

3. Send the composed message to the user's Slack DM.

Output format:
{
  "variant": "morning" | "eod",
  "items_covered": 15,
  "p0_count": 2,
  "p1_count": 5,
  "p2_count": 8,
  "drafts_pending": 3,
  "stale_items": 1,
  "meetings_today": 4,
  "delivered_to": "slack DM",
  "message_ts": "slack message timestamp"
}
```

---

## 4. task_extraction

Extracts tasks from any source and creates them in Notion.

### Skill definition

```
Name: task_extraction
Description: Extract actionable tasks from messages, meetings, or threads and create them in the appropriate Notion database.

Parameters:
  - source_type: "meeting" | "email" | "slack"
  - source_id: The ID of the meeting, email thread, or Slack thread to extract from.

Instructions:

1. Fetch the full content of the specified source.

2. Analyze the content to identify actionable tasks. A task is actionable if:
   - Someone explicitly committed to doing something ("I'll send that over", "Let me check on that")
   - Someone was asked to do something ("Can you update the doc?", "Please send the report")
   - A deadline was set for a deliverable
   - A follow-up was agreed upon

3. For each identified task, determine:
   - Title: A clear, actionable description starting with a verb (e.g., "Send Q3 report to board", "Update pricing page copy")
   - Owner: Who is responsible. If it's the user, mark it as such. If it's someone else, note their name.
   - Due date: Extract from the content if explicitly mentioned. Apply these rules:
     - "by EOD" → today's date
     - "by end of week" → Friday of the current week
     - "next week" → Monday of next week
     - "ASAP" → tomorrow
     - No date mentioned → 1 week from now
   - Priority: Derive from the urgency of the conversation and the importance of the project
   - Project: Match against the active projects list. If no match, leave blank.
   - Context: 1-2 sentences of context from the source explaining why this task exists

4. Create each task in the appropriate Notion database:
   - Match the task to a project → use that project's database
   - No project match → use the default task database
   - Set all properties (title, owner, due date, priority, status = "Not started")
   - Add the context as the page body
   - Add a source link back to the original message/meeting

5. If any tasks are assigned to the user, add them to the digest queue.

6. Do NOT create duplicate tasks. Before creating, search Notion for existing tasks with similar titles created in the last 7 days. If a likely duplicate exists, skip creation and log it.

Output format:
{
  "source_type": "meeting",
  "source_id": "id",
  "tasks_found": 4,
  "tasks_created": 3,
  "tasks_skipped_duplicate": 1,
  "tasks": [
    {
      "title": "Send Q3 report to board",
      "owner": "Sarah",
      "due_date": "2026-06-25",
      "priority": "High",
      "project": "Q3 Product Launch",
      "notion_page_id": "page-id"
    }
  ]
}
```

---

## 5. draft_response

Generates a draft reply for a specific item.

### Skill definition

```
Name: draft_response
Description: Draft a response to a specific email or Slack message, following the user's writing style and the context of the conversation.

Parameters:
  - source_type: "gmail" | "slack"
  - source_id: The thread ID (Gmail) or message timestamp + channel (Slack) to respond to.
  - urgency: "P0" | "P1" | "P2" — informs the response speed/tone.
  - instructions: (optional) Specific instructions for this draft, e.g., "Decline politely" or "Ask for more details about the timeline."

Instructions:

1. Fetch the full conversation thread from the source.

2. Analyze the conversation:
   - What is being asked or discussed?
   - What information does the sender need?
   - Is this a decision request, information request, scheduling request, or follow-up?
   - What is the sender's tone and formality level?

3. Draft the response following the user's writing style guidelines:
   - Match the sender's formality level
   - Keep it concise (the user will edit before sending)
   - Never make commitments the user hasn't authorized
   - Never share information from other sources without explicit authorization
   - If information is needed that you don't have, draft a holding response ("Let me look into this and get back to you")

4. Apply urgency-appropriate behavior:
   - P0: Draft should be ready to send with minimal editing. Be direct and action-oriented.
   - P1: Draft should cover the key points but leave room for the user to add detail.
   - P2: Keep it brief — acknowledge and inform.

5. Always append this footer to every draft:
   "[Draft by assistant — please review before sending]"

6. Save the draft:
   - For Gmail: Use create_draft to save in Gmail drafts, in the correct thread
   - For Slack: Log the draft content and include it in the digest with the thread link

7. If special instructions were provided, follow them. Common patterns:
   - "Decline politely": Draft a gracious decline with a brief reason
   - "Delegate to [name]": Draft a response suggesting the sender connect with that person
   - "Ask for more details": Draft a response requesting specific information
   - "Acknowledge only": Brief acknowledgment, no substantive response
   - "Schedule a call": Draft a response suggesting a meeting with time options

Output format:
{
  "source_type": "gmail",
  "source_id": "thread-id",
  "draft_content": "the full draft text",
  "draft_id": "gmail draft ID or logged reference",
  "recipient": "sender name",
  "subject": "Re: thread subject",
  "urgency": "P1",
  "special_instructions": "none",
  "confidence": 0.85,
  "notes": "Sender asked about Q3 timeline. Used last board deck dates. User should verify the July 15 date is still accurate."
}
```

---

## Skill interaction map

Skills often invoke each other:

```
email_triage (full mode)
├── draft_response (for P0 and P1 items)
├── task_extraction (for Granola meetings found during triage)
│   └── [creates Notion tasks]
└── [queues items for daily_digest]

email_triage (urgent mode)
└── draft_response (for P0 items only)

daily_digest (morning)
├── reads from digest queue (populated by email_triage)
└── reads from task list (populated by task_extraction)

daily_digest (eod)
├── reads from digest queue
├── checks draft status (sent vs pending)
└── reads tomorrow's calendar

meeting_followup
├── task_extraction (for each meeting)
└── draft_response (for follow-up messages)
```
