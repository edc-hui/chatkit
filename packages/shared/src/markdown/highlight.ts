import hljs from 'highlight.js/lib/core';
import type { LanguageFn } from 'highlight.js';
import bash from 'highlight.js/lib/languages/bash';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

let registered = false;

export function registerMarkdownCodeLanguage(name: string, language: LanguageFn): void {
  hljs.registerLanguage(name, language);
}

export function registerDefaultMarkdownLanguages(): void {
  if (registered) {
    return;
  }

  registerMarkdownCodeLanguage('bash', bash);
  registerMarkdownCodeLanguage('sh', bash);
  registerMarkdownCodeLanguage('shell', bash);
  registerMarkdownCodeLanguage('javascript', javascript);
  registerMarkdownCodeLanguage('js', javascript);
  registerMarkdownCodeLanguage('json', json);
  registerMarkdownCodeLanguage('markdown', markdown);
  registerMarkdownCodeLanguage('md', markdown);
  registerMarkdownCodeLanguage('python', python);
  registerMarkdownCodeLanguage('py', python);
  registerMarkdownCodeLanguage('sql', sql);
  registerMarkdownCodeLanguage('typescript', typescript);
  registerMarkdownCodeLanguage('ts', typescript);
  registerMarkdownCodeLanguage('html', xml);
  registerMarkdownCodeLanguage('xml', xml);

  registered = true;
}

export function getMarkdownHighlighter() {
  registerDefaultMarkdownLanguages();
  return hljs;
}