# Evening Wrapup

Execute the daily evening wrap-up routine for today's daily note.

## Steps

1. **Read today's daily note** (`Daily/YYYY-MM-DD.md` where YYYY-MM-DD is today's date)

2. **Read 2026 Career Goals** to align action items with G1/G2/G3 framework:
   - G1: External Visibility
   - G2: Innovation Leadership
   - G3: Role Transition

3. **Extract action items** from today's meeting notes and workspace:
   - Identify tasks that align with career goals → categorize under G1/G2/G3
   - Identify operational/delegatable tasks → categorize separately
   - Use the format from the template below

4. **Add "Action Items from Today" section** right after the Daily Spark quote, using this format:

```markdown
## 🎯 Action Items from Today

> [!success] Career Goal Aligned — Own These
> **G2: Innovation Leadership**
> - [ ] [task] #p1 #area/career
>
> **G3: Role Transition**
> - [ ] [task] #area/career
>
> **G1: External Visibility**
> - [ ] [task] #area/career

> [!warning] Operational — Delegate or Track
> - [ ] [task] — delegate to [person]
> - [ ] Track: [item]
```

5. **Prompt for Evening Close** if not already filled:
   - 🏆 Win: Ask what went well
   - 📈 Better: Ask what could improve
   - 🙏 Grateful: Ask what they're grateful for
   - 🎯 Tomorrow's #1: Ask what's the top priority for tomorrow

6. **Add Evening Close section** before the Logbook section

7. **Sync changes** with `./cli.sh sync`

## Notes

- Career goal tasks get `#p1` if they're urgent, `#area/career` always
- Operational tasks should note who to delegate to
- Link to relevant projects (e.g., `[[Innovation Sprint]]`)
- Keep action items specific and actionable
