# Cron Schedules

The Personal Assistant agent runs on four automated cron schedules plus maintains a persistent state store. Each trigger wakes the agent, runs a specific skill, and puts it back to sleep.

---

## Overview

| Schedule | Cron expression | Skill invoked | Runtime | Purpose |
|----------|----------------|---------------|---------|---------|
| Every 10 minutes | `*/10 * * * *` | `email_triage` (urgent mode) | ~2-5 seconds | VIP + deadline scan, quick wiki lookup |
| Every hour | `0 * * * *` | `email_triage` (full mode) | ~15-30 seconds | Full triage, all sources, wiki enrich + update |
| 7:00 AM weekdays | `0 7 * * 1-5` | `daily_digest` (morning) | ~15-25 seconds | Wiki-enriched morning briefing + wiki maintenance |
| 5:00 PM weekdays | `0 17 * * 1-5` | `daily_digest` (eod) | ~10-20 seconds | EOD wrap with wiki context |

All times are in the user's configured timezone.

---

## Schedule 1: Urgent scan (every 10 minutes)

### Cron expression
```
*/10 * * * *
```

### What it does

This is the fastest, lightest scan. It ONLY checks for truly urgent items:

1. **Pulls from Gmail and Slack only** (skips Granola and Notion for speed)
2. **Filters aggressively** — only processes items matching:
   - Sender is on the VIP list
   - Content contains deadline language for today
   - Thread has 3+ replies in the last hour (hot thread)
3. **For any P0 items found:**
   - Drafts an immediate response
   - Sends a Slack DM alert to the user
4. **Ignores everything else** — those items will be caught by the hourly full triage

### Configuration in Claude Console

1. Go to your agent's **Schedules** section
2. Click **Add Schedule**
3. Set:
   - **Name**: `Urgent scan`
   - **Cron expression**: `*/10 * * * *`
   - **Timezone**: (your timezone)
   - **Skill**: `email_triage`
   - **Parameters**: `{ "mode": "urgent" }`
4. Click **Save**

### Cost impact

- Each run: ~2-5 seconds of session time
- 6 runs per hour × 24 hours = 144 runs/day
- At $0.08/session-hour: ~$0.02-0.06/day for session time
- Plus minimal token usage (small searches, quick classification)
- **Monthly estimate: $1-3** for urgent scans alone

### Tuning

If costs are too high or alerts are too frequent:
- Change to every 15 minutes: `*/15 * * * *`
- Change to every 20 minutes: `*/20 * * * *`
- Restrict to business hours only: `*/10 8-18 * * 1-5` (every 10 min, 8am-6pm, weekdays)

---

## Schedule 2: Full triage (every hour)

### Cron expression
```
0 * * * *
```

### What it does

The comprehensive scan that processes everything:

1. **Pulls from all four sources**: Gmail, Slack, Granola, Notion
2. **Normalizes** all items into the common schema
3. **Deduplicates** cross-source items
4. **Classifies** every item into P0/P1/P2/P3
5. **Scores** items within each tier
6. **Routes** items to appropriate outputs:
   - P0: Draft + immediate alert (if not already caught by urgent scan)
   - P1: Draft + digest queue
   - P2: Digest queue
   - P3: Log only
7. **Extracts tasks** from any new Granola meetings
8. **Updates cursors** for all sources

### Configuration in Claude Console

1. Go to your agent's **Schedules** section
2. Click **Add Schedule**
3. Set:
   - **Name**: `Full triage`
   - **Cron expression**: `0 * * * *`
   - **Timezone**: (your timezone)
   - **Skill**: `email_triage`
   - **Parameters**: `{ "mode": "full" }`
4. Click **Save**

### Cost impact

- Each run: ~15-30 seconds of session time
- 24 runs/day
- More tokens than urgent scan (reads full threads, classifies all items, drafts responses)
- **Monthly estimate: $8-20** depending on volume

### Tuning

If costs are too high:
- Change to every 2 hours: `0 */2 * * *`
- Restrict to business hours: `0 8-18 * * 1-5`
- Business hours every 2 hours: `0 8,10,12,14,16,18 * * 1-5`

---

## Schedule 3: Morning digest (7:00 AM weekdays)

### Cron expression
```
0 7 * * 1-5
```

### What it does

Compiles and delivers the morning briefing:

1. Gathers all items processed since the previous morning digest
2. Pulls today's meeting schedule
3. Composes a structured Slack message with:
   - Urgent items (P0)
   - Items needing response (P1)
   - FYI items (P2)
   - Meeting prep for today
   - Pending draft queue
4. Sends to the user's Slack DM

### Configuration in Claude Console

1. Go to your agent's **Schedules** section
2. Click **Add Schedule**
3. Set:
   - **Name**: `Morning digest`
   - **Cron expression**: `0 7 * * 1-5`
   - **Timezone**: (your timezone)
   - **Skill**: `daily_digest`
   - **Parameters**: `{ "variant": "morning" }`
4. Click **Save**

### Customizing the time

- Earlier morning: `0 6 * * 1-5` (6 AM)
- Later morning: `0 8 * * 1-5` (8 AM)
- Include weekends: `0 7 * * *` (every day)
- Different times on different days: Set up multiple schedules

### Cost impact

- Each run: ~10-20 seconds
- 5 runs/week (weekdays only)
- Moderate token usage (composing the digest message)
- **Monthly estimate: $1-3**

---

## Schedule 4: EOD wrap (5:00 PM weekdays)

### Cron expression
```
0 17 * * 1-5
```

### What it does

Delivers the end-of-day wrap-up:

1. Reviews all items processed today
2. Identifies still-pending P0/P1 items
3. Flags stale items (waiting >24 hours for user response)
4. Reports on draft status (sent vs. still pending)
5. Previews tomorrow's meetings and deadlines
6. Sends to the user's Slack DM

### Configuration in Claude Console

1. Go to your agent's **Schedules** section
2. Click **Add Schedule**
3. Set:
   - **Name**: `EOD wrap`
   - **Cron expression**: `0 17 * * 1-5`
   - **Timezone**: (your timezone)
   - **Skill**: `daily_digest`
   - **Parameters**: `{ "variant": "eod" }`
4. Click **Save**

### Customizing the time

- Earlier wrap: `0 16 * * 1-5` (4 PM)
- Later wrap: `0 18 * * 1-5` (6 PM)

### Cost impact

- Each run: ~10-15 seconds
- 5 runs/week
- **Monthly estimate: $1-2**

---

## State store

The agent maintains state between runs using a cursor system. This is not a cron schedule — it's a persistent data store that all schedules read from and write to.

### What it stores

| Key | Value | Updated by |
|-----|-------|-----------|
| `cursor_gmail` | Timestamp of last processed Gmail thread | `email_triage` |
| `cursor_slack` | Timestamp of last processed Slack message | `email_triage` |
| `cursor_granola` | Timestamp of last processed Granola meeting | `email_triage`, `meeting_followup` |
| `cursor_notion` | Timestamp of last processed Notion update | `email_triage` |
| `cursor_urgent` | Timestamp of last urgent scan | `email_triage` (urgent) |
| `digest_queue` | List of items to include in next digest | `email_triage`, `task_extraction` |
| `draft_registry` | List of created drafts with status | `draft_response` |
| `last_digest_morning` | Timestamp of last morning digest | `daily_digest` |
| `last_digest_eod` | Timestamp of last EOD wrap | `daily_digest` |
| `last_wiki_maintenance` | Timestamp of last wiki maintenance run | `wiki_maintain` |
| `wiki_database_id` | Notion database ID for the Assistant Wiki | Configuration |

### How state works

1. Each cron trigger starts a new agent session
2. The session reads the relevant cursors at startup
3. Processes only items newer than the cursor
4. Updates the cursor at the end of processing
5. The session ends and the agent goes back to sleep

This ensures:
- **No item is processed twice**: The cursor always moves forward
- **No item is missed**: Each run picks up exactly where the last one left off
- **Sessions are independent**: Each cron trigger runs its own session

### First run behavior

On the first run (no existing cursor):
- The agent looks back **24 hours** from the current time
- Processes everything it finds
- Sets the cursor to the timestamp of the newest item processed
- Caps the initial digest at 20 items to avoid overload

---

## Monitoring schedules

### Viewing run history

1. In the Claude Console, go to your agent's **Logs** section
2. You'll see each scheduled run with:
   - Start time
   - Duration
   - Skill invoked
   - Items processed
   - Actions taken
   - Any errors

### Common issues

**Schedule not firing:**
- Check that the schedule is toggled **On** (active)
- Verify the timezone is correct
- Check that you have remaining credits
- Verify the spending limit hasn't been reached

**Schedule running too long:**
- The agent has a 60-second timeout per session
- If it hits the timeout, remaining items are deferred to the next run
- Check if the volume of items is unusually high
- Consider adding more specific channel/label filters to reduce volume

**Duplicate alerts:**
- Check that the cursor is updating correctly
- Review the dedup logic — the same thread shouldn't trigger alerts twice
- If the urgent scan and hourly scan both catch a P0, the hourly scan should detect that an alert was already sent
