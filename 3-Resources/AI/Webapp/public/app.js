// Vision Dashboard — Split View (Preview + Textarea)

let currentFile = null;
let saveTimeout = null;
let recentFiles = [];

const fileTree = document.getElementById('fileTree');
const visionPanel = document.getElementById('visionPanel');
const visionContent = document.getElementById('visionContent');
const editorPanel = document.getElementById('editorPanel');
const editorPath = document.getElementById('editorPath');
const editorPreview = document.getElementById('editorPreview');
const editorInput = document.getElementById('editorInput');
const saveStatus = document.getElementById('saveStatus');
const currentView = document.getElementById('currentView');
const todayBtn = document.getElementById('todayBtn');
const visionBtn = document.getElementById('visionBtn');
const recentList = document.getElementById('recentList');
const closeEditor = document.getElementById('closeEditor');
const tabs = document.querySelectorAll('.tab');

document.addEventListener('DOMContentLoaded', () => {
  loadFileTree();
  loadVision('karthik');
  loadRecent();

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadVision(tab.dataset.tab);
    });
  });

  todayBtn.addEventListener('click', openTodaysNote);
  visionBtn.addEventListener('click', showVisionPanel);
  closeEditor.addEventListener('click', showVisionPanel);

  editorInput.addEventListener('input', () => {
    updatePreview();
    scheduleSave();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (currentFile) saveFile();
    }
    if (e.key === 'Escape') showVisionPanel();
  });
});

function showVisionPanel() {
  if (currentFile) saveFile();
  visionPanel.classList.remove('hidden');
  editorPanel.classList.add('hidden');
  currentFile = null;
  currentView.textContent = '';
  document.querySelectorAll('.tree-file').forEach(f => f.classList.remove('active'));
}

function showEditorPanel(filePath) {
  visionPanel.classList.add('hidden');
  editorPanel.classList.remove('hidden');
  currentView.textContent = filePath;
}

function updatePreview() {
  editorPreview.innerHTML = `<div class="markdown-body">${renderMarkdown(editorInput.value)}</div>`;
}

async function loadVision(person) {
  try {
    const res = await fetch(`/api/vision/${person}`);
    const data = await res.json();
    if (data.error) {
      visionContent.innerHTML = `<p class="error">${data.error}</p>`;
      return;
    }
    const cleanContent = data.content
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/div>/gi, '')
      .replace(/style="[^"]*"/gi, '');
    visionContent.innerHTML = `<div class="markdown-body">${renderMarkdown(cleanContent)}</div>`;
  } catch (err) {
    visionContent.innerHTML = `<p class="error">Failed to load vision document</p>`;
  }
}

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
      html += `<div class="tree-node" data-path="${item.path}">
        <div class="tree-item tree-folder" style="padding-left: ${level * 12}px">
          <span class="tree-icon">▶</span>
          <span class="tree-name">${item.name}</span>
        </div>
        <div class="tree-children">${renderTree(item.children, level + 1)}</div>
      </div>`;
    } else {
      html += `<div class="tree-item tree-file" data-path="${item.path}" style="padding-left: ${(level * 12) + 16}px">
        <span class="tree-icon">📄</span>
        <span class="tree-name">${item.name.replace('.md', '')}</span>
      </div>`;
    }
  }
  return html;
}

function attachTreeListeners() {
  document.querySelectorAll('.tree-folder').forEach(folder => {
    folder.addEventListener('click', () => {
      const node = folder.closest('.tree-node');
      const children = node.querySelector('.tree-children');
      const icon = folder.querySelector('.tree-icon');
      children.classList.toggle('open');
      icon.textContent = children.classList.contains('open') ? '▼' : '▶';
    });
  });
  document.querySelectorAll('.tree-file').forEach(file => {
    file.addEventListener('click', () => {
      openFile(file.dataset.path);
      document.querySelectorAll('.tree-file').forEach(f => f.classList.remove('active'));
      file.classList.add('active');
    });
  });
}

async function openFile(filePath) {
  try {
    const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    if (data.error) { alert(data.error); return; }

    currentFile = filePath;
    editorPath.textContent = filePath;
    editorInput.value = data.content;
    updatePreview();
    showEditorPanel(filePath);
    saveStatus.textContent = '';
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
      body: JSON.stringify({ path: currentFile, content: editorInput.value })
    });
    const data = await res.json();
    if (data.success) {
      saveStatus.textContent = 'Saved';
      saveStatus.className = 'save-status saved';
      setTimeout(() => { saveStatus.textContent = ''; }, 2000);
    } else {
      saveStatus.textContent = 'Save failed';
    }
  } catch (err) {
    saveStatus.textContent = 'Save failed';
  }
}

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveStatus.textContent = 'Typing...';
  saveStatus.className = 'save-status';
  saveTimeout = setTimeout(() => saveFile(), 1000);
}

async function openTodaysNote() {
  try {
    const res = await fetch('/api/daily');
    const data = await res.json();
    if (data.error) { alert(data.error); return; }

    currentFile = data.path;
    editorPath.textContent = data.path;
    editorInput.value = data.content;
    updatePreview();
    showEditorPanel(data.path);

    if (data.created) {
      saveStatus.textContent = 'Created new note';
      saveStatus.className = 'save-status saved';
      loadFileTree();
    } else {
      saveStatus.textContent = '';
    }
    loadRecent();
  } catch (err) {
    alert("Failed to open today's note");
  }
}

async function loadRecent() {
  try {
    const res = await fetch('/api/recent');
    recentFiles = await res.json();
    renderRecent();
  } catch (err) {}
}

function renderRecent() {
  if (recentFiles.length === 0) {
    recentList.innerHTML = '<div class="recent-empty">No recent files</div>';
    return;
  }
  recentList.innerHTML = recentFiles.map(path => `
    <button class="recent-item" data-path="${path}" title="${path}">
      📄 ${path.split('/').pop().replace('.md', '')}
    </button>
  `).join('');
  recentList.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', () => openFile(item.dataset.path));
  });
}

function renderMarkdown(content) {
  marked.setOptions({ breaks: true, gfm: true });
  let processed = content
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '[$2](#)')
    .replace(/\[\[([^\]]+)\]\]/g, '[$1](#)')
    .replace(/> \[!(\w+)\](-?)\s*([^\n]*)\n((?:>.*\n?)*)/g, (m, type, c, title, cont) => {
      const cc = cont.replace(/^> ?/gm, '').trim();
      return `<div class="callout callout-${type}"><div class="callout-title">${title || type}</div><div class="callout-content">${marked.parse(cc)}</div></div>`;
    })
    .replace(/- \[ \]/g, '- <input type="checkbox" disabled>')
    .replace(/- \[x\]/gi, '- <input type="checkbox" checked disabled>');
  return marked.parse(processed);
}
