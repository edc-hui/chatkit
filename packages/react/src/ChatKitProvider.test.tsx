// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ChatProvider, ProviderEvent } from '@kweaver-ai/chatkit-core';

import { Assistant } from './Assistant.js';
import { ChatKitProvider, useChatKit } from './ChatKitProvider.js';
import { Copilot } from './Copilot.js';
import { DebuggerPanel } from './DebuggerPanel.js';
import type { ChatKitRef } from './imperative.js';

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
});

describe('ChatKitProvider + Assistant', () => {
  it('renders provider output through the React adapter', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-1',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-react-1' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-react-1',
              role: 'assistant',
              content: 'Hello **React**',
            },
          },
          { type: 'message.completed', messageId: 'assistant-react-1' },
          { type: 'stream.completed', conversationId: 'conversation-react-1' },
        ]);
      },
    };

    function AutoSend() {
      const { useEffect } = React;
      const { commands } = useChatKit();

      useEffect(() => {
        void commands.send({ text: 'hello' });
      }, [commands]);

      return null;
    }

    render(
      <ChatKitProvider provider={provider} locale="zh-CN">
        <AutoSend />
        <Assistant />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Hello React');
    });

    expect(document.body.textContent).toContain('准备好接收下一个问题');
    expect(document.body.textContent).toContain('新建会话');
  });

  it('renders a closable Copilot shell', async () => {
    const handleClose = vi.fn();
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-copilot-1',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-react-copilot-1' },
          { type: 'stream.completed', conversationId: 'conversation-react-copilot-1' },
        ]);
      },
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Copilot onClose={handleClose} />
      </ChatKitProvider>
    );

    expect(document.body.textContent).toContain('Copilot');
    fireEvent.click(screen.getByRole('button', { name: 'Close copilot' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('uploads selected files before sending through the React Assistant', async () => {
    const uploadFile = vi.fn(async () => ({
      fileName: 'notes.md',
      url: 'https://cdn.example.com/notes.md',
      storageKey: 'conversation-react-2/uploads/notes.md',
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
            id: 'conversation-react-2',
          },
        };
      },
      send: providerSend,
    };

    const { container } = render(
      <ChatKitProvider provider={provider} providerName="dip" hostAdapter={{ uploadFile }} locale="en-US">
        <Assistant allowAttachments />
      </ChatKitProvider>
    );

    const fileInputs = Array.from(container.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    const fileInput = fileInputs.at(-1) ?? null;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput!, {
      target: {
        files: [new File(['# notes'], 'notes.md', { type: 'text/markdown' })],
      },
    });
    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'please review the attachment',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalled();
      expect(providerSend).toHaveBeenCalled();
    });

    expect(uploadFile).toHaveBeenCalledWith({
      provider: 'dip',
      conversationId: 'conversation-react-2',
      fileName: 'notes.md',
      content: expect.any(File),
      contentType: 'text/markdown',
      purpose: undefined,
      metadata: {
        size: 7,
        lastModified: expect.any(Number),
      },
    });
    expect(providerSend).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-react-2',
        text: 'please review the attachment',
        attachments: [
          {
            source: 'uploaded',
            fileName: 'notes.md',
            url: 'https://cdn.example.com/notes.md',
            storageKey: 'conversation-react-2/uploads/notes.md',
            fileId: undefined,
            contentType: undefined,
            size: undefined,
            metadata: undefined,
          },
        ],
      })
    );
    expect(document.body.textContent).toContain('Files');
    expect(document.body.textContent).toContain('Uploaded');
    expect(document.body.textContent).toContain('Used 1 times');
    expect(screen.getAllByText('notes.md').length).toBeGreaterThan(0);
  });

  it('injects a default application context through the Assistant and sends it with the user message', async () => {
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) =>
      createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        {
          type: 'message.snapshot',
          message: {
            id: 'assistant-react-context-send-1',
            role: 'assistant',
            content: 'Context received',
          },
        },
        { type: 'stream.completed', conversationId: input.conversationId },
      ])
    );

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-context-send-1',
          },
        };
      },
      send: providerSend,
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant
          defaultApplicationContext={{
            title: 'Fault Node',
            data: {
              node_id: 'node-uuid-1',
            },
          }}
        />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Fault Node');
    });

    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'analyze this node',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conversation-react-context-send-1',
          text: 'analyze this node',
          applicationContext: {
            title: 'Fault Node',
            data: {
              node_id: 'node-uuid-1',
            },
          },
        })
      );
      expect(document.body.textContent).toContain('Context: Fault Node');
    });
  });

  it('exposes an imperative ref API compatible with existing React integrations', async () => {
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
            id: 'conversation-react-ref-1',
          },
        };
      },
      async listConversations() {
        return [
          {
            id: 'conversation-react-ref-1',
            title: 'Ref Conversation',
          },
        ];
      },
      send: providerSend,
    };

    const assistantRef = React.createRef<ChatKitRef>();

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant ref={assistantRef} allowAttachments />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(assistantRef.current).not.toBeNull();
    });

    assistantRef.current?.injectApplicationContext({
      title: 'Ref Context',
      data: {
        node_id: 'node-ref-1',
      },
    });
    assistantRef.current?.setInputFiles([
      {
        source: 'uploaded',
        fileName: 'brief.md',
        fileId: 'brief-ref-file',
      },
    ]);

    await assistantRef.current!.send('send from ref');

    expect(providerSend).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-react-ref-1',
        text: 'send from ref',
        applicationContext: {
          title: 'Ref Context',
          data: {
            node_id: 'node-ref-1',
          },
        },
        attachments: [
          {
            source: 'uploaded',
            fileName: 'brief.md',
            fileId: 'brief-ref-file',
          },
        ],
      })
    );

    await expect(assistantRef.current!.getConversations(1, 10)).resolves.toEqual([
      {
        id: 'conversation-react-ref-1',
        title: 'Ref Conversation',
      },
    ]);
  });

  it('shows conversation session status and allows refreshing it from the Assistant shell', async () => {
    const getConversationSessionStatus = vi.fn(async () => ({
      status: 'active' as const,
      ttlSeconds: 120,
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    }));
    const recoverConversationSession = vi.fn(async () => ({
      status: 'active' as const,
      ttlSeconds: 240,
      expiresAt: new Date(Date.now() + 240_000).toISOString(),
    }));
    const assistantRef = React.createRef<ChatKitRef>();
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-session-1',
          },
        };
      },
      getConversationSessionStatus,
      recoverConversationSession,
      send() {
        return createAsyncIterable([]);
      },
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant ref={assistantRef} />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(assistantRef.current).not.toBeNull();
    });
    await assistantRef.current!.createConversation();

    await waitFor(() => {
      expect(getConversationSessionStatus).toHaveBeenCalledWith({
        conversationId: 'conversation-react-session-1',
        signal: undefined,
      });
      expect(document.body.textContent).toContain('Session active');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh session' }));

    await waitFor(() => {
      expect(recoverConversationSession).toHaveBeenCalledWith({
        conversationId: 'conversation-react-session-1',
        signal: undefined,
      });
    });

    await expect(assistantRef.current?.getConversationSessionStatus()).resolves.toMatchObject({
      conversationSession: {
        status: 'active',
      },
    });
    await expect(assistantRef.current?.recoverConversationSession()).resolves.toMatchObject({
      conversationSession: {
        status: 'active',
      },
    });
  });

  it('reuses uploaded conversation files without uploading them again', async () => {
    let sendCount = 0;
    const uploadFile = vi.fn(async () => ({
      fileName: 'notes.md',
      url: 'https://cdn.example.com/notes.md',
      storageKey: 'conversation-react-reuse-1/uploads/notes.md',
    }));
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) => {
      sendCount += 1;
      const assistantMessageId = sendCount === 1 ? 'assistant-react-reuse-1' : 'assistant-react-reuse-2';
      const content = sendCount === 1 ? 'Uploaded once' : 'Reused existing file';

      return createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        {
          type: 'message.snapshot',
          message: {
            id: assistantMessageId,
            role: 'assistant',
            content,
          },
        },
        { type: 'stream.completed', conversationId: input.conversationId },
      ]);
    });

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-reuse-1',
          },
        };
      },
      send: providerSend,
    };

    const { container } = render(
      <ChatKitProvider provider={provider} providerName="dip" hostAdapter={{ uploadFile }} locale="en-US">
        <Assistant allowAttachments />
      </ChatKitProvider>
    );

    const fileInputs = Array.from(container.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    const fileInput = fileInputs.at(-1) ?? null;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput!, {
      target: {
        files: [new File(['# notes'], 'notes.md', { type: 'text/markdown' })],
      },
    });
    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'first pass',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('Uploaded once');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reuse file' }));
    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'reuse it',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalledTimes(2);
    });

    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(providerSend).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        conversationId: 'conversation-react-reuse-1',
        text: 'reuse it',
        attachments: [
          {
            source: 'uploaded',
            fileName: 'notes.md',
            url: 'https://cdn.example.com/notes.md',
            storageKey: 'conversation-react-reuse-1/uploads/notes.md',
            fileId: undefined,
            contentType: undefined,
            size: undefined,
            metadata: undefined,
          },
        ],
      })
    );
  });

  it('uploads files into the temporary area and sends them without re-uploading', async () => {
    const uploadFile = vi.fn(async () => ({
      fileName: 'temp-notes.md',
      url: 'https://cdn.example.com/temp-notes.md',
      storageKey: 'temporary-area/temp-notes.md',
      temporaryAreaId: 'temporary-area-1',
    }));
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) =>
      createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        {
          type: 'message.snapshot',
          message: {
            id: 'assistant-react-temp-area-1',
            role: 'assistant',
            content: 'Temporary area sent',
          },
        },
        { type: 'stream.completed', conversationId: input.conversationId },
      ])
    );

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-temp-area-1',
          },
        };
      },
      send: providerSend,
    };

    const { container } = render(
      <ChatKitProvider provider={provider} providerName="dip" hostAdapter={{ uploadFile }} locale="en-US">
        <Assistant allowAttachments />
      </ChatKitProvider>
    );

    const fileInputs = Array.from(container.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    expect(fileInputs.length).toBeGreaterThanOrEqual(2);

    fireEvent.change(fileInputs[0]!, {
      target: {
        files: [new File(['# temp notes'], 'temp-notes.md', { type: 'text/markdown' })],
      },
    });

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toContain('Temporary area');
      expect(document.body.textContent).toContain('temp-notes.md');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select for send' }));
    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'send from temp area',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toContain('Temporary area sent');
    });

    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(providerSend).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-react-temp-area-1',
        text: 'send from temp area',
        temporaryAreaId: 'temporary-area-1',
        attachments: [
          expect.objectContaining({
            source: 'uploaded',
            fileName: 'temp-notes.md',
            storageKey: 'temporary-area/temp-notes.md',
            temporaryAreaId: 'temporary-area-1',
          }),
        ],
      })
    );
  });

  it('clears reused uploaded files after switching to another conversation', async () => {
    let sendCount = 0;
    const uploadFile = vi.fn(async () => ({
      fileName: 'notes.md',
      url: 'https://cdn.example.com/notes.md',
      storageKey: 'conversation-react-reuse-clear-1/uploads/notes.md',
    }));
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) => {
      sendCount += 1;
      const assistantMessageId = `assistant-react-reuse-clear-${sendCount}`;

      return createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        {
          type: 'message.snapshot',
          message: {
            id: assistantMessageId,
            role: 'assistant',
            content: sendCount === 1 ? 'First conversation upload complete' : 'Second conversation clean send',
          },
        },
        { type: 'stream.completed', conversationId: input.conversationId },
      ]);
    });

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-reuse-clear-1',
            title: 'Conversation A',
          },
        };
      },
      async listConversations() {
        return [
          {
            id: 'conversation-react-reuse-clear-1',
            title: 'Conversation A',
          },
          {
            id: 'conversation-react-reuse-clear-2',
            title: 'Conversation B',
          },
        ];
      },
      async getConversationMessages(input) {
        if (input.conversationId === 'conversation-react-reuse-clear-2') {
          return [
            {
              id: 'history-react-reuse-clear-2',
              role: 'assistant',
              content: 'Conversation B loaded',
            },
          ];
        }

        return [];
      },
      send: providerSend,
    };

    const { container } = render(
      <ChatKitProvider provider={provider} providerName="dip" hostAdapter={{ uploadFile }} locale="en-US">
        <Assistant allowAttachments showConversations />
      </ChatKitProvider>
    );

    const fileInputs = Array.from(container.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    const fileInput = fileInputs.at(-1) ?? null;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput!, {
      target: {
        files: [new File(['# notes'], 'notes.md', { type: 'text/markdown' })],
      },
    });
    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'first conversation upload',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('First conversation upload complete');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reuse file' }));
    expect(document.body.textContent).toContain('notes.md');

    fireEvent.click(screen.getByRole('button', { name: /Conversation B/i }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('Conversation B loaded');
    });

    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'second conversation send',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalledTimes(2);
    });

    expect(providerSend).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        conversationId: 'conversation-react-reuse-clear-2',
        text: 'second conversation send',
      })
    );
    expect(providerSend.mock.calls[1]?.[0]?.attachments).toBeUndefined();
  });

  it('allows removing a reused file before the next send', async () => {
    const uploadFile = vi.fn(async () => ({
      fileName: 'notes.md',
      url: 'https://cdn.example.com/notes.md',
      storageKey: 'conversation-react-reuse-remove-1/uploads/notes.md',
    }));
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) =>
      createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        {
          type: 'message.snapshot',
          message: {
            id: `assistant-react-reuse-remove-${providerSend.mock.calls.length}`,
            role: 'assistant',
            content: 'Done',
          },
        },
        { type: 'stream.completed', conversationId: input.conversationId },
      ])
    );

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-reuse-remove-1',
          },
        };
      },
      send: providerSend,
    };

    const { container } = render(
      <ChatKitProvider provider={provider} providerName="dip" hostAdapter={{ uploadFile }} locale="en-US">
        <Assistant allowAttachments />
      </ChatKitProvider>
    );

    const fileInputs = Array.from(container.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    const fileInput = fileInputs.at(-1) ?? null;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput!, {
      target: {
        files: [new File(['# notes'], 'notes.md', { type: 'text/markdown' })],
      },
    });
    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'seed conversation files',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reuse file' }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('Selected for next send');
      expect(screen.getByRole('button', { name: 'Remove reuse' })).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove reuse' }));

    await waitFor(() => {
      expect(document.body.textContent).not.toContain('Selected for next send');
    });

    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'send without reused file',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalledTimes(2);
    });

    expect(providerSend.mock.calls[1]?.[0]?.attachments).toBeUndefined();
  });

  it('passes deepThink through the React Assistant when enabled', async () => {
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
            id: 'conversation-react-3',
          },
        };
      },
      send: providerSend,
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant allowDeepThink />
      </ChatKitProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Deep Think' }));
    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'think harder',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalled();
    });

    expect(providerSend).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-react-3',
        text: 'think harder',
        deepThink: true,
      })
    );
  });

  it('renders tool cards when provider messages contain toolCalls metadata', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-4',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-react-4' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-react-4',
              role: 'assistant',
              content: 'Tool execution completed.',
              metadata: {
                toolCalls: [
                  {
                    name: 'execute_code',
                    title: 'Code Execution',
                    input: 'print(\"hello\")',
                    output: {
                      stdout: 'hello',
                    },
                  },
                ],
              },
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-react-4' },
        ]);
      },
    };

    function AutoSend() {
      const { useEffect } = React;
      const { commands } = useChatKit();

      useEffect(() => {
        void commands.send({ text: 'run code' });
      }, [commands]);

      return null;
    }

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <AutoSend />
        <Assistant />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Code Execution');
      expect(document.body.textContent).toContain('hello');
      expect(document.body.textContent).toContain('Tool execution completed.');
    });
  });

  it('renders doc_qa and text2ngql tool cards through the default React renderers', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-5',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-react-5' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-react-5',
              role: 'assistant',
              content: 'Tool preview complete.',
              metadata: {
                toolCalls: [
                  {
                    name: 'doc_qa',
                    title: 'Document QA',
                    input: 'What is ChatKit v2?',
                    output: {
                      htmlText: '<p>ChatKit v2 is framework-free.</p>',
                      cites: [
                        {
                          title: 'Architecture Doc',
                          quote: 'Core is framework-free',
                        },
                      ],
                    },
                  },
                  {
                    name: 'text2ngql',
                    title: 'NGQL Query',
                    input: 'Find related agents',
                    output: {
                      sql: 'MATCH (n)-[:RELATES_TO]->(m) RETURN n.name',
                      tableColumns: ['name'],
                      tableData: [
                        {
                          name: 'Agent A',
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-react-5' },
        ]);
      },
    };

    function AutoSend() {
      const { useEffect } = React;
      const { commands } = useChatKit();

      useEffect(() => {
        void commands.send({ text: 'show tools' });
      }, [commands]);

      return null;
    }

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <AutoSend />
        <Assistant />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Document QA');
      expect(document.body.textContent).toContain('ChatKit v2 is framework-free.');
      expect(document.body.textContent).toContain('Architecture Doc');
      expect(document.body.textContent).toContain('NGQL Query');
      expect(document.body.textContent).toContain('MATCH (n)-[:RELATES_TO]->(m) RETURN n.name');
      expect(document.body.textContent).toContain('Agent A');
    });
  });

  it('renders web_processor tool cards through the default React renderers', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-5b',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-react-5b' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-react-5b',
              role: 'assistant',
              content: 'Web preview complete.',
              metadata: {
                toolCalls: [
                  {
                    name: 'web_processor',
                    title: 'Orders dashboard',
                    output: {
                      title: 'Orders dashboard',
                      url: 'https://example.com/orders/dashboard',
                      size: [1280, 720],
                    },
                  },
                ],
              },
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-react-5b' },
        ]);
      },
    };

    function AutoSend() {
      const { useEffect } = React;
      const { commands } = useChatKit();

      useEffect(() => {
        void commands.send({ text: 'show web preview' });
      }, [commands]);

      return null;
    }

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <AutoSend />
        <Assistant />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Orders dashboard');
      expect(document.body.textContent).toContain('example.com/orders/dashboard');
      expect(screen.getByTitle('Orders dashboard')).toBeTruthy();
    });
  });

  it('renders thinking and timing metrics when provider metadata includes them', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-6',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-react-6' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-react-6',
              role: 'assistant',
              content: 'Final answer',
              metadata: {
                thinking: 'Inspect the provider pipeline before rendering the UI.',
                metrics: {
                  totalTimeSeconds: 3.2,
                  totalTokens: 128,
                  ttftMs: 240,
                },
              },
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-react-6' },
        ]);
      },
    };

    function AutoSend() {
      const { useEffect } = React;
      const { commands } = useChatKit();

      useEffect(() => {
        void commands.send({ text: 'show thinking' });
      }, [commands]);

      return null;
    }

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <AutoSend />
        <Assistant />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Deep Thinking');
      expect(document.body.textContent).toContain('Inspect the provider pipeline before rendering the UI.');
      expect(document.body.textContent).toContain('Time: 3.20 s');
      expect(document.body.textContent).toContain('Tokens: 128');
      expect(document.body.textContent).toContain('TTFT: 240 ms');
    });
  });

  it('renders sandbox tool cards beyond execute_code', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-7',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-react-7' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-react-7',
              role: 'assistant',
              content: 'Sandbox preview complete.',
              metadata: {
                toolCalls: [
                  {
                    name: 'execute_command',
                    title: 'Execute Command',
                    input: 'ls -la',
                    output: {
                      action: 'execute_command',
                      actionMessage: 'Directory listing ready',
                      result: {
                        files: ['README.md', 'src'],
                      },
                    },
                  },
                ],
              },
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-react-7' },
        ]);
      },
    };

    function AutoSend() {
      const { useEffect } = React;
      const { commands } = useChatKit();

      useEffect(() => {
        void commands.send({ text: 'show sandbox tools' });
      }, [commands]);

      return null;
    }

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <AutoSend />
        <Assistant />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Execute Command');
      expect(document.body.textContent).toContain('Directory listing ready');
      expect(document.body.textContent).toContain('"README.md"');
    });
  });

  it('copies assistant message content through the built-in message action', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {
        writeText,
      },
      configurable: true,
    });

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-8',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-react-8' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-react-8',
              role: 'assistant',
              content: 'Copy me',
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-react-8' },
        ]);
      },
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant />
      </ChatKitProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'copy test',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('Copy me');
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Copy' })[1]);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('Copy me');
    });
  });

  it('regenerates the latest assistant message with the previous user prompt, ids, and attachments', async () => {
    let sendCount = 0;
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) => {
      sendCount += 1;
      const assistantId = sendCount === 1 ? 'assistant-react-9' : 'assistant-react-10';
      const content = sendCount === 1 ? 'First answer' : 'Regenerated answer';

      return createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        {
          type: 'message.snapshot',
            message: {
              id: assistantId,
              role: 'assistant',
              content,
              metadata: {
                responseMessageIds: {
                  userMessageId: 'server-user-9',
                  assistantMessageId: assistantId,
                },
              },
            },
          },
          { type: 'stream.completed', conversationId: input.conversationId },
        ]);
    });
    const uploadFile = vi.fn(async () => ({
      fileName: 'requirements.md',
      url: 'https://cdn.example.com/requirements.md',
      storageKey: 'conversation-react-9/uploads/requirements.md',
    }));

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-9',
          },
        };
      },
      send: providerSend,
    };

    render(
      <ChatKitProvider provider={provider} providerName="dip" hostAdapter={{ uploadFile }} locale="en-US">
        <Assistant allowAttachments />
      </ChatKitProvider>
    );

    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    const fileInput = fileInputs.at(-1) ?? null;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput!, {
      target: {
        files: [new File(['requirements'], 'requirements.md', { type: 'text/markdown' })],
      },
    });
    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'show regenerate',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('First answer');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalledTimes(2);
    });

    expect(providerSend).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        conversationId: 'conversation-react-9',
        text: 'show regenerate',
        regenerateUserMessageId: 'server-user-9',
        regenerateAssistantMessageId: 'assistant-react-9',
        attachments: [
          expect.objectContaining({
            source: 'uploaded',
            fileName: 'requirements.md',
            storageKey: 'conversation-react-9/uploads/requirements.md',
          }),
        ],
      })
    );
      expect(document.body.textContent).toContain('Regenerated answer');
    });

    it('edits the latest user message and regenerates from that user message id like DipChat', async () => {
      let sendCount = 0;
      const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) => {
        sendCount += 1;
        const assistantId = sendCount === 1 ? 'assistant-react-edit-1' : 'assistant-react-edit-2';

        return createAsyncIterable([
          { type: 'stream.started', conversationId: input.conversationId },
          {
            type: 'message.snapshot',
            message: {
              id: assistantId,
              role: 'assistant',
              content: sendCount === 1 ? 'Original answer' : 'Edited answer',
              metadata: {
                responseMessageIds: {
                  userMessageId: 'server-user-edit-ui-1',
                  assistantMessageId: assistantId,
                },
              },
            },
          },
          { type: 'stream.completed', conversationId: input.conversationId },
        ]);
      });

      const provider: ChatProvider = {
        async createConversation() {
          return {
            conversation: {
              id: 'conversation-react-edit-ui-1',
            },
          };
        },
        send: providerSend,
      };

      render(
        <ChatKitProvider provider={provider} locale="en-US">
          <Assistant />
        </ChatKitProvider>
      );

      fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
        target: {
          value: 'draft question',
        },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send' }));

      await waitFor(() => {
        expect(document.body.textContent).toContain('Original answer');
      });

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      fireEvent.change(screen.getByDisplayValue('draft question'), {
        target: {
          value: 'edited question',
        },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() => {
        expect(providerSend).toHaveBeenCalledTimes(2);
      });

      expect(providerSend).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          conversationId: 'conversation-react-edit-ui-1',
          text: 'edited question',
          regenerateUserMessageId: 'server-user-edit-ui-1',
        })
      );
      expect(providerSend.mock.calls[1]?.[0]?.regenerateAssistantMessageId).toBeUndefined();

      await waitFor(() => {
        expect(document.body.textContent).toContain('edited question');
        expect(document.body.textContent).toContain('Edited answer');
        expect(document.body.textContent).not.toContain('Original answer');
      });
    });

    it('keeps the original user application context when regenerating an assistant message', async () => {
    let sendCount = 0;
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) => {
      sendCount += 1;
      const assistantId = sendCount === 1 ? 'assistant-react-context-regen-1' : 'assistant-react-context-regen-2';

      return createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        {
          type: 'message.snapshot',
          message: {
            id: assistantId,
            role: 'assistant',
            content: sendCount === 1 ? 'First context answer' : 'Regenerated context answer',
            metadata: {
              responseMessageIds: {
                userMessageId: 'server-user-context-1',
                assistantMessageId: assistantId,
              },
            },
          },
        },
        { type: 'stream.completed', conversationId: input.conversationId },
      ]);
    });

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-context-regen-1',
          },
        };
      },
      send: providerSend,
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant
          defaultApplicationContext={{
            title: 'Fault Node',
            data: {
              node_id: 'node-uuid-2',
            },
          }}
        />
      </ChatKitProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'regenerate with context',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('First context answer');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalledTimes(2);
    });

    expect(providerSend).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        conversationId: 'conversation-react-context-regen-1',
        text: 'regenerate with context',
        applicationContext: {
          title: 'Fault Node',
          data: {
            node_id: 'node-uuid-2',
          },
        },
        regenerateUserMessageId: 'server-user-context-1',
        regenerateAssistantMessageId: 'assistant-react-context-regen-1',
      })
    );
  });

  it('loads conversation history through the built-in Assistant sidebar', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-10',
          },
        };
      },
      async listConversations() {
        return [
          {
            id: 'conversation-history-1',
            title: 'Project recap',
          },
        ];
      },
      async getConversationMessages() {
        return [
          {
            id: 'history-user-react-1',
            role: 'user',
            content: 'What did we finish?',
          },
          {
            id: 'history-assistant-react-1',
            role: 'assistant',
            content: 'We finished the conversation sidebar.',
          },
        ];
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant showConversations />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Conversations');
      expect(document.body.textContent).toContain('Project recap');
    });

    fireEvent.click(screen.getByRole('button', { name: /Project recap/i }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('What did we finish?');
      expect(document.body.textContent).toContain('We finished the conversation sidebar.');
    });
  });

  it('renames and deletes conversations through the built-in Assistant sidebar actions', async () => {
    const deletedConversationIds: string[] = [];
    const updateConversation = vi.fn(async (input: { conversationId: string; title: string }) => ({
      id: input.conversationId,
      title: input.title,
    }));
    const deleteConversation = vi.fn(async (input: { conversationId: string }) => {
      deletedConversationIds.push(input.conversationId);
    });

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-manage-1',
          },
        };
      },
      async listConversations() {
        return [
          {
            id: 'conversation-react-manage-1',
            title: 'Original title',
          },
        ];
      },
      updateConversation,
      deleteConversation,
      send() {
        return createAsyncIterable([]);
      },
    };

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Renamed title');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant showConversations />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Original title');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));

    await waitFor(() => {
      expect(updateConversation).toHaveBeenCalledWith({
        conversationId: 'conversation-react-manage-1',
        title: 'Renamed title',
      });
      expect(document.body.textContent).toContain('Renamed title');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(deleteConversation).toHaveBeenCalledWith({
        conversationId: 'conversation-react-manage-1',
      });
      expect(deletedConversationIds).toEqual(['conversation-react-manage-1']);
      expect(document.body.textContent).not.toContain('Renamed title');
    });

    promptSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it('filters and refreshes conversations through the built-in Assistant sidebar', async () => {
    const listConversations = vi.fn(async () => [
      {
        id: 'conversation-react-filter-1',
        title: 'Architecture recap',
      },
      {
        id: 'conversation-react-filter-2',
        title: 'Billing sync',
      },
    ]);

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-filter-created',
          },
        };
      },
      listConversations,
      send() {
        return createAsyncIterable([]);
      },
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant showConversations />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Architecture recap');
      expect(document.body.textContent).toContain('Billing sync');
    });

    fireEvent.change(screen.getByPlaceholderText('Search conversations'), {
      target: {
        value: 'billing',
      },
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('Billing sync');
      expect(document.body.textContent).not.toContain('Architecture recap');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(listConversations).toHaveBeenCalledTimes(2);
    });
  });

  it('shows conversation status badges and auto-refreshes processing conversations', async () => {
    const listConversations = vi.fn(async () => {
      if (listConversations.mock.calls.length >= 2) {
        return [
          {
            id: 'conversation-react-status-1',
            title: 'Long running sync',
            status: 'completed',
          },
        ];
      }

      return [
        {
          id: 'conversation-react-status-1',
          title: 'Long running sync',
          status: 'processing',
        },
      ];
    });

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-status-created',
          },
        };
      },
      listConversations,
      send() {
        return createAsyncIterable([]);
      },
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant showConversations />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Long running sync');
      expect(document.body.textContent).toContain('In progress');
    });

    await new Promise(resolve => {
      window.setTimeout(resolve, 2200);
    });

    await waitFor(() => {
      expect(listConversations).toHaveBeenCalledTimes(2);
      expect(document.body.textContent).toContain('Completed');
    });
  });

  it('loads more conversations through the built-in Assistant sidebar', async () => {
    const listConversations = vi.fn(async (input?: { page?: number; size?: number; replace?: boolean }) => {
      if (input?.page === 2) {
        return [
          {
            id: 'conversation-react-page-11',
            title: 'Page two conversation',
          },
        ];
      }

      return Array.from({ length: 10 }, (_, index) => ({
        id: `conversation-react-page-${index + 1}`,
        title: `Page one conversation ${index + 1}`,
      }));
    });

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-page-created',
          },
        };
      },
      listConversations,
      send() {
        return createAsyncIterable([]);
      },
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant showConversations />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Page one conversation 10');
      expect(screen.getByRole('button', { name: 'Load more' })).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    await waitFor(() => {
      expect(listConversations).toHaveBeenNthCalledWith(1, {
        page: 1,
        size: 10,
        replace: true,
      });
      expect(listConversations).toHaveBeenNthCalledWith(2, {
        page: 2,
        size: 10,
      });
      expect(document.body.textContent).toContain('Page two conversation');
    });
  });

  it('shows unread conversation summary and opens the history modal from the Assistant shell', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-modal-created',
          },
        };
      },
      async listConversations() {
        return [
          {
            id: 'conversation-react-modal-1',
            title: 'Unread follow-up',
            unread: true,
            readMessageIndex: 2,
            messageIndex: 5,
          },
          {
            id: 'conversation-react-modal-2',
            title: 'Read architecture recap',
            unread: false,
          },
        ];
      },
      async getConversationMessages(input) {
        return [
          {
            id: `history-user-${input.conversationId}`,
            role: 'user',
            content: 'preview this conversation',
          },
        ];
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant showConversations />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('1 unread');
      expect(screen.getByRole('button', { name: 'Open history' })).not.toBeNull();
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open history' }));

    const dialog = await screen.findByRole('dialog', { name: 'All conversations' });
    expect(within(dialog).getByText('Unread follow-up')).not.toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: /Read architecture recap/i }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('preview this conversation');
      expect(screen.queryByRole('dialog', { name: 'All conversations' })).toBeNull();
    });
  });

  it('renders onboarding prompts and sends the selected starter prompt', async () => {
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) =>
      createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        {
          type: 'message.snapshot',
          message: {
            id: 'assistant-react-onboarding-1',
            role: 'assistant',
            content: 'Onboarding prompt sent',
          },
        },
        { type: 'stream.completed', conversationId: input.conversationId },
      ])
    );

    const provider: ChatProvider = {
      async getOnboardingInfo() {
        return {
          greeting: 'Welcome to ChatKit v2',
          description: 'Pick a starter prompt to exercise the provider.',
          prompts: [
            {
              id: 'starter-architecture',
              label: 'Summarize the architecture',
              description: 'Get a quick overview of the current SDK layers.',
            },
          ],
        };
      },
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-onboarding-1',
          },
        };
      },
      send: providerSend,
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Welcome to ChatKit v2');
      expect(document.body.textContent).toContain('Summarize the architecture');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Summarize the architecture' }));

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conversation-react-onboarding-1',
          text: 'Summarize the architecture',
        })
      );
      expect(document.body.textContent).toContain('Onboarding prompt sent');
    });
  });

  it('renders assistant context panels when provider context info is available', async () => {
    const provider: ChatProvider = {
      async getContextInfo() {
        return {
          title: 'Assistant Context',
          description: 'Context linked from the host workspace.',
          sections: [
            {
              id: 'knowledge-networks',
              title: 'Knowledge Networks',
              items: [
                {
                  id: 'kn-1',
                  title: 'Order Graph',
                  subtitle: 'Knowledge network',
                  tags: ['Graph'],
                },
              ],
            },
            {
              id: 'metrics',
              title: 'Metrics',
              items: [
                {
                  id: 'metric-1',
                  title: 'GMV',
                  value: '12',
                  subtitle: 'Bound metric',
                },
              ],
            },
          ],
        };
      },
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-context-1',
          },
        };
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Assistant Context');
      expect(document.body.textContent).toContain('Knowledge Networks');
      expect(document.body.textContent).toContain('Order Graph');
      expect(document.body.textContent).toContain('GMV');
    });
  });

  it('renders related questions on the latest assistant message and sends the selected follow-up question', async () => {
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) => {
      if (providerSend.mock.calls.length === 1) {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: input.conversationId },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-react-related-1',
              role: 'assistant',
              content: 'Primary answer',
              metadata: {
                relatedQuestions: ['Show the provider contract', 'Explain message normalization'],
              },
            },
          },
          { type: 'stream.completed', conversationId: input.conversationId },
        ]);
      }

      return createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        {
          type: 'message.snapshot',
          message: {
            id: 'assistant-react-related-2',
            role: 'assistant',
            content: 'Follow-up answer',
          },
        },
        { type: 'stream.completed', conversationId: input.conversationId },
      ]);
    });

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-related-1',
          },
        };
      },
      send: providerSend,
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant />
      </ChatKitProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'show initial answer',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('Primary answer');
      expect(document.body.textContent).toContain('Show the provider contract');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show the provider contract' }));

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalledTimes(2);
      expect(providerSend).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          conversationId: 'conversation-react-related-1',
          text: 'Show the provider contract',
        })
      );
      expect(document.body.textContent).toContain('Follow-up answer');
    });
  });

  it('opens a workbench-style detail panel for assistant progress data', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-workbench-1',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-react-workbench-1' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-react-workbench-1',
              role: 'assistant',
              content: 'Workbench answer',
              raw: {
                run_id: 'run-workbench-1',
                tool_name: 'doc_qa',
                message: {
                  content: {
                    middle_answer: {
                      progress: [
                        {
                          stage: 'retrieve',
                          agent_name: 'Retriever',
                          status: 'completed',
                          start_time: 1,
                          end_time: 2,
                        },
                        {
                          stage: 'llm',
                          agent_name: 'Answerer',
                          status: 'completed',
                          token_usage: {
                            total_tokens: 42,
                          },
                        },
                      ],
                    },
                  },
                },
              },
              metadata: {
                thinking: 'Collecting sources before answering',
                toolCalls: [
                  {
                    name: 'doc_qa',
                    title: 'Document QA',
                    output: {
                      cites: [
                        {
                          title: 'Architecture Notes',
                          quote: 'The provider emits normalized events.',
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-react-workbench-1' },
        ]);
      },
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant />
      </ChatKitProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'show workbench details',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('Workbench answer');
      expect(document.body.textContent).toContain('Workbench');
      expect(document.body.textContent).toContain('Thinking');
      expect(document.body.textContent).toContain('Tool progress');
      expect(document.body.textContent).toContain('Selected tool');
      expect(document.body.textContent).toContain('Progress stages');
      expect(document.body.textContent).toContain('Selected stage');
      expect(document.body.textContent).toContain('Retriever (retrieve)');
      expect(document.body.textContent).toContain('Answerer (llm)');
      expect(document.body.textContent).toContain('Document QA');
      expect(document.body.textContent).toContain('Raw payload');
      expect(document.body.textContent).toContain('run-workbench-1');
    });
  });

  it('auto-sends the initialQuestion once when the Assistant mounts', async () => {
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) =>
      createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        {
          type: 'message.snapshot',
          message: {
            id: 'assistant-react-initial-1',
            role: 'assistant',
            content: 'Initial question answered',
          },
        },
        { type: 'stream.completed', conversationId: input.conversationId },
      ])
    );

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-initial-1',
          },
        };
      },
      send: providerSend,
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant initialQuestion="show me the initial flow" />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalledTimes(1);
      expect(providerSend).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conversation-react-initial-1',
          text: 'show me the initial flow',
        })
      );
      expect(document.body.textContent).toContain('Initial question answered');
    });
  });

  it('renders the latest provider error inside the built-in Assistant', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-error-1',
          },
        };
      },
      send() {
        return {
          async *[Symbol.asyncIterator]() {
            throw new Error('Upstream provider failed');
          },
        };
      },
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant />
      </ChatKitProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'show error',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('Latest error');
      expect(document.body.textContent).toContain('Message error');
      expect(document.body.textContent).toContain('Upstream provider failed');
    });
  });

  it('submits assistant feedback through the built-in message actions', async () => {
    const submitMessageFeedback = vi.fn(async () => undefined);
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-feedback-1',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-react-feedback-1' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-react-feedback-1',
              role: 'assistant',
              content: 'Feedback ready',
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-react-feedback-1' },
        ]);
      },
      submitMessageFeedback,
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant allowFeedback />
      </ChatKitProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'show feedback',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('Feedback ready');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Helpful' }));

    await waitFor(() => {
      expect(submitMessageFeedback).toHaveBeenCalledWith({
        conversationId: 'conversation-react-feedback-1',
        messageId: 'assistant-react-feedback-1',
        feedback: 'upvote',
      });
    });
  });

  it('renders a debugger panel with recent events and the latest state snapshot', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-debug-1',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-react-debug-1' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-react-debug-1',
              role: 'assistant',
              content: 'Debug payload',
              raw: {
                assistant_message_id: 'assistant-react-debug-1',
                message: {
                  content: {
                    middle_answer: {
                      progress: [
                        {
                          stage: 'skill',
                          agent_name: 'Web Search',
                          status: 'completed',
                          end_time: 2,
                          start_time: 1,
                        },
                        {
                          stage: 'llm',
                          agent_name: 'Planner',
                          status: 'completed',
                          token_usage: {
                            total_tokens: 42,
                          },
                        },
                      ],
                    },
                    final_answer: {
                      answer: {
                        text: 'Debug payload',
                      },
                    },
                  },
                },
              },
            },
          },
          { type: 'stream.completed', conversationId: 'conversation-react-debug-1' },
        ]);
      },
    };

    function AutoSend() {
      const { useEffect } = React;
      const { commands } = useChatKit();

      useEffect(() => {
        void commands.send({ text: 'show debugger' });
      }, [commands]);

      return null;
    }

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <AutoSend />
        <DebuggerPanel maxEvents={12} />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Debugger');
      expect(document.body.textContent).toContain('Command Log');
      expect(document.body.textContent).toContain('Latest Command');
      expect(document.body.textContent).toContain('send');
      expect(document.body.textContent).toContain('Success');
      expect(document.body.textContent).toContain('show debugger');
      expect(document.body.textContent).toContain('streamStarted');
      expect(document.body.textContent).toContain('messageUpdated');
      expect(document.body.textContent).toContain('streamCompleted');
      expect(document.body.textContent).toContain('conversation-react-debug-1');
      expect(document.body.textContent).toContain('Debug payload');
      expect(document.body.textContent).toContain('Latest Raw Message');
      expect(document.body.textContent).toContain('Raw Trace');
      expect(document.body.textContent).toContain('Progress Stages');
      expect(document.body.textContent).toContain('Selected Stage');
      expect(document.body.textContent).toContain('Web Search (skill)');
      expect(document.body.textContent).toContain('Planner (llm)');
      expect(document.body.textContent).toContain('assistant-react-debug-1');
    });
  });

  it('uses terminate semantics for the built-in stop button, matching DipChat behavior', async () => {
    const terminateConversation = vi.fn(async (_input?: unknown) => undefined);
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-stop-terminate-1',
          },
        };
      },
      async terminateConversation(input) {
        await terminateConversation(input);
      },
      send(input) {
        return {
          async *[Symbol.asyncIterator]() {
            yield { type: 'stream.started', conversationId: input.conversationId } satisfies ProviderEvent;
            yield {
              type: 'message.delta',
              message: {
                id: 'assistant-react-stop-terminate-1',
                role: 'assistant',
                content: 'Streaming...',
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

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant />
      </ChatKitProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'please stop this run',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('Streaming...');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

    await waitFor(() => {
      expect(terminateConversation).toHaveBeenCalledWith({
        conversationId: 'conversation-react-stop-terminate-1',
        mode: 'terminate',
        signal: undefined,
      });
    });
  });

  it('invokes terminate from the debugger controls and records the command entry', async () => {
    const terminateConversation = vi.fn(async () => undefined);
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-debug-control-1',
          },
        };
      },
      terminateConversation,
      send() {
        return createAsyncIterable([]);
      },
    };

    function AutoCreateConversation() {
      const { useEffect } = React;
      const { commands } = useChatKit();

      useEffect(() => {
        void commands.createConversation();
      }, [commands]);

      return null;
    }

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <AutoCreateConversation />
        <DebuggerPanel maxEvents={12} />
      </ChatKitProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('conversation-react-debug-control-1');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Terminate' }));

    await waitFor(() => {
      expect(terminateConversation).toHaveBeenCalledWith({
        conversationId: 'conversation-react-debug-control-1',
        mode: 'terminate',
        signal: undefined,
      });
      expect(document.body.textContent).toContain('Controls');
      expect(document.body.textContent).toContain('terminate');
    });
  });

  it('resumes an interrupted assistant turn with DipChat-style confirm/skip actions', async () => {
    let sendCount = 0;
    const providerSend = vi.fn((input: Parameters<ChatProvider['send']>[0]) => {
      sendCount += 1;

      if (sendCount === 1) {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: input.conversationId },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-react-interrupt-1',
              role: 'assistant',
              content: 'Interrupt pending',
              metadata: {
                interrupt: {
                  handle: {
                    run_id: 'run-interrupt-1',
                  },
                  data: {
                    tool_name: 'execute_command',
                    tool_args: [
                      {
                        key: 'command',
                        value: 'ls -la',
                        type: 'string',
                      },
                    ],
                    interrupt_config: {
                      requires_confirmation: true,
                      confirmation_message: 'Please review the command before continuing.',
                    },
                  },
                },
              },
            },
          },
          { type: 'stream.completed', conversationId: input.conversationId },
        ]);
      }

      return createAsyncIterable([
        { type: 'stream.started', conversationId: input.conversationId },
        {
          type: 'message.snapshot',
          message: {
            id: 'assistant-react-interrupt-2',
            role: 'assistant',
            content: 'Interrupt resolved',
          },
        },
        { type: 'stream.completed', conversationId: input.conversationId },
      ]);
    });

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-react-interrupt-1',
          },
        };
      },
      send: providerSend,
    };

    render(
      <ChatKitProvider provider={provider} locale="en-US">
        <Assistant />
      </ChatKitProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: {
        value: 'run that command',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(document.body.textContent).toContain('Please review the command before continuing.');
    });

    const interruptInput = screen.getByDisplayValue('ls -la');
    fireEvent.change(interruptInput, {
      target: {
        value: 'ls',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(providerSend).toHaveBeenCalledTimes(2);
      expect(document.body.textContent).toContain('Interrupt resolved');
    });

    expect(providerSend).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        conversationId: 'conversation-react-interrupt-1',
        text: '',
        attachments: undefined,
        interrupt: {
          handle: {
            run_id: 'run-interrupt-1',
          },
          data: {
            tool_name: 'execute_command',
            tool_args: [
              {
                key: 'command',
                value: 'ls -la',
                type: 'string',
              },
            ],
            interrupt_config: {
              requires_confirmation: true,
              confirmation_message: 'Please review the command before continuing.',
            },
          },
          action: 'confirm',
          modifiedArgs: [
            {
              key: 'command',
              value: 'ls',
            },
          ],
          interruptedAssistantMessageId: 'assistant-react-interrupt-1',
        },
      })
    );
  });
});
