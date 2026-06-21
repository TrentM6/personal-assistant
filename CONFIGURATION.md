# Configuration

How to customize every aspect of the Personal Assistant agent. All configuration is done by editing the system prompt in the Claude Console — there's no separate config file.

---

## Table of Contents

1. [VIP senders](#1-vip-senders)
2. [Channel and label filters](#2-channel-and-label-filters)
3. [Active projects](#3-active-projects)
4. [Writing style](#4-writing-style)
5. [Digest template](#5-digest-template)
6. [Schedule tuning](#6-schedule-tuning)
7. [Classification tuning](#7-classification-tuning)

---

## 1. VIP senders

VIP senders are always classified as P0 (Urgent) unless their message is clearly trivial. This is the most important configuration — it determines who gets the fastest response.

### Where to configure

In the system prompt, find the `{{VIP_LIST}}` placeholder and replace it with your actual VIP list.

### Format

```
- [Name] ([Role]) — [email] / [@slack_handle]
```

### Example configuration

```
- Jane Smith (CEO) — jane@company.com / @jane.smith
- Mark Johnson (CTO) — mark@company.com / @mark.johnson
- Sarah Lee (COO) — sarah@company.com / @sarah.lee
- Board: Alex Rodriguez — alex@boardemail.com / @alex.rodriguez
- Board: Robin Feld — robin@vcfirm.com
- Client: Sam Park (Acme Corp) — sam.park@acmecorp.com / @sam.park
- Client: Lisa Wang (Globex) — lisa.wang@globex.com
- Investor: David Chen (First Round) — david@firstround.com
```

### Guidelines

- **Start small**: 5-10 people max. Too many VIPs means too many P0 alerts, which defeats the purpose.
- **Include both email and Slack**: The agent matches senders across both.
- **Update regularly**: Add new clients when engagements start, remove them when they end.
- **Board members are always VIP**: Even if they email infrequently.
- **Direct reports are NOT VIP by default**: Unless their role warrants it. Their messages are typically P1.

### VIP behavior rules

- VIP message with substance → P0
- VIP message that's trivial ("Thanks!", "Sounds good") → P1 (downgraded, but never below P1)
- VIP message with "no rush" → P1 (VIP floor overrides "no rush")
- Non-VIP with crisis language → P0 (crisis detection is independent of VIP list)

---

## 2. Channel and label filters

Control which Slack channels and Gmail labels the agent monitors. Items from included channels/labels get full processing. Items from excluded channels/labels are skipped entirely.

### Where to configure

In the system prompt, find the `{{INCLUDE_CHANNELS_AND_LABELS}}` and `{{EXCLUDE_CHANNELS_AND_LABELS}}` placeholders.

### Include list (always process)

```
Slack channels:
- #leadership — executive team discussions
- #product — product decisions and updates
- #engineering — technical discussions
- #client-updates — client-facing communications
- #urgent — escalation channel
- #sales — deal updates and client questions

Gmail labels:
- INBOX — all inbox emails
- IMPORTANT — Gmail's importance markers
- Client/Active — emails from active clients
- Board — board-related communications
- Legal — legal matters (always urgent)
```

### Exclude list (skip entirely)

```
Slack channels:
- #random — social chat
- #social — team social events
- #food — lunch orders
- #pets — pet photos
- #music-recs — music recommendations
- #fitness — workout discussions
- #memes — memes
- #general-banter — casual conversation

Gmail labels:
- Promotions — marketing emails
- Social — social media notifications
- Newsletters — subscribed newsletters
- Automated — CI/CD, monitoring, system alerts
- Spam — spam (obviously)
```

### Channels/labels not in either list

Items from channels or labels not in either list are processed normally but with lower priority weight. They won't be excluded, but they'll score lower in the topic relevance signal.

### Tips

- **Be aggressive with excludes**: The more noise you filter out, the better the signal.
- **Review monthly**: Channels you need to monitor change as projects evolve.
- **Don't include high-volume channels** unless you really need to monitor them. A #general channel with 200 messages/day will significantly increase processing time and cost.

---

## 3. Active projects

Active projects are used for topic relevance scoring. When an item matches an active project, its priority score gets a boost.

### Where to configure

In the system prompt, find the `{{ACTIVE_PROJECTS}}` placeholder.

### Format

```
- [Project Name] (Notion DB: "[database name]") — [key details, deadline]
```

### Example configuration

```
- Q3 Product Launch (Notion DB: "Q3 Launch Tracker") — shipping July 15, all hands on deck
- Series B Fundraise (Notion DB: "Fundraise Pipeline") — targeting August close, board presentations in progress
- Engineering Hiring (Notion DB: "Hiring Pipeline") — 3 open roles, interviewing actively
- Platform Migration (Notion DB: "Migration Checklist") — Phase 2, deadline end of Q3
- Client: Acme Corp Onboarding (Notion DB: "Acme Onboarding") — kicked off June 1, 90-day timeline
```

### How projects affect scoring

- Item mentions an active project → +15 topic relevance points
- Item mentions an active project with a deadline this week → +20 topic relevance points
- Item is from a participant in a recent Granola meeting about the project → +5 relevance boost
- No project match → +0 to +3 relevance points (general work topics still get small credit)

### Maintenance

- **Update when projects start or end**: A completed project should be removed so it doesn't inflate relevance scores.
- **Include the Notion database name**: This lets the agent link extracted tasks to the right project.
- **Add key details**: Deadlines and status help the agent calibrate urgency.

---

## 4. Writing style

Controls how the agent drafts responses on your behalf. This is critical for making drafts actually usable — if they don't sound like you, you'll spend more time rewriting than you save.

### Where to configure

In the system prompt, find the `{{WRITING_STYLE}}` placeholder.

### Example configuration

```
Tone:
- Professional but warm. Never stuffy or corporate.
- Slightly casual with internal team. More formal with external clients and board.
- Confident but not arrogant. Say "I think" not "I believe" (too formal).

Length:
- 2-4 sentences for most replies.
- Longer (up to 2 paragraphs) for complex topics requiring context.
- One-liners are fine for quick acknowledgments.

Greetings:
- Use first name. "Hi Sarah," or just "Sarah,"
- Never "Dear" (too formal) or "Hey" (too casual for external).
- No greeting needed for thread replies where you've already said hi.

Sign-offs:
- "Best," for external emails
- "Thanks," when someone did something for you
- No sign-off needed for Slack messages or quick thread replies
- Never "Regards," "Cheers," or "Best regards,"

Avoid:
- Exclamation marks: max 1 per email, never in subject lines
- Emoji in external emails (fine in Slack)
- Passive voice ("The report was completed" → "I completed the report")
- Weasel words ("I was just wondering if maybe you could...")
- Corporate jargon ("synergize," "leverage," "circle back")

Mirror:
- Match the formality of the sender
- If they're casual ("hey, quick q"), be casual
- If they're formal ("Dear [name], I hope this finds you well"), match that level

Common phrases I use:
- "Let me look into this and get back to you"
- "Good question — here's what I'm thinking"
- "Appreciate the heads up"
- "Makes sense, let's go with that"
- "Can we sync on this briefly? I have a few questions."

When uncertain:
- Default response: "Thanks for flagging this. Let me review and get back to you by [reasonable deadline]."
- Never commit to deadlines, budgets, or decisions without explicit authorization
```

### Tips for writing style

- **Read your sent messages**: Look at your last 20 sent emails and Slack messages. What patterns do you notice? Document those.
- **Include specific phrases**: The more real examples you give, the more natural the drafts will sound.
- **Note what you NEVER say**: "Cheers" might be fine for some people but completely wrong for you.
- **Iterate**: After a week of using the agent, review the drafts. If they consistently miss the mark on something, add a note about it.

---

## 5. Digest template

Controls the structure and content of the morning digest and EOD wrap.

### Where to configure

The digest template is built into the `daily_digest` skill (see [SKILLS.md](SKILLS.md)), but you can customize it in the system prompt by modifying the digest format section.

### Customizable elements

**Sections to include/exclude:**
- Urgent (P0) — always included if items exist
- Needs response (P1) — always included if items exist
- For your awareness (P2) — can be excluded if too noisy
- Meeting prep — can be excluded if you prefer to prep manually
- Draft queue — always included

**Delivery channel:**
- Default: Slack DM
- Alternative: Can also be delivered via email (modify the skill to use create_draft instead of slack_send_message)

**Maximum items per section:**
- Default: No limit for P0/P1, max 10 for P2
- Increase/decrease P2 limit based on preference

**Grouping:**
- Default: P2 items grouped by topic/project
- Alternative: Group by source (all Gmail items, all Slack items)

### Example customization in system prompt

Add this to the system prompt if you want to modify the default digest behavior:

```
Digest customization:
- P2 section: Show max 5 items, grouped by project. If more than 5, add a count: "(+3 more FYI items)"
- Meeting prep: Include last meeting notes from Granola for recurring meetings with the same people
- Draft queue: Sort by urgency, show the first line of each draft as a preview
- EOD wrap: Skip "Still pending" section if there are no stale items
- Delivery: Slack DM only, never email
```

---

## 6. Schedule tuning

Adjust how frequently the agent runs based on your needs and budget.

### Conservative schedule (lower cost, ~$10-15/month)

```
Urgent scan: Every 20 minutes, business hours only
  */20 8-18 * * 1-5

Full triage: Every 2 hours, business hours only
  0 8,10,12,14,16,18 * * 1-5

Morning digest: 8:00 AM weekdays
  0 8 * * 1-5

EOD wrap: 5:30 PM weekdays
  0 17 * * 1-5
```

### Aggressive schedule (faster response, ~$30-40/month)

```
Urgent scan: Every 5 minutes, 7am-10pm
  */5 7-22 * * *

Full triage: Every 30 minutes, all day
  0,30 * * * *

Morning digest: 6:30 AM every day
  30 6 * * *

EOD wrap: 6:00 PM weekdays, noon on weekends
  0 18 * * 1-5
  0 12 * * 0,6
```

### Minimal schedule (lowest cost, ~$5-8/month)

```
No urgent scan (remove entirely)

Full triage: 3 times per day
  0 9,13,17 * * 1-5

Morning digest: 9:00 AM weekdays
  0 9 * * 1-5

No EOD wrap (remove entirely)
```

---

## 7. Classification tuning

If the agent is consistently mis-classifying items, adjust the classification rules in the system prompt.

### Making classification more aggressive (more P0/P1)

Add to the system prompt:
```
Classification adjustments:
- Any email from a .com domain I haven't seen before should be P1 (potential new client)
- Any Slack DM (not channel message) is at least P1
- Any thread with my name mentioned is at least P1
```

### Making classification less aggressive (fewer P0/P1)

Add to the system prompt:
```
Classification adjustments:
- Only classify as P0 if the sender is on the VIP list AND the content requires action within 2 hours
- Slack channel messages are P2 by default unless they contain a direct @mention
- Emails where I'm CC'd (not TO) are always P2
```

### Adjusting scoring weights

You can modify the priority scoring weights in the system prompt:

```
Priority scoring weight overrides:
- Sender importance: 40% (up from 30% — who is talking matters most)
- Deadline proximity: 20% (down from 25%)
- Topic relevance: 15% (down from 20%)
- Thread heat: 15% (unchanged)
- Staleness: 10% (unchanged)
```
