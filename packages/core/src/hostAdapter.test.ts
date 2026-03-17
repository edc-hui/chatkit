import { describe, expect, it, vi } from 'vitest';

import { navigateWithHostAdapter, resolveHostAccessToken, uploadWithHostAdapter } from './hostAdapter.js';

describe('resolveHostAccessToken', () => {
  it('uses getAccessToken when the host adapter already has a token', async () => {
    const refreshAccessToken = vi.fn(async () => 'token-refresh');
    const token = await resolveHostAccessToken(
      {
        getAccessToken: async () => 'token-ready',
        refreshAccessToken,
      },
      {
        provider: 'dip',
        reason: 'request',
      }
    );

    expect(token).toBe('token-ready');
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('falls back to refreshAccessToken when getAccessToken returns nothing', async () => {
    const refreshAccessToken = vi.fn(async () => 'token-refresh');
    const token = await resolveHostAccessToken(
      {
        getAccessToken: async () => undefined,
        refreshAccessToken,
      },
      {
        provider: 'coze',
        reason: 'request',
      }
    );

    expect(token).toBe('token-refresh');
    expect(refreshAccessToken).toHaveBeenCalledWith({
      provider: 'coze',
      reason: 'refresh',
    });
  });

  it('delegates file upload through uploadWithHostAdapter', async () => {
    const result = await uploadWithHostAdapter(
      {
        uploadFile: async input => ({
          fileName: input.fileName,
          url: 'https://cdn.example.com/file.md',
        }),
      },
      {
        provider: 'dip',
        fileName: 'notes.md',
        content: '# hello',
      }
    );

    expect(result).toEqual({
      fileName: 'notes.md',
      url: 'https://cdn.example.com/file.md',
    });
  });

  it('delegates navigation through navigateWithHostAdapter', async () => {
    const navigate = vi.fn(async () => undefined);

    await navigateWithHostAdapter(
      {
        navigate,
      },
      {
        href: '/agents/1',
        replace: true,
      }
    );

    expect(navigate).toHaveBeenCalledWith({
      href: '/agents/1',
      replace: true,
    });
  });
});
