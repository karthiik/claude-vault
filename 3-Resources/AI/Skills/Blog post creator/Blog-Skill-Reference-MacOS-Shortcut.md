# macOS Shortcut Reference for Blog Skill

*Saved for later when we build the blog post creator skill*

## Karthik's Existing Workflow (macOS Shortcuts)

The workflow has these steps:

1. **Ask for Text** with Prompt
2. **Set variable** `chatvar1` to Ask for Input
3. **Get** `chatvar1`
4. **Use ChatGPT**: "Summarize the content in chatvar1 and get it ready for a blog post. Create an outline and then section headers. Fill in with key data points and insights as bullet points for each section. Think hard. **output in pure markdown format**"
5. **Run Shell Script**: Strip RTF and save as clean markdown
   ```bash
   textutil -convert txt -stdin -stdout | cat > "/Users/karthik/Documents/AIResearchSB/$(date +%Y-%m-%d-%H%M) - Draft.md"
   ```
   - Shell: bash
   - Input: Response (from ChatGPT)
   - Pass Input: to stdin

## Notes for Skill Creation

- User wants to input raw content/notes
- ChatGPT processes into structured blog outline with headers and bullet points
- Output is pure markdown
- Auto-saved with timestamp to a specific folder
- We should incorporate the AI Slop Avoidance Guide into the prompt
