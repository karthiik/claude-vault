# Multi-Agent Council

A decision-analysis framework using parallel AI agents with opposing perspectives.

---

## Trigger Phrases

- "Agents gather" + idea
- "Counsel, evaluate this" + idea

---

## The Council

| Agent | Role | Perspective |
|-------|------|-------------|
| [[subagent_advocate\|🟢 Optimist]] | Strategic maximalist | Best-case extrapolation |
| [[subagent_skeptic\|🔴 Pessimist]] | Strategic minimalist | Worst-case extrapolation |
| [[subagent_neutral\|🔵 Realist]] | Strategic probabilist | Most-likely extrapolation |

---

## How It Works

1. User invokes council with an idea
2. Agents spawn in parallel
3. Each agent documents reasoning **LIVE** in [[shared_reasoning]]
4. Final analyses saved to `3-Resources/Research/`

---

## Files

- [[shared_reasoning]] — Live workspace + session archive
- [[subagent_advocate]] — Optimist agent config
- [[subagent_skeptic]] — Pessimist agent config
- [[subagent_neutral]] — Realist agent config

---

## Adding New Agents

1. Create `subagent_[name].md` in this folder
2. Include: Role, Tone, Core Mandate, Reasoning Approach, Output Format, Stance
3. Add to spawn list in [[CLAUDE|CLAUDE.md]]
4. Agent inherits live documentation protocol automatically

---

## Past Analyses

See `3-Resources/Research/` for archived council analyses.
