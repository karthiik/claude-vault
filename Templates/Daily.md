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
  // Career
  "🚀 C1 Visibility: What moves you toward being known outside Lockton today?",
  "🚀 C1 Visibility: One sentence toward the article. That's all it takes.",
  "🚀 C2 Innovation: What's your sharpest insight on the thesis right now?",
  "🚀 C3 Transition: Is the handoff protected? What needs attention?",
  // Health
  "🏃 H1 AT Ready: Did you ruck or train today? Foundation year.",
  "🏃 H2 Creation: Create before you consume. Morning is for building.",
  "🏃 H3 Evening Ritual: Close the day intentionally tonight.",
  // Relationships
  "💛 R1 Jamie: When's the next FaceTime? Connection needs rhythm.",
  "💛 R2 Vinay: What's one thing you can teach him this week?",
  "💛 R3 GPA Hero: When's the next building session with Vinay?",
  // Finances
  "💰 F1 Income: External visibility = market leverage. Build it.",
  "💰 F2 Reviews: Did you do your monthly finance review?",
  "💰 F3 Vinay: One money conversation — it compounds.",
  // Learning
  "📚 L1 MIT: What's one framework you can apply at Lockton?",
  "📚 L2 Books: Progress on the current book? Synthesis matters.",
  "📚 L3 AI Skills: What did you experiment with today?",
  // Contribution
  "🌟 X1 Substack: One post per week. Consistency over perfection.",
  "🌟 X2 Speaking: Which conference or podcast is next on the list?",
  "🌟 X3 Mentoring: Who can you uplift today?",
  // Joy
  "🎨 J1 Motorcycle: When's the ride? Don't let it get squeezed.",
  "🎨 J2 India/Dubai: Planning progress? Summer will come fast.",
  "🎨 J3 Local: What would make today feel alive?",
  // Home
  "🏠 E1 Declutter: Does your space spark creativity right now?",
  // Theme
  "⭐ 2026 Theme — EMERGENCE: Are you stepping into visibility today?"
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

## Logbook

<!-- Things 3 completed tasks sync here automatically -->

> [!abstract]- Next 7 Days
> ```tasks
> not done
> due after <% tp.date.now("YYYY-MM-DD") %>
> due before <% tp.date.now("YYYY-MM-DD", 7) %>
> group by due
> short mode
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

**Nav:** [[<% tp.date.now("YYYY-MM-DD", -1) %>|← Yesterday]] · [[<% tp.date.now("YYYY-MM-DD", 1) %>|Tomorrow →]] · [[0_Areas_Index|Areas]] · [[Goals-Reference|Goals]] · [[AGENDA]]
