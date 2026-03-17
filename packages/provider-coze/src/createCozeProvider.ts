import { resolveHostAccessToken, type ChatProvider, type CreateConversationResult } from '@kweaver-ai/chatkit-core';

import { normalizeCozeStream } from './normalize/normalizeCozeStream.js';
import { createCozeSseEventStream } from './transport/createCozeSseEventStream.js';
import type { CozeProviderConfig } from './transport/types.js';

function resolveBaseUrl(baseUrl?: string): string {
  return (baseUrl ?? 'https://api.coze.cn').replace(/\/$/, '');
}

function buildChatUrl(baseUrl?: string, conversationId?: string): string {
  const url = `${resolveBaseUrl(baseUrl)}/v3/chat`;
  return conversationId ? `${url}?conversation_id=${encodeURIComponent(conversationId)}` : url;
}

function createDefaultConversation(): CreateConversationResult {
  return {
    conversation: {
      id: crypto.randomUUID(),
    },
  };
}

async function resolveAccessToken(config: CozeProviderConfig): Promise<string | undefined> {
  if (config.getAccessToken) {
    return config.getAccessToken();
  }

  if (config.apiToken) {
    return config.apiToken;
  }

  return resolveHostAccessToken(config.hostAdapter, {
    provider: 'coze',
    reason: 'request',
  });
}

function serializeApplicationContextData(data: unknown): string | undefined {
  if (data === undefined || data === null) {
    return undefined;
  }

  if (typeof data === 'string') {
    return data;
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function buildUserMessageContent(input: Parameters<ChatProvider['send']>[0]): string {
  const applicationContext = input.applicationContext;
  const serializedContextData = serializeApplicationContextData(applicationContext?.data);

  if (!applicationContext?.title && !serializedContextData) {
    return input.text;
  }

  const parts = ['[Application Context]'];

  if (applicationContext?.title) {
    parts.push(`Title: ${applicationContext.title}`);
  }

  if (serializedContextData) {
    parts.push('Data:');
    parts.push(serializedContextData);
  }

  parts.push('');
  parts.push(input.text);

  return parts.join('\n');
}

export function createCozeProvider(config: CozeProviderConfig): ChatProvider {
  const streamTransport = config.streamTransport ?? createCozeSseEventStream;

  return {
    async getOnboardingInfo() {
      if (config.getOnboardingInfo) {
        return config.getOnboardingInfo();
      }

      return {};
    },

    async getContextInfo() {
      if (config.getContextInfo) {
        return config.getContextInfo();
      }

      return {};
    },

    async createConversation() {
      if (config.createConversation) {
        return config.createConversation();
      }

      return createDefaultConversation();
    },

    async listConversations(input) {
      if (!config.listConversations) {
        throw new Error('Conversation listing is not configured for this Coze provider.');
      }

      return config.listConversations(input);
    },

    async getConversationMessages(input) {
      if (!config.getConversationMessages) {
        throw new Error('Conversation message loading is not configured for this Coze provider.');
      }

      return config.getConversationMessages(input);
    },

    recoverConversation(input) {
      if (!config.recoverConversation) {
        throw new Error('Conversation recovery is not configured for this Coze provider.');
      }

      return config.recoverConversation(input);
    },

    async markConversationRead(input) {
      if (!config.markConversationRead) {
        throw new Error('Conversation read tracking is not configured for this Coze provider.');
      }

      await config.markConversationRead(input);
    },

    async getConversationSessionStatus(input) {
      if (!config.getConversationSessionStatus) {
        throw new Error('Conversation session status is not configured for this Coze provider.');
      }

      return config.getConversationSessionStatus(input);
    },

    async recoverConversationSession(input) {
      if (!config.recoverConversationSession) {
        throw new Error('Conversation session recovery is not configured for this Coze provider.');
      }

      return config.recoverConversationSession(input);
    },

    async updateConversation(input) {
      if (!config.updateConversation) {
        throw new Error('Conversation updating is not configured for this Coze provider.');
      }

      return config.updateConversation(input);
    },

    async deleteConversation(input) {
      if (!config.deleteConversation) {
        throw new Error('Conversation deletion is not configured for this Coze provider.');
      }

      await config.deleteConversation(input);
    },

    async submitMessageFeedback(input) {
      if (!config.submitMessageFeedback) {
        throw new Error('Message feedback is not configured for this Coze provider.');
      }

      await config.submitMessageFeedback(input);
    },

    async *send(input) {
      const accessToken = await resolveAccessToken(config);
      const rawStream = streamTransport({
        url: buildChatUrl(config.baseUrl, input.conversationId),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: {
          bot_id: config.botId,
          user_id: config.userId ?? 'chatkit-user',
          stream: true,
          additional_messages: [
            {
              role: 'user',
              content: buildUserMessageContent(input),
              content_type: 'text',
            },
          ],
        },
        signal: input.signal,
      });

      for await (const event of normalizeCozeStream(rawStream, input.conversationId)) {
        yield event;
      }
    },

    async terminateConversation(input) {
      await config.terminateConversation?.(input);
    },
  };
}
