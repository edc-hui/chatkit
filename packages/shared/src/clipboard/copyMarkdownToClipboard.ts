import { renderMarkdown } from '../markdown/renderMarkdown.js';

export type ClipboardCopyMode = 'html' | 'text' | 'unsupported';

export function generateWordCompatibleHTML(html: string): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <meta name="ProgId" content="Word.Document" />
    <meta name="Generator" content="ChatKit v2" />
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; }
      pre { background: #f8fafc; padding: 12px; border-radius: 12px; overflow: auto; }
      code { font-family: Consolas, "Courier New", monospace; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d7deeb; padding: 8px; text-align: left; }
      blockquote { margin: 0; padding-left: 12px; border-left: 4px solid #cbd5e1; color: #475569; }
    </style>
  </head>
  <body>${html}</body>
</html>`;
}

function htmlToPlainText(html: string): string {
  if (typeof DOMParser !== 'undefined') {
    const document = new DOMParser().parseFromString(html, 'text/html');
    return document.body.textContent?.replace(/\u00a0/g, ' ').trim() ?? '';
  }

  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function copyMarkdownToClipboard(markdown: string): Promise<ClipboardCopyMode> {
  const renderedHtml = renderMarkdown(markdown);
  const plainText = htmlToPlainText(renderedHtml) || markdown.trim();

  if (!plainText) {
    return 'unsupported';
  }

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function' &&
    typeof Blob !== 'undefined'
  ) {
    const ClipboardItemCtor = (globalThis as typeof globalThis & { ClipboardItem?: new (items: Record<string, Blob>) => unknown })
      .ClipboardItem;

    if (ClipboardItemCtor) {
      const wordHTML = generateWordCompatibleHTML(renderedHtml);
      const clipboardItem = new ClipboardItemCtor({
        'text/html': new Blob([wordHTML], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([clipboardItem as never]);
      return 'html';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(plainText);
    return 'text';
  }

  if (typeof document !== 'undefined') {
    const textArea = document.createElement('textarea');
    textArea.value = plainText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return 'text';
  }

  return 'unsupported';
}
