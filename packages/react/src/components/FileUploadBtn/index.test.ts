import { describe, expect, it, vi } from 'vitest';

import { uploadTemporaryFile } from './uploadTemporaryFile.js';

describe('uploadTemporaryFile', () => {
  it('creates a conversation before upload when conversationId is missing', async () => {
    const createConversation = vi.fn(async () => ({
      currentConversationId: 'conversation-1',
      conversations: {},
      messages: [],
      inputAttachments: [],
      temporaryAttachments: [],
      conversationSession: undefined,
      applicationContext: undefined,
      pending: false,
      streaming: false,
      error: undefined,
    }));
    const uploadTemporaryFiles = vi.fn(async () => ({
      currentConversationId: 'conversation-1',
      conversations: {},
      messages: [],
      inputAttachments: [],
      temporaryAttachments: [
        {
          source: 'uploaded' as const,
          fileName: 'notes.md',
          url: 'https://cdn.example.com/notes.md',
        },
      ],
      conversationSession: undefined,
      applicationContext: undefined,
      pending: false,
      streaming: false,
      error: undefined,
    }));

    await uploadTemporaryFile({
      file: new File(['hello'], 'notes.md', { type: 'text/markdown' }),
      createConversation,
      uploadTemporaryFiles,
    });

    expect(createConversation).toHaveBeenCalledTimes(1);
    expect(uploadTemporaryFiles).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      attachments: [
        {
          source: 'local',
          fileName: 'notes.md',
          content: expect.any(File),
          contentType: 'text/markdown',
          metadata: {
            size: 5,
            lastModified: expect.any(Number),
          },
        },
      ],
      mode: 'append',
    });
  });

  it('uploads directly when conversationId already exists', async () => {
    const createConversation = vi.fn();
    const uploadTemporaryFiles = vi.fn(async () => ({
      currentConversationId: 'conversation-2',
      conversations: {},
      messages: [],
      inputAttachments: [],
      temporaryAttachments: [],
      conversationSession: undefined,
      applicationContext: undefined,
      pending: false,
      streaming: false,
      error: undefined,
    }));

    await uploadTemporaryFile({
      file: new File(['world'], 'playbook.md', { type: 'text/markdown' }),
      conversationId: 'conversation-2',
      createConversation,
      uploadTemporaryFiles,
    });

    expect(createConversation).not.toHaveBeenCalled();
    expect(uploadTemporaryFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-2',
        mode: 'append',
      })
    );
  });
});
