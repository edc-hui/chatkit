// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyMarkdownToClipboard } from './copyMarkdownToClipboard.js';

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, 'ClipboardItem');
});

describe('copyMarkdownToClipboard', () => {
  it('copies html and plain text when ClipboardItem is available', async () => {
    const write = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        write,
        writeText: vi.fn(async () => {}),
      },
    });

    class ClipboardItemMock {
      constructor(public readonly items: Record<string, Blob>) {}
    }

    (globalThis as Record<string, unknown>).ClipboardItem = ClipboardItemMock;

    const mode = await copyMarkdownToClipboard('# Title');

    expect(mode).toBe('html');
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('falls back to text copy when ClipboardItem is unavailable', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    const mode = await copyMarkdownToClipboard('**hello**');

    expect(mode).toBe('text');
    expect(writeText).toHaveBeenCalledWith('hello');
  });
});
