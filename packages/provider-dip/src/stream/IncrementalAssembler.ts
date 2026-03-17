import { applyIncrementalPatch } from './applyIncrementalPatch.js';
import type { IncrementalAssemblerState, IncrementalPatchFrame } from './types.js';

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return value;
}

export class IncrementalAssembler {
  private currentValue: unknown;
  private lastSeqId = -1;
  private completed = false;

  constructor(initialValue: unknown = {}) {
    this.currentValue = initialValue;
  }

  apply(frame: IncrementalPatchFrame): IncrementalAssemblerState {
    if (frame.seqId <= this.lastSeqId) {
      return this.getState();
    }

    this.lastSeqId = frame.seqId;

    if (frame.action === 'end') {
      this.completed = true;
      return this.getState();
    }

    this.currentValue = applyIncrementalPatch(this.currentValue, frame);
    return this.getState();
  }

  reset(initialValue: unknown = {}): IncrementalAssemblerState {
    this.currentValue = initialValue;
    this.lastSeqId = -1;
    this.completed = false;
    return this.getState();
  }

  getState(): IncrementalAssemblerState {
    return {
      value: cloneValue(this.currentValue),
      lastSeqId: this.lastSeqId,
      completed: this.completed,
    };
  }
}
