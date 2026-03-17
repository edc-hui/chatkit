import MarkdownIt from 'markdown-it';

import type { MarkdownSanitizer } from './stream/types.js';
import { getMarkdownHighlighter } from './highlight.js';
import { extractMathSegments, restoreMathSegments } from './math.js';
import { createDefaultMarkdownSanitizer } from './sanitizeHtml.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface RenderMarkdownOptions {
  sanitize?: MarkdownSanitizer;
}

export function createMarkdownRenderer(): MarkdownIt {
  const highlighter = getMarkdownHighlighter();

  return new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
    highlight(code: string, language: string) {
      if (language && highlighter.getLanguage(language)) {
        const highlighted = highlighter.highlight(code, { language }).value;
        return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
      }

      return `<pre><code class="hljs">${escapeHtml(code)}</code></pre>`;
    },
  });
}

export function renderMarkdown(source: string, options: RenderMarkdownOptions = {}): string {
  const renderer = createMarkdownRenderer();
  const math = extractMathSegments(source);
  const html = renderer.render(math.source);
  const sanitizer = options.sanitize ?? createDefaultMarkdownSanitizer();
  const sanitized = sanitizer ? sanitizer(html) : html;
  return restoreMathSegments(sanitized, math.segments);
}