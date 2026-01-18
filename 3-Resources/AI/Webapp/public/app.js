// ============================================
// Vision Dashboard — Frontend App
// ============================================

// State
let currentFile = null;
let saveTimeout = null;
let recentFiles = [];

// DOM Elements
const fileTree = document.getElementById('fileTree');
const visionContent = document.getElementById('visionContent');
const editorPanel = document.getElementById('editorPanel');
const editorPath = document.getElementById('editorPath');
const editorPreview = document.getElementById('editorPreview');
const editorInput = document.getElementById('editorInput');
const saveStatus = document.getElementById('saveStatus');
const todayBtn = document.getElementById('todayBtn');
const recentBtn = document.getElementById('recentBtn');
const recentList = document.getElementById('recentList');
const closeEditor = document.getElementById('closeEditor');
const tabs = document.querySelectorAll('.tab');

// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  loadFileTree();
  loadVision('karthik');
  loadRecent();

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadVision(tab.dataset.tab);
    });
  });

  // Today's note button
  todayBtn.addEventListener('click', openTodaysNote);

  // Recent dropdown
  recentBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    recentList.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    recentList.classList.remove('show');
  });

  // Close editor button
  closeEditor.addEventListener('click', closeEditorPanel);

  // Editor input — auto-save on change
  editorInput.addEventListener('input', () => {
    updatePreview();
    scheduleSave();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (currentFile) {
        saveFile();
      }
    }
    // Escape to close editor
    if (e.key === 'Escape') {
      closeEditorPanel();
    }
  });
});

// ============================================
// Vision Documents
// ============================================

async function loadVision(person) {
  try {
    const res = await fetch(`/api/vision/${person}`);
    const data = await res.json();

    if (data.error) {
      visionContent.innerHTML = `<p class="error">${data.error}</p>`;
      return;
    }

    // Strip HTML tags and render as markdown
    const cleanContent = stripHtml(data.content);
    visionContent.innerHTML = `<div class="markdown-body">${renderMarkdown(cleanContent)}</div>`;
  } catch (err) {
    visionContent.innerHTML = `<p class="error">Failed to load vision document</p>`;
  }
}

function stripHtml(content) {
  // Remove HTML div tags and style attributes but keep content
  return content
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '')
    .replace(/style="[^"]*"/gi, '');
}

// ============================================
// File Tree
// ============================================

async function loadFileTree() {
  try {
    const res = await fetch('/api/files');
    const files = await res.json();
    fileTree.innerHTML = renderTree(files);
    attachTreeListeners();
  } catch (err) {
    fileTree.innerHTML = '<p class="error">Failed to load files</p>';
  }
}

function renderTree(items, level = 0) {
  let html = '';

  for (const item of items) {
    if (item.type === 'folder') {
      html += `
        <div class="tree-node" data-path="${item.path}">
          <div class="tree-item tree-folder" style="padding-left: ${level * 12}px">
            <span class="tree-icon">▶</span>
            <span class="tree-name">${item.name}</span>
          </div>
          <div class="tree-children">
            ${renderTree(item.children, level + 1)}
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="tree-item tree-file" data-path="${item.path}" style="padding-left: ${(level * 12) + 16}px">
          <span class="tree-icon">📄</span>
          <span class="tree-name">${item.name.replace('.md', '')}</span>
        </div>
      `;
    }
  }

  return html;
}

function attachTreeListeners() {
  // Folder toggle
  document.querySelectorAll('.tree-folder').forEach(folder => {
    folder.addEventListener('click', (e) => {
      const node = folder.closest('.tree-node');
      const children = node.querySelector('.tree-children');
      const icon = folder.querySelector('.tree-icon');

      if (children.classList.contains('open')) {
        children.classList.remove('open');
        icon.textContent = '▶';
      } else {
        children.classList.add('open');
        icon.textContent = '▼';
      }
    });
  });

  // File click
  document.querySelectorAll('.tree-file').forEach(file => {
    file.addEventListener('click', () => {
      const path = file.dataset.path;
      openFile(path);

      // Update active state
      document.querySelectorAll('.tree-file').forEach(f => f.classList.remove('active'));
      file.classList.add('active');
    });
  });
}

// ============================================
// File Operations
// ============================================

async function openFile(filePath) {
  try {
    const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    currentFile = filePath;
    editorPath.textContent = filePath;
    editorInput.value = data.content;
    updatePreview();
    editorPanel.classList.remove('hidden');
    saveStatus.textContent = '';

    // Refresh recent list
    loadRecent();
  } catch (err) {
    alert('Failed to open file');
  }
}

async function saveFile() {
  if (!currentFile) return;

  saveStatus.textContent = 'Saving...';
  saveStatus.className = 'save-status saving';

  try {
    const res = await fetch('/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentFile,
        content: editorInput.value
      })
    });

    const data = await res.json();

    if (data.success) {
      saveStatus.textContent = 'Saved';
      saveStatus.className = 'save-status saved';
      setTimeout(() => {
        saveStatus.textContent = '';
      }, 2000);
    } else {
      saveStatus.textContent = 'Save failed';
      saveStatus.className = 'save-status';
    }
  } catch (err) {
    saveStatus.textContent = 'Save failed';
    saveStatus.className = 'save-status';
  }
}

function scheduleSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveStatus.textContent = 'Typing...';
  saveStatus.className = 'save-status';

  saveTimeout = setTimeout(() => {
    saveFile();
  }, 1000);
}

function closeEditorPanel() {
  // Save before closing if there's content
  if (currentFile && editorInput.value) {
    saveFile();
  }

  editorPanel.classList.add('hidden');
  currentFile = null;

  // Remove active state from tree
  document.querySelectorAll('.tree-file').forEach(f => f.classList.remove('active'));
}

// ============================================
// Today's Note
// ============================================

async function openTodaysNote() {
  try {
    const res = await fetch('/api/daily');
    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    currentFile = data.path;
    editorPath.textContent = data.path;
    editorInput.value = data.content;
    updatePreview();
    editorPanel.classList.remove('hidden');

    if (data.created) {
      saveStatus.textContent = 'Created new note';
      saveStatus.className = 'save-status saved';
    } else {
      saveStatus.textContent = '';
    }

    // Refresh file tree to show new file
    if (data.created) {
      loadFileTree();
    }

    // Refresh recent
    loadRecent();
  } catch (err) {
    alert('Failed to open today\'s note');
  }
}

// ============================================
// Recent Files
// ============================================

async function loadRecent() {
  try {
    const res = await fetch('/api/recent');
    recentFiles = await res.json();
    renderRecent();
  } catch (err) {
    console.error('Failed to load recent files');
  }
}

function renderRecent() {
  if (recentFiles.length === 0) {
    recentList.innerHTML = '<div class="dropdown-empty">No recent files</div>';
    return;
  }

  recentList.innerHTML = recentFiles.map(path => `
    <button class="dropdown-item" data-path="${path}">
      📄 ${path.split('/').pop().replace('.md', '')}
      <small style="display: block; color: var(--text-muted); font-size: 11px;">${path}</small>
    </button>
  `).join('');

  // Attach click listeners
  recentList.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      openFile(item.dataset.path);
      recentList.classList.remove('show');
    });
  });
}

// ============================================
// Markdown Rendering
// ============================================

function updatePreview() {
  const content = editorInput.value;
  editorPreview.innerHTML = `<div class="markdown-body">${renderMarkdown(content)}</div>`;
}

function renderMarkdown(content) {
  // Configure marked
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  // Pre-process: Convert Obsidian wiki-links to regular links
  let processed = content
    // [[link|text]] -> [text](#)
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '[$2](#)')
    // [[link]] -> [link](#)
    .replace(/\[\[([^\]]+)\]\]/g, '[$1](#)');

  // Convert Obsidian callouts to HTML
  processed = processed.replace(
    /> \[!(\w+)\](-?)\s*([^\n]*)\n((?:>.*\n?)*)/g,
    (match, type, collapsed, title, content) => {
      const calloutContent = content.replace(/^> ?/gm, '').trim();
      return `<div class="callout callout-${type}">
        <div class="callout-title">${title || type}</div>
        <div class="callout-content">${marked.parse(calloutContent)}</div>
      </div>`;
    }
  );

  // Handle checkbox lists
  processed = processed
    .replace(/- \[ \]/g, '- <input type="checkbox" disabled>')
    .replace(/- \[x\]/gi, '- <input type="checkbox" checked disabled>');

  return marked.parse(processed);
}
