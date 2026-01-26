/**
 * KJ360 Memory Service
 *
 * Implements the three-tier memory architecture:
 * 1. Longest Term: Full session transcripts (JSONL)
 * 2. Caught Memories: Extracted moments of consequence
 * 3. Entity Context: On-demand lookup by entity
 */

import fs from 'fs/promises';
import { join } from 'path';

const MEMORY_TYPES = [
  'decision',      // A choice was made
  'insight',       // Something was learned
  'pattern',       // Recurring behavior noticed
  'commitment',    // Promise made
  'correction',    // Mistake fixed
  'workflow_gap'   // Missing integration opportunity
];

/**
 * Extract entities from user message
 * Looks for: [[wikilinks]], @mentions, #tags, and known entity names
 */
export async function extractEntities(message, vaultRoot) {
  const entities = {
    people: [],
    projects: [],
    areas: [],
    tags: []
  };

  // Extract [[wikilinks]]
  const wikilinks = message.match(/\[\[([^\]]+)\]\]/g) || [];
  for (const link of wikilinks) {
    const name = link.slice(2, -2);
    // Determine type by checking file locations
    if (await fileExists(join(vaultRoot, '3-Resources/People', `${name}.md`))) {
      entities.people.push(name);
    } else if (await fileExists(join(vaultRoot, '1-Projects', `${name}.md`))) {
      entities.projects.push(name);
    }
  }

  // Extract @mentions (simple word after @)
  const mentions = message.match(/@(\w+)/g) || [];
  entities.people.push(...mentions.map(m => m.slice(1)));

  // Extract #tags
  const tags = message.match(/#[\w/]+/g) || [];
  entities.tags.push(...tags);

  // Load entity registry for fuzzy matching
  const registry = await loadEntityRegistry(vaultRoot);

  // Fuzzy match names mentioned in plain text
  for (const person of registry.people) {
    // Check first name or full name mentioned
    const firstName = person.name.split(' ')[0];
    if (
      message.toLowerCase().includes(person.name.toLowerCase()) ||
      message.toLowerCase().includes(firstName.toLowerCase())
    ) {
      if (!entities.people.includes(person.name)) {
        entities.people.push(person.name);
      }
    }
  }

  return entities;
}

/**
 * Load memories linked to given entities
 */
export async function lookupMemories(entities, vaultRoot) {
  const memoriesPath = join(vaultRoot, 'KJ360/system/memories.jsonl');
  const memories = [];

  try {
    const content = await fs.readFile(memoriesPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const memory = JSON.parse(line);

      // Check if memory is linked to any of the extracted entities
      const linkedEntities = memory.entities || [];
      const allEntityNames = [
        ...entities.people,
        ...entities.projects,
        ...entities.areas
      ];

      const isRelevant = linkedEntities.some(e =>
        allEntityNames.some(name =>
          e.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(e.toLowerCase())
        )
      );

      if (isRelevant) {
        memories.push(memory);
      }
    }
  } catch (err) {
    // No memories file yet, that's fine
    if (err.code !== 'ENOENT') {
      console.error('[Memory] Error loading memories:', err.message);
    }
  }

  // Sort by confidence and recency
  return memories
    .sort((a, b) => {
      const confidenceDiff = (b.confidence || 0) - (a.confidence || 0);
      if (confidenceDiff !== 0) return confidenceDiff;
      return new Date(b.timestamp) - new Date(a.timestamp);
    })
    .slice(0, 10); // Limit to top 10 relevant memories
}

/**
 * Build context injection prompt from memories and entities
 */
export function buildContextInjection(entities, memories) {
  if (memories.length === 0 && Object.values(entities).flat().length === 0) {
    return null;
  }

  let context = '## Contextual Memory\n\n';

  // Entity summary
  if (entities.people.length > 0) {
    context += `**People mentioned:** ${entities.people.join(', ')}\n`;
  }
  if (entities.projects.length > 0) {
    context += `**Projects mentioned:** ${entities.projects.join(', ')}\n`;
  }

  // Relevant memories
  if (memories.length > 0) {
    context += '\n**Relevant memories:**\n';
    for (const mem of memories) {
      const date = new Date(mem.timestamp).toLocaleDateString();
      context += `- [${mem.type}] ${mem.content} (${date}, ${mem.confidence}% confidence)\n`;
    }
  }

  context += '\n---\n\n';
  return context;
}

/**
 * Check for ambiguous entities (e.g., multiple Dans)
 * Returns disambiguation options if needed
 */
export async function checkAmbiguousEntities(entities, vaultRoot) {
  const ambiguous = [];
  const registry = await loadEntityRegistry(vaultRoot);

  for (const personName of entities.people) {
    const matches = registry.people.filter(p => {
      const firstName = p.name.split(' ')[0].toLowerCase();
      return firstName === personName.toLowerCase() ||
             p.name.toLowerCase() === personName.toLowerCase();
    });

    if (matches.length > 1) {
      ambiguous.push({
        query: personName,
        matches: matches.map(m => m.name),
        type: 'person'
      });
    }
  }

  return ambiguous;
}

/**
 * Catch a memory from a session transcript
 */
export async function catchMemory(memory, vaultRoot) {
  const memoriesPath = join(vaultRoot, 'KJ360/system/memories.jsonl');

  // Ensure system folder exists
  await fs.mkdir(join(vaultRoot, 'KJ360/system'), { recursive: true });

  // Generate ID
  const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const entry = {
    id,
    timestamp: memory.timestamp || new Date().toISOString(),
    session_id: memory.session_id,
    type: memory.type,
    content: memory.content,
    confidence: memory.confidence || 0.8,
    entities: memory.entities || [],
    source_file: memory.source_file
  };

  // Append to JSONL
  await fs.appendFile(memoriesPath, JSON.stringify(entry) + '\n');

  return entry;
}

/**
 * Load or create entity registry
 */
async function loadEntityRegistry(vaultRoot) {
  const registryPath = join(vaultRoot, 'KJ360/system/entities.json');

  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    // Build initial registry from vault
    const registry = { people: [], projects: [], areas: [] };

    // Scan People folder
    try {
      const peopleDir = join(vaultRoot, '3-Resources/People');
      const files = await fs.readdir(peopleDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          registry.people.push({
            name: file.replace('.md', ''),
            file: `3-Resources/People/${file}`
          });
        }
      }
    } catch (e) { /* People folder may not exist */ }

    // Scan Projects folder
    try {
      const projectsDir = join(vaultRoot, '1-Projects');
      const scanProjects = async (dir, prefix = '') => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            await scanProjects(join(dir, entry.name), `${prefix}${entry.name}/`);
          } else if (entry.name.endsWith('.md')) {
            registry.projects.push({
              name: entry.name.replace('.md', ''),
              file: `1-Projects/${prefix}${entry.name}`
            });
          }
        }
      };
      await scanProjects(projectsDir);
    } catch (e) { /* Projects folder may not exist */ }

    // Scan Areas folder
    try {
      const areasDir = join(vaultRoot, '2-Areas');
      const entries = await fs.readdir(areasDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          registry.areas.push({
            name: entry.name,
            file: `2-Areas/${entry.name}`
          });
        }
      }
    } catch (e) { /* Areas folder may not exist */ }

    // Save registry
    await fs.mkdir(join(vaultRoot, 'KJ360/system'), { recursive: true });
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

    return registry;
  }
}

async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export default {
  extractEntities,
  lookupMemories,
  buildContextInjection,
  checkAmbiguousEntities,
  catchMemory
};
