# Personal Assistant Agent

**Your inbox, triaged by an agent that never sleeps.**

A Claude Managed Agent that integrates with Gmail, Slack, Granola, and Notion. It classifies communications by urgency, drafts responses, and delivers daily briefings — all hosted by Anthropic with no infrastructure to manage.

Built by [Baseline Studio](https://baselinestudio.design/personal-assistant).

---

## What's in this repo

| File | Purpose |
|------|---------|
| [SETUP-GUIDE.md](SETUP-GUIDE.md) | Step-by-step Claude Console setup from zero (credits, billing, deployment) |
| [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md) | The full system prompt to paste into the agent |
| [SKILLS.md](SKILLS.md) | All agent skills with complete definitions |
| [RULES.md](RULES.md) | Classification rules, priority scoring, and routing logic |
| [MCP-CONNECTORS.md](MCP-CONNECTORS.md) | How to set up each MCP connector (Gmail, Slack, Granola, Notion) |
| [CRON-SCHEDULES.md](CRON-SCHEDULES.md) | All cron triggers with exact schedules and what they do |
| [CONFIGURATION.md](CONFIGURATION.md) | How to customize VIPs, channels, projects, writing style, and digest format |
| [COST-MANAGEMENT.md](COST-MANAGEMENT.md) | Detailed cost breakdown, budget setup, and monitoring |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture overview and data flow |
| `assets/` | Architecture diagram (HTML + PDF) |

---

## Architecture at a glance

```
Gmail ──┐                                          ┌── Urgent alert (Slack DM)
Slack ──┤   Ingest → Dedup → Classify → Score →   ├── Draft queue (Gmail/Slack)
Granola ┤   Route                                  ├── Notion tasks
Notion ─┘                                          └── Daily digest (Slack)
```

**Key constraint: Drafts, never sends.** All responses are staged for human review. Nothing is sent without your approval.

---

## Quick start

1. Read [SETUP-GUIDE.md](SETUP-GUIDE.md) to get your Claude Console account ready
2. Follow [MCP-CONNECTORS.md](MCP-CONNECTORS.md) to connect your data sources
3. Paste the system prompt from [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md)
4. Add the skills from [SKILLS.md](SKILLS.md)
5. Configure your cron schedules per [CRON-SCHEDULES.md](CRON-SCHEDULES.md)
6. Customize your settings per [CONFIGURATION.md](CONFIGURATION.md)
7. Set your budget per [COST-MANAGEMENT.md](COST-MANAGEMENT.md)

---

## Estimated cost

~$15-40/month based on $0.08/session-hour + token usage. Urgent scans take ~2s, full triage ~15-30s.

---

## License

This project documentation is provided by Baseline Studio for client use. See [baselinestudio.design](https://baselinestudio.design) for details.
