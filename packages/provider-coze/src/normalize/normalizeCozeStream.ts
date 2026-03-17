import type { ProviderEvent, ProviderMessage } from '@kweaver-ai/chatkit-core';

import type { CozeSseEvent } from '../transport/types.js';

interface CozeEventPayload {
  id?: string;
  conversation_id?: string;
  content?: string;
  type?: string;
  status?: string;
  msg_type?: string;
}

function parsePayload(data: string): CozeEventPayload {
  return JSON.parse(data) as CozeEventPayload;
}

function resolveMessageId(payload: CozeEventPayload, conversationId?: string): string {
  return payload.id ?? `coze-message-${conversationId ?? 'unknown'}`;
}

function createAnswerMessage(payload: CozeEventPayload, conversationId?: string): ProviderMessage | null {
  if (!payload.content || payload.type !== 'answer') {
    return null;
  }

  return {
    id: resolveMessageId(payload, conversationId),
    role: 'assistant',
    content: payload.content,
    raw: payload,
  };
}

export async function* normalizeCozeStream(
  stream: AsyncIterable<CozeSseEvent>,
  fallbackConversationId?: string
): AsyncIterable<ProviderEvent> {
  let started = false;
  let completed = false;
  let currentConversationId = fallbackConversationId;

  for await (const frame of stream) {
    const payload = parsePayload(frame.data);
    currentConversationId = payload.conversation_id ?? currentConversationId;

    if (!started) {
      started = true;
      yield { type: 'stream.started', conversationId: currentConversationId };
    }

    if (frame.event === 'done') {
      completed = true;
      yield { type: 'stream.completed', conversationId: currentConversationId };
      continue;
    }

    if (frame.event === 'conversation.message.delta') {
      const message = createAnswerMessage(payload, currentConversationId);
      if (message) {
        yield { type: 'message.delta', message };
      }
      continue;
    }

    if (frame.event === 'conversation.message.completed') {
      const message = createAnswerMessage(payload, currentConversationId);
      if (message) {
        yield { type: 'message.snapshot', message };
        yield { type: 'message.completed', messageId: message.id };
      }
      continue;
    }

    if (frame.event === 'conversation.chat.completed' || payload.status === 'completed' || payload.msg_type === 'generate_answer_finish') {
      completed = true;
      yield { type: 'stream.completed', conversationId: currentConversationId };
      continue;
    }
  }

  if (started && !completed) {
    yield { type: 'stream.completed', conversationId: currentConversationId };
  }
}
