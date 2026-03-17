import { describe, expect, it } from 'vitest';

import { normalizeCozeStream } from './normalizeCozeStream.js';

function createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield item;
      }
    },
  };
}

describe('normalizeCozeStream', () => {
  it('normalizes delta and completed answer events', async () => {
    const events = [];

    for await (const event of normalizeCozeStream(
      createAsyncIterable([
        {
          event: 'conversation.message.delta',
          data: JSON.stringify({
            id: 'coze-message-1',
            conversation_id: 'coze-conversation-1',
            type: 'answer',
            content: 'Hel',
          }),
        },
        {
          event: 'conversation.message.completed',
          data: JSON.stringify({
            id: 'coze-message-1',
            conversation_id: 'coze-conversation-1',
            type: 'answer',
            content: 'Hello',
          }),
        },
      ])
    )) {
      events.push(event);
    }

    expect(events[0]).toEqual({ type: 'stream.started', conversationId: 'coze-conversation-1' });
    expect(events[1]).toMatchObject({
      type: 'message.delta',
      message: { id: 'coze-message-1', content: 'Hel' },
    });
    expect(events[2]).toMatchObject({
      type: 'message.snapshot',
      message: { id: 'coze-message-1', content: 'Hello' },
    });
    expect(events[3]).toEqual({ type: 'message.completed', messageId: 'coze-message-1' });
    expect(events[4]).toEqual({ type: 'stream.completed', conversationId: 'coze-conversation-1' });
  });

  it('ignores non-answer verbose payloads', async () => {
    const events = [];

    for await (const event of normalizeCozeStream(
      createAsyncIterable([
        {
          event: 'conversation.message.completed',
          data: JSON.stringify({
            id: 'verbose-1',
            type: 'verbose',
            content: 'ignored',
          }),
        },
        {
          event: 'done',
          data: JSON.stringify({ status: 'completed' }),
        },
      ]),
      'coze-conversation-2'
    )) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: 'stream.started', conversationId: 'coze-conversation-2' },
      { type: 'stream.completed', conversationId: 'coze-conversation-2' },
    ]);
  });
});
