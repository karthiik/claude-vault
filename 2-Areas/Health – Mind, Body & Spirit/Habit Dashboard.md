# Habit Dashboard

**Year:** 2026 · **Word:** Emergence

---

## 🏃 Lean & Energized
*Move my body — 10 pushups counts*

```dataviewjs
const calendarData = {
    year: 2026,
    colors: {
        green: ["#c6e48b", "#7bc96f", "#49af5d", "#2e8b40", "#196127"]
    },
    entries: []
};

for (let page of dv.pages('"Daily"').where(p => p.Lean === true)) {
    calendarData.entries.push({
        date: page.file.name,
        intensity: 4,
        color: "green"
    });
}

renderHeatmapCalendar(this.container, calendarData);
```

---

## 🧠 Clear-Minded
*Create before consume — write before phone*

```dataviewjs
const calendarData = {
    year: 2026,
    colors: {
        blue: ["#c0d6e4", "#8bb8d0", "#5a9abd", "#3182a0", "#1a6985"]
    },
    entries: []
};

for (let page of dv.pages('"Daily"').where(p => p.Clear === true)) {
    calendarData.entries.push({
        date: page.file.name,
        intensity: 4,
        color: "blue"
    });
}

renderHeatmapCalendar(this.container, calendarData);
```

---

## 📚 Always Learning
*Feed my mind — 5 min MIT or 1 page*

```dataviewjs
const calendarData = {
    year: 2026,
    colors: {
        purple: ["#d4c6e8", "#b298d4", "#9069bf", "#7045a6", "#522d8a"]
    },
    entries: []
};

for (let page of dv.pages('"Daily"').where(p => p.Learning === true)) {
    calendarData.entries.push({
        date: page.file.name,
        intensity: 4,
        color: "purple"
    });
}

renderHeatmapCalendar(this.container, calendarData);
```

---

## ✍️ Thought Leader
*Build visibility — 1 sentence toward article/thesis*

```dataviewjs
const calendarData = {
    year: 2026,
    colors: {
        orange: ["#f9d8b7", "#f5b87a", "#f0983e", "#d97b1a", "#b35f0a"]
    },
    entries: []
};

for (let page of dv.pages('"Daily"').where(p => p.Visible === true)) {
    calendarData.entries.push({
        date: page.file.name,
        intensity: 4,
        color: "orange"
    });
}

renderHeatmapCalendar(this.container, calendarData);
```

---

## 💛 Present for My People
*Connect with intent — Jamie or Vinay*

```dataviewjs
const calendarData = {
    year: 2026,
    colors: {
        yellow: ["#fff3c0", "#ffe680", "#ffd940", "#e6c200", "#b39600"]
    },
    entries: []
};

for (let page of dv.pages('"Daily"').where(p => p.Present === true)) {
    calendarData.entries.push({
        date: page.file.name,
        intensity: 4,
        color: "yellow"
    });
}

renderHeatmapCalendar(this.container, calendarData);
```

---

## 📈 Summary Stats

```dataviewjs
const habits = ['Lean', 'Clear', 'Learning', 'Visible', 'Present'];
const pages = dv.pages('"Daily"').where(p => p.file.name.match(/^\d{4}-\d{2}-\d{2}$/));
const totalDays = pages.length;

let table = "| Habit | Completed | Rate | Current Streak |\n|-------|-----------|------|----------------|\n";

habits.forEach(h => {
    const completed = pages.filter(p => p[h] === true).length;
    const rate = totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;

    // Calculate current streak
    let streak = 0;
    const sorted = pages.sort(p => p.file.name, 'desc');
    for (let p of sorted) {
        if (p[h] === true) streak++;
        else break;
    }

    table += `| ${h} | ${completed}/${totalDays} | ${rate}% | ${streak} days |\n`;
});

dv.paragraph(table);
```

---

**Nav:** [[0_Health_Mind_Body_Spirit_Index|Health Index]] · [[0_Areas_Index|Areas]] · [[2026 Goals]]
