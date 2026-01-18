// Milkdown WYSIWYG Editor Module (simplified)

import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';

let editorInstance = null;
let currentMarkdown = '';
let fallbackTextarea = null;

async function createEditor(selector, initialContent = '', onChange = null) {
  const container = document.querySelector(selector);
  if (!container) {
    console.error('Editor container not found:', selector);
    return null;
  }

  // Destroy existing
  destroyEditor();
  container.innerHTML = '';
  currentMarkdown = initialContent;

  try {
    editorInstance = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, container);
        ctx.set(defaultValueCtx, initialContent);
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .create();

    // Poll for changes (simpler than listener plugin)
    const checkChanges = setInterval(() => {
      if (!editorInstance) {
        clearInterval(checkChanges);
        return;
      }
      try {
        const view = editorInstance.ctx.get('editorView');
        if (view && view.state) {
          const newContent = view.state.doc.textContent;
          if (newContent !== currentMarkdown) {
            currentMarkdown = newContent;
            if (onChange) onChange(newContent);
          }
        }
      } catch (e) {}
    }, 500);

    return editorInstance;
  } catch (error) {
    console.error('Milkdown failed, using fallback:', error);
    // Fallback textarea
    container.innerHTML = `<textarea class="fallback-editor">${initialContent}</textarea>`;
    fallbackTextarea = container.querySelector('.fallback-editor');
    fallbackTextarea.style.cssText = 'width:100%;height:100%;background:#0d1117;color:#c9d1d9;border:none;padding:20px;font-family:ui-monospace,monospace;font-size:14px;line-height:1.6;resize:none;outline:none;';
    fallbackTextarea.addEventListener('input', () => {
      currentMarkdown = fallbackTextarea.value;
      if (onChange) onChange(fallbackTextarea.value);
    });
    return null;
  }
}

function getMarkdown() {
  if (fallbackTextarea) return fallbackTextarea.value;
  return currentMarkdown;
}

function destroyEditor() {
  if (editorInstance) {
    try { editorInstance.destroy(); } catch(e) {}
    editorInstance = null;
  }
  fallbackTextarea = null;
  currentMarkdown = '';
}

window.MilkdownEditor = { createEditor, getMarkdown, destroyEditor };
