**<% tp.date.now("dddd") %>** · Week <% tp.date.now("W") %>

<%*
// ═══════════════════════════════════════════════════════════════════
// DAILY SPARK — Randomized inspiration from arrays
// ═══════════════════════════════════════════════════════════════════

const quotes = [
  "The obstacle is the way. — Marcus Aurelius",
  "First principles: reduce to fundamentals and reason up from there. — Elon Musk",
  "What got you here won't get you there. — Marshall Goldsmith",
  "The best time to plant a tree was 20 years ago. The second best is now.",
  "Be so good they can't ignore you. — Steve Martin",
  "Clarity comes from engagement, not thought. — Marie Forleo",
  "The score takes care of itself. — Bill Walsh",
  "Think like a man of action, act like a man of thought. — Henri Bergson",
  "Small daily improvements are the key to long-term results. — James Clear",
  "Leadership is not about being in charge. It's about taking care of those in your charge. — Simon Sinek",
  "We suffer more in imagination than in reality. — Seneca",
  "The chief task in life is simply this: to identify and separate matters. — Epictetus",
  "You could leave life right now. Let that determine what you do and say and think. — Marcus Aurelius",
  "The impediment to action advances action. What stands in the way becomes the way. — Marcus Aurelius",
  "Waste no more time arguing about what a good man should be. Be one. — Marcus Aurelius"
];

const areaNudges = [
  "🏃 Health: When did you last push your physical edge?",
  "🏃 Health: How's your energy today? Body doesn't lie.",
  "💛 Relationships: What does Jamie need from you this week?",
  "💛 Relationships: Plan something 1:1 with Vinay.",
  "💛 Relationships: Who deserves a thank-you today?",
  "🚀 Career: Are you building for visibility or just delivery?",
  "🚀 Career: What's one thing only you can do today?",
  "💰 Finances: Is your money working while you work?",
  "📚 Learning: What's one MIT insight you can apply today?",
  "📚 Learning: Synthesis over consumption — what's the insight?",
  "🎨 Joy: When's the next adventure on the calendar?",
  "🎨 Joy: What would make today feel alive?",
  "🏠 Home: Does your space spark creativity right now?",
  "🌟 Contribution: Who can you mentor or uplift today?",
  "🌟 Contribution: What's worth sharing from your experience?"
];

const goalReminders = [
  "G1 Visibility: What moves you toward being known outside Lockton today?",
  "G1 Visibility: One sentence toward the article. That's all it takes.",
  "G1 Visibility: Who should know your name that doesn't yet?",
  "G2 Innovation: What's your sharpest insight on the thesis right now?",
  "G2 Innovation: Which pilot could prove your point this quarter?",
  "G3 Transition: Is the handoff protected? What needs attention?",
  "2026 Theme — EMERGENCE: Are you stepping into visibility today?"
];

const relationshipPings = [
  "💛 Text Jamie something unexpected.",
  "💛 Ask Vinay a real question. Listen fully.",
  "💛 Who at work needs your encouragement today?",
  "💛 When's the last time you reached out to Mom?",
  "💛 Someone is thinking of you. Reach back.",
  "💛 Presence > presents. Be fully there today."
];

const learningPrompts = [
  "📚 MIT: What's one framework you can apply at Lockton?",
  "📚 IDEO: How might you reframe today's hardest problem?",
  "📚 What book has been sitting unread too long?",
  "📚 Teach someone one thing you learned this week.",
  "📚 What would a first-principles thinker do here?"
];

const adventureSparks = [
  "🎨 Next hike idea: research a new trail this weekend.",
  "🎨 When's the motorcycle coming out next?",
  "🎨 London trip April — what's one must-do experience?",
  "🎨 India/Dubai summer — who do you want to reconnect with?",
  "🎨 Photography: what's a shot you've been meaning to capture?",
  "🎨 What would 10-year-old Karthik think is cool about your life?"
];

// Combine all sparks with weighted randomization
const allSparks = [
  ...quotes.map(q => `💬 "${q}"`),
  ...areaNudges,
  ...goalReminders,
  ...relationshipPings,
  ...learningPrompts,
  ...adventureSparks
];

const randomSpark = allSparks[Math.floor(Math.random() * allSparks.length)];
_%>
> [!quote] ✨ Daily Spark
> <% randomSpark %>

---

## Habits

> [!check] Who I showed up as today
>
> | | Identity | Atomic Action | Done |
> |:-:|:--|:--|:-:|
> | 🏃 | **Lean & Energized** | Move my body *(10 pushups counts)* | Lean:: false |
> | 🧠 | **Clear-Minded** | Create before consume *(write before phone)* | Clear:: false |
> | 📚 | **Always Learning** | Feed my mind *(5 min MIT or 1 page)* | Learning:: false |
> | ✍️ | **Thought Leader** | Build visibility *(1 sentence toward article)* | Visible:: false |
> | 💛 | **Present for My People** | Connect with intent *(Jamie or Vinay)* | Present:: false |

---

## 📅 Today

<%*
// Calendar via icalBuddy — requires Templater user function setup
// If not configured yet, this shows a placeholder
let calendar = "";
try {
  calendar = await tp.user.calendar();
} catch (e) {
  calendar = "*Calendar not configured — see setup instructions below*\n\n`<!-- Run: icalBuddy -npn -nc -ps \"/: /\" -iep \"datetime,title\" -po \"datetime,title\" -tf \"%H:%M\" -df \"\" -ec \"Birthdays,Holidays\" eventsToday -->`";
}
_%>
<% calendar %>

---

## 🎯 #1 Priority

>

---

> [!danger]- Overdue
> ```tasks
> not done
> due before <% tp.date.now("YYYY-MM-DD") %>
> short mode
> limit 5
> ```

> [!warning]- Due Today
> ```tasks
> not done
> due on <% tp.date.now("YYYY-MM-DD") %>
> short mode
> ```

---

## Workspace

### Deep Work
-

### Meeting Notes
-

### Capture
-

---

> [!success]- Logbook (Things 3)
> <!-- Completed tasks sync here -->

> [!abstract]- Next 7 Days
> ```tasks
> not done
> due after <% tp.date.now("YYYY-MM-DD") %>
> due before <% tp.date.now("YYYY-MM-DD", 7) %>
> group by due
> short mode
> ```

> [!example]- 📊 Habit Trends
> **→ [[Habit Dashboard]]** for full heatmaps
>
> ```dataviewjs
> const habits = ['Lean', 'Clear', 'Learning', 'Visible', 'Present'];
> const pages = dv.pages('"Daily"').where(p => p.file.name.match(/^\d{4}-\d{2}-\d{2}$/));
> const last7 = pages.sort(p => p.file.name, 'desc').slice(0, 7);
>
> let summary = "**Last 7 days:** ";
> habits.forEach(h => {
>   const done = last7.filter(p => p[h] === true).length;
>   summary += `${h}: ${done}/7 · `;
> });
> dv.paragraph(summary.slice(0, -3));
> ```

> [!tip]- 🌙 Evening Close
> **Win:**
>
> **Better:**
>
> **Grateful:**
>
> **Tomorrow's #1:**

---

**Nav:** [[<% tp.date.now("YYYY-MM-DD", -1) %>|← Yesterday]] · [[<% tp.date.now("YYYY-MM-DD", 1) %>|Tomorrow →]] · [[0_Areas_Index|Areas]] · [[AGENDA]] · [[0_Areas_Index|2026 Goals]]
