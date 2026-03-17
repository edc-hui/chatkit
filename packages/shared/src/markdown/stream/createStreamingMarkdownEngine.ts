import { renderMarkdown } from '../renderMarkdown.js';
import { repairMarkdown, type RepairMarkdownOptions } from './repairMarkdown.js';
import type { MarkdownSanitizer, StreamingMarkdownRenderResult, StreamingMarkdownState } from './types.js';

export interface CreateStreamingMarkdownEngineOptions {
  repair?: RepairMarkdownOptions;
  sanitize?: MarkdownSanitizer;
}

export interface StreamingMarkdownEngine {
  append(chunk: string): StreamingMarkdownRenderResult;
  complete(): StreamingMarkdownRenderResult;
  reset(): StreamingMarkdownRenderResult;
  setSource(source: string, complete?: boolean): StreamingMarkdownRenderResult;
  getState(): StreamingMarkdownState;
}

function buildResult(
  source: string,
  latestChunk: string,
  complete: boolean,
  options: CreateStreamingMarkdownEngineOptions,
  chunkCount: number
): StreamingMarkdownRenderResult {
  const repairedSource = complete ? source : repairMarkdown(source, options.repair);
  const html = renderMarkdown(repairedSource, { sanitize: options.sanitize });

  return {
    source,
    repairedSource,
    html,
    chunkCount,
    isComplete: complete,
    latestChunk,
  };
}

export function createStreamingMarkdownEngine(
  options: CreateStreamingMarkdownEngineOptions = {}
): StreamingMarkdownEngine {
  let source = '';
  let chunkCount = 0;
  let isComplete = false;

  return {
    append(chunk) {
      source += chunk;
      chunkCount += 1;
      isComplete = false;
      return buildResult(source, chunk, false, options, chunkCount);
    },

    complete() {
      isComplete = true;
      return buildResult(source, '', true, options, chunkCount);
    },

    reset() {
      source = '';
      chunkCount = 0;
      isComplete = false;
      return buildResult(source, '', false, options, chunkCount);
    },

    setSource(nextSource, complete = false) {
      source = nextSource;
      chunkCount = nextSource.length === 0 ? 0 : 1;
      isComplete = complete;
      return buildResult(source, nextSource, complete, options, chunkCount);
    },

    getState() {
      const result = buildResult(source, '', isComplete, options, chunkCount);
      return {
        source: result.source,
        repairedSource: result.repairedSource,
        html: result.html,
        chunkCount: result.chunkCount,
        isComplete: result.isComplete,
      };
    },
  };
}
