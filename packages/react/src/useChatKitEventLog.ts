import { useEffect, useState } from 'react';

import type { ChatKitEventMap } from '@kweaver-ai/chatkit-core';

import { useChatKitEngine } from './ChatKitProvider.js';

const DEBUG_EVENT_NAMES: Array<keyof ChatKitEventMap> = [
  'stateChanged',
  'conversationChanged',
  'streamStarted',
  'streamCompleted',
  'messageAppended',
  'messageUpdated',
  'streamError',
];

export interface ChatKitDebugEventEntry<K extends keyof ChatKitEventMap = keyof ChatKitEventMap> {
  id: string;
  name: K;
  timestamp: number;
  payload: ChatKitEventMap[K];
}

export interface UseChatKitEventLogOptions {
  maxEvents?: number;
}

function createDebugEventId(name: keyof ChatKitEventMap): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${name}-${crypto.randomUUID()}`;
  }

  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useChatKitEventLog(options: UseChatKitEventLogOptions = {}): ChatKitDebugEventEntry[] {
  const engine = useChatKitEngine();
  const [events, setEvents] = useState<ChatKitDebugEventEntry[]>([]);
  const maxEvents = options.maxEvents ?? 40;

  useEffect(() => {
    setEvents([]);

    const unsubscribers = DEBUG_EVENT_NAMES.map(eventName =>
      engine.on(eventName, payload => {
        setEvents(currentEvents => {
          const nextEvents = currentEvents.concat({
            id: createDebugEventId(eventName),
            name: eventName,
            timestamp: Date.now(),
            payload,
          });

          return nextEvents.slice(-maxEvents);
        });
      })
    );

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [engine, maxEvents]);

  return events;
}
