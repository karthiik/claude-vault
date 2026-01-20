# Blog Post Creator

Brainstorming options for automating blog post creation from referenced material (bookmarked links, ideas, YouTube videos, etc.)

---

## Decision: Skill vs Slash Command

| Feature | Slash Command | Skill |
|---------|---------------|-------|
| **Activation** | Manual (`/write-post`) | Auto-triggered by Claude |
| **Control** | Explicit, predictable | AI-determined (sometimes unreliable) |
| **Complexity** | Simple to moderate | Can be very complex |
| **Best for** | Repeatable workflows you want to control | Domain knowledge, style guides |

**Key insight:** Skills *should* auto-trigger when relevant, but in practice many creators report having to say "use the X skill" anyway. A common pattern is creating a **slash command that invokes a skill** for explicit control.

---

## 3 Options

### Option 1: Minimal Slash Command — `/draft-post`

**Philosophy:** Keep it simple. One command, one job.

**What it does:**
1. Takes a reference (URL, YouTube link, bookmark, or idea)
2. Extracts/summarizes the source material
3. Creates a structured draft in your voice
4. Outputs to `0-Inbox/` as a draft post

**Implementation:**
```markdown
# /draft-post

## Trigger
User invokes `/draft-post [reference]`

## Steps
1. Identify reference type (URL, YouTube, vault note, raw idea)
2. If URL → WebFetch and summarize
3. If YouTube → Extract transcript via tool/API
4. Generate outline: Hook → Problem → Insight → Application → CTA
5. Draft 800-1200 word post matching Karthik's voice
6. Create `0-Inbox/Draft - [Title].md` with frontmatter

## Voice Guidelines
- Professional but conversational
- First-principles thinking
- Practical, actionable
- No corporate fluff
```

**Pros:** Simple, fast, explicit control
**Cons:** Less sophisticated, no multi-stage workflow

---

### Option 2: Full Workflow Skill — `blog-post-creator`

**Philosophy:** Rich, multi-stage workflow Claude can invoke when you're working on content.

**What it does:**
1. **Research Phase** — Deep dive into source material, find related vault notes
2. **Ideation Phase** — Generate 3 angle options with headlines
3. **Drafting Phase** — Collaborative writing with iterative refinement
4. **SEO/Meta Phase** — Keywords, meta description, social snippets
5. **Publishing Prep** — Checklist, image suggestions, final review

**Implementation:**
- `blog-post-creator.md` skill file with detailed instructions per phase
- Supporting files: `voice-guide.md`, `post-templates.md`, `seo-checklist.md`
- Uses TodoWrite to track multi-step progress

**Activation:** Claude auto-triggers when you say things like:
- "Turn this article into a blog post"
- "Write about [topic] based on this video"
- "Help me create content from these bookmarks"

**Pros:** Comprehensive, handles edge cases, maintains quality
**Cons:** Heavy, may not always auto-trigger reliably

---

### Option 3: Hybrid — Slash Command + Skill Library

**Philosophy:** Best of both worlds. Explicit control with rich capabilities.

**Components:**

1. **`/write-post`** — Main entry point (slash command)
   - Invokes the skill explicitly
   - Accepts parameters: `--quick` (skip SEO), `--thread` (social format)

2. **`blog-writing-skill.md`** — Core skill with domain knowledge
   - Your voice and style guide
   - Content frameworks (PAS, AIDA, Hook-Insight-Action)
   - Platform-specific formatting rules

3. **Supporting slash commands:**
   - `/headlines [topic]` — Quick headline brainstorm
   - `/social-thread [post]` — Convert post to Twitter/LinkedIn thread
   - `/seo-check [post]` — Run SEO analysis on draft

**Workflow Example:**
```
You: /write-post https://youtube.com/watch?v=xxx

Claude: [Uses blog-writing-skill, walks through phases]
- Extracts video transcript
- Proposes 3 angles
- You pick one
- Drafts collaboratively
- Generates SEO metadata
- Creates draft in 0-Inbox/
```

**Pros:** Flexible, scalable, explicit when needed, rich when available
**Cons:** More setup, multiple files to maintain

---

## Recommendation

**Start with Option 3 (Hybrid)** but build incrementally:

1. **Week 1:** Create `/draft-post` slash command (minimal viable workflow)
2. **Week 2:** Add `voice-guide.md` and iterate on quality
3. **Week 3:** Expand to full skill with SEO/social capabilities
4. **Ongoing:** Add `/headlines`, `/social-thread` as needed

This matches the "pattern from practitioners" approach — analyze your last few posts, extract the workflow, then encode it.

---

## Research Sources

- [Claude Skill for Blog Workflow Automation](https://exploreaitogether.com/claude-skills-workflow-automation/) — SOP approach, literal instructions
- [Streamlining Blog Writing with Claude Code](https://www.aaronheld.com/post/streamlining-blog-writing-with-claude-code/) — 5-step workflow, TodoWrite usage
- [Skills vs Slash Commands Comparison](https://medium.com/@lakshminp/skills-vs-slash-commands-one-works-ones-a-prayer-fa6b065e78e6) — Reliability concerns with auto-triggering
- [Claude Code Skills Guide](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/) — When to use each approach

---

## Next Steps

- [ ] Decide on option (1, 2, or 3)
- [ ] Gather 5-7 past posts to extract voice patterns
- [ ] Define "done" criteria for a publishable post
- [ ] Build initial implementation
- [ ] Test with real reference material

---

*Created: 2026-01-19*
