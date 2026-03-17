// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ChatProvider, ProviderEvent } from '@kweaver-ai/chatkit-core';

import { BlockRegistry } from './BlockRegistry.js';
import { ChatKitProvider } from './ChatKitProvider.js';
import { ToolCallCard } from './tools/ToolCallCard.js';

function createAsyncIterable(events: ProviderEvent[]): AsyncIterable<ProviderEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
  };
}

afterEach(() => {
  cleanup();
  BlockRegistry.unregisterTool('custom_block_tool');
});

describe('BlockRegistry compatibility', () => {
  it('supports the legacy block registration shape for custom tool icons and click handlers', async () => {
    const handleToolClick = vi.fn();

    BlockRegistry.registerTool({
      name: 'custom_block_tool',
      Icon: <span>CI</span>,
      onClick: handleToolClick,
    });

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-block-registry-1',
          },
        };
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <ToolCallCard
          toolCall={{
            name: 'custom_block_tool',
            title: 'Custom Tool',
            output: {
              result: 'ok',
            },
          }}
        />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Custom Tool')).not.toBeNull();
      expect(screen.getByText('CI')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Custom Tool'));

    expect(handleToolClick).toHaveBeenCalledTimes(1);
  });
});
