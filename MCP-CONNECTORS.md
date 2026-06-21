# MCP Connectors

The Personal Assistant agent connects to four data sources via MCP (Model Context Protocol) connectors. This guide covers how to set up each one, what permissions they need, and how they're used.

---

## Table of Contents

1. [What is MCP?](#what-is-mcp)
2. [Gmail connector](#1-gmail-connector)
3. [Slack connector](#2-slack-connector)
4. [Granola connector](#3-granola-connector)
5. [Notion connector](#4-notion-connector)
6. [Credential management](#credential-management)
7. [Troubleshooting](#troubleshooting)

---

## What is MCP?

MCP (Model Context Protocol) is the standard way Claude agents connect to external data sources and tools. Each MCP connector:

- Provides the agent with specific **tools** (functions it can call)
- Authenticates via **OAuth** (no passwords stored in the agent)
- Has defined **permission scopes** (read, write, or both)
- Stores credentials in Anthropic's **encrypted vault**

When you add an MCP connector in the Claude Console, you'll go through an OAuth authorization flow — the same kind of "Sign in with Google" flow you've used on other websites. Once authorized, the agent can use that connector's tools whenever it runs.

---

## 1. Gmail connector

### Overview

| Property | Value |
|----------|-------|
| Access level | Read + Write |
| OAuth scopes | `gmail.readonly`, `gmail.compose`, `gmail.modify`, `gmail.labels` |
| Used by skills | `email_triage`, `draft_response`, `daily_digest` |

### Setup steps

1. In your agent configuration, go to **Tools** > **Add MCP Connector**
2. Select **Gmail** from the connector list
3. Click **Connect**
4. A Google OAuth popup will appear:
   - Select the Google account you want to connect (the user's work email)
   - Review the permissions being requested:
     - "Read your email messages and settings" — needed to pull threads for triage
     - "Compose, send, and manage your drafts" — needed to create draft responses
     - "Manage your labels" — needed to apply triage labels
   - Click **Allow**
5. The popup will close and the connector will show as **Connected**

### Available tools

Once connected, the agent has access to these Gmail tools:

| Tool | Purpose | Used in |
|------|---------|---------|
| `search_threads` | Search for email threads by date, sender, label, keyword | `email_triage` — pulls new threads since last cursor |
| `get_thread` | Get the full content of a specific email thread | `email_triage` — reads full thread for classification |
| `create_draft` | Create a draft email in a specific thread | `draft_response` — creates draft replies |
| `list_drafts` | List all current drafts | `daily_digest` — checks draft status |
| `list_labels` | List all Gmail labels | Setup — identifies which labels to monitor |
| `create_label` | Create a new Gmail label | Setup — creates triage labels if needed |
| `label_message` | Apply a label to a message | `email_triage` — labels processed messages |
| `label_thread` | Apply a label to an entire thread | `email_triage` — labels processed threads |
| `unlabel_message` | Remove a label from a message | Cleanup operations |
| `unlabel_thread` | Remove a label from a thread | Cleanup operations |

### Recommended Gmail labels

Create these labels in Gmail (the agent can also create them on first run):

- `Assistant/Processed` — Applied to threads after triage
- `Assistant/P0-Urgent` — Applied to P0 classified threads
- `Assistant/P1-Respond` — Applied to P1 classified threads
- `Assistant/P2-FYI` — Applied to P2 classified threads
- `Assistant/P3-Low` — Applied to P3 classified threads
- `Assistant/Draft-Ready` — Applied to threads that have a draft response waiting

### Gmail-specific notes

- The agent searches for threads using `after:` date queries relative to the cursor
- Threads are identified by thread ID, which groups all messages in a conversation
- Drafts are created within the correct thread so they appear as a reply
- The agent never sends emails — it only creates drafts
- The agent never deletes emails or modifies existing messages

---

## 2. Slack connector

### Overview

| Property | Value |
|----------|-------|
| Access level | Read + Write |
| OAuth scopes | `channels:read`, `channels:history`, `groups:read`, `groups:history`, `im:read`, `im:write`, `im:history`, `mpim:read`, `mpim:history`, `users:read`, `chat:write`, `reactions:read`, `search:read` |
| Used by skills | `email_triage`, `draft_response`, `daily_digest` |

### Setup steps

1. In your agent configuration, go to **Tools** > **Add MCP Connector**
2. Select **Slack** from the connector list
3. Click **Connect**
4. A Slack OAuth popup will appear:
   - Select the correct Slack workspace
   - Review the permissions:
     - Reading channels and messages — needed to monitor for new messages
     - Sending messages — needed ONLY for DMs to the user (alerts and digests)
     - Reading reactions — needed for thread heat scoring
     - Searching messages — needed for cross-referencing topics
   - Click **Allow**
5. The connector will show as **Connected**

### Available tools

| Tool | Purpose | Used in |
|------|---------|---------|
| `slack_read_channel` | Read recent messages from a channel | `email_triage` — scans channels for new messages |
| `slack_read_thread` | Read all replies in a thread | `email_triage` — gets full thread context |
| `slack_search_public` | Search messages across public channels | `email_triage` — finds related discussions |
| `slack_search_public_and_private` | Search across all accessible channels | `email_triage` — comprehensive search |
| `slack_send_message` | Send a message to a channel or DM | `daily_digest` — delivers digests to user's DM; urgent alerts |
| `slack_read_user_profile` | Get user profile information | `email_triage` — identifies senders |
| `slack_get_reactions` | Get reactions on a message | `email_triage` — thread heat scoring |
| `slack_search_channels` | Search for channels by name | Setup — find channels to monitor |
| `slack_search_users` | Search for users | Setup — find the user's Slack ID |
| `slack_list_channel_members` | List members of a channel | Context enrichment |
| `slack_schedule_message` | Schedule a message for later | `daily_digest` — can pre-schedule digest delivery |

### Finding the user's Slack ID

You'll need the user's Slack member ID for the system prompt. To find it:

1. In Slack, click on the user's profile
2. Click the **three dots** menu (...)
3. Select **Copy member ID**
4. It looks like `U04ABCD1234`
5. Use this as `{{SLACK_USER_ID}}` in the system prompt

### Slack-specific notes

- The agent only sends messages to the user's DM — never to channels or other people
- Channel monitoring reads the latest messages and checks for new ones since the cursor
- Thread replies are fetched separately from channel messages
- The agent uses reactions count as a signal for thread heat scoring
- Slack search is used for cross-referencing topics across channels

---

## 3. Granola connector

### Overview

| Property | Value |
|----------|-------|
| Access level | Read only |
| OAuth scopes | Read meetings, transcripts, notes, action items |
| Used by skills | `email_triage`, `meeting_followup`, `task_extraction`, `daily_digest` |

### Setup steps

1. In your agent configuration, go to **Tools** > **Add MCP Connector**
2. Select **Granola** from the connector list (you may need to search for it or add it as a custom connector)
3. Click **Connect**
4. Complete the Granola OAuth authorization:
   - Log in to your Granola account
   - Grant read access to meetings and transcripts
   - Click **Allow**
5. The connector will show as **Connected**

### Available tools

| Tool | Purpose | Used in |
|------|---------|---------|
| `list_meetings` | List meetings by date range | `email_triage` — find new meetings since cursor |
| `get_meeting_transcript` | Get the full transcript of a meeting | `meeting_followup` — analyze meeting content |
| `query_granola_meetings` | Search meetings by keyword, participant, or topic | `daily_digest` — find context for meeting prep |
| `get_meetings` | Get meeting details by ID | `task_extraction` — get specific meeting data |
| `list_meeting_folders` | List meeting folders/categories | Setup — understand meeting organization |
| `get_account_info` | Get account information | Setup — verify connection |

### Granola-specific notes

- Granola is read-only — the agent cannot modify transcripts or notes
- Meeting transcripts are the primary source for task extraction
- Granola notes include AI-generated action items which the agent uses as a starting point
- The agent cross-references Granola participants with Gmail senders and Slack users for enrichment
- Meetings without transcripts (no-shows, cancelled) are skipped

---

## 4. Notion connector

### Overview

| Property | Value |
|----------|-------|
| Access level | Read + Write |
| OAuth scopes | Read and write access to pages, databases, and workspace content |
| Used by skills | `email_triage`, `task_extraction`, `meeting_followup`, `daily_digest` |

### Setup steps

1. In your agent configuration, go to **Tools** > **Add MCP Connector**
2. Select **Notion** from the connector list
3. Click **Connect**
4. A Notion OAuth popup will appear:
   - Select the workspace to connect
   - Choose which pages/databases to grant access to:
     - **Recommended**: Grant access to all pages, or at minimum:
       - Your task databases (where tasks will be created)
       - Your project tracking databases (for topic relevance scoring)
       - Your wiki/knowledge base (for context enrichment)
   - Click **Allow**
5. The connector will show as **Connected**

### Required Notion setup

Before the agent can create tasks, you need these databases in Notion:

#### Default task database

Create a Notion database with these properties:

| Property | Type | Purpose |
|----------|------|---------|
| Title | Title | Task name (actionable, starts with a verb) |
| Status | Select | Options: "Not started", "In progress", "Done" |
| Assignee | Person | Who is responsible |
| Due date | Date | When it's due |
| Priority | Select | Options: "Urgent", "High", "Medium", "Low" |
| Source | URL | Link back to the original message/meeting |
| Project | Relation | Link to the project database |
| Created by | Select | "Manual" or "Assistant" |

#### Project tracking databases

The agent reads from your existing project databases to score topic relevance. Make sure:
- Each project has a clear title
- Projects have status (Active, On hold, Completed)
- Projects have dates/milestones if applicable
- The agent has been granted access to these databases

### Available tools

The agent uses Notion's MCP tools for:

| Operation | Purpose | Used in |
|-----------|---------|---------|
| Query databases | Find recently modified pages, active projects, wiki pages | `email_triage` — topic relevance scoring + wiki enrichment |
| Create pages | Create tasks from meetings, create wiki pages | `task_extraction`, `email_triage` (wiki writes) |
| Update pages | Update task status, update wiki pages with new context | `meeting_followup`, `email_triage` (wiki updates) |
| Search | Find existing tasks and wiki pages to avoid duplicates | `task_extraction`, `wiki_maintain` |
| Create relations | Link wiki pages to each other | `email_triage`, `meeting_followup` (wiki cross-references) |

### Notion-specific notes

- The agent creates tasks with a "Created by: Assistant" property so you can distinguish them from manually created tasks
- Before creating a task, the agent searches for duplicates (similar titles in the last 7 days)
- Notion pages include source links back to the original Granola meeting or email/Slack thread
- The agent reads project databases to understand what topics are actively being worked on
- Page modifications in Notion are picked up by the hourly triage as "recently modified"
- **The Agent's wiki lives in Notion** — a dedicated "Assistant Wiki" database where the agent maintains Person, Organization, Project, Topic, Pattern, Decision, and Open Question pages. This is the agent's persistent knowledge base. See [NOTION-WIKI.md](NOTION-WIKI.md) for complete details.
- Wiki operations add 2-5 Notion API calls per triage run (reads) and 1-3 per run (writes)

---

## Credential management

### How credentials are stored

All MCP connector credentials are managed through OAuth and stored in Anthropic's encrypted credential vault:

- **No passwords in code**: You never enter passwords into the agent configuration
- **Encrypted at rest**: OAuth tokens are encrypted in Anthropic's vault using AES-256 encryption
- **Automatic refresh**: OAuth tokens are automatically refreshed when they expire
- **Scoped access**: Each connector only has the permissions you granted during OAuth setup
- **Revocable**: You can revoke access at any time from the source service

### Revoking access

If you need to revoke the agent's access to a service:

**Gmail:**
1. Go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
2. Find the Claude/Anthropic application
3. Click **Remove Access**

**Slack:**
1. Go to your Slack workspace settings
2. Navigate to **Manage Apps**
3. Find the Claude/Anthropic integration
4. Click **Remove**

**Granola:**
1. Go to your Granola account settings
2. Find **Connected Apps** or **Integrations**
3. Revoke the Claude/Anthropic connection

**Notion:**
1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Find the Claude/Anthropic integration
3. Click **Remove**

After revoking, the connector will show as **Disconnected** in the Claude Console. The agent will skip that source during triage and note the disconnection in the digest.

---

## Troubleshooting

### Connector shows "Disconnected"

1. Click **Reconnect** in the agent's Tools section
2. Complete the OAuth flow again
3. If it keeps disconnecting, check that you haven't revoked access in the source service
4. Check that your account on the source service is still active

### Connector shows "Error"

1. Check the agent logs for the specific error message
2. Common errors:
   - **Rate limited**: The agent is making too many API calls. Consider reducing scan frequency.
   - **Permission denied**: The OAuth scope may have changed. Reconnect with updated permissions.
   - **Not found**: A channel, database, or resource the agent is trying to access may have been deleted or renamed.

### Gmail not finding new emails

- Verify the search query is using the correct `after:` timestamp
- Check that the Gmail labels in the include list actually exist
- Make sure the connected Google account is the correct one
- Check Gmail's API quota in the Google Cloud Console

### Slack not reading channels

- Verify the agent has been added to the channels it needs to read
- Private channels require explicit invitation for the Slack app
- Check that channel names in the configuration match exactly (case-sensitive)

### Granola returning no meetings

- Verify you have Granola meetings with transcripts in the time range
- Check that the Granola account is the correct one
- Ensure meetings have been processed by Granola (transcription complete)

### Notion not creating tasks

- Verify the agent has write access to the target database
- Check that the database properties match the expected schema
- Ensure the database hasn't been moved to a private section the agent can't access
