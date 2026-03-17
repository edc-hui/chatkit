import { describe, expect, it } from 'vitest';

import { createCozeProvider } from './createCozeProvider.js';

function createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield item;
      }
    },
  };
}

describe('createCozeProvider', () => {
  it('builds the Coze request and normalizes streamed output', async () => {
    let capturedRequest: unknown;

    const provider = createCozeProvider({
      botId: 'bot-1',
      apiToken: 'token-1',
      baseUrl: 'https://api.coze.example.com',
      userId: 'user-1',
      streamTransport(request) {
        capturedRequest = request;
        return createAsyncIterable([
          {
            event: 'conversation.message.completed',
            data: JSON.stringify({
              id: 'coze-message-1',
              conversation_id: 'coze-conversation-1',
              type: 'answer',
              content: 'Hello Coze',
            }),
          },
        ]);
      },
    });

    const events = [];
    for await (const event of provider.send({ conversationId: 'coze-conversation-1', text: 'hello coze' })) {
      events.push(event);
    }

    expect(capturedRequest).toMatchObject({
      url: 'https://api.coze.example.com/v3/chat?conversation_id=coze-conversation-1',
      method: 'POST',
      headers: {
        Authorization: 'Bearer token-1',
      },
      body: {
        bot_id: 'bot-1',
        user_id: 'user-1',
        stream: true,
      },
    });
    expect(events[1]).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'coze-message-1',
        content: 'Hello Coze',
      },
    });
  });

  it('supports hostAdapter token resolution when apiToken is not provided', async () => {
    let capturedRequest: unknown;

    const provider = createCozeProvider({
      botId: 'bot-2',
      hostAdapter: {
        getAccessToken: async context => {
          expect(context).toEqual({
            provider: 'coze',
            reason: 'request',
          });
          return 'host-token-coze';
        },
      },
      streamTransport(request) {
        capturedRequest = request;
        return createAsyncIterable([
          {
            event: 'conversation.chat.completed',
            data: JSON.stringify({
              conversation_id: 'coze-conversation-host',
            }),
          },
        ]);
      },
    });

    for await (const _event of provider.send({ conversationId: 'coze-conversation-host', text: 'hello host' })) {
      // consume the stream to capture the request
    }

    expect(capturedRequest).toMatchObject({
      headers: {
        Authorization: 'Bearer host-token-coze',
      },
    });
  });

  it('serializes application context into the Coze user message content', async () => {
    let capturedRequest: unknown;

    const provider = createCozeProvider({
      botId: 'bot-context-serialization',
      apiToken: 'token-context-serialization',
      streamTransport(request) {
        capturedRequest = request;
        return createAsyncIterable([
          {
            event: 'conversation.chat.completed',
            data: JSON.stringify({
              conversation_id: 'coze-conversation-context-1',
            }),
          },
        ]);
      },
    });

    for await (const _event of provider.send({
      conversationId: 'coze-conversation-context-1',
      text: 'analyze this metric',
      applicationContext: {
        title: 'GMV Metric',
        data: {
          metric_id: 'metric-gmv',
          granularity: 'daily',
        },
      },
    })) {
      // consume the stream to capture the request
    }

    expect(capturedRequest).toMatchObject({
      body: {
        additional_messages: [
          {
            role: 'user',
            content_type: 'text',
            content: expect.stringContaining('[Application Context]'),
          },
        ],
      },
    });

    expect(capturedRequest).toMatchObject({
      body: {
        additional_messages: [
          {
            content: expect.stringContaining('Title: GMV Metric'),
          },
        ],
      },
    });
    expect(capturedRequest).toMatchObject({
      body: {
        additional_messages: [
          {
            content: expect.stringContaining('"metric_id": "metric-gmv"'),
          },
        ],
      },
    });
    expect(capturedRequest).toMatchObject({
      body: {
        additional_messages: [
          {
            content: expect.stringContaining('analyze this metric'),
          },
        ],
      },
    });
  });

  it('falls back to local conversation creation when no API hook is provided', async () => {
    const provider = createCozeProvider({
      botId: 'bot-3',
    });

    const result = await provider.createConversation();
    expect(result.conversation.id).toBeTruthy();
  });

  it('delegates terminateConversation through the Coze provider config when provided', async () => {
    const terminated: unknown[] = [];

    const provider = createCozeProvider({
      botId: 'bot-4',
      terminateConversation: async input => {
        terminated.push(input);
      },
    });

    await provider.terminateConversation?.({
      conversationId: 'coze-conversation-terminate-1',
      mode: 'terminate',
    });

    expect(terminated).toEqual([
      {
        conversationId: 'coze-conversation-terminate-1',
        mode: 'terminate',
      },
    ]);
  });

  it('delegates listConversations and getConversationMessages through the Coze provider config', async () => {
    const provider = createCozeProvider({
      botId: 'bot-5',
      listConversations: async input => {
        expect(input).toEqual({ page: 1, size: 10 });
        return [
          {
            id: 'coze-conversation-1',
            title: 'Coze Conversation 1',
          },
        ];
      },
      getConversationMessages: async input => {
        expect(input).toEqual({ conversationId: 'coze-conversation-1' });
        return [
          {
            id: 'coze-message-history-1',
            role: 'assistant',
            content: 'coze history',
          },
        ];
      },
    });

    await expect(provider.listConversations?.({ page: 1, size: 10 })).resolves.toEqual([
      {
        id: 'coze-conversation-1',
        title: 'Coze Conversation 1',
      },
    ]);
    await expect(provider.getConversationMessages?.({ conversationId: 'coze-conversation-1' })).resolves.toEqual([
      {
        id: 'coze-message-history-1',
        role: 'assistant',
        content: 'coze history',
      },
    ]);
  });

  it('delegates recoverConversation and markConversationRead through the Coze provider config', async () => {
    const readCalls: Array<{ conversationId: string; messageIndex: number }> = [];

    const provider = createCozeProvider({
      botId: 'bot-recover-1',
      recoverConversation(input) {
        expect(input).toEqual({
          conversationId: 'coze-conversation-recover-1',
        });
        return createAsyncIterable([
          {
            type: 'stream.started',
            conversationId: input.conversationId,
          },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-coze-recover-1',
              role: 'assistant',
              content: 'Recovered Coze answer',
            },
          },
          {
            type: 'stream.completed',
            conversationId: input.conversationId,
          },
        ]);
      },
      async markConversationRead(input) {
        readCalls.push({
          conversationId: input.conversationId,
          messageIndex: input.messageIndex,
        });
      },
    });

    const recoveryEvents = [];
    for await (const event of provider.recoverConversation?.({
      conversationId: 'coze-conversation-recover-1',
    }) ?? []) {
      recoveryEvents.push(event);
    }
    await provider.markConversationRead?.({
      conversationId: 'coze-conversation-recover-1',
      messageIndex: 7,
    });

    expect(recoveryEvents).toEqual([
      {
        type: 'stream.started',
        conversationId: 'coze-conversation-recover-1',
      },
      {
        type: 'message.snapshot',
        message: {
          id: 'assistant-coze-recover-1',
          role: 'assistant',
          content: 'Recovered Coze answer',
        },
      },
      {
        type: 'stream.completed',
        conversationId: 'coze-conversation-recover-1',
      },
    ]);
    expect(readCalls).toEqual([
      {
        conversationId: 'coze-conversation-recover-1',
        messageIndex: 7,
      },
    ]);
  });

  it('delegates conversation session status helpers through the Coze provider config', async () => {
    const provider = createCozeProvider({
      botId: 'bot-session-1',
      async getConversationSessionStatus(input) {
        expect(input).toEqual({
          conversationId: 'coze-conversation-session-1',
        });
        return {
          status: 'active',
          ttlSeconds: 120,
        };
      },
      async recoverConversationSession(input) {
        expect(input).toEqual({
          conversationId: 'coze-conversation-session-1',
        });
        return {
          status: 'active',
          ttlSeconds: 240,
        };
      },
    });

    await expect(
      provider.getConversationSessionStatus?.({
        conversationId: 'coze-conversation-session-1',
      })
    ).resolves.toEqual({
      status: 'active',
      ttlSeconds: 120,
    });
    await expect(
      provider.recoverConversationSession?.({
        conversationId: 'coze-conversation-session-1',
      })
    ).resolves.toEqual({
      status: 'active',
      ttlSeconds: 240,
    });
  });

  it('delegates updateConversation and deleteConversation through the Coze provider config', async () => {
    const deletedConversationIds: string[] = [];
    const provider = createCozeProvider({
      botId: 'bot-6',
      updateConversation: async input => {
        expect(input).toEqual({
          conversationId: 'coze-conversation-rename-1',
          title: 'Renamed Coze Conversation',
        });
        return {
          id: input.conversationId,
          title: input.title,
        };
      },
      deleteConversation: async input => {
        deletedConversationIds.push(input.conversationId);
      },
    });

    await expect(
      provider.updateConversation?.({
        conversationId: 'coze-conversation-rename-1',
        title: 'Renamed Coze Conversation',
      })
    ).resolves.toEqual({
      id: 'coze-conversation-rename-1',
      title: 'Renamed Coze Conversation',
    });
    await provider.deleteConversation?.({
      conversationId: 'coze-conversation-delete-1',
    });

    expect(deletedConversationIds).toEqual(['coze-conversation-delete-1']);
  });

  it('delegates getOnboardingInfo through the Coze provider config', async () => {
    const provider = createCozeProvider({
      botId: 'bot-7',
      async getOnboardingInfo() {
        return {
          greeting: 'Welcome to Coze',
          description: 'Start with a suggested prompt',
          prompts: [
            {
              id: 'starter-coze-1',
              label: 'Explain the current workflow',
            },
          ],
        };
      },
      streamTransport() {
        return createAsyncIterable([]);
      },
    });

    await expect(provider.getOnboardingInfo?.()).resolves.toEqual({
      greeting: 'Welcome to Coze',
      description: 'Start with a suggested prompt',
      prompts: [
        {
          id: 'starter-coze-1',
          label: 'Explain the current workflow',
        },
      ],
    });
  });

  it('delegates getContextInfo through the Coze provider config', async () => {
    const provider = createCozeProvider({
      botId: 'bot-context-1',
      async getContextInfo() {
        return {
          title: 'Assistant Context',
          sections: [
            {
              id: 'metrics',
              title: 'Metrics',
              items: [
                {
                  id: 'metric-coze-1',
                  title: 'GMV',
                },
              ],
            },
          ],
        };
      },
      streamTransport() {
        return createAsyncIterable([]);
      },
    });

    await expect(provider.getContextInfo?.()).resolves.toEqual({
      title: 'Assistant Context',
      sections: [
        {
          id: 'metrics',
          title: 'Metrics',
          items: [
            {
              id: 'metric-coze-1',
              title: 'GMV',
            },
          ],
        },
      ],
    });
  });

  it('delegates submitMessageFeedback through the Coze provider config', async () => {
    const feedbackCalls: Array<{ conversationId?: string; messageId: string; feedback: 'upvote' | 'downvote' }> = [];

    const provider = createCozeProvider({
      botId: 'bot-8',
      async submitMessageFeedback(input) {
        feedbackCalls.push({
          conversationId: input.conversationId,
          messageId: input.messageId,
          feedback: input.feedback,
        });
      },
      streamTransport() {
        return createAsyncIterable([]);
      },
    });

    await provider.submitMessageFeedback?.({
      conversationId: 'coze-feedback-1',
      messageId: 'assistant-coze-feedback-1',
      feedback: 'upvote',
    });

    expect(feedbackCalls).toEqual([
      {
        conversationId: 'coze-feedback-1',
        messageId: 'assistant-coze-feedback-1',
        feedback: 'upvote',
      },
    ]);
  });
});
