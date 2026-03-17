import katex from 'katex';

interface MathSegment {
  placeholder: string;
  content: string;
  displayMode: boolean;
}

interface ExtractedMathResult {
  source: string;
  segments: MathSegment[];
}

const INLINE_PLACEHOLDER_PREFIX = 'CHATKIT_INLINE_MATH_TOKEN_';
const BLOCK_PLACEHOLDER_PREFIX = 'CHATKIT_BLOCK_MATH_TOKEN_';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createPlaceholder(displayMode: boolean, index: number): string {
  const prefix = displayMode ? BLOCK_PLACEHOLDER_PREFIX : INLINE_PLACEHOLDER_PREFIX;
  return `${prefix}${index}__`;
}

function findInlineMathEnd(source: string, start: number): number {
  for (let index = start; index < source.length; index += 1) {
    const current = source[index];
    if (current === '\n') {
      return -1;
    }

    if (current === '$' && source[index - 1] !== '\\') {
      return index;
    }
  }

  return -1;
}

function normalizeInlineMath(content: string): string {
  return content.trim();
}

export function extractMathSegments(source: string): ExtractedMathResult {
  const segments: MathSegment[] = [];
  let next = '';
  let index = 0;
  let inCodeFence = false;
  let inInlineCode = false;

  while (index < source.length) {
    if (!inInlineCode && source.startsWith('```', index)) {
      inCodeFence = !inCodeFence;
      next += '```';
      index += 3;
      continue;
    }

    if (!inCodeFence && source[index] === '`') {
      inInlineCode = !inInlineCode;
      next += source[index];
      index += 1;
      continue;
    }

    if (!inCodeFence && !inInlineCode && source.startsWith('$$', index)) {
      const end = source.indexOf('$$', index + 2);
      if (end !== -1) {
        const content = source.slice(index + 2, end).trim();
        const placeholder = createPlaceholder(true, segments.length);
        segments.push({
          placeholder,
          content,
          displayMode: true,
        });
        next += `\n\n${placeholder}\n\n`;
        index = end + 2;
        continue;
      }
    }

    const current = source[index];
    const nextCharacter = source[index + 1];
    if (
      !inCodeFence &&
      !inInlineCode &&
      current === '$' &&
      source[index - 1] !== '\\' &&
      nextCharacter &&
      nextCharacter !== '$' &&
      !/\s/.test(nextCharacter)
    ) {
      const end = findInlineMathEnd(source, index + 1);
      if (end !== -1) {
        const content = normalizeInlineMath(source.slice(index + 1, end));
        if (content) {
          const placeholder = createPlaceholder(false, segments.length);
          segments.push({
            placeholder,
            content,
            displayMode: false,
          });
          next += placeholder;
          index = end + 1;
          continue;
        }
      }
    }

    next += current;
    index += 1;
  }

  return {
    source: next,
    segments,
  };
}

function renderMathSegment(segment: MathSegment): string {
  try {
    return katex.renderToString(segment.content, {
      displayMode: segment.displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
  } catch {
    const escaped = segment.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return segment.displayMode
      ? `<pre><code class="chatkit-math-fallback">${escaped}</code></pre>`
      : `<code class="chatkit-math-fallback">${escaped}</code>`;
  }
}

export function restoreMathSegments(html: string, segments: MathSegment[]): string {
  let next = html;

  for (const segment of segments) {
    const rendered = renderMathSegment(segment);
    if (segment.displayMode) {
      const blockPattern = new RegExp(`<p>\\s*${escapeRegExp(segment.placeholder)}\\s*</p>`, 'g');
      next = next.replace(blockPattern, rendered);
    }

    next = next.replace(new RegExp(escapeRegExp(segment.placeholder), 'g'), rendered);
  }

  return next;
}