import { describe, expect, it } from 'vitest';

import { createStreamingMarkdownEngine } from './createStreamingMarkdownEngine.js';
import { repairMarkdown } from './repairMarkdown.js';

describe('repairMarkdown', () => {
  it('closes an unclosed code fence', () => {
    const source = '```ts\nconst answer = 42;';
    expect(repairMarkdown(source)).toContain('\n```');
  });

  it('closes an unclosed inline code span', () => {
    expect(repairMarkdown('Use `chat.send(')).toBe('Use `chat.send(`');
  });
});

describe('createStreamingMarkdownEngine', () => {
  it('renders streaming content before completion', () => {
    const engine = createStreamingMarkdownEngine();

    const first = engine.append('# Hello');
    const second = engine.append('\n```ts\nconst value = 1;');

    expect(first.html).toContain('<h1>Hello</h1>');
    expect(second.repairedSource).toContain('\n```');
    expect(second.isComplete).toBe(false);
  });

  it('keeps the raw source and final output after completion', () => {
    const engine = createStreamingMarkdownEngine();

    engine.append('A paragraph');
    const result = engine.complete();

    expect(result.source).toBe('A paragraph');
    expect(result.isComplete).toBe(true);
    expect(result.html).toContain('<p>A paragraph</p>');
  });

  it('supports an injected sanitizer', () => {
    const engine = createStreamingMarkdownEngine({
      sanitize: html => html.replace('Hello', 'Hi'),
    });

    const result = engine.setSource('# Hello', true);
    expect(result.html).toContain('<h1>Hi</h1>');
  });
});
