import { describe, expect, it, vi } from 'vitest';

import { prepareSendMessageInput } from './attachments.js';

describe('prepareSendMessageInput', () => {
  it('uploads local attachments through the host adapter before send', async () => {
    const uploadFile = vi.fn(async () => ({
      fileName: 'notes.md',
      url: 'https://cdn.example.com/notes.md',
      storageKey: 'conversation-1/uploads/notes.md',
    }));

    const result = await prepareSendMessageInput(
      {
        conversationId: 'conversation-1',
        text: 'hello',
        attachments: [
          {
            source: 'local',
            fileName: 'notes.md',
            content: '# hello',
          },
        ],
      },
      {
        provider: 'dip',
        hostAdapter: {
          uploadFile,
        },
      }
    );

    expect(uploadFile).toHaveBeenCalledWith({
      provider: 'dip',
      conversationId: 'conversation-1',
      fileName: 'notes.md',
      content: '# hello',
      contentType: undefined,
      purpose: undefined,
      metadata: undefined,
    });
    expect(result.attachments).toEqual([
      {
        source: 'uploaded',
        fileName: 'notes.md',
        url: 'https://cdn.example.com/notes.md',
        storageKey: 'conversation-1/uploads/notes.md',
        fileId: undefined,
        contentType: undefined,
        size: undefined,
        metadata: undefined,
      },
    ]);
  });

  it('keeps uploaded attachments unchanged', async () => {
    const result = await prepareSendMessageInput({
      text: 'hello',
      attachments: [
        {
          source: 'uploaded',
          fileName: 'notes.md',
          storageKey: 'conversation-1/uploads/notes.md',
        },
      ],
    });

    expect(result.attachments).toEqual([
      {
        source: 'uploaded',
        fileName: 'notes.md',
        storageKey: 'conversation-1/uploads/notes.md',
      },
    ]);
  });

  it('falls back to provider uploadFile when host adapter upload is not provided', async () => {
    const providerUploadFile = vi.fn(async () => ({
      fileName: 'playbook.md',
      url: 'https://cdn.example.com/playbook.md',
      storageKey: 'conversation-2/uploads/temparea/playbook.md',
      temporaryAreaId: 'temporary-area-2',
    }));

    const result = await prepareSendMessageInput(
      {
        conversationId: 'conversation-2',
        text: 'hello',
        attachments: [
          {
            source: 'local',
            fileName: 'playbook.md',
            content: '# playbook',
          },
        ],
      },
      {
        provider: 'dip',
        providerUploadFile,
      }
    );

    expect(providerUploadFile).toHaveBeenCalledWith({
      provider: 'dip',
      conversationId: 'conversation-2',
      fileName: 'playbook.md',
      content: '# playbook',
      contentType: undefined,
      purpose: undefined,
      metadata: undefined,
    });
    expect(result.attachments).toEqual([
      {
        source: 'uploaded',
        fileName: 'playbook.md',
        url: 'https://cdn.example.com/playbook.md',
        fileId: undefined,
        storageKey: 'conversation-2/uploads/temparea/playbook.md',
        temporaryAreaId: 'temporary-area-2',
        contentType: undefined,
        size: undefined,
        metadata: undefined,
      },
    ]);
  });
});
