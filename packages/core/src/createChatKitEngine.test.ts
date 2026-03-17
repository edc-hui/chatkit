import { describe, expect, it, vi } from 'vitest';

import { createChatKitEngine } from './createChatKitEngine.js';
import type { ChatProvider, ProviderEvent } from './provider.js';

function createAsyncIterable(events: ProviderEvent[]): AsyncIterable<ProviderEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
  };
}

describe('createChatKitEngine', () => {
  it('creates a conversation automatically before send and consumes provider events', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-1',
            title: 'Session 1',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-1' },
          {
            type: 'message.delta',
            message: {
              id: 'assistant-1',
              role: 'assistant',
              content: 'Hel',
            },
          },
          {
            type: 'message.delta',
            message: {
              id: 'assistant-1',
              role: 'assistant',
              content: 'lo',
            },
          },
          { type: 'message.completed', messageId: 'assistant-1' },
          { type: 'stream.completed', conversationId: 'conversation-1' },
        ]);
      },
    };

    const engine = createChatKitEngine({ provider });
    const snapshots: number[] = [];
    engine.subscribe(state => {
      snapshots.push(state.messages.length);
    });

    const result = await engine.send({ text: 'hello' });

    expect(result.currentConversationId).toBe('conversation-1');
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toMatchObject({
      role: 'user',
      content: 'hello',
      status: 'done',
    });
    expect(result.messages[1]).toMatchObject({
      id: 'assistant-1',
      content: 'Hello',
      status: 'done',
    });
    expect(snapshots.length).toBeGreaterThan(1);
  });

  it('clears previous messages when creating a new conversation explicitly', async () => {
    let createCount = 0;

    const provider: ChatProvider = {
      async createConversation() {
        createCount += 1;
        return {
          conversation: {
            id: `conversation-reset-${createCount}`,
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-reset-1' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-reset-1',
              role: 'assistant',
              content: 'first answer',
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-reset-1' },
        ]);
      },
    };

    const engine = createChatKitEngine({ provider });
    await engine.send({ text: 'first question' });

    const result = await engine.createConversation();

    expect(result.currentConversationId).toBe('conversation-reset-2');
    expect(result.messages).toEqual([]);
  });

  it('emits fine-grained messageUpdated events', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-2',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-2' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-2',
              role: 'assistant',
              content: 'snapshot',
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-2' },
        ]);
      },
    };

    const engine = createChatKitEngine({ provider });
    const updatedMessageIds: string[] = [];
    engine.on('messageAppended', payload => {
      updatedMessageIds.push(payload.message.id);
    });

    await engine.send({ text: 'snapshot' });

    expect(updatedMessageIds).toHaveLength(2);
    expect(updatedMessageIds[0]).toMatch(/^user-/);
    expect(updatedMessageIds[1]).toBe('assistant-2');
  });

  it('supports stopping an in-flight stream without surfacing an error', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-3',
          },
        };
      },
      send(input) {
        return {
          async *[Symbol.asyncIterator]() {
            yield { type: 'stream.started', conversationId: 'conversation-3' } satisfies ProviderEvent;
            yield {
              type: 'message.delta',
              message: {
                id: 'assistant-3',
                role: 'assistant',
                content: 'Partial answer',
              },
            } satisfies ProviderEvent;

            await new Promise<void>(resolve => {
              input.signal?.addEventListener('abort', () => resolve(), { once: true });
            });

            throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
          },
        };
      },
    };

    const engine = createChatKitEngine({ provider });
    const sendPromise = engine.send({ text: 'hello stop' });

    await new Promise(resolve => setTimeout(resolve, 0));

    const stoppedState = engine.stop();
    const finalState = await sendPromise;

    expect(stoppedState.streaming).toBe(false);
    expect(finalState.streaming).toBe(false);
    expect(finalState.error).toBeUndefined();
    expect(finalState.messages[0]).toMatchObject({
      role: 'user',
      content: 'hello stop',
      status: 'done',
    });
    expect(finalState.messages[1]).toMatchObject({
      id: 'assistant-3',
      content: 'Partial answer',
      status: 'done',
    });
  });

  it('marks the latest assistant message as errored when the provider stream fails', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-error-message-1',
          },
        };
      },
      send() {
        return {
          async *[Symbol.asyncIterator]() {
            yield { type: 'stream.started', conversationId: 'conversation-error-message-1' } satisfies ProviderEvent;
            yield {
              type: 'message.delta',
              message: {
                id: 'assistant-error-message-1',
                role: 'assistant',
                content: 'Partial',
              },
            } satisfies ProviderEvent;

            throw new Error('Provider stream failed');
          },
        };
      },
    };

    const engine = createChatKitEngine({ provider });

    await expect(
      engine.send({
        text: 'trigger error',
      })
    ).rejects.toThrow('Provider stream failed');

    expect(engine.getState().error).toBeInstanceOf(Error);
    expect(engine.getState().messages.at(-1)).toMatchObject({
      id: 'assistant-error-message-1',
      status: 'error',
      metadata: {
        error: {
          source: 'unknown',
          detail: expect.any(Error),
        },
      },
    });
  });

  it('calls provider terminateConversation when terminate() is requested', async () => {
    const terminated: Array<{ conversationId?: string; mode?: 'cancel' | 'terminate' }> = [];

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-4',
          },
        };
      },
      send() {
        return createAsyncIterable([]);
      },
      async terminateConversation(input) {
        terminated.push({
          conversationId: input?.conversationId,
          mode: input?.mode,
        });
      },
    };

    const engine = createChatKitEngine({ provider });
    await engine.createConversation();
    await engine.terminate();

    expect(terminated).toEqual([
      {
        conversationId: 'conversation-4',
        mode: 'terminate',
      },
    ]);
  });

  it('uploads local attachments before delegating send to the provider', async () => {
    const uploadFile = vi.fn(async () => ({
      fileName: 'notes.md',
      storageKey: 'conversation-5/uploads/notes.md',
      url: 'https://cdn.example.com/notes.md',
    }));
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) =>
      createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        { type: 'stream.completed', conversationId: input.conversationId },
      ])
    );

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-5',
          },
        };
      },
      send: providerSend,
    };

    const engine = createChatKitEngine({
      provider,
      providerName: 'dip',
      hostAdapter: {
        uploadFile,
      },
    });

    await engine.send({
      text: 'hello attachment',
      attachments: [
        {
          source: 'local',
          fileName: 'notes.md',
          content: '# notes',
        },
      ],
    });

    expect(uploadFile).toHaveBeenCalledWith({
      provider: 'dip',
      conversationId: 'conversation-5',
      fileName: 'notes.md',
      content: '# notes',
      contentType: undefined,
      purpose: undefined,
      metadata: undefined,
    });
    expect(providerSend).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-5',
        attachments: [
          {
            source: 'uploaded',
            fileName: 'notes.md',
            storageKey: 'conversation-5/uploads/notes.md',
            url: 'https://cdn.example.com/notes.md',
            fileId: undefined,
            contentType: undefined,
            size: undefined,
            metadata: undefined,
          },
        ],
      })
    );
    expect(engine.getState().messages[0]).toMatchObject({
      role: 'user',
      content: 'hello attachment',
      metadata: {
        attachments: [
          {
            source: 'uploaded',
            fileName: 'notes.md',
            storageKey: 'conversation-5/uploads/notes.md',
            url: 'https://cdn.example.com/notes.md',
          },
        ],
      },
    });
  });

  it('stores input attachments in engine state and uses them when send input omits attachments', async () => {
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) =>
      createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        { type: 'stream.completed', conversationId: input.conversationId },
      ])
    );

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-5-input-files',
          },
        };
      },
      send: providerSend,
    };

    const engine = createChatKitEngine({ provider });

    engine.setInputFiles({
      attachments: [
        {
          source: 'uploaded',
          fileName: 'brief.md',
          fileId: 'file-1',
          storageKey: 'brief-storage-key',
        },
      ],
    });

    expect(engine.getState().inputAttachments).toEqual([
      {
        source: 'uploaded',
        fileName: 'brief.md',
        fileId: 'file-1',
        storageKey: 'brief-storage-key',
      },
    ]);

    await engine.send({
      text: 'use the selected file',
    });

    expect(providerSend).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-5-input-files',
        attachments: [
          expect.objectContaining({
            source: 'uploaded',
            fileName: 'brief.md',
            fileId: 'file-1',
            storageKey: 'brief-storage-key',
          }),
        ],
      })
    );
    expect(engine.getState().inputAttachments).toEqual([]);
  });

  it('uploads files into the temporary area without clearing them during later sends', async () => {
    const uploadFile = vi.fn(async () => ({
      fileName: 'playbook.md',
      storageKey: 'temporary-area/playbook.md',
      temporaryAreaId: 'temporary-area-1',
      url: 'https://cdn.example.com/playbook.md',
    }));
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) =>
      createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        { type: 'stream.completed', conversationId: input.conversationId },
      ])
    );

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-temp-area-1',
          },
        };
      },
      send: providerSend,
    };

    const engine = createChatKitEngine({
      provider,
      providerName: 'dip',
      hostAdapter: {
        uploadFile,
      },
    });

    await engine.uploadTemporaryFiles({
      attachments: [
        {
          source: 'local',
          fileName: 'playbook.md',
          content: '# playbook',
        },
      ],
      mode: 'append',
    });

    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(engine.getState().temporaryAttachments).toEqual([
      {
        source: 'uploaded',
        fileName: 'playbook.md',
        storageKey: 'temporary-area/playbook.md',
        temporaryAreaId: 'temporary-area-1',
        url: 'https://cdn.example.com/playbook.md',
        fileId: undefined,
        contentType: undefined,
        size: undefined,
        metadata: undefined,
      },
    ]);

    engine.setInputFiles({
      attachments: engine.getState().temporaryAttachments,
    });
    await engine.send({
      text: 'use the temporary file',
    });

    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(providerSend).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-temp-area-1',
        temporaryAreaId: 'temporary-area-1',
        attachments: [
          expect.objectContaining({
            source: 'uploaded',
            fileName: 'playbook.md',
            storageKey: 'temporary-area/playbook.md',
            temporaryAreaId: 'temporary-area-1',
          }),
        ],
      })
    );
    expect(engine.getState().temporaryAttachments).toEqual([
      expect.objectContaining({
        source: 'uploaded',
        fileName: 'playbook.md',
        storageKey: 'temporary-area/playbook.md',
      }),
    ]);
  });

  it('does not append a duplicate user message when regenerate ids are provided', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-6',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-6' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-6',
              role: 'assistant',
              content: 'Regenerated answer',
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-6' },
        ]);
      },
    };

    const engine = createChatKitEngine({ provider });

    const result = await engine.send({
      text: 'repeat',
      regenerateAssistantMessageId: 'assistant-previous',
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      id: 'assistant-6',
      content: 'Regenerated answer',
      status: 'done',
    });
  });

  it('does not append a duplicate user message when resuming an interrupted assistant turn', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-interrupt-resume-1',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-interrupt-resume-1' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-interrupt-resume-1',
              role: 'assistant',
              content: 'Resumed answer',
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-interrupt-resume-1' },
        ]);
      },
    };

    const engine = createChatKitEngine({ provider });

    const result = await engine.send({
      text: '',
      interrupt: {
        handle: {
          run_id: 'run-interrupt-1',
        },
        data: {
          tool_name: 'execute_command',
        },
        action: 'skip',
        interruptedAssistantMessageId: 'assistant-interrupt-previous-1',
      },
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      id: 'assistant-interrupt-resume-1',
      content: 'Resumed answer',
      status: 'done',
    });
  });

  it('replaces the optimistic user id with the server user_message_id when provider metadata includes it', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-7',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-7' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-7',
              role: 'assistant',
              content: 'Server answer',
              metadata: {
                responseMessageIds: {
                  userMessageId: 'server-user-7',
                  assistantMessageId: 'assistant-7',
                },
              },
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-7' },
        ]);
      },
    };

    const engine = createChatKitEngine({ provider });
    const result = await engine.send({ text: 'sync ids' });

    expect(result.messages[0]).toMatchObject({
      id: 'server-user-7',
      role: 'user',
      content: 'sync ids',
      metadata: {
        messageIdentity: {
          source: 'server',
        },
      },
    });
  });

  it('merges listed conversations into state and returns the fetched page', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-list-created',
          },
        };
      },
      async listConversations() {
        return [
          {
            id: 'conversation-list-1',
            title: 'Conversation 1',
          },
          {
            id: 'conversation-list-2',
            title: 'Conversation 2',
          },
        ];
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    const engine = createChatKitEngine({ provider });
    await engine.createConversation({ title: 'Created conversation' });

    const listed = await engine.listConversations();

    expect(listed).toEqual([
      {
        id: 'conversation-list-1',
        title: 'Conversation 1',
      },
      {
        id: 'conversation-list-2',
        title: 'Conversation 2',
      },
    ]);
    expect(engine.getState().conversations).toMatchObject({
      'conversation-list-created': {
        id: 'conversation-list-created',
      },
      'conversation-list-1': {
        id: 'conversation-list-1',
        title: 'Conversation 1',
      },
      'conversation-list-2': {
        id: 'conversation-list-2',
        title: 'Conversation 2',
      },
    });
  });

  it('replaces cached conversations when listConversations is called with replace=true', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-list-replace-created',
          },
        };
      },
      async listConversations(input) {
        expect(input).toEqual({
          page: 1,
          size: 10,
          replace: true,
        });
        return [
          {
            id: 'conversation-list-replace-1',
            title: 'Fresh Conversation',
          },
        ];
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    const engine = createChatKitEngine({ provider });
    await engine.createConversation({ title: 'Stale Conversation' });

    const listed = await engine.listConversations({
      page: 1,
      size: 10,
      replace: true,
    });

    expect(listed).toEqual([
      {
        id: 'conversation-list-replace-1',
        title: 'Fresh Conversation',
      },
    ]);
    expect(engine.getState().conversations).toEqual({
      'conversation-list-replace-1': {
        id: 'conversation-list-replace-1',
        title: 'Fresh Conversation',
      },
    });
  });

  it('loads conversation history into state and emits conversationChanged', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-history-created',
          },
        };
      },
      async getConversationMessages(input) {
        expect(input).toEqual({
          conversationId: 'conversation-history-1',
        });
        return [
          {
            id: 'history-user-1',
            role: 'user',
            content: '历史问题',
          },
          {
            id: 'history-assistant-1',
            role: 'assistant',
            content: '历史回答',
            metadata: {
              thinking: '先整理上下文',
            },
          },
        ];
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    const engine = createChatKitEngine({ provider });
    const changedConversationIds: Array<string | undefined> = [];
    engine.on('conversationChanged', payload => {
      changedConversationIds.push(payload.conversationId);
    });

    const result = await engine.loadConversation({
      conversationId: 'conversation-history-1',
    });

    expect(result.currentConversationId).toBe('conversation-history-1');
    expect(result.messages).toEqual([
      {
        id: 'history-user-1',
        role: 'user',
        content: '历史问题',
        status: 'done',
      },
      {
        id: 'history-assistant-1',
        role: 'assistant',
        content: '历史回答',
        status: 'done',
        metadata: {
          thinking: '先整理上下文',
        },
      },
    ]);
    expect(result.conversations['conversation-history-1']).toEqual({
      id: 'conversation-history-1',
      unread: false,
    });
    expect(changedConversationIds).toEqual(['conversation-history-1']);
  });

  it('marks a loaded conversation as read and resumes processing conversations when provider metadata requests recovery', async () => {
    const markConversationRead = vi.fn(async () => undefined);
    const recoverConversation = vi.fn((input: { conversationId: string }) =>
      createAsyncIterable([
        {
          type: 'stream.started',
          conversationId: input.conversationId,
        },
        {
          type: 'message.delta',
          message: {
            id: 'history-assistant-processing-1',
            role: 'assistant',
            content: 'ial answer',
          },
        },
        {
          type: 'message.completed',
          messageId: 'history-assistant-processing-1',
        },
        {
          type: 'stream.completed',
          conversationId: input.conversationId,
        },
      ])
    );

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-history-created-2',
          },
        };
      },
      async getConversationMessages(input) {
        expect(input).toEqual({
          conversationId: 'conversation-history-processing-1',
        });

        return {
          messages: [
            {
              id: 'history-user-processing-1',
              role: 'user',
              content: 'resume this run',
            },
            {
              id: 'history-assistant-processing-1',
              role: 'assistant',
              content: 'Part',
            },
          ],
          recoverConversation: true,
          readMessageIndex: 1,
          messageIndex: 2,
          conversation: {
            id: 'conversation-history-processing-1',
            title: 'Recoverable conversation',
            unread: true,
          },
        };
      },
      recoverConversation,
      markConversationRead,
      send() {
        return createAsyncIterable([]);
      },
    };

    const engine = createChatKitEngine({ provider });
    const result = await engine.loadConversation({
      conversationId: 'conversation-history-processing-1',
    });

    expect(markConversationRead).toHaveBeenCalledWith({
      conversationId: 'conversation-history-processing-1',
      messageIndex: 2,
      signal: undefined,
    });
    expect(recoverConversation).toHaveBeenCalledWith({
      conversationId: 'conversation-history-processing-1',
      signal: undefined,
    });
    expect(result.messages).toEqual([
      {
        id: 'history-user-processing-1',
        role: 'user',
        content: 'resume this run',
        status: 'done',
      },
      {
        id: 'history-assistant-processing-1',
        role: 'assistant',
        content: 'Partial answer',
        status: 'done',
      },
    ]);
    expect(result.conversations['conversation-history-processing-1']).toEqual({
      id: 'conversation-history-processing-1',
      title: 'Recoverable conversation',
      unread: false,
      readMessageIndex: 2,
      messageIndex: 2,
    });
  });

  it('exposes explicit recoverConversation and markConversationRead commands for custom UIs', async () => {
    const recoverConversation = vi.fn((input: { conversationId: string }) =>
      createAsyncIterable([
        {
          type: 'stream.started',
          conversationId: input.conversationId,
        },
        {
          type: 'message.delta',
          message: {
            id: 'assistant-explicit-recover-1',
            role: 'assistant',
            content: 'Recovered',
          },
        },
        {
          type: 'stream.completed',
          conversationId: input.conversationId,
        },
      ])
    );
    const markConversationRead = vi.fn(async () => undefined);

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-explicit-recover-1',
          },
        };
      },
      async getConversationMessages() {
        return {
          messages: [
            {
              id: 'history-explicit-recover-user-1',
              role: 'user',
              content: 'resume me',
            },
          ],
          conversation: {
            id: 'conversation-explicit-recover-1',
            title: 'Explicit recovery',
            messageIndex: 3,
            readMessageIndex: 1,
            unread: true,
          },
          messageIndex: 3,
          readMessageIndex: 1,
          recoverConversation: false,
        };
      },
      recoverConversation,
      markConversationRead,
      send() {
        return createAsyncIterable([]);
      },
    };

    const engine = createChatKitEngine({ provider });
    await engine.loadConversation({
      conversationId: 'conversation-explicit-recover-1',
    });
    const recovered = await engine.recoverConversation({
      conversationId: 'conversation-explicit-recover-1',
    });
    const marked = await engine.markConversationRead({
      conversationId: 'conversation-explicit-recover-1',
    });

    expect(recoverConversation).toHaveBeenCalledWith({
      conversationId: 'conversation-explicit-recover-1',
      signal: undefined,
    });
    expect(markConversationRead).toHaveBeenCalledWith({
      conversationId: 'conversation-explicit-recover-1',
      messageIndex: 3,
      signal: undefined,
    });
    expect(recovered.messages.at(-1)).toMatchObject({
      id: 'assistant-explicit-recover-1',
      content: 'Recovered',
      status: 'done',
    });
    expect(marked.conversations['conversation-explicit-recover-1']).toMatchObject({
      unread: false,
      readMessageIndex: 3,
      messageIndex: 3,
    });
  });

  it('tracks conversation session status and auto-refreshes it before expiry', async () => {
    vi.useFakeTimers();

    const getConversationSessionStatus = vi.fn(async () => ({
      status: 'active' as const,
      ttlSeconds: 10,
    }));
    const recoverConversationSession = vi.fn(async () => ({
      status: 'active' as const,
      ttlSeconds: 120,
    }));

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-session-1',
          },
        };
      },
      getConversationSessionStatus,
      recoverConversationSession,
      send() {
        return createAsyncIterable([]);
      },
    };

    try {
      const engine = createChatKitEngine({ provider });
      await engine.createConversation();

      expect(getConversationSessionStatus).toHaveBeenCalledWith({
        conversationId: 'conversation-session-1',
        signal: undefined,
      });
      expect(engine.getState().conversationSession).toMatchObject({
        status: 'active',
        ttlSeconds: 10,
      });

      await vi.advanceTimersByTimeAsync(1_000);

      expect(recoverConversationSession).toHaveBeenCalledWith({
        conversationId: 'conversation-session-1',
        signal: undefined,
      });
      expect(engine.getState().conversationSession).toMatchObject({
        status: 'active',
        ttlSeconds: 120,
      });
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it('exposes explicit conversation session status commands for custom UIs', async () => {
    const getConversationSessionStatus = vi.fn(async () => ({
      status: 'active' as const,
      ttlSeconds: 90,
    }));
    const recoverConversationSession = vi.fn(async () => ({
      status: 'active' as const,
      ttlSeconds: 180,
    }));

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-session-explicit-1',
          },
        };
      },
      getConversationSessionStatus,
      recoverConversationSession,
      send() {
        return createAsyncIterable([]);
      },
    };

    const engine = createChatKitEngine({ provider });
    await engine.createConversation();
    const statusState = await engine.getConversationSessionStatus();
    const refreshState = await engine.recoverConversationSession();

    expect(getConversationSessionStatus).toHaveBeenLastCalledWith({
      conversationId: 'conversation-session-explicit-1',
      signal: undefined,
    });
    expect(recoverConversationSession).toHaveBeenCalledWith({
      conversationId: 'conversation-session-explicit-1',
      signal: undefined,
    });
    expect(statusState.conversationSession).toMatchObject({
      status: 'active',
      ttlSeconds: 90,
    });
    expect(refreshState.conversationSession).toMatchObject({
      status: 'active',
      ttlSeconds: 180,
    });
  });

  it('delegates onboarding info retrieval through the provider when available', async () => {
    const provider: ChatProvider = {
      async getOnboardingInfo() {
        return {
          greeting: 'Welcome aboard',
          description: 'Choose a starter prompt',
          prompts: [
            {
              id: 'starter-1',
              label: 'Explain the architecture',
            },
          ],
        };
      },
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-onboarding-1',
          },
        };
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    const engine = createChatKitEngine({ provider });

    await expect(engine.getOnboardingInfo()).resolves.toEqual({
      greeting: 'Welcome aboard',
      description: 'Choose a starter prompt',
      prompts: [
        {
          id: 'starter-1',
          label: 'Explain the architecture',
        },
      ],
    });
  });

  it('delegates context info retrieval through the provider when available', async () => {
    const provider: ChatProvider = {
      async getContextInfo() {
        return {
          title: 'Assistant Context',
          sections: [
            {
              id: 'knowledge-networks',
              title: 'Knowledge Networks',
              items: [
                {
                  id: 'kn-1',
                  title: 'Order Graph',
                  subtitle: 'Knowledge network',
                },
              ],
            },
          ],
        };
      },
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-context-1',
          },
        };
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    const engine = createChatKitEngine({ provider });

    await expect(engine.getContextInfo()).resolves.toEqual({
      title: 'Assistant Context',
      sections: [
        {
          id: 'knowledge-networks',
          title: 'Knowledge Networks',
          items: [
            {
              id: 'kn-1',
              title: 'Order Graph',
              subtitle: 'Knowledge network',
            },
          ],
        },
      ],
    });
  });

  it('injects application context into state and sends it with the next user message', async () => {
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) =>
      createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        { type: 'stream.completed', conversationId: input.conversationId },
      ])
    );
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-context-send-1',
          },
        };
      },
      send: providerSend,
    };

    const engine = createChatKitEngine({ provider });

    engine.injectApplicationContext({
      title: '故障节点',
      data: {
        node_id: 'node-uuid-1',
      },
    });

    const result = await engine.send({
      text: '分析这个节点',
    });

    expect(providerSend).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-context-send-1',
        text: '分析这个节点',
        applicationContext: {
          title: '故障节点',
          data: {
            node_id: 'node-uuid-1',
          },
        },
      })
    );
    expect(result.applicationContext).toEqual({
      title: '故障节点',
      data: {
        node_id: 'node-uuid-1',
      },
    });
    expect(result.messages[0]).toMatchObject({
      role: 'user',
      content: '分析这个节点',
      applicationContext: {
        title: '故障节点',
        data: {
          node_id: 'node-uuid-1',
        },
      },
    });
  });

  it('restores the default application context when removeApplicationContext or createConversation is called', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-context-default-1',
          },
        };
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    const engine = createChatKitEngine({
      provider,
      defaultApplicationContext: {
        title: '默认上下文',
        data: {
          node_id: 'default-node',
        },
      },
    });

    engine.injectApplicationContext({
      title: '临时上下文',
      data: {
        node_id: 'temp-node',
      },
    });

    expect(engine.getState().applicationContext).toEqual({
      title: '临时上下文',
      data: {
        node_id: 'temp-node',
      },
    });

    const removed = engine.removeApplicationContext();
    expect(removed.applicationContext).toEqual({
      title: '默认上下文',
      data: {
        node_id: 'default-node',
      },
    });

    engine.injectApplicationContext({
      title: '另一个临时上下文',
      data: {
        node_id: 'temp-node-2',
      },
    });

    const recreated = await engine.createConversation();
    expect(recreated.applicationContext).toEqual({
      title: '默认上下文',
      data: {
        node_id: 'default-node',
      },
    });
  });

  it('renames a conversation through the provider and updates local state', async () => {
    const updatedInputs: Array<{ conversationId: string; title: string }> = [];
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-rename-1',
            title: 'Before rename',
          },
        };
      },
      async updateConversation(input) {
        updatedInputs.push({
          conversationId: input.conversationId,
          title: input.title,
        });
        return {
          id: input.conversationId,
          title: input.title,
        };
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    const engine = createChatKitEngine({ provider });
    await engine.createConversation({ title: 'Before rename' });

    const result = await engine.renameConversation({
      conversationId: 'conversation-rename-1',
      title: 'After rename',
    });

    expect(updatedInputs).toEqual([
      {
        conversationId: 'conversation-rename-1',
        title: 'After rename',
      },
    ]);
    expect(result.conversations['conversation-rename-1']).toEqual({
      id: 'conversation-rename-1',
      title: 'After rename',
    });
  });

  it('deletes the current conversation through the provider and clears local runtime state', async () => {
    const deletedConversationIds: string[] = [];
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-delete-1',
            title: 'Delete me',
          },
        };
      },
      async deleteConversation(input) {
        deletedConversationIds.push(input.conversationId);
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-delete-1' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-delete-1',
              role: 'assistant',
              content: 'temporary answer',
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-delete-1' },
        ]);
      },
    };

    const engine = createChatKitEngine({ provider });
    await engine.send({ text: 'delete conversation' });

    const changedConversationIds: Array<string | undefined> = [];
    engine.on('conversationChanged', payload => {
      changedConversationIds.push(payload.conversationId);
    });

    const result = await engine.deleteConversation({
      conversationId: 'conversation-delete-1',
    });

    expect(deletedConversationIds).toEqual(['conversation-delete-1']);
    expect(result.currentConversationId).toBeUndefined();
    expect(result.messages).toEqual([]);
    expect(result.conversations['conversation-delete-1']).toBeUndefined();
    expect(changedConversationIds).toContain(undefined);
  });

  it('updates a local message and truncates following messages for user-side regeneration flows', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-edit-1',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-edit-1' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-edit-1',
              role: 'assistant',
              content: 'Original answer',
              metadata: {
                responseMessageIds: {
                  userMessageId: 'server-user-edit-1',
                },
              },
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-edit-1' },
        ]);
      },
    };

    const engine = createChatKitEngine({ provider });
    await engine.send({ text: 'original question' });

    const updated = engine.updateMessage({
      conversationId: 'conversation-edit-1',
      messageId: 'server-user-edit-1',
      content: 'edited question',
    });
    const truncated = engine.truncateMessages({
      conversationId: 'conversation-edit-1',
      fromMessageId: 'server-user-edit-1',
      inclusive: false,
    });

    expect(updated.messages[0]).toMatchObject({
      id: 'server-user-edit-1',
      role: 'user',
      content: 'edited question',
    });
    expect(truncated.messages).toEqual([
      expect.objectContaining({
        id: 'server-user-edit-1',
        role: 'user',
        content: 'edited question',
      }),
    ]);
  });

  it('submits message feedback through the provider and stores the latest selection on the message', async () => {
    const feedbackCalls: Array<{ conversationId?: string; messageId: string; feedback: 'upvote' | 'downvote' }> = [];
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-feedback-1',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-feedback-1' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-feedback-1',
              role: 'assistant',
              content: 'Please leave feedback',
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-feedback-1' },
        ]);
      },
      async submitMessageFeedback(input) {
        feedbackCalls.push({
          conversationId: input.conversationId,
          messageId: input.messageId,
          feedback: input.feedback,
        });
      },
    };

    const engine = createChatKitEngine({ provider });
    await engine.send({ text: 'feedback me' });

    const result = await engine.submitMessageFeedback({
      conversationId: 'conversation-feedback-1',
      messageId: 'assistant-feedback-1',
      feedback: 'upvote',
    });

    expect(feedbackCalls).toEqual([
      {
        conversationId: 'conversation-feedback-1',
        messageId: 'assistant-feedback-1',
        feedback: 'upvote',
      },
    ]);
    expect(result.messages.find(message => message.id === 'assistant-feedback-1')?.metadata?.feedback).toBe('upvote');
  });
});
