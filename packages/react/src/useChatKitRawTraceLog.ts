import { useEffect, useRef, useState } from 'react';

import type { ChatMessage } from '@kweaver-ai/chatkit-core';

import { useChatKitEngine } from './ChatKitProvider.js';

export interface ChatKitRawTraceEntry {
  id: string;
  messageId: string;
  timestamp: number;
  raw: unknown;
}

export interface UseChatKitRawTraceLogOptions {
  maxEntries?: number;
}

function createTraceId(messageId: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${messageId}-${crypto.randomUUID()}`;
  }

  return `${messageId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function stringifyValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function useChatKitRawTraceLog(options: UseChatKitRawTraceLogOptions = {}): ChatKitRawTraceEntry[] {
  const engine = useChatKitEngine();
  const [entries, setEntries] = useState<ChatKitRawTraceEntry[]>([]);
  const maxEntries = options.maxEntries ?? 30;
  const lastRawSignatureByMessageId = useRef(new Map<string, string>());

  useEffect(() => {
    setEntries([]);
    lastRawSignatureByMessageId.current.clear();

    const capture = (message: ChatMessage) => {
      if (message.role !== 'assistant' || typeof message.raw === 'undefined') {
        return;
      }

      const nextSignature = stringifyValue(message.raw);
      if (lastRawSignatureByMessageId.current.get(message.id) === nextSignature) {
        return;
      }

      lastRawSignatureByMessageId.current.set(message.id, nextSignature);
      setEntries(currentEntries =>
        currentEntries
          .concat({
            id: createTraceId(message.id),
            messageId: message.id,
            timestamp: Date.now(),
            raw: message.raw,
          })
          .slice(-maxEntries)
      );
    };

    const unsubscribeAppended = engine.on('messageAppended', payload => {
      capture(payload.message);
    });
    const unsubscribeUpdated = engine.on('messageUpdated', payload => {
      capture(payload.message);
    });

    return () => {
      unsubscribeAppended();
      unsubscribeUpdated();
    };
  }, [engine, maxEntries]);

  return entries;
}
