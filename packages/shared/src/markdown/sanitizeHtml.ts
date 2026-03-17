import createDOMPurify from 'dompurify';

import type { MarkdownSanitizer } from './stream/types.js';

let cachedSanitizer: MarkdownSanitizer | undefined;

export function createDefaultMarkdownSanitizer(): MarkdownSanitizer | undefined {
  if (cachedSanitizer) {
    return cachedSanitizer;
  }

  if (typeof window === 'undefined' || !window.document) {
    return undefined;
  }

  const purifier = createDOMPurify(window);
  cachedSanitizer = html =>
    purifier.sanitize(html, {
      USE_PROFILES: {
        html: true,
      },
      ADD_ATTR: ['target', 'rel'],
    });

  return cachedSanitizer;
}