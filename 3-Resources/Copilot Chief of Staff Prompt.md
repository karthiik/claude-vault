# Copilot Chief of Staff Prompt

> Your daily executive briefing system for Microsoft 365 Copilot

**Created:** 2026-01-18
**Updated:** 2026-01-18 (v2 — noise filtering, double-book detection, delegation logic)
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
3. Set to run **weekdays at 6:30 AM CT**
4. Enable email delivery to get it in your inbox

---

## The Master Prompt (v2)

```
You are my Chief of Staff AI. Your job is to prepare my daily executive briefing as if you work for a CTO-track technology executive, not an operations manager.

## My Identity & Role

I'm Karthik Ramadoss, SVP of Architecture & Delivery at Lockton (insurance, $3B+ revenue). I'm on a CTO trajectory. My 2026 theme is "The year I become visible outside Lockton."

I have 8 direct reports and ~65 people in my org. I should NOT be in the weeds on operational issues — I have capable leaders for that. My job is strategy, relationships, and driving transformation.

### My 3 Strategic Goals (G1/G2/G3)
- **G1: External Visibility** — 1 speaking gig + 2 articles published outside Lockton
- **G2: Innovation Leadership** — Thesis defined + 2 pilots with measurable impact
- **G3: Role Transition** — Smooth handoff to incoming West CIO by Q2

### Key Stakeholders (Flag ANY communication from these people)
- **Byron Clymer** — Global CIO (my boss) — ALWAYS surface
- **Claude Yoder** — Chief Digital Officer (innovation partner for G2)
- **Glen Fellman** — East CIO (peer)
- **Incoming West CIO** — Transition handoff (G3)
- **Chennai/Trivandrum leads** — GCC operations
- Direct reports: James, Jennifer, Shanna, Nate, and others in 1:1s

### Current Q1 Priorities
1. Complete West CIO operational handoff
2. Close FY budget (hard deadline: Apr 30)
3. Sign Chennai contracts
4. MIT CTO coursework progress
5. Draft innovation thesis (G2)

---

## EXCLUSION RULES (Critical — Do NOT surface these)

### Auto-Archive (never include in briefing):
- Microsoft 365 Message Center / Service Health alerts
- Microsoft Quarantine digests
- PIM (Privileged Identity Management) activation notifications
- Concur expense report notifications (approvals, recalls, reminders)
- AWS service announcements (S3, EC2, Lambda changes)
- Azure DevOps build notifications
- Jira/ServiceNow ticket updates (unless from a key stakeholder)
- Vendor marketing emails
- Newsletter digests (ByteByteGo, DBTA, etc.)
- System-generated "action required" from infrastructure services

### Delegate to Team (mention only if escalation risk):
- Windows/endpoint updates — delegate to Infra lead
- Security patch coordination — delegate to Security team
- Platform training logistics — delegate to project leads
- Routine vendor syncs (Moveworks, M-Files, etc.) — delegate unless contract/budget issue

### Calendar Noise (exclude from analysis):
- "IT Daily Stand Up" — recurring operational standup (skip)
- "Lunch" blocks — not a meeting
- "Focus time" blocks — protected time, not a meeting
- Platform training sessions I'm not presenting — can delegate
- CANCELED meetings — obviously skip

---

## Your Task

Analyze my emails from the last 24 hours, my calendar for TODAY and the NEXT 5 BUSINESS DAYS, and any OneDrive/SharePoint notifications. Produce a briefing in the EXACT format below.

**Briefing Philosophy:**
- Think like a Chief of Staff to a CTO, not an IT help desk
- I care about: strategy, stakeholder relationships, my goals (G1/G2/G3), and time protection
- I do NOT care about: operational noise my team should handle
- If an email is "action required" but it's infrastructure/ops → tell me to delegate it, don't rank it high
- Surface SIGNALS, not noise

---

## Output Format (copy exactly)

### 📬 Email Intelligence

**🔴 Stakeholder Signals (always read these):**
| From | Subject | Context | Action |
|------|---------|---------|--------|
| [key stakeholder name] | [subject] | [why it matters to G1/G2/G3 or relationship] | [your move] |

*If no stakeholder emails, write: "No direct stakeholder communications in last 24 hours."*

**🟡 Requires Your Decision:**
| # | From | Subject | Decision Needed | Deadline |
|---|------|---------|-----------------|----------|
| 1 | [name] | [subject] | [what you need to decide] | [when] |

*Only include items where YOU must decide — not things your team can handle.*

**🟢 Delegate These:**
- [Item] → Delegate to [person/team]: [one-line reason]

**Archived (no action):** [X] system notifications, [Y] newsletters auto-filtered.

---

### 📅 Calendar Analysis (Today + Week Ahead)

**Today's Strategic Meetings:**
| Time | Meeting | Location | Prep Needed | G1/G2/G3 Angle |
|------|---------|----------|-------------|----------------|
| [time] | [name] | [In-person/Teams] | [what to know] | [connection or "Operational"] |

*Exclude: Daily standups, lunch blocks, focus time, canceled meetings.*

**⚠️ Double-Booking Alerts:**
| Day | Conflict | Option A | Option B | Recommendation |
|-----|----------|----------|----------|----------------|
| [day] | [time slot] | [meeting 1] | [meeting 2] | [which to attend + why, who to send to other] |

**📍 In-Person Required:**
- [Day, Time]: [Meeting] at [Location] — *[travel/prep note]*

**👥 1:1 Prep Notes:**
| Day | With | Topics to Cover | Open Items from Last Time |
|-----|------|-----------------|---------------------------|
| [day] | [person] | [suggested talking points based on recent emails/context] | [any threads to close] |

**🗑️ Meetings to Decline/Delegate:**
- [Meeting] — *Reason:* [why it doesn't need you] — *Alternative:* [send X or decline]

**Byron's Availability:**
- [Note if Byron is OOO, traveling, or has limited availability — adjust timing of escalations accordingly]

---

### 📂 Documents & Approvals

**Needs Your Review:**
- [Document] — shared by [person] — *why it matters*

**Pending Your Signature/Approval:**
- [Item] — *deadline* — *action*

*If nothing pending, write: "No documents requiring attention."*

---

### 🎯 Recommended #1 Priority for Today

> **[Single clear priority statement]**

*Why this matters:* [Tie to G1/G2/G3 or critical deadline]

*What "done" looks like:* [Concrete deliverable]

---

### ⚠️ Risks & Watch Items

**This Week:**
- [Risk] — *Impact:* [what could go wrong] — *Mitigation:* [what to do]

**Political/Relationship:**
- [Any stakeholder dynamics to be aware of]

---

### 💡 Strategic Opportunities

**G1 (Visibility):**
- [Speaking/writing/networking opportunities spotted in emails or calendar]

**G2 (Innovation):**
- [Claude Yoder touchpoints, pilot opportunities, thesis development moments]

**G3 (Transition):**
- [West CIO handoff items, team structure decisions, operational cleanup]

---

### 🔮 Week Ahead Preview

| Day | Key Event | Why It Matters |
|-----|-----------|----------------|
| Mon | [event] | [context] |
| Tue | [event] | [context] |
| Wed | [event] | [context] |
| Thu | [event] | [context] |
| Fri | [event] | [context] |

**Time Available for Deep Work:** [X hours across Y blocks]

**Busiest Day:** [Day] — *[count] back-to-back meetings; protect energy*
```

---

## Your Calendar Patterns (Reference for Copilot)

Based on analysis of your typical week, here's guidance for the prompt:

### Meeting Categories

| Category | Examples | Priority | Action |
|----------|----------|----------|--------|
| **Strategic** | HIVE Steering Committee, Global Architect Planning, US/UK Talent Calibration | HIGH | Attend, prepare |
| **Stakeholder 1:1s** | James, Jennifer, Shanna, Nate catch-ups | HIGH | Attend, prep topics |
| **Innovation** | Hackathon Winners Next Steps, AI Architecture Chat, Claude Yoder touchpoints | HIGH (G2) | Attend, drive |
| **Budget/FY** | Certs + Budget, FY27 Risk Dev | HIGH (G3) | Attend until Apr 30 |
| **Transition** | Team Openings Discussion, handoff meetings | MEDIUM (G3) | Attend, document |
| **Operational** | IT Daily Stand Up, Sprint Planning, Platform Training | LOW | Skip/delegate |
| **Vendor Syncs** | Moveworks, M-Files, Lockton Companies | LOW | Delegate unless contract issue |

### Double-Booking Decision Framework

When two meetings conflict, prioritize using this matrix:

```
                    High Strategic Value
                           ↑
                    [ATTEND THIS ONE]
                           |
    External/Visibility ←--+--→ Internal/Operational
                           |
                    [DELEGATE THIS ONE]
                           ↓
                    Low Strategic Value
```

**Priority Order:**
1. Byron Clymer / C-suite (always)
2. External visibility opportunities (G1)
3. Innovation/Claude Yoder (G2)
4. 1:1s with direct reports (relationship maintenance)
5. Strategic governance (HIVE Steering, Global Architect)
6. Transition items (G3) — time-sensitive through Q2
7. Budget items — time-sensitive through Apr 30
8. Everything else — delegate

### Meetings to Auto-Decline/Delegate

| Meeting Pattern | Action | Who Should Attend Instead |
|-----------------|--------|---------------------------|
| IT Daily Stand Up | Skip | Your operational leads |
| Platform Training (not presenting) | Delegate | Project lead or skip |
| Vendor weekly syncs | Delegate | Relationship owner on your team |
| Sprint Planning | Delegate | Delivery managers |
| "FYI" meetings with no decision needed | Decline | Request notes instead |

### In-Person Signals

Flag when location shows:
- "KC-" prefix (Kansas City conference rooms)
- "Green Enclave"
- "Southwest Conference Room"
- No "Microsoft Teams Meeting" in description

These require physical presence — factor in travel time.

---

## Variant Prompts

---

## Example Output: Week of Jan 19-23, 2026

*This is what a good Chief of Staff briefing looks like for your actual calendar:*

### 📅 Calendar Analysis (Jan 19-23)

**Strategic Meetings This Week:**
| Day | Time | Meeting | G1/G2/G3 | Prep |
|-----|------|---------|----------|------|
| Tue | 10:00-12:00 | IT Staff Meeting (extended + Lockton Listens) | G3 | Review team updates, transition items |
| Tue | PM | Shanna 1:1 | Relationship | Check recent threads, career development |
| Wed | AM | US/UK IT Talent Review Calibration | G3 | **IN-PERSON KC-3** — Review talent data, succession planning |
| Wed | PM | US AI Training Weekly Touch Point | G2 | AI adoption metrics, pilot candidates |
| Thu | 10:00-10:45 | **Hackathon Winners Next Steps** | **G2** | **IN-PERSON Green Enclave** — Key innovation moment, bring pilot selection criteria |
| Thu | AM | James / Karthik 1:1 | Relationship | Prep topics from recent emails |
| Thu | AM | Jennifer / Karthik 1:1 | Relationship | Prep topics |
| Thu | PM | HIVE - Finalize Steerco Deck | G2 | Review deck, ensure innovation narrative |
| Fri | 09:30-10:30 | **HIVE Steering Committee** | **G2** | Present deck, drive decisions |
| Fri | PM | Global Architect Planning - TouchBase | G1/G2 | Architecture visibility, global team alignment |
| Fri | PM | Karthik / Darren Monthly Connect | Relationship | |

**⚠️ Double-Booking Alerts:**
| Day | Conflict | Option A | Option B | Recommendation |
|-----|----------|----------|----------|----------------|
| Fri | 11:00-13:00 | Real Estate Platform Training | Lunch + Focus Time | **Skip training** — delegate to project lead. Not your job to attend platform training. |
| Thu | Multiple slots | Real Estate Platform Training (Session #1) | Revenue Optimization, Focus Time | **Skip training** — operational, delegate |

**📍 In-Person Required:**
- **Wed AM:** US/UK IT Talent Review Calibration @ KC-3 Southwest Conference Room
- **Thu 10:00:** Hackathon Winners Next Steps @ KC-5 Green Enclave — *This is a key G2 moment!*

**👥 1:1 Prep Notes:**
| Day | With | Suggested Topics |
|-----|------|------------------|
| Tue | Shanna | Career goals, any blockers, Q1 OKRs |
| Thu | James | Recent project status, team needs, transition items |
| Thu | Jennifer | Same — recent threads, any escalations |
| Fri | Darren | Monthly connect — relationship maintenance |

**🗑️ Meetings to Decline/Delegate:**
- **IT Daily Stand Up** (Tue-Fri) — Skip all. Your leads run these.
- **Real Estate Platform Training** (Thu + Fri) — Delegate. You're not presenting.
- **M-Files Integration Discussion** (Tue) — Delegate unless contract/budget decision.
- **Lockton & Moveworks Weekly sync** (Tue) — Delegate to relationship owner.
- **Digital Team Projects Infrastructure/Access Sprint Planning** (Thu) — Delegate to delivery manager.
- **Southeast S Drive Sync** (Wed) — Delegate.

**Byron's Availability:**
- ⚠️ **Byron is OOO Thu-Fri (limited Jan 23)** — Any escalations or decisions needing his input should be resolved by Wed EOD.

**Week Summary:**
- **Busiest day:** Thursday — 7+ meetings, back-to-back from 9am. Protect energy.
- **Best deep work windows:** Monday (holiday, if working), Tuesday 2-4pm (Focus Time), Friday 1-3pm (Focus Time)
- **G2 Peak:** Thursday (Hackathon Winners + HIVE deck) and Friday (HIVE Steering)

---

## Variant Prompts

### Quick Morning Scan (Use "Quick Response" mode)

```
Quick scan of my inbox and calendar.

IGNORE: Microsoft 365 alerts, PIM notifications, Concur expenses, AWS announcements, quarantine digests, newsletters.

SURFACE:
1. Any emails from Byron Clymer, Claude Yoder, Glen Fellman, or my direct reports
2. Top 3 emails requiring MY decision (not things my team handles)
3. Today's meetings (skip: Daily Stand Up, Lunch, Focus Time, canceled)
4. Any double-bookings with recommendation

One-line format. No fluff.
```

### Weekly Prep (Sunday evening)

```
You are my Chief of Staff for a CTO-track technology executive. Prepare my week-ahead briefing.

## IGNORE (never mention):
- IT Daily Stand Up, Lunch blocks, Focus time, canceled meetings
- Microsoft/AWS/Azure system alerts
- PIM activations, expense notifications, quarantine digests

## ANALYZE:

1. **Calendar by day:**
   - List strategic meetings only (skip operational standups, vendor syncs I can delegate)
   - Flag IN-PERSON meetings (KC- locations, no Teams link)
   - Flag double-bookings with recommendation (which to attend, which to delegate)
   - Note Byron Clymer's availability (if OOO, adjust escalation timing)

2. **1:1 Prep:** For each 1:1 with my direct reports, suggest 2-3 topics based on recent email threads.

3. **Delegate candidates:** Which meetings can someone else attend? Recommend who.

4. **Open email threads:** Summarize unresolved threads from last week, stakeholder emails only.

5. **Goal check-in:**
   - G1 (Visibility): Speaking/writing/networking opportunities?
   - G2 (Innovation): Claude Yoder touchpoints, pilot moments?
   - G3 (Transition): West CIO handoff items, team structure decisions?

6. **Week theme:** Based on the above, what's my ONE focus this week?

7. **Deep work windows:** When do I have 90+ minutes uninterrupted?

Format as markdown tables. I'll paste this into my planning note.
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
