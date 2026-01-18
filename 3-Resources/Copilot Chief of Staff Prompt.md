# Copilot Chief of Staff Prompt

> Your daily executive briefing system for Microsoft 365 Copilot

**Created:** 2026-01-18
**Purpose:** Generate a morning briefing to paste into your [[Templates/Daily|Daily Note]]
**Model:** Use **Think Deeper** mode (GPT-5.2 Thinking) for best results

---

## Quick Setup

1. Open **Copilot Chat** in Teams or office.com/copilot
2. Paste the **Master Prompt** below
3. Set mode to **"Think Deeper"** (or let Smart Mode route it)
4. Copy output → Paste into Daily Note sections

### Scheduled Automation (Optional)

To automate this as a morning briefing:
1. Run the prompt once in Copilot Chat
2. Hover over your prompt → **"Schedule this prompt"**
3. Set to run **weekdays at 7:00 AM CT**
4. Enable email delivery to get it in your inbox

---

## The Master Prompt

```
You are my Chief of Staff AI. Your job is to prepare my daily executive briefing.

## My Context

I'm Karthik Ramadoss, SVP of Architecture & Delivery at Lockton. My 2026 theme is "The year I become visible outside Lockton."

### My 3 Strategic Goals
- **G1: External Visibility** — 1 speaking gig + 2 articles published
- **G2: Innovation Leadership** — Thesis defined + 2 pilots with impact
- **G3: Role Transition** — Smooth handoff to incoming West CIO

### Key Stakeholders to Flag
- Byron Clymer (Global CIO, my boss)
- Claude Yoder (Chief Digital Officer, innovation partner)
- Glen Fellman (East CIO, peer)
- Incoming West CIO (transition handoff)
- Chennai/Trivandrum teams (GCC operations)
- MIT CTO Program (learning priority)

### Current Q1 Priorities
1. Complete West CIO handoff
2. Close FY budget (Apr 30 deadline)
3. Sign Chennai contracts
4. MIT CTO coursework progress
5. Draft innovation thesis

---

## Your Task

Analyze my emails, calendar, and OneDrive notifications from the last 24 hours. Produce a briefing in the EXACT format below.

**Important instructions:**
- Be concise but complete — I'll paste this into my notes
- Flag anything from key stakeholders immediately
- Surface items that connect to G1, G2, or G3
- Identify hidden opportunities (speaking invites, collaboration asks, visibility moments)
- Warn me about risks (missed deadlines, political landmines, overcommitment)

---

## Output Format (copy exactly)

### 📬 Email Intelligence

**Requires Response (ranked by priority):**
| # | From | Subject | Why It Matters | Suggested Action |
|---|------|---------|----------------|------------------|
| 1 | [name] | [subject] | [G1/G2/G3 connection or urgency] | [one-line action] |

**FYI — Worth Knowing:**
- [Bullet summary of important FYI emails]

**Can Archive:**
- [Count] emails are low-priority newsletters/notifications

---

### 📅 Today's Meetings

| Time | Meeting | Prep Needed | Strategic Angle |
|------|---------|-------------|-----------------|
| [time] | [meeting name] | [what to review/know] | [G1/G2/G3 connection if any] |

**Watch out:** [Any back-to-back issues, missing prep time, or conflicts]

**Hidden opportunity:** [Any meeting that could serve visibility/innovation goals]

---

### 📂 OneDrive & SharePoint Alerts

**Documents requiring attention:**
- [File name] — shared by [person] — [why it matters]

**Pending reviews/approvals:**
- [Any documents awaiting your input]

---

### 🎯 Recommended #1 Priority

Based on today's landscape, your single most important focus should be:

> **[One clear priority statement]**

*Why:* [Brief reasoning tied to goals or urgency]

---

### ⚠️ Risks & Blockers

- [Any deadline risks]
- [Political/stakeholder concerns]
- [Overcommitment warnings]

---

### 💡 Opportunities Spotted

- **G1 (Visibility):** [Any speaking/writing/networking opportunities]
- **G2 (Innovation):** [Any pilot ideas, Claude Yoder collaboration moments]
- **G3 (Transition):** [Any handoff progress or concerns]

---

### 🔮 Heads Up (This Week)

- [Important upcoming items from calendar/email threads]
```

---

## Variant Prompts

### Quick Morning Scan (Use "Quick Response" mode)

```
Summarize my unread emails from the last 24 hours. Rank top 5 by importance (1-5).
Flag anything from: Byron Clymer, Claude Yoder, Glen Fellman, or Chennai/Trivandrum teams.
List today's meetings with one-line prep notes each.
```

### Weekly Prep (Sunday evening)

```
You are my Chief of Staff. Prepare my week-ahead briefing:

1. **Calendar review:** List all meetings for the coming week, grouped by day. Flag any prep-heavy meetings or conflicts.

2. **Email threads:** Summarize any email threads from last week that are still unresolved. Rank by importance.

3. **Goal check-in:**
   - G1 (Visibility): Any speaking/writing opportunities or deadlines this week?
   - G2 (Innovation): Any pilot progress or Claude Yoder touchpoints?
   - G3 (Transition): Any West CIO handoff items?

4. **Recommend my "theme" for the week** — what should I focus on?

Format as a clean briefing I can paste into my weekly planning note.
```

### Meeting Prep (Before important meetings)

```
I have a meeting with [NAME] about [TOPIC] in [TIME].

Search my emails and OneDrive for:
1. Recent correspondence with this person
2. Documents related to this topic
3. Any commitments I made in past meetings

Prepare a 1-page brief:
- Key context/history
- What they likely want from me
- What I should ask/propose
- Potential landmines to avoid
```

### End of Day Wrap (Use "Quick Response" mode)

```
Review emails and Teams messages I sent today.
List any commitments I made that need follow-up.
Surface any threads where I'm waiting on someone else.
Flag anything that should go into tomorrow's priorities.
```

---

## Pro Tips

### 1. Use Think Deeper for Complex Analysis
The morning briefing benefits from GPT-5.2's Thinking mode. It needs to:
- Cross-reference multiple sources (email + calendar + files)
- Reason about priority and strategic relevance
- Generate structured, actionable output

### 2. Reference Specific Time Windows
Instead of vague requests, be specific:
- ✓ "emails from the last 24 hours"
- ✓ "calendar for January 20-24"
- ✗ "recent emails" (ambiguous)

### 3. Name Your Stakeholders Explicitly
Copilot is better at filtering when you name names:
- ✓ "Flag anything from Byron Clymer or Claude Yoder"
- ✗ "Flag important people"

### 4. Request Specific Output Formats
Tables and bullet lists paste cleanly into Obsidian:
- ✓ "Format as a markdown table"
- ✓ "Use bullet points for FYI items"

### 5. Iterate Your Prompt
Save versions that work well. Copilot's responses improve when you:
- Add examples of good output
- Clarify what "priority" means to you
- Specify what to ignore (e.g., "skip HR newsletters")

### 6. Combine with Things 3
After your briefing, send time-sensitive action items to Things 3:
- Deadlines → Things with due dates
- Strategic items → Keep in daily note for context

---

## Customization

Update the **Key Stakeholders** and **Q1 Priorities** sections quarterly as your focus shifts.

### Q2 2026 Updates (suggested)
Once Q1 priorities resolve, update to:
- West CIO handoff complete → Remove from priorities
- Innovation thesis draft → Change to "finalize thesis"
- Add: "Submit speaking proposals"
- Add: "Complete first article draft"

---

## Related

- [[Templates/Daily]] — Where briefing output goes
- [[2026 Career Goals]] — The G1/G2/G3 framework
- [[0_Career_Purpose_Index]] — Full career context

---

## Sources & Further Reading

- [What's New with GPT-5 in Copilot](https://www.microsoft.com/en-us/microsoft-copilot/for-individuals/do-more-with-ai/general-ai/whats-new-with-gpt-5-in-copilot) — Microsoft's GPT-5 features
- [GPT-5.2 in Microsoft 365 Copilot](https://www.microsoft.com/en-us/microsoft-365/blog/2025/12/11/available-today-gpt-5-2-in-microsoft-365-copilot/) — Thinking mode details
- [Copilot Scheduled Prompts](https://tminus365.com/this-copilot-trick-turns-outlook-into-your-executive-assistant/) — Automation setup
- [Microsoft Copilot Prompts Gallery](https://m365.cloud.microsoft/copilot-prompts) — Official prompt library
- [Microsoft 365 Copilot Power User Tips](https://techcommunity.microsoft.com/blog/microsoftmechanicsblog/microsoft-365-copilot-power-user-tips/4404994) — Advanced techniques
