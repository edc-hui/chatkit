import { fetchEventSource } from '@microsoft/fetch-event-source';

import type { CozeSseEvent, CozeStreamRequest } from './types.js';

export async function* createCozeSseEventStream(request: CozeStreamRequest): AsyncIterable<CozeSseEvent> {
  const controller = new AbortController();
  const queue: CozeSseEvent[] = [];
  let completed = false;
  let failure: unknown;
  let resume: (() => void) | undefined;

  const notify = () => {
    resume?.();
    resume = undefined;
  };

  const relayAbort = () => {
    controller.abort(request.signal?.reason);
  };

  if (request.signal?.aborted) {
    controller.abort(request.signal.reason);
  } else {
    request.signal?.addEventListener('abort', relayAbort, { once: true });
  }

  void fetchEventSource(request.url, {
    signal: controller.signal,
    method: request.method ?? 'POST',
    headers: request.headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
    openWhenHidden: true,
    async onopen(response) {
      if (!response.ok) {
        throw new Error(`Failed to open Coze SSE stream: ${response.status}`);
      }
    },
    onmessage(message) {
      queue.push({
        event: message.event,
        data: message.data,
      });
      notify();
    },
    onclose() {
      completed = true;
      notify();
    },
    onerror(error) {
      failure = error;
      completed = true;
      notify();
      throw error;
    },
  });

  try {
    while (!completed || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>(resolve => {
          resume = resolve;
        });
        continue;
      }

      yield queue.shift() as CozeSseEvent;
    }

    if (failure) {
      throw failure;
    }
  } finally {
    request.signal?.removeEventListener('abort', relayAbort);
    controller.abort();
  }
}
