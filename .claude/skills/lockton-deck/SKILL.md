---
name: lockton-deck
description: Create Lockton-branded PowerPoint presentations. Use when asked to create a deck, presentation, or slides.
allowed-tools: Read, Write, Bash, Glob
---

# Lockton PowerPoint Deck Generator

Create professional, on-brand Lockton presentations using the official template.

## Template Location

**Base Template:** `1-Projects/2026 PACE/PACE SteerCo Update - December 25.pptx`
**Backup Template:** `Templates/Lockton powerpoint template.potx`

## Template Specifications

| Property | Value |
|----------|-------|
| **Dimensions** | 13.33" x 7.50" (16:9 widescreen) |
| **Brand Colors** | Navy (#003366), Teal (#00A3AD), White, Black |

## Available Slide Layouts

| Index | Layout Name | Use For |
|-------|-------------|---------|
| **15** | Title Only_Black | Title/cover slides (dark) |
| **16** | Title Only | Section dividers (light) |
| **17** | Title and Content_Black | Content with dark header |
| **18** | Title and Content_White | Content with light header |
| **22** | One-Column Content | General content slides |
| **19** | Copyright - Standard logo | Closing slide |

## Generation Process

When asked to create a presentation:

1. **Gather Requirements**
   - Topic/purpose
   - Target audience
   - Key messages (3-5 max)
   - Desired length (# of slides)

2. **Create Outline First**
   - Draft slide titles and key points in Markdown
   - Get user approval before generating

3. **Generate Using Python Script**

   Use the helper script at `.claude/skills/lockton-deck/generate_deck.py`:

   ```bash
   python3 .claude/skills/lockton-deck/generate_deck.py \
     --template "1-Projects/2026 PACE/PACE SteerCo Update - December 25.pptx" \
     --output "path/to/output.pptx" \
     --config "path/to/slides.json"
   ```

4. **Export to Desktop**
   ```bash
   cp "path/to/output.pptx" ~/Desktop/
   ```

## Slide Config JSON Format

```json
{
  "title": "Presentation Title",
  "slides": [
    {
      "layout": 15,
      "title": "Cover Slide Title",
      "subtitle": "Optional subtitle"
    },
    {
      "layout": 18,
      "title": "Content Slide",
      "bullets": [
        "First point",
        "Second point",
        "Third point"
      ]
    },
    {
      "layout": 16,
      "title": "Section Divider"
    },
    {
      "layout": 22,
      "title": "One Column Content",
      "body": "Paragraph text or bullet points"
    }
  ]
}
```

## Best Practices

1. **Keep slides simple** — 3-5 bullets max per slide
2. **Use section dividers** — Break up content logically
3. **Title slides** — Use layout 15 for impact
4. **End with copyright** — Always include layout 19

## Quick Generation (Inline)

For simple decks, generate directly with Python:

```python
from pptx import Presentation
from pptx.util import Inches, Pt

# Load template
prs = Presentation('1-Projects/2026 PACE/PACE SteerCo Update - December 25.pptx')

# Clear existing slides (keep layouts)
while len(prs.slides) > 0:
    rId = prs.slides._sldIdLst[0].rId
    prs.part.drop_rel(rId)
    del prs.slides._sldIdLst[0]

# Add slides using layouts
title_slide = prs.slides.add_slide(prs.slide_layouts[15])  # Title Only_Black
title_slide.shapes.title.text = "Your Title Here"

content_slide = prs.slides.add_slide(prs.slide_layouts[18])  # Title and Content_White
content_slide.shapes.title.text = "Content Title"
# Find body placeholder and add content
for shape in content_slide.placeholders:
    if shape.placeholder_format.idx == 10:  # Body placeholder
        shape.text = "• Point 1\n• Point 2\n• Point 3"

prs.save('output.pptx')
```

## Output

Always:
1. Save to project folder with descriptive name
2. Copy to `~/Desktop/` for easy access
3. Report file location to user
