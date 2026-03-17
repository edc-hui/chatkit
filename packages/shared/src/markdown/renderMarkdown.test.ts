// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { renderMarkdown } from './renderMarkdown.js';

describe('renderMarkdown', () => {
  it('renders inline math with KaTeX', () => {
    const html = renderMarkdown('Inline math: $x^2 + y^2$');

    expect(html).toContain('katex');
    expect(html).toContain('x^2 + y^2');
  });

  it('renders block math with KaTeX', () => {
    const html = renderMarkdown('$$\n\int_0^1 x^2 dx\n$$');

    expect(html).toContain('katex-display');
  });

  it('does not treat code fences as math blocks', () => {
    const html = renderMarkdown('```ts\nconst price = "$5";\n```');

    expect(html).not.toContain('katex');
    expect(html).toContain('<pre><code class="hljs language-ts">');
    expect(html).toContain('hljs-string');
  });

  it('applies an injected sanitizer after markdown rendering', () => {
    const html = renderMarkdown('# Hello', {
      sanitize: value => value.replace('Hello', 'Hi'),
    });

    expect(html).toContain('<h1>Hi</h1>');
  });
});