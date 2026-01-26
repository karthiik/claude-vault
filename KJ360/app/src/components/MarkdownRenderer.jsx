import { useMemo } from 'react';

/**
 * Simple Markdown Renderer
 * Converts basic markdown to HTML without external dependencies
 * Memoized for performance - only re-parses when content changes
 */
export default function MarkdownRenderer({ content, className = '' }) {
  // Memoize the parsed HTML to avoid re-parsing on every render
  const html = useMemo(() => {
    if (!content) return '';
    return parseMarkdown(content);
  }, [content]);

  if (!html) return null;

  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function parseMarkdown(text) {
  let html = text;

  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers (must come before bold processing)
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-white mt-5 mb-3">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="border-gray-700 my-4" />');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="text-gray-300 italic">$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-800 text-amber-400 px-1.5 py-0.5 rounded text-sm">$1</code>');

  // Links (wiki-style and standard)
  html = html.replace(/\[\[([^\]]+)\]\]/g, '<span class="text-amber-400">$1</span>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-amber-400 hover:underline">$1</a>');

  // Tags
  html = html.replace(/#([a-z]+\/[a-z]+)/g, '<span class="text-blue-400 text-sm">#$1</span>');
  html = html.replace(/#(p[123])/g, '<span class="text-orange-400 text-sm">#$1</span>');

  // Numbered lists
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 text-gray-300 mb-2"><span class="text-amber-400 mr-2">$1.</span>$2</li>');

  // Bullet lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-300 mb-1 list-disc list-inside">$1</li>');

  // Wrap consecutive list items
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
    return `<ul class="my-2">${match}</ul>`;
  });

  // Paragraphs (lines that aren't already wrapped)
  const lines = html.split('\n');
  html = lines.map(line => {
    // Skip if already has HTML tags or is empty
    if (line.trim() === '' || line.startsWith('<')) {
      return line;
    }
    return `<p class="text-gray-300 mb-2">${line}</p>`;
  }).join('\n');

  // Clean up empty paragraphs
  html = html.replace(/<p class="[^"]*"><\/p>/g, '');

  return html;
}

// CSS styles for markdown content (add to your global CSS or component)
export const markdownStyles = `
  .markdown-content h1,
  .markdown-content h2,
  .markdown-content h3 {
    line-height: 1.3;
  }

  .markdown-content ul {
    list-style: none;
    padding: 0;
  }

  .markdown-content li {
    position: relative;
  }

  .markdown-content code {
    font-family: 'Monaco', 'Menlo', monospace;
  }

  .markdown-content hr {
    opacity: 0.3;
  }
`;
