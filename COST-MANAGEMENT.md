# Cost Management

Detailed cost breakdown, budget setup, monitoring, and optimization for the Personal Assistant agent.

---

## Table of Contents

1. [How billing works](#1-how-billing-works)
2. [Cost breakdown by schedule](#2-cost-breakdown-by-schedule)
3. [Setting up your budget](#3-setting-up-your-budget)
4. [Monitoring costs](#4-monitoring-costs)
5. [Cost optimization](#5-cost-optimization)
6. [Budget scenarios](#6-budget-scenarios)

---

## 1. How billing works

Claude Managed Agents have two cost components:

### Session time

- Billed at **$0.08 per session-hour**
- A "session" is one agent run — from when a cron trigger fires to when the agent finishes
- Time is prorated to the second: a 15-second run costs $0.08 × (15/3600) = $0.00033
- Sessions that fail immediately still incur a minimum charge

### Token usage

- **Input tokens** (reading data, system prompt, conversation context): varies by model
- **Output tokens** (classification reasoning, draft responses, digest composition): varies by model
- Pricing depends on the model selected:

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|----------------------|
| Claude Sonnet 4 | $3.00 | $15.00 |
| Claude Opus 4 | $15.00 | $75.00 |
| Claude Haiku 4 | $0.80 | $4.00 |

**Recommendation**: Use **Claude Sonnet 4** for the best cost/performance balance. The classification and drafting tasks don't require Opus-level reasoning, and Sonnet is 5x cheaper.

### What drives token usage

| Operation | Approximate input tokens | Approximate output tokens |
|-----------|------------------------|-------------------------|
| System prompt (loaded every session) | ~4,000-6,000 | 0 |
| Reading 10 email threads | ~5,000-15,000 | 0 |
| Reading 20 Slack messages | ~2,000-5,000 | 0 |
| Wiki enrichment queries (2-5 pages) | ~1,000-3,000 | 0 |
| Classifying 10 items (with wiki context) | ~800 | ~1,200-2,500 |
| Drafting 3 responses (with wiki context) | ~1,500 | ~1,000-2,000 |
| Composing morning digest (with wiki) | ~3,000 | ~2,000-4,000 |
| Wiki page updates (1-3 pages) | ~200 | ~500-1,500 |

---

## 2. Cost breakdown by schedule

### Urgent scan (every 10 minutes)

```
Frequency: 144 runs/day (6 per hour × 24 hours)
Average runtime: ~3 seconds
Daily session cost: 144 × $0.08 × (3/3600) = $0.0096
Daily token cost: ~$0.01-0.03 (minimal — just VIP search + quick classify)
Daily total: ~$0.02-0.04
Monthly total: ~$0.60-$1.20
```

### Full triage (every hour)

```
Frequency: 24 runs/day
Average runtime: ~20 seconds
Daily session cost: 24 × $0.08 × (20/3600) = $0.0107
Daily token cost: ~$0.10-0.30 (reads threads, classifies all, drafts some)
Daily total: ~$0.12-0.32
Monthly total: ~$3.60-$9.60
```

### Morning digest (7 AM weekdays)

```
Frequency: ~22 runs/month (weekdays)
Average runtime: ~15 seconds
Monthly session cost: 22 × $0.08 × (15/3600) = $0.0073
Monthly token cost: ~$0.50-1.50 (reads queue, composes long message)
Monthly total: ~$0.50-$1.50
```

### EOD wrap (5 PM weekdays)

```
Frequency: ~22 runs/month
Average runtime: ~12 seconds
Monthly session cost: 22 × $0.08 × (12/3600) = $0.0059
Monthly token cost: ~$0.30-0.80
Monthly total: ~$0.30-$0.80
```

### Total monthly estimate

| Component | Low estimate | High estimate |
|-----------|-------------|---------------|
| Urgent scans | $0.60 | $1.20 |
| Full triage | $4.50 | $12.00 |
| Morning digest (with wiki) | $0.80 | $2.00 |
| EOD wrap (with wiki) | $0.50 | $1.20 |
| Wiki maintenance | $0.50 | $1.50 |
| **Subtotal** | **$6.90** | **$17.90** |
| Buffer (unexpected spikes) | $2.00 | $5.00 |
| **Total** | **$8.90** | **$22.90** |

The higher end of the range ($17-45/month) accounts for:
- Higher email/Slack volume (50+ items per triage instead of 10-20)
- More draft responses generated (each one uses tokens)
- Longer meeting transcripts from Granola
- Wiki read/write operations on every run (~$2-5/month)
- Using Claude Opus instead of Sonnet

---

## 3. Setting up your budget

### Step-by-step budget setup

#### A. Add credits

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Click **Settings** in the left sidebar
3. Click **Billing**
4. Click **Add payment method** (if you haven't already)
   - Enter credit card details
   - Click **Save**
5. Click **Add credits** (or **Purchase credits**)
   - **First-time recommended amount: $25**
   - This gives you enough for ~1-2 months of typical usage
   - Credits are prepaid — you won't be charged beyond what you load
6. Click **Confirm purchase**

#### B. Set monthly spending limit

1. In **Settings** > **Billing**, find **Spending limits**
2. Set **Monthly budget**: **$50**
   - This is a hard cap — the agent stops when it's hit
   - Set it higher than your expected spend to avoid unexpected cutoffs
   - You'll get alerts before hitting the cap
3. Click **Save**

#### C. Set per-session limit (optional but recommended)

1. In **Settings** > **Billing** > **Spending limits**
2. Set **Per-session limit**: **$1.00**
   - Prevents any single agent run from consuming excessive tokens
   - Normal runs use $0.01-0.30, so $1 is generous with safety margin
   - If a run hits this limit, it stops and logs an error
3. Click **Save**

#### D. Configure alerts

1. In **Settings** > **Billing** > **Notifications** (or **Alerts**)
2. Add your email address for billing notifications
3. Set alert thresholds:
   - **50% of monthly budget** ($25): "Heads up, you're halfway through"
   - **75% of monthly budget** ($37.50): "Getting close, review if needed"
   - **90% of monthly budget** ($45): "Almost at the limit, agent will stop soon"
4. Optionally: Set up a Slack webhook to get alerts in a channel
5. Click **Save**

### Budget recommendations by usage level

| Usage level | Monthly budget | Credits to load | Per-session limit |
|-------------|---------------|----------------|-------------------|
| Light (small team, low email volume) | $30 | $25 to start | $0.50 |
| Standard (medium team, moderate volume) | $50 | $50 to start | $1.00 |
| Heavy (large team, high volume, Opus model) | $100 | $100 to start | $2.00 |

---

## 4. Monitoring costs

### Daily check (first week)

For the first week after deployment, check costs daily:

1. Go to **Settings** > **Billing** > **Usage**
2. Look at:
   - **Today's spend**: Is it tracking to your expected daily rate?
   - **Session count**: How many times has the agent run?
   - **Average session duration**: Are sessions taking longer than expected?
   - **Token breakdown**: What's driving token usage?

### Weekly check (first month)

After the first week, switch to weekly checks:

1. Same location: **Settings** > **Billing** > **Usage**
2. Look at:
   - **Weekly trend**: Is spending increasing, stable, or decreasing?
   - **Peak days**: Are certain days more expensive? (Monday mornings often spike)
   - **Error sessions**: Sessions that failed but still cost money

### Monthly review (ongoing)

1. Review the monthly total against your budget
2. Compare to the previous month
3. Decide whether to:
   - **Increase budget**: If you're consistently hitting the cap before month end
   - **Decrease budget**: If you're consistently well under budget
   - **Optimize**: If costs are higher than expected (see Cost optimization below)

### Viewing detailed logs

1. Go to your agent's **Logs** section in the Console
2. Each run shows:
   - Timestamp and duration
   - Skill invoked
   - Items processed
   - Token count (input + output)
   - Estimated cost for that run
3. Sort by cost to find your most expensive runs
4. Click into a run to see exactly what happened

---

## 5. Cost optimization

### Quick wins

**1. Reduce urgent scan frequency**
- Every 10 min → every 15 min saves ~33%
- Every 10 min → every 20 min saves ~50%
- Business hours only saves ~60%

**2. Use business-hours-only schedules**
If nothing urgent happens at 3 AM, don't scan at 3 AM:
```
Urgent scan: */10 8-18 * * 1-5    (business hours, weekdays)
Full triage: 0 8-18 * * 1-5       (business hours, weekdays)
```

**3. Be aggressive with exclude filters**
Every channel/label you exclude means fewer items to process, fewer tokens consumed:
- Exclude high-volume Slack channels you don't need to monitor
- Exclude automated Gmail labels (promotions, social, newsletters)

**4. Keep the VIP list tight**
More VIPs = more P0 items = more draft responses = more tokens. Only include people whose messages truly require immediate attention.

### Advanced optimization

**5. Model selection**
- Claude Sonnet 4 (recommended): Best cost/performance for classification tasks
- Claude Haiku 4: Even cheaper, but may produce lower quality classifications and drafts
- Claude Opus 4: Best quality, but 5x the cost of Sonnet. Only use if classification accuracy is critical and budget allows

**6. System prompt optimization**
- A shorter system prompt = fewer input tokens per session
- Since the system prompt is loaded on every run (144 urgent scans/day), even small reductions add up
- Remove verbose examples from the prompt if the agent has learned the patterns
- Keep essential rules, trim explanations

**7. Reduce Granola processing**
- If you have many meetings, Granola transcripts are the largest token consumers
- Option: Only process meetings with 3+ participants (skip 1:1s)
- Option: Only process meetings on the hourly triage, not urgent scans

**8. Cap digest length**
- Set a maximum number of items per digest section
- "Show top 5 P2 items, count the rest" instead of listing all 20

---

## 6. Budget scenarios

### Scenario 1: Solo founder, moderate email volume

```
Setup:
- 30 emails/day, 50 Slack messages/day
- 3-4 meetings/week
- 8 VIPs (investors, board, key clients)
- Sonnet 4 model

Expected monthly cost: $10-18
Recommended budget: $30
Recommended starting credits: $25
```

### Scenario 2: Executive at a medium company

```
Setup:
- 80 emails/day, 150 Slack messages/day
- 6-8 meetings/week
- 15 VIPs (board, leadership team, key clients)
- Sonnet 4 model
- Aggressive schedule (5-min urgent scans)

Expected monthly cost: $25-40
Recommended budget: $60
Recommended starting credits: $50
```

### Scenario 3: Minimal usage, cost-conscious

```
Setup:
- Triage 3x/day instead of hourly
- No urgent scans
- Morning digest only, no EOD wrap
- 20 emails/day, 30 Slack messages/day
- Haiku 4 model

Expected monthly cost: $3-6
Recommended budget: $15
Recommended starting credits: $15
```

### Scenario 4: Maximum coverage

```
Setup:
- 5-min urgent scans, 24/7
- 30-min full triage
- Morning + EOD + weekly digest
- 100+ emails/day, 200+ Slack messages/day
- 10+ meetings/week
- Opus 4 model for best classification

Expected monthly cost: $50-100+
Recommended budget: $150
Recommended starting credits: $100
```
