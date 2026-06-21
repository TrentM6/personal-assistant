# Setup Guide: Claude Console from Zero

This guide walks you through every step of setting up the Personal Assistant agent in the Claude Console (console.anthropic.com), starting from scratch. No prior experience required.

---

## Table of Contents

1. [Create your Anthropic account](#1-create-your-anthropic-account)
2. [Set up your organization](#2-set-up-your-organization)
3. [Add credits and set a budget](#3-add-credits-and-set-a-budget)
4. [Navigate to Managed Agents](#4-navigate-to-managed-agents)
5. [Create the Personal Assistant agent](#5-create-the-personal-assistant-agent)
6. [Configure MCP connectors](#6-configure-mcp-connectors)
7. [Add the system prompt](#7-add-the-system-prompt)
8. [Add skills](#8-add-skills)
9. [Set up cron schedules](#9-set-up-cron-schedules)
10. [Configure credentials](#10-configure-credentials)
11. [Test the agent](#11-test-the-agent)
12. [Go live](#12-go-live)

---

## 1. Create your Anthropic account

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Click **Sign up** (or **Log in** if you already have an account)
3. Sign up with your Google account or email address
4. Verify your email if prompted
5. You'll land on the Console dashboard

> If you're joining an existing organization, ask your admin for an invite link instead.

---

## 2. Set up your organization

Once you're logged in:

1. Click your **profile icon** in the top-right corner
2. Go to **Settings** > **Organization**
3. Set your **Organization name** (e.g., your company name)
4. Under **Members**, invite any team members who need access
   - **Admin**: Can manage billing, members, and agents
   - **Developer**: Can create and manage agents
   - **Viewer**: Can view agents but not modify them

---

## 3. Add credits and set a budget

This is the most important step for cost control. Claude Managed Agents bill per session-hour ($0.08/hr) plus token usage.

### 3a. Add credits

1. From the Console dashboard, click **Settings** in the left sidebar
2. Go to **Billing**
3. Click **Add payment method**
   - Enter your credit card or payment details
   - Click **Save**
4. Click **Add credits**
   - For initial testing, start with **$25-50**
   - This is prepaid — you won't be charged beyond what you load
5. Confirm the purchase

### 3b. Set a spending budget (critical)

This prevents runaway costs if something goes wrong:

1. Still in **Settings** > **Billing**
2. Find the **Spending limits** section
3. Set a **Monthly budget**:
   - **Recommended starting budget**: $50/month
   - This is a hard cap — the agent stops running when the budget is hit
   - You'll get email alerts at 50%, 75%, and 90% of the budget
4. Set a **Per-session limit** (optional but recommended):
   - Set to **$1.00** per session
   - This prevents any single agent run from consuming too many tokens
5. Click **Save limits**

### 3c. Monitor your spending

1. Go to **Settings** > **Billing** > **Usage**
2. You'll see a breakdown of:
   - **Session hours**: How long the agent has been running
   - **Token usage**: Input and output tokens consumed
   - **Total cost**: Running total for the billing period
3. Check this weekly for the first month to understand your usage pattern
4. Adjust your budget up or down based on actual usage

### 3d. Set up billing alerts

1. In **Settings** > **Billing** > **Alerts**
2. Add your email for billing notifications
3. Configure alert thresholds:
   - **50% of budget**: Early warning
   - **75% of budget**: Consider if you need to increase
   - **90% of budget**: Agent will stop soon if not increased
4. Optionally add a Slack webhook URL for real-time alerts

---

## 4. Navigate to Managed Agents

1. In the Console left sidebar, click **Agents** (or **Managed Agents**)
2. You'll see the Agents dashboard — this is where all your agents live
3. Click **Create Agent** to start building

---

## 5. Create the Personal Assistant agent

1. Click **Create Agent**
2. Fill in the basic information:
   - **Name**: `Personal Assistant`
   - **Description**: `Triages Gmail, Slack, Granola, and Notion. Classifies by urgency, drafts responses, delivers daily briefings.`
3. Select the **Model**:
   - Choose **Claude Sonnet 4** for the best balance of speed and capability
   - Claude Sonnet is recommended because the agent runs frequently (every 10 min for urgent scans) and needs to be fast and cost-effective
   - Claude Opus is available if you want maximum quality on classification decisions, but costs more
4. Click **Create** to save the initial configuration

---

## 6. Configure MCP connectors

The agent needs four MCP (Model Context Protocol) connectors to access your data sources. See [MCP-CONNECTORS.md](MCP-CONNECTORS.md) for the full detailed setup of each one, but here's the overview:

1. In the agent configuration, find the **Tools** or **MCP Connectors** section
2. Click **Add connector** for each:

| Connector | Access Level | What it connects to |
|-----------|-------------|-------------------|
| Gmail MCP | Read + Write | Threads, labels, attachments, drafts |
| Slack MCP | Read + Write | Channels, DMs, threads, @mentions |
| Granola MCP | Read only | Transcripts, notes, action items |
| Notion MCP | Read + Write | Databases, pages, wiki, tasks |

3. For each connector, you'll need to complete an **OAuth flow**:
   - Click **Connect** next to the connector name
   - A popup will open asking you to authorize access
   - Log in to the service (Gmail, Slack, etc.)
   - Grant the requested permissions
   - The popup will close and show "Connected"

4. The OAuth tokens are stored in Anthropic's **encrypted credential vault** — no passwords are stored in your agent configuration or code.

---

## 7. Add the system prompt

1. In your agent's configuration, find the **System Prompt** section
2. Copy the entire contents of [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md)
3. Paste it into the system prompt field
4. Before saving, customize the placeholder values:
   - Replace `{{USER_NAME}}` with the user's actual name
   - Replace `{{USER_EMAIL}}` with their email
   - Replace `{{USER_TIMEZONE}}` with their timezone (e.g., `America/New_York`)
   - Replace `{{ORGANIZATION_NAME}}` with the company name
5. Click **Save**

---

## 8. Add skills

Skills are named capabilities that the agent can invoke. Each skill is a focused routine with its own rules and output format.

1. In your agent's configuration, find the **Skills** section
2. For each skill defined in [SKILLS.md](SKILLS.md):
   - Click **Add Skill**
   - Enter the skill **name** (e.g., `email_triage`)
   - Paste the skill's **instructions** from the skills file
   - Set any **parameters** the skill requires
   - Click **Save**
3. The five core skills to add are:
   - `email_triage`
   - `meeting_followup`
   - `daily_digest`
   - `task_extraction`
   - `draft_response`

See [SKILLS.md](SKILLS.md) for the complete skill definitions.

---

## 9. Set up cron schedules

Cron schedules automatically wake the agent on a set cadence.

1. In your agent's configuration, find the **Triggers** or **Schedules** section
2. Add each cron trigger:

| Schedule | Cron Expression | Purpose |
|----------|----------------|---------|
| Every 10 minutes | `*/10 * * * *` | Urgent scan — VIP senders + deadlines only |
| Every hour | `0 * * * *` | Full triage — all 4 sources, complete pipeline |
| 7:00 AM weekdays | `0 7 * * 1-5` | Morning digest — compiled briefing via Slack |
| 5:00 PM weekdays | `0 17 * * 1-5` | EOD wrap — stale items, pending drafts, tomorrow preview |

3. For each trigger, set the **skill** it should invoke:
   - 10-min trigger → `email_triage` (urgent mode)
   - Hourly trigger → `email_triage` (full mode)
   - 7 AM trigger → `daily_digest`
   - 5 PM trigger → `daily_digest` (EOD variant)

4. Set the **timezone** for all schedule-based triggers to match the user's timezone

See [CRON-SCHEDULES.md](CRON-SCHEDULES.md) for complete details.

---

## 10. Configure credentials

All credentials are managed through OAuth — you don't store any passwords or API keys directly.

1. Go to your agent's **Credentials** section
2. Verify that all four MCP connectors show **Connected** status
3. If any show **Disconnected** or **Expired**:
   - Click **Reconnect**
   - Complete the OAuth flow again
   - Tokens are automatically refreshed, but may occasionally expire

### Security notes

- OAuth tokens are encrypted at rest in Anthropic's credential vault
- No passwords are stored in the agent configuration
- Tokens are scoped to the minimum permissions needed
- You can revoke access at any time from the source service (Gmail settings, Slack admin, etc.)

---

## 11. Test the agent

Before going live, test each component:

### Test 1: Manual trigger

1. In the agent dashboard, click **Run now** or **Test**
2. The agent should:
   - Connect to all four data sources
   - Pull recent items
   - Classify them by urgency
   - Generate a test output
3. Check the **Logs** tab to see what happened

### Test 2: Verify classification

1. Send yourself a test email with urgent language ("URGENT: Need response by EOD")
2. Trigger the agent manually
3. Check that it classifies the email as P0
4. Verify the draft response appears in your Gmail drafts

### Test 3: Verify digest

1. Trigger the daily digest skill manually
2. Check your Slack DMs for the digest message
3. Verify it includes the right sections and formatting

### Test 4: Verify task extraction

1. If you have recent Granola meeting notes with action items, trigger `task_extraction`
2. Check that tasks appear in your Notion database with correct owners and deadlines

---

## 12. Go live

Once testing is complete:

1. **Enable all cron triggers** — toggle each schedule to active
2. **Monitor for the first 24 hours**:
   - Check the agent logs after each scheduled run
   - Verify urgent alerts are arriving in Slack
   - Check that drafts look correct
   - Review the morning digest at 7 AM
3. **Fine-tune**:
   - Adjust your VIP list if important senders are being missed
   - Update channel filters if you're getting noise from irrelevant channels
   - Modify the writing style if drafts don't sound right
4. **Ongoing maintenance**:
   - Check billing weekly for the first month
   - Review and send/discard drafts daily
   - Update the VIP list and active projects as they change

---

## Troubleshooting

### Agent isn't running

- Check that cron triggers are enabled (toggled on)
- Verify you have remaining credits in Settings > Billing
- Check that your spending limit hasn't been hit
- Look at the agent logs for error messages

### MCP connector disconnected

- OAuth tokens occasionally expire
- Go to the agent's Tools section and click Reconnect
- Complete the OAuth flow again
- If it keeps disconnecting, check that you haven't revoked access in the source service

### Drafts aren't appearing

- Verify the Gmail MCP has **write** access (not just read)
- Check the agent logs for permission errors
- Make sure the email account used for OAuth matches the account where you expect drafts

### Classification seems wrong

- Review and update your VIP list in the configuration
- Check that active projects in Notion are current
- Look at the agent's reasoning in the logs — each classification includes a confidence score and explanation
- Adjust classification rules in the system prompt if needed

### Costs higher than expected

- Check Settings > Billing > Usage for a detailed breakdown
- Look for stuck sessions (sessions that didn't terminate properly)
- Reduce the urgent scan frequency from every 10 min to every 15 or 20 min
- Lower the per-session token limit
- Review whether full hourly triage is needed, or if every 2 hours is sufficient

---

## Next steps

- [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md) — The full system prompt to customize
- [SKILLS.md](SKILLS.md) — All skill definitions
- [RULES.md](RULES.md) — Classification and routing rules
- [CONFIGURATION.md](CONFIGURATION.md) — Customization options
- [COST-MANAGEMENT.md](COST-MANAGEMENT.md) — Detailed cost management guide
