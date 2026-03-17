import { defaultChatKitMessages } from './messages.js';
import type { ChatKitI18nConfig, ChatKitLocale, ChatKitMessageKey, ChatKitMessages, ChatKitTranslator } from './types.js';

function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, token: string) => {
    const value = params[token];
    return value === undefined || value === null ? '' : String(value);
  });
}

function resolveMessage(
  locale: ChatKitLocale,
  fallbackLocale: ChatKitLocale,
  customMessages: Partial<Record<ChatKitLocale, ChatKitMessages>>,
  key: ChatKitMessageKey
): string | undefined {
  return (
    customMessages[locale]?.[key] ??
    defaultChatKitMessages[locale]?.[key] ??
    customMessages[fallbackLocale]?.[key] ??
    defaultChatKitMessages[fallbackLocale]?.[key]
  );
}

export function createChatKitTranslator(config: ChatKitI18nConfig = {}): ChatKitTranslator {
  const locale = config.locale ?? 'en-US';
  const fallbackLocale = config.fallbackLocale ?? 'en-US';
  const messages = config.messages ?? {};

  if (config.t) {
    return {
      locale,
      fallbackLocale,
      messages,
      t(key, params) {
        return config.t?.(key, params) ?? String(key);
      },
    };
  }

  return {
    locale,
    fallbackLocale,
    messages,
    t(key, params) {
      const resolved = resolveMessage(locale, fallbackLocale, messages, key) ?? String(key);
      return interpolate(resolved, params);
    },
  };
}
