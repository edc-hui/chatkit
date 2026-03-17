// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CozeSseEvent } from '@kweaver-ai/chatkit-provider-coze';

import { ChatKitCoze } from './ChatKitCoze.js';

afterEach(() => {
  cleanup();
});

function createAsyncIterable(items: CozeSseEvent[]): AsyncIterable<CozeSseEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield item;
      }
    },
  };
}

describe('ChatKitCoze', () => {
  it('renders a closable Copilot with a Coze provider wrapper', () => {
    const handleClose = vi.fn();

    render(
      <ChatKitCoze
        botId="coze-bot-demo"
        apiToken="coze-token-demo"
        onClose={handleClose}
        streamTransport={() =>
          createAsyncIterable([
            {
              event: 'done',
              data: '{}',
            },
          ])
        }
      />
    );

    expect(document.body.textContent).toContain('Copilot');
    fireEvent.click(screen.getByRole('button', { name: 'Close copilot' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
