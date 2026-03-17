export type IncrementalAction = 'upsert' | 'append' | 'remove' | 'end';

export interface IncrementalPatchFrame {
  seqId: number;
  key: string[];
  content?: unknown;
  action: IncrementalAction;
}

export interface IncrementalAssemblerState {
  value: unknown;
  lastSeqId: number;
  completed: boolean;
}
