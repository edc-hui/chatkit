import { fetchEventSource } from '@microsoft/fetch-event-source';

import type { DipRawStreamChunk } from '../normalize/normalizeDipStream.js';
import type { DipStreamRequest } from './types.js';

export async function* createSseChunkStream(
  request: DipStreamRequest
): AsyncIterable<DipRawStreamChunk> {
  const controller = new AbortController();
  const queue: DipRawStreamChunk[] = [];
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
        throw Object.assign(new Error(`Failed to open SSE stream: ${response.status}`), {
          chatkitErrorSource: 'response' as const,
          status: response.status,
        });
      }
    },
    onmessage(message) {
      queue.push(message.data);
      notify();
    },
    onclose() {
      completed = true;
      notify();
    },
    onerror(error) {
      const nextError =
        error instanceof Error
          ? error
          : Object.assign(new Error(String(error)), {
              cause: error,
            });

      if (!(nextError as { chatkitErrorSource?: string }).chatkitErrorSource) {
        (nextError as { chatkitErrorSource?: string }).chatkitErrorSource = 'stream';
      }

      failure = nextError;
      completed = true;
      notify();
      throw nextError;
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

      yield queue.shift() as DipRawStreamChunk;
    }

    if (failure) {
      throw failure;
    }
  } finally {
    request.signal?.removeEventListener('abort', relayAbort);
    controller.abort();
  }
}
