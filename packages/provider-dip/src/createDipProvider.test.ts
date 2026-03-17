import { describe, expect, it, vi } from 'vitest';

import { createDipProvider } from './createDipProvider.js';

function createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield item;
      }
    },
  };
}

function stubDipAgentDetailsFetch(
  options: {
    agentKey?: string;
    agentVersion?: string;
    agentId?: string;
    fallbackConversationId?: string;
  } = {}
) {
  const agentKey = options.agentKey ?? 'agent-key';
  const agentVersion = options.agentVersion ?? 'v0';
  const agentId = options.agentId ?? 'agent-id-1';
  const fallbackConversationId = options.fallbackConversationId ?? 'conversation-fallback-1';
  const agentDetailsUrl = `/api/agent-factory/v3/agent-market/agent/${agentKey}/version/${agentVersion}?is_visit=true`;

  const fetchMock = vi.fn(async (url: string) => {
    if (url === agentDetailsUrl) {
      return new Response(
        JSON.stringify({
          id: agentId,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        id: fallbackConversationId,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  });
  vi.stubGlobal('fetch', fetchMock);

  return {
    fetchMock,
    agentDetailsUrl,
  };
}

describe('createDipProvider', () => {
  it('uses the default baseUrl when createConversation config is not injected', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/agent-factory/v3/agent-market/agent/agent-key/version/v0?is_visit=true') {
        return new Response(
          JSON.stringify({
            id: 'agent-id-1',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          id: 'conversation-default-1',
          title: 'Default Conversation',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = createDipProvider({
      agentKey: 'agent-key',
    });

    const created = await provider.createConversation({
      title: 'Default Conversation',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/agent-factory/v3/agent-market/agent/agent-key/version/v0?is_visit=true', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Business-Domain': 'bd_public',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/agent-factory/v1/app/agent-key/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Business-Domain': 'bd_public',
      },
      body: JSON.stringify({
        title: 'Default Conversation',
        agent_id: 'agent-id-1',
        agent_version: 'v0',
        executor_version: 'v2',
      }),
    });
    expect(created).toEqual({
      conversation: {
        id: 'conversation-default-1',
        title: 'Default Conversation',
      },
    });

    vi.unstubAllGlobals();
  });

  it('uses configured agentVersion when creating conversation', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/agent-factory/v3/agent-market/agent/agent-key/version/v9?is_visit=true') {
        return new Response(
          JSON.stringify({
            id: 'agent-id-9',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          id: 'conversation-configured-version-1',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = createDipProvider({
      agentKey: 'agent-key',
      agentVersion: 'v9',
    });

    await provider.createConversation();

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/agent-factory/v3/agent-market/agent/agent-key/version/v9?is_visit=true', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Business-Domain': 'bd_public',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/agent-factory/v1/app/agent-key/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Business-Domain': 'bd_public',
      },
      body: JSON.stringify({
        agent_id: 'agent-id-9',
        agent_version: 'v9',
        executor_version: 'v2',
      }),
    });

    vi.unstubAllGlobals();
  });

  it('uses built-in sandbox upload with fixed sess-agent-default by default', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          file_path: 'conversation-conversation-upload-1/uploads/temparea/notes.md',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = createDipProvider({
      agentKey: 'agent-key',
    });

    const uploaded = await provider.uploadFile?.({
      provider: 'dip',
      conversationId: 'conversation-upload-1',
      fileName: 'notes.md',
      content: 'hello',
      contentType: 'text/markdown',
      metadata: {
        owner: 'chatkit-test',
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/sessions/sess-agent-default/files/upload?path=conversation-conversation-upload-1/uploads/temparea/notes.md',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'X-Business-Domain': 'bd_public',
        },
        body: expect.any(FormData),
      })
    );
    expect(uploaded).toEqual({
      fileName: 'notes.md',
      url: 'conversation-conversation-upload-1/uploads/temparea/notes.md',
      storageKey: 'conversation-conversation-upload-1/uploads/temparea/notes.md',
      contentType: 'text/markdown',
      size: 5,
      metadata: {
        owner: 'chatkit-test',
      },
    });

    vi.unstubAllGlobals();
  });

  it('builds a provider that normalizes full snapshot chunks', async () => {
    const { fetchMock } = stubDipAgentDetailsFetch();
    let capturedRequest: unknown;

    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      getAccessToken: async () => 'token-1',
      streamTransport(request) {
        capturedRequest = request;
        return createAsyncIterable([
          {
            assistant_message_id: 'assistant-1',
            message: {
              content: {
                final_answer: {
                  answer: {
                    text: 'Hello from DIP',
                  },
                },
              },
            },
          },
        ]);
      },
    });

    const events = [];
    for await (const event of provider.send({ conversationId: 'conversation-1', text: 'hello' })) {
      events.push(event);
    }

    expect(capturedRequest).toMatchObject({
      url: 'https://dip.example.com/app/agent-key/chat/completion',
      method: 'POST',
      headers: {
        Authorization: 'Bearer token-1',
        'X-Business-Domain': 'bd_public',
      },
      body: {
        query: 'hello',
        conversation_id: 'conversation-1',
        agent_id: 'agent-id-1',
        agent_version: 'v0',
        stream: true,
        inc_stream: true,
        executor_version: 'v2',
        chat_option: {
          is_need_history: true,
          is_need_doc_retrival_post_process: true,
          is_need_progress: true,
          enable_dependency_cache: true,
        },
      },
    });
    expect((capturedRequest as { body: Record<string, unknown> }).body).not.toHaveProperty('text');
    expect((capturedRequest as { body: Record<string, unknown> }).body).not.toHaveProperty('agent_key');
    expect(events[1]).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'assistant-1',
        content: 'Hello from DIP',
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('supports hostAdapter token resolution when no DIP-specific token callback is provided', async () => {
    stubDipAgentDetailsFetch();
    let capturedRequest: unknown;

    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      hostAdapter: {
        getAccessToken: async context => {
          expect(context).toEqual({
            provider: 'dip',
            reason: 'request',
          });
          return 'host-token-dip';
        },
      },
      streamTransport(request) {
        capturedRequest = request;
        return createAsyncIterable([
          {
            assistant_message_id: 'assistant-host-1',
            message: {
              content: {
                final_answer: {
                  answer: {
                    text: 'Hello from host adapter',
                  },
                },
              },
            },
          },
        ]);
      },
    });

    for await (const _event of provider.send({ conversationId: 'conversation-host-1', text: 'hello' })) {
      // consume the stream to capture the request
    }

    expect(capturedRequest).toMatchObject({
      headers: {
        Authorization: 'Bearer host-token-dip',
        'X-Business-Domain': 'bd_public',
      },
    });

    vi.unstubAllGlobals();
  });

  it('uses custom businessDomain for all built-in request headers', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/agent-factory/v3/agent-market/agent/agent-key/version/v0?is_visit=true') {
        return new Response(
          JSON.stringify({
            id: 'agent-id-custom-1',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      if (url === '/api/v1/sessions/sess-agent-default/files/upload?path=conversation-conversation-custom-1/uploads/temparea/notes.md') {
        return new Response(
          JSON.stringify({
            file_path: 'conversation-conversation-custom-1/uploads/temparea/notes.md',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          id: 'conversation-custom-1',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    let capturedStreamRequest: unknown;
    const provider = createDipProvider({
      agentKey: 'agent-key',
      businessDomain: 'bd_enterprise',
      streamTransport(request) {
        capturedStreamRequest = request;
        return createAsyncIterable([]);
      },
    });

    await provider.createConversation();
    await provider.uploadFile?.({
      provider: 'dip',
      conversationId: 'conversation-custom-1',
      fileName: 'notes.md',
      content: 'hello',
    });
    for await (const _event of provider.send({ conversationId: 'conversation-custom-1', text: 'hello' })) {
      // consume stream
    }

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/agent-factory/v3/agent-market/agent/agent-key/version/v0?is_visit=true', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Business-Domain': 'bd_enterprise',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/agent-factory/v1/app/agent-key/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Business-Domain': 'bd_enterprise',
      },
      body: JSON.stringify({
        agent_id: 'agent-id-custom-1',
        agent_version: 'v0',
        executor_version: 'v2',
      }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/sessions/sess-agent-default/files/upload?path=conversation-conversation-custom-1/uploads/temparea/notes.md',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'X-Business-Domain': 'bd_enterprise',
        },
        body: expect.any(FormData),
      })
    );
    expect(capturedStreamRequest).toMatchObject({
      headers: {
        'Content-Type': 'application/json',
        'X-Business-Domain': 'bd_enterprise',
      },
    });

    vi.unstubAllGlobals();
  });

  it('uses canonical X-Business-Domain header key for built-in requests', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url === '/api/agent-factory/v3/agent-market/agent/agent-key/version/v0?is_visit=true') {
        return new Response(
          JSON.stringify({
            id: 'agent-id-header-key-1',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          id: 'conversation-header-key-1',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = createDipProvider({
      agentKey: 'agent-key',
    });

    await provider.createConversation();

    const firstCallOptions = fetchMock.mock.calls[0]?.[1] as { headers?: Record<string, string> } | undefined;
    const secondCallOptions = fetchMock.mock.calls[1]?.[1] as { headers?: Record<string, string> } | undefined;
    expect(firstCallOptions?.headers?.['X-Business-Domain']).toBe('bd_public');
    expect(secondCallOptions?.headers?.['X-Business-Domain']).toBe('bd_public');
    expect(firstCallOptions?.headers?.['x-business-domain']).toBeUndefined();
    expect(secondCallOptions?.headers?.['x-business-domain']).toBeUndefined();

    vi.unstubAllGlobals();
  });

  it('maps deep thinking and regenerate fields into the default DIP request body', async () => {
    stubDipAgentDetailsFetch();
    let capturedRequest: unknown;

    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      streamTransport(request) {
        capturedRequest = request;
        return createAsyncIterable([
          {
            assistant_message_id: 'assistant-deep-think-1',
            message: {
              content: {
                final_answer: {
                  answer: {
                    text: 'Deep thinking enabled',
                  },
                },
              },
            },
          },
        ]);
      },
    });

    for await (const _event of provider.send({
      conversationId: 'conversation-deep-think-1',
      text: 'please think deeply',
      deepThink: true,
      regenerateUserMessageId: 'user-message-1',
      regenerateAssistantMessageId: 'assistant-message-0',
    })) {
      // consume the stream to capture the request
    }

    expect(capturedRequest).toMatchObject({
      body: {
        query: 'please think deeply',
        conversation_id: 'conversation-deep-think-1',
        stream: true,
        inc_stream: true,
        executor_version: 'v2',
        chat_mode: 'deep_thinking',
        regenerate_user_message_id: 'user-message-1',
        regenerate_assistant_message_id: 'assistant-message-0',
      },
    });
    expect((capturedRequest as { body: Record<string, unknown> }).body).not.toHaveProperty('text');
    expect((capturedRequest as { body: Record<string, unknown> }).body).not.toHaveProperty('agent_key');

    vi.unstubAllGlobals();
  });

  it('maps uploaded attachments into selected_files and forwards temporary_area_id', async () => {
    stubDipAgentDetailsFetch();
    let capturedRequest: unknown;

    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      streamTransport(request) {
        capturedRequest = request;
        return createAsyncIterable([
          {
            assistant_message_id: 'assistant-attachment-1',
            message: {
              content: {
                final_answer: {
                  answer: {
                    text: 'Attachment received',
                  },
                },
              },
            },
          },
        ]);
      },
    });

    for await (const _event of provider.send({
      conversationId: 'conversation-attachment-1',
      text: 'check this file',
      attachments: [
        {
          source: 'uploaded',
          fileName: 'notes.md',
          storageKey: 'conversation-attachment-1/uploads/notes.md',
          temporaryAreaId: 'temporary-area-1',
        },
      ],
    })) {
      // consume the stream to capture the request
    }

    expect(capturedRequest).toMatchObject({
      body: {
        temporary_area_id: 'temporary-area-1',
        selected_files: [
          {
            file_name: 'conversation-attachment-1/uploads/notes.md',
          },
        ],
      },
    });

    vi.unstubAllGlobals();
  });

  it('maps DipChat-style interrupt resume fields into the default DIP request body', async () => {
    stubDipAgentDetailsFetch();
    let capturedRequest: unknown;

    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      streamTransport(request) {
        capturedRequest = request;
        return createAsyncIterable([
          {
            assistant_message_id: 'assistant-interrupt-1',
            message: {
              content: {
                final_answer: {
                  answer: {
                    text: 'Interrupt resumed',
                  },
                },
              },
            },
          },
        ]);
      },
    });

    for await (const _event of provider.send({
      conversationId: 'conversation-interrupt-1',
      text: '',
      interrupt: {
        handle: {
          run_id: 'run-1',
        },
        data: {
          tool_name: 'sql_helper',
          tool_args: [
            {
              key: 'query',
              value: 'SELECT * FROM orders LIMIT 10',
              type: 'string',
            },
          ],
          interrupt_config: {
            requires_confirmation: true,
            confirmation_message: 'Please review the query before execution.',
          },
        },
        action: 'confirm',
        modifiedArgs: [
          {
            key: 'query',
            value: 'SELECT * FROM orders LIMIT 5',
          },
        ],
        interruptedAssistantMessageId: 'assistant-interrupt-previous-1',
      },
    })) {
      // consume the stream to capture the request
    }

    expect(capturedRequest).toMatchObject({
      body: {
        conversation_id: 'conversation-interrupt-1',
        stream: true,
        inc_stream: true,
        executor_version: 'v2',
        interrupted_assistant_message_id: 'assistant-interrupt-previous-1',
        resume_interrupt_info: {
          resume_handle: {
            run_id: 'run-1',
          },
          data: {
            tool_name: 'sql_helper',
          },
          action: 'confirm',
          modified_args: [
            {
              key: 'query',
              value: 'SELECT * FROM orders LIMIT 5',
            },
          ],
        },
      },
    });
    expect((capturedRequest as { body: Record<string, unknown> }).body).not.toHaveProperty('query');
    expect((capturedRequest as { body: Record<string, unknown> }).body).not.toHaveProperty('text');
    expect((capturedRequest as { body: Record<string, unknown> }).body).not.toHaveProperty('agent_key');

    vi.unstubAllGlobals();
  });

  it('delegates terminateConversation through the DIP provider config when provided', async () => {
    const terminated: unknown[] = [];

    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      terminateConversation: async input => {
        terminated.push(input);
      },
      streamTransport() {
        return createAsyncIterable([]);
      },
    });

    await provider.terminateConversation?.({
      conversationId: 'conversation-terminate-1',
      mode: 'terminate',
    });

    expect(terminated).toEqual([
      {
        conversationId: 'conversation-terminate-1',
        mode: 'terminate',
      },
    ]);
  });

  it('delegates listConversations and getConversationMessages through the DIP provider config', async () => {
    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      listConversations: async input => {
        expect(input).toEqual({ page: 1, size: 20 });
        return [
          {
            id: 'dip-conversation-1',
            title: 'DIP Conversation 1',
          },
        ];
      },
      getConversationMessages: async input => {
        expect(input).toEqual({ conversationId: 'dip-conversation-1' });
        return [
          {
            id: 'dip-message-1',
            role: 'assistant',
            content: 'hello history',
          },
        ];
      },
      streamTransport() {
        return createAsyncIterable([]);
      },
    });

    await expect(provider.listConversations?.({ page: 1, size: 20 })).resolves.toEqual([
      {
        id: 'dip-conversation-1',
        title: 'DIP Conversation 1',
      },
    ]);
    await expect(provider.getConversationMessages?.({ conversationId: 'dip-conversation-1' })).resolves.toEqual([
      {
        id: 'dip-message-1',
        role: 'assistant',
        content: 'hello history',
      },
    ]);
  });

  it('delegates getOnboardingInfo through the DIP provider config', async () => {
    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      async getOnboardingInfo() {
        return {
          greeting: 'Welcome to DIP',
          description: 'Choose a starter prompt',
          prompts: [
            {
              id: 'starter-dip-1',
              label: 'Summarize provider capabilities',
            },
          ],
        };
      },
      streamTransport() {
        return createAsyncIterable([]);
      },
    });

    await expect(provider.getOnboardingInfo?.()).resolves.toEqual({
      greeting: 'Welcome to DIP',
      description: 'Choose a starter prompt',
      prompts: [
        {
          id: 'starter-dip-1',
          label: 'Summarize provider capabilities',
        },
      ],
    });
  });

  it('delegates recoverConversation and markConversationRead through the DIP provider config', async () => {
    const readCalls: Array<{ conversationId: string; messageIndex: number }> = [];

    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      recoverConversation(input) {
        expect(input).toEqual({
          conversationId: 'dip-conversation-recover-1',
        });
        return createAsyncIterable([
          {
            type: 'stream.started',
            conversationId: input.conversationId,
          },
          {
            type: 'message.delta',
            message: {
              id: 'assistant-recover-1',
              role: 'assistant',
              content: 'resume',
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
      streamTransport() {
        return createAsyncIterable([]);
      },
    });

    const recoveryEvents = [];
    for await (const event of provider.recoverConversation?.({
      conversationId: 'dip-conversation-recover-1',
    }) ?? []) {
      recoveryEvents.push(event);
    }
    await provider.markConversationRead?.({
      conversationId: 'dip-conversation-recover-1',
      messageIndex: 12,
    });

    expect(recoveryEvents).toEqual([
      {
        type: 'stream.started',
        conversationId: 'dip-conversation-recover-1',
      },
      {
        type: 'message.delta',
        message: {
          id: 'assistant-recover-1',
          role: 'assistant',
          content: 'resume',
        },
      },
      {
        type: 'stream.completed',
        conversationId: 'dip-conversation-recover-1',
      },
    ]);
    expect(readCalls).toEqual([
      {
        conversationId: 'dip-conversation-recover-1',
        messageIndex: 12,
      },
    ]);
  });

  it('delegates conversation session status helpers through the DIP provider config', async () => {
    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      async getConversationSessionStatus(input) {
        expect(input).toEqual({
          conversationId: 'dip-conversation-session-1',
        });
        return {
          status: 'active',
          ttlSeconds: 180,
        };
      },
      async recoverConversationSession(input) {
        expect(input).toEqual({
          conversationId: 'dip-conversation-session-1',
        });
        return {
          status: 'active',
          ttlSeconds: 360,
        };
      },
      streamTransport() {
        return createAsyncIterable([]);
      },
    });

    await expect(
      provider.getConversationSessionStatus?.({
        conversationId: 'dip-conversation-session-1',
      })
    ).resolves.toEqual({
      status: 'active',
      ttlSeconds: 180,
    });
    await expect(
      provider.recoverConversationSession?.({
        conversationId: 'dip-conversation-session-1',
      })
    ).resolves.toEqual({
      status: 'active',
      ttlSeconds: 360,
    });
  });

  it('delegates getContextInfo through the DIP provider config', async () => {
    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      async getContextInfo() {
        return {
          title: 'Assistant Context',
          sections: [
            {
              id: 'knowledge-networks',
              title: 'Knowledge Networks',
              items: [
                {
                  id: 'kn-dip-1',
                  title: 'Order Graph',
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
          id: 'knowledge-networks',
          title: 'Knowledge Networks',
          items: [
            {
              id: 'kn-dip-1',
              title: 'Order Graph',
            },
          ],
        },
      ],
    });
  });

  it('delegates updateConversation and deleteConversation through the DIP provider config', async () => {
    const deletedConversationIds: string[] = [];
    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      updateConversation: async input => {
        expect(input).toEqual({
          conversationId: 'dip-conversation-rename-1',
          title: 'Renamed DIP Conversation',
        });
        return {
          id: input.conversationId,
          title: input.title,
        };
      },
      deleteConversation: async input => {
        deletedConversationIds.push(input.conversationId);
      },
      streamTransport() {
        return createAsyncIterable([]);
      },
    });

    await expect(
      provider.updateConversation?.({
        conversationId: 'dip-conversation-rename-1',
        title: 'Renamed DIP Conversation',
      })
    ).resolves.toEqual({
      id: 'dip-conversation-rename-1',
      title: 'Renamed DIP Conversation',
    });
    await provider.deleteConversation?.({
      conversationId: 'dip-conversation-delete-1',
    });

    expect(deletedConversationIds).toEqual(['dip-conversation-delete-1']);
  });

  it('delegates submitMessageFeedback through the DIP provider config', async () => {
    const feedbackCalls: Array<{ conversationId?: string; messageId: string; feedback: 'upvote' | 'downvote' }> = [];

    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
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
      conversationId: 'dip-feedback-1',
      messageId: 'assistant-dip-feedback-1',
      feedback: 'downvote',
    });

    expect(feedbackCalls).toEqual([
      {
        conversationId: 'dip-feedback-1',
        messageId: 'assistant-dip-feedback-1',
        feedback: 'downvote',
      },
    ]);
  });

  it('normalizes incremental chunks through the assembler', async () => {
    stubDipAgentDetailsFetch();
    const provider = createDipProvider({
      baseUrl: 'https://dip.example.com',
      agentKey: 'agent-key',
      streamTransport() {
        return createAsyncIterable([
          { seq_id: 1, key: ['assistant_message_id'], action: 'upsert', content: 'assistant-2' },
          { seq_id: 2, key: ['message', 'content', 'final_answer', 'answer', 'text'], action: 'upsert', content: 'Hel' },
          { seq_id: 3, key: ['message', 'content', 'final_answer', 'answer', 'text'], action: 'append', content: 'lo' },
          { seq_id: 4, key: [], action: 'end' },
        ]);
      },
    });

    const messages = [];
    for await (const event of provider.send({ conversationId: 'conversation-2', text: 'hello' })) {
      if (event.type === 'message.snapshot') {
        messages.push(event.message.content);
      }
    }

    expect(messages.at(-1)).toBe('Hello');

    vi.unstubAllGlobals();
  });

  it('fetches agent details once and reuses it in createConversation and send', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/agent-factory/v3/agent-market/agent/agent-key/version/v0?is_visit=true') {
        return new Response(
          JSON.stringify({
            id: 'agent-id-cached-1',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          id: 'conversation-cached-1',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    let capturedStreamRequest: unknown;
    const provider = createDipProvider({
      agentKey: 'agent-key',
      streamTransport(request) {
        capturedStreamRequest = request;
        return createAsyncIterable([]);
      },
    });

    await provider.createConversation();
    for await (const _event of provider.send({ conversationId: 'conversation-cached-1', text: 'hello cached' })) {
      // consume stream
    }

    expect(
      fetchMock.mock.calls.filter(
        call => call[0] === '/api/agent-factory/v3/agent-market/agent/agent-key/version/v0?is_visit=true'
      )
    ).toHaveLength(1);
    expect(capturedStreamRequest).toMatchObject({
      body: {
        query: 'hello cached',
        agent_id: 'agent-id-cached-1',
        agent_version: 'v0',
      },
    });

    vi.unstubAllGlobals();
  });
});


