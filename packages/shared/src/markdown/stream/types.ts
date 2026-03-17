export interface StreamingMarkdownState {
  source: string;
  repairedSource: string;
  html: string;
  chunkCount: number;
  isComplete: boolean;
}

export interface StreamingMarkdownRenderResult extends StreamingMarkdownState {
  latestChunk: string;
}

export type MarkdownSanitizer = (html: string) => string;
