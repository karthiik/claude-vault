**

https://youtu.be/yjO9UHIunSE?si=X171pU37dIYngNU0

# Product Requirements Document: JFDI System (Obsidian Edition)

Version: 1.0Status: Draft / Research PhaseProduct Philosophy: "Just F***ing Do It" – Automated Executive Function

## 1. Executive Summary

The JFDI System is a "Life Command Center" designed to solve the maintenance fatigue associated with traditional productivity tools. While tools like Obsidian offer excellent data ownership, they require manual "gardening" (organizing, linking, updating) which creates friction for users with executive function challenges 1.

The Solution: A mobile-first Web App that serves as a visual interface for an Obsidian Vault. It uses AI agents (Claude Code) to perform the "gardening" automatically, ensuring the user trusts the system enough to close open loops 2.

## 2. Technical Architecture: The "Obsidian Backend"

Unlike a traditional SaaS with a SQL database, this system utilizes a Local-First Architecture.

- Database: The user's local file system (Obsidian Vault). All data is stored as Markdown (.md) and JSONL files 3.
    
- Version Control: Git-backed. Every change made by the AI or the user is committed, allowing for rollback and history tracking 3.
    
- AI Engine: Claude Code (Headless Mode). The web app wraps Claude Code to execute agentic workflows (file reading, editing, and reasoning) without hitting the Anthropic API directly for every call, preserving context and utilizing caching 4, 5.
    
- Frontend: React/Next.js web application optimized for mobile (swipe gestures), communicating with the local file system via a local server or Electron wrapper.
    

## 3. Data Models (Markdown Schemas)

To make the Obsidian vault machine-readable for the JFDI agents, we define specific Frontmatter (YAML) schemas.

### 3.1. Project Note (type: project)

- status: Active | On Deck | Growing | On Hold 6
    
- space: (e.g., Business A, Personal) 7
    
- deadline: YYYY-MM-DD
    
- next_action: (Auto-calculated by AI based on tasks) 8
    
- collaborators: [[Link to Person]]
    

### 3.2. Person Note (type: relationship)

- priority: Core | Peripheral | Casual 9
    
- last_contact: YYYY-MM-DD 10
    
- nurture_status: Needs Attention | Good
    
- context: (Keywords for fuzzy search, e.g., "Graphic Design," "Philly") 11
    

## 4. Key Feature Requirements

### 4.1. "The Star" – Universal Chat Interface

User Story: As a user, I want a single chat button always available to dump thoughts, tasks, or commands without navigating folders.

- Requirement: A chat wrapper around Claude Code 12.
    
- Slash Commands: Implement fuzzy-searchable commands (e.g., /newsletter, /bookroom) that trigger specific agent workflows 13.
    
- Session Management:
    
- Pause/Compact: Ability to "Pause" a chat, compressing the context via Git commits to save tokens, and resuming later 14.
    
- Reminders: "Remind me about this chat" functionality to resurface a conversation context at a specific time 15.
    
- Voice Mode: Mobile-optimized voice input that cleans up "brain dumps" into structured text 16.
    

### 4.2. Automated Morning Dashboard (The Daily Note)

User Story: At 8:30 AM, I want a report telling me exactly what to do so I don't have to decide.

- Trigger: Scheduled Cron job (8:30 AM M-F) 17.
    
- Inputs: Scans the Obsidian Vault (Calendar notes, Active Project files, Inbox folder).
    
- Processing:
    
- Checks Goal Alignment (e.g., 40% Work / 35% Partnerships / 25% Relationships) 18.
    
- Identifies "Action Necessary" emails (via Gmail integration) 19.
    
- Output: Appends a report to the Daily Note in Obsidian containing prioritized recommendations and a schedule summary 20.
    

### 4.3. Project Management: The "Next Action" Engine

User Story: I want to see projects sorted by what I need to do next, not by when the project finishes.

1. Logic: The system scans all Project files. It identifies the first unchecked checkbox (- [ ]) in the file as the "Next Action" 8.
    
2. Hierarchy:
    
3. Life: High-level Spaces (Folders in Obsidian).
    
4. Workstreams: Threads crossing multiple spaces 21.
    
5. Projects: The atomic unit of work.
    
6. Visualization: A "Card" view where clicking a project expands to show a "stack" of tasks. The user only sees the top task by default to reduce overwhelm 22.
    

### 4.4. The "Now" View (Execution Mode)

User Story: When I am ready to work, I want a filtered list of immediate tasks without seeing the entire backlog.

1. Filtering Algorithm:
    
2. Include all Overdue tasks.
    
3. Include all tasks Due Today.
    
4. Include Max 3 Undated Tasks (selected from high-priority active projects) 23.
    
5. Energy Sorting: Users can toggle filters based on current mental state: "Quick Win," "Creative," or "Deep Work" 24. Implementation Note: These are stored as tags (e.g., #energy/quick) on the task line in Markdown.
    

### 4.5. Relationship Manager (CRM)

User Story: I want to track relationships based on "last contact" and "nurture" rather than sales pipelines.

- Functionality:
    
- Scans Daily Notes and Meeting Notes for mentions of People ([[Person Name]]).
    
- Updates the last_contact YAML field in that Person's note automatically.
    
- Bubbling: The Dashboard highlights people who haven't been contacted recently based on their priority tier 9, 10.
    

### 4.6. Intelligent Meeting Ops

User Story: I want meeting notes to organize themselves and generate tasks automatically.

- Pre-Meeting: Agent scans calendar attendees -> looks up their Obsidian files -> generates a "Prep Sheet" (Who are they? What did we discuss last?) 25.
    
- Post-Meeting:
    
- User uploads audio/transcript or voice dump.
    
- Agent extracts: Takeaways, Decisions, Commitments 26.
    
- Auto-Tasking: Agent parses commitments (e.g., "I will send the deck") and appends them to the specific Project Note as a task 26.
    

### 4.7. Knowledge Management (Spark File)

User Story: I want to drop a link or quote and have the system file it and connect it to relevant projects/people.

- Workflow: User pastes a URL/Quote -> Agent analyzes content -> Agent determines appropriate folder -> Agent adds links to related People/Projects (e.g., "This article is relevant to [[Project X]]") 27.
    
- Spark File: A continuously appended file for half-baked ideas, which the AI periodically reviews to find patterns 28.
    

## 5. UX/UI Specifications

- Mobile-First Ergonomics:
    
- Swipe Right: Autocomplete a task/suggestion 29.
    
- Swipe Left: Open "Snooze" panel (reschedule to Tomorrow, Next Week, or Custom) 29.
    
- Visual Feedback:
    
- Thumbs Up: Browser tab/Window icon changes to a "Thumbs Up" emoji when a long-running background agent completes its task 30.
    
- Squiggles: Background animation in chat to indicate processing 31.
    
- Dark Mode: Auto-switching based on local sunset time 32.
    

## 6. Admin & Health Monitoring

- Token Watch: A visual dashboard tracking token usage and cost per session/week 33.
    
- Context Window: Real-time counter of current context window usage (to prevent overflow) 34.
    
- Agent Health: Status indicators for background sync jobs (Calendar sync, Email sync) 35.
    

## 7. Development Roadmap (Recreation Strategy)

1. Phase 1: The Wrapper. Build the React interface that can read/write to a local directory of Markdown files.
    
2. Phase 2: The Brain. Integrate Claude Code (Headless) to interpret commands and edit the Markdown files.
    
3. Phase 3: The View. Build the "Now" view logic to parse task lists across files and apply the "Max 3 undated" filter.
    
4. Phase 4: The Automation. Implement the Cron jobs for the 8:30 AM Dashboard generation.
    

Primary Source Citation:All feature requirements are derived from the transcript of "JFDI System - my AI Executive Assistant + full life command center" by Alex Hillman. Specific timestamp/passage indices are noted in brackets above.

  
**