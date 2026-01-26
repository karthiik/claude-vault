import { Router } from 'express';
import fs from 'fs/promises';
import { join, relative } from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';

const router = Router();

// List all markdown files in vault
router.get('/files', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');
  const { folder } = req.query;

  try {
    const searchPath = folder
      ? join(vaultRoot, folder, '**/*.md')
      : join(vaultRoot, '**/*.md');

    const files = await glob(searchPath, {
      ignore: ['**/node_modules/**', '**/KJ360/**', '**/.obsidian/**']
    });

    const fileList = files.map(f => ({
      path: relative(vaultRoot, f),
      name: f.split('/').pop().replace('.md', '')
    }));

    res.json({ files: fileList, count: fileList.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read a specific file with frontmatter parsing
router.get('/file', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');
  const { path: filePath } = req.query;

  if (!filePath) {
    return res.status(400).json({ error: 'path query parameter required' });
  }

  try {
    const fullPath = join(vaultRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    res.json({
      path: filePath,
      frontmatter,
      content: body,
      raw: content
    });
  } catch (error) {
    res.status(404).json({ error: `File not found: ${filePath}` });
  }
});

// Write/update a file
router.post('/file', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');
  const { path: filePath, content, frontmatter } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'path required in body' });
  }

  try {
    const fullPath = join(vaultRoot, filePath);

    // If frontmatter provided, stringify with gray-matter
    let fileContent = content;
    if (frontmatter) {
      fileContent = matter.stringify(content || '', frontmatter);
    }

    await fs.writeFile(fullPath, fileContent, 'utf-8');

    res.json({
      status: 'success',
      path: filePath,
      message: `File saved: ${filePath}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vault structure (folders)
router.get('/structure', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');

  try {
    const entries = await fs.readdir(vaultRoot, { withFileTypes: true });

    const folders = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name);

    // Get Areas specifically for Life Spaces
    const areasPath = join(vaultRoot, '2-Areas');
    const areaEntries = await fs.readdir(areasPath, { withFileTypes: true });
    const areas = areaEntries
      .filter(e => e.isDirectory())
      .map(e => e.name);

    res.json({
      rootFolders: folders,
      areas,
      structure: {
        inbox: '0-Inbox',
        projects: '1-Projects',
        areas: '2-Areas',
        resources: '3-Resources',
        archive: '4-Archive',
        daily: 'Daily'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
