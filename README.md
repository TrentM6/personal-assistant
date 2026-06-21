# Personal Assistant Agent

**Your inbox, triaged by an agent that never sleeps.**

A Claude Managed Agent that integrates with Gmail, Slack, Granola, and Notion. It classifies communications by urgency, drafts responses, delivers daily briefings, and maintains a persistent knowledge base that compounds over time - all hosted by Anthropic with no infrastructure to manage.

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
| [NOTION-WIKI.md](NOTION-WIKI.md) | The agent's persistent knowledge base - schema, page types, read/write operations |
| [CONFIGURATION.md](CONFIGURATION.md) | How to customize VIPs, channels, projects, writing style, and digest format |
| [COST-MANAGEMENT.md](COST-MANAGEMENT.md) | Detailed cost breakdown, budget setup, and monitoring |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture overview and data flow |
| `assets/` | Architecture diagram (HTML + PDF) |

---

## Architecture at a glance

```
Gmail ──┐                                                    ┌── Urgent alert (Slack DM)
Slack ──┤   Ingest → Dedup → Enrich → Classify → Score →   ├── Draft queue (Gmail/Slack)
Granola ┤   Route                              ▲             ├── Notion tasks
Notion ─┘                                      │             ├── Daily digest (Slack)
                                          Wiki reads         └── Wiki updates
                                        (context from              │
                                      persistent knowledge)        ▼
                                               ▲          Assistant Wiki (Notion)
                                               └──────── People, Projects, Patterns,
                                                         Decisions, Open Questions
```

The agent maintains a **persistent wiki** in Notion - a compounding knowledge base of people, projects, patterns, and decisions that makes it smarter with every run.

**Key constraint: Drafts, never sends.** All responses are staged for human review. Nothing is sent without your approval.

---

## Quick start

1. Read [SETUP-GUIDE.md](SETUP-GUIDE.md) to get your Claude Console account ready
2. Follow [MCP-CONNECTORS.md](MCP-CONNECTORS.md) to connect your data sources
3. Set up the wiki database per [NOTION-WIKI.md](NOTION-WIKI.md)
4. Paste the system prompt from [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md)
5. Add the skills from [SKILLS.md](SKILLS.md)
6. Configure your cron schedules per [CRON-SCHEDULES.md](CRON-SCHEDULES.md)
7. Customize your settings per [CONFIGURATION.md](CONFIGURATION.md)
8. Set your budget per [COST-MANAGEMENT.md](COST-MANAGEMENT.md)

---

## Estimated cost

~$8-20/month with model delegation (Sonnet for classification/drafting, Haiku for wiki operations). Wiki ops cost ~$0.50-1.50/month on Haiku (vs. ~$2-5 on Sonnet). Higher volumes or Opus model: $20-35/month.

