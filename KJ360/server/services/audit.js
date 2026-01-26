/**
 * KJ360 Audit Trail Service
 *
 * Creates and manages audit trails for all agent operations.
 * Implements "Trust Through Transparency" philosophy.
 */

import fs from 'fs/promises';
import { join } from 'path';

/**
 * Create a new audit entry for an agent operation
 */
export async function createAuditEntry(vaultRoot, agentName, entry) {
  const today = new Date().toISOString().split('T')[0];
  const auditDir = join(vaultRoot, 'KJ360/system/audit', today);

  // Ensure audit directory exists
  await fs.mkdir(auditDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const fileName = `${agentName}_activity.md`;
  const filePath = join(auditDir, fileName);

  const content = formatAuditEntry(agentName, timestamp, entry);

  // Append to existing file or create new
  try {
    await fs.appendFile(filePath, '\n---\n\n' + content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(filePath, content);
    } else {
      throw err;
    }
  }

  return { file: filePath, timestamp };
}

/**
 * Format an audit entry as markdown
 */
function formatAuditEntry(agentName, timestamp, entry) {
  let md = `# Agent: ${agentName}\n`;
  md += `## Timestamp: ${timestamp}\n\n`;

  if (entry.actions && entry.actions.length > 0) {
    md += `### Actions Taken\n`;
    for (const action of entry.actions) {
      md += `- ${action}\n`;
    }
    md += '\n';
  }

  if (entry.decisions && entry.decisions.length > 0) {
    md += `### Decisions Made\n`;
    for (const decision of entry.decisions) {
      md += `- ${decision}\n`;
    }
    md += '\n';
  }

  if (entry.optionsConsidered && entry.optionsConsidered.length > 0) {
    md += `### Options Considered\n`;
    for (const option of entry.optionsConsidered) {
      md += `- ${option}\n`;
    }
    md += '\n';
  }

  if (entry.crossAgentNotes && entry.crossAgentNotes.length > 0) {
    md += `### Cross-Agent Notes\n`;
    for (const note of entry.crossAgentNotes) {
      md += `- @${note.agent}: ${note.message}\n`;
    }
    md += '\n';
  }

  if (entry.filesCreated || entry.filesModified || entry.entitiesTouched) {
    md += `### Data for Analysis\n`;
    if (entry.filesCreated?.length > 0) {
      md += `- Files created: ${entry.filesCreated.join(', ')}\n`;
    }
    if (entry.filesModified?.length > 0) {
      md += `- Files modified: ${entry.filesModified.join(', ')}\n`;
    }
    if (entry.entitiesTouched?.length > 0) {
      md += `- Entities touched: ${entry.entitiesTouched.join(', ')}\n`;
    }
    md += '\n';
  }

  // Data integrity checklist
  md += `### Data Integrity\n`;
  md += `- [x] Audit entry created\n`;
  md += `- [x] Timestamp recorded\n`;
  md += `- [${entry.allFieldsPresent ? 'x' : ' '}] All required fields present\n`;
  md += `- [${entry.entityLinksResolved ? 'x' : ' '}] Entity links resolved\n`;

  return md;
}

/**
 * Read cross-agent notes for a specific agent
 */
export async function readCrossAgentNotes(vaultRoot, targetAgent) {
  const today = new Date().toISOString().split('T')[0];
  const auditDir = join(vaultRoot, 'KJ360/system/audit', today);

  const notes = [];

  try {
    const files = await fs.readdir(auditDir);

    for (const file of files) {
      if (!file.endsWith('_activity.md')) continue;

      const content = await fs.readFile(join(auditDir, file), 'utf-8');

      // Parse cross-agent notes
      const notesMatch = content.match(/### Cross-Agent Notes\n([\s\S]*?)(?=\n###|\n---|\n$)/g);

      if (notesMatch) {
        for (const section of notesMatch) {
          const lines = section.split('\n').slice(1); // Skip header
          for (const line of lines) {
            const match = line.match(/^- @(\w+): (.+)$/);
            if (match && match[1].toLowerCase() === targetAgent.toLowerCase()) {
              notes.push({
                from: file.replace('_activity.md', ''),
                message: match[2]
              });
            }
          }
        }
      }
    }
  } catch (err) {
    // No audit folder for today yet
    if (err.code !== 'ENOENT') {
      console.error('[Audit] Error reading cross-agent notes:', err.message);
    }
  }

  return notes;
}

/**
 * Log a chat session for memory catching
 */
export async function logChatSession(vaultRoot, session) {
  const today = new Date().toISOString().split('T')[0];
  const auditDir = join(vaultRoot, 'KJ360/system/audit', today);

  await fs.mkdir(auditDir, { recursive: true });

  const sessionId = `chat_${Date.now()}`;
  const filePath = join(auditDir, `${sessionId}.md`);

  let content = `# Chat Session: ${sessionId}\n`;
  content += `## Started: ${new Date().toISOString()}\n\n`;

  for (const msg of session.messages) {
    content += `### ${msg.role === 'user' ? 'User' : 'Assistant'}\n`;
    content += `${msg.content}\n\n`;
  }

  await fs.writeFile(filePath, content);

  return { sessionId, file: filePath };
}

export default {
  createAuditEntry,
  readCrossAgentNotes,
  logChatSession
};
