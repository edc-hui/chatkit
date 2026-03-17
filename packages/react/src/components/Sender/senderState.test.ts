import { describe, expect, it } from 'vitest';

import { extractNewTemporaryAttachments, resolveSenderState } from './senderState.js';

describe('resolveSenderState', () => {
  it('does not show temporary files after send when input attachments are cleared', () => {
    const state = resolveSenderState({
      value: '',
      inputAttachments: [],
      tempFileList: [
        {
          source: 'uploaded',
          fileName: 'plan.md',
          url: 'https://example.com/plan.md',
        },
      ],
    });

    expect(state.displayFiles).toEqual([]);
    expect(state.attachmentsToSend).toEqual([]);
    expect(state.inputDisabled).toBe(true);
  });

  it('uses input attachments as the only sending source', () => {
    const state = resolveSenderState({
      value: '',
      inputAttachments: [
        {
          source: 'uploaded',
          fileName: 'notes.md',
          url: 'https://example.com/notes.md',
        },
      ],
      tempFileList: [
        {
          source: 'uploaded',
          fileName: 'old.md',
          url: 'https://example.com/old.md',
        },
      ],
    });

    expect(state.displayFiles).toEqual([
      {
        source: 'uploaded',
        fileName: 'notes.md',
        url: 'https://example.com/notes.md',
      },
    ]);
    expect(state.attachmentsToSend).toEqual([
      {
        source: 'uploaded',
        fileName: 'notes.md',
        url: 'https://example.com/notes.md',
      },
    ]);
  });

  it('extracts only newly uploaded files from temporary attachment state', () => {
    const newUploaded = extractNewTemporaryAttachments({
      previousTemporaryAttachments: [
        {
          source: 'uploaded',
          fileName: 'old.md',
          url: 'https://example.com/old.md',
        },
      ],
      nextTemporaryAttachments: [
        {
          source: 'uploaded',
          fileName: 'old.md',
          url: 'https://example.com/old.md',
        },
        {
          source: 'uploaded',
          fileName: 'new.md',
          url: 'https://example.com/new.md',
        },
      ],
    });

    expect(newUploaded).toEqual([
      {
        source: 'uploaded',
        fileName: 'new.md',
        url: 'https://example.com/new.md',
      },
    ]);
  });
});
