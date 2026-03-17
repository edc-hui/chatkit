import { describe, expect, it } from 'vitest';

import { resolveBuiltInBadgeIcon, resolveCurrentAgentAvatar, type AgentAvatarOption } from './agentIconState.js';

const options: AgentAvatarOption[] = [
  { type: 1, value: '1', img: 'img-1' },
  { type: 1, value: '2', img: 'img-2' },
];

describe('resolveCurrentAgentAvatar', () => {
  it('returns matched avatar option', () => {
    const result = resolveCurrentAgentAvatar(options, 1, '2');

    expect(result).toEqual({ type: 1, value: '2', img: 'img-2' });
  });

  it('supports string number input and falls back to first option when unmatched', () => {
    const matched = resolveCurrentAgentAvatar(options, '1', '1');
    const fallback = resolveCurrentAgentAvatar(options, 99, '9');

    expect(matched).toEqual({ type: 1, value: '1', img: 'img-1' });
    expect(fallback).toEqual({ type: 1, value: '1', img: 'img-1' });
  });
});

describe('resolveBuiltInBadgeIcon', () => {
  const icons = {
    'zh-CN': 'icon-zh',
    'zh-TW': 'icon-tw',
    'en-US': 'icon-en',
  } as const;

  it('returns locale matched built-in badge icon', () => {
    expect(resolveBuiltInBadgeIcon('en-US', icons)).toBe('icon-en');
    expect(resolveBuiltInBadgeIcon('zh-TW', icons)).toBe('icon-tw');
  });

  it('falls back to zh-CN for unsupported locale', () => {
    expect(resolveBuiltInBadgeIcon('ja-JP', icons)).toBe('icon-zh');
    expect(resolveBuiltInBadgeIcon(undefined, icons)).toBe('icon-zh');
  });
});
