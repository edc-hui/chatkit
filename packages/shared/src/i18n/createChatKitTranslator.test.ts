import { describe, expect, it } from 'vitest';

import { createChatKitTranslator } from './createChatKitTranslator.js';

describe('createChatKitTranslator', () => {
  it('uses built-in messages for zh-CN', () => {
    const translator = createChatKitTranslator({ locale: 'zh-CN' });
    expect(translator.t('sender.send')).toBe('发送');
  });

  it('falls back to en-US when a key is missing', () => {
    const translator = createChatKitTranslator({
      locale: 'zh-CN',
      messages: {
        'zh-CN': {
          'sender.send': '立即发送',
        },
      },
    });

    expect(translator.t('sender.send')).toBe('立即发送');
    expect(translator.t('assistant.title')).toBe('助手');
  });

  it('supports custom t overrides', () => {
    const translator = createChatKitTranslator({
      t: key => `custom:${key}`,
    });

    expect(translator.t('assistant.title')).toBe('custom:assistant.title');
  });
});
