import { describe, expect, it } from 'vitest';

import { applyIncrementalPatch } from './applyIncrementalPatch.js';
import { IncrementalAssembler } from './IncrementalAssembler.js';

describe('applyIncrementalPatch', () => {
  it('supports nested string append', () => {
    const initial = {
      message: {
        content: {
          text: 'Hel',
        },
      },
    };

    const result = applyIncrementalPatch(initial, {
      key: ['message', 'content', 'text'],
      action: 'append',
      content: 'lo',
    }) as { message: { content: { text: string } } };

    expect(result.message.content.text).toBe('Hello');
  });

  it('preserves sparse array slots on remove', () => {
    const initial = { list: ['a', 'b', 'c'] };
    const result = applyIncrementalPatch(initial, {
      key: ['list', '1'],
      action: 'remove',
    }) as { list: string[] };

    expect(1 in result.list).toBe(false);
    expect(result.list[0]).toBe('a');
    expect(result.list[2]).toBe('c');
  });
});

describe('IncrementalAssembler', () => {
  it('assembles ordered frames into a single snapshot', () => {
    const assembler = new IncrementalAssembler({});

    assembler.apply({ seqId: 1, key: ['message', 'content', 'text'], action: 'upsert', content: 'Hel' });
    const state = assembler.apply({ seqId: 2, key: ['message', 'content', 'text'], action: 'append', content: 'lo' });

    expect(state.value).toEqual({
      message: {
        content: {
          text: 'Hello',
        },
      },
    });
  });

  it('ignores stale frames', () => {
    const assembler = new IncrementalAssembler({ value: 'A' });

    assembler.apply({ seqId: 2, key: ['value'], action: 'append', content: 'B' });
    const state = assembler.apply({ seqId: 1, key: ['value'], action: 'append', content: 'C' });

    expect(state.value).toEqual({ value: 'AB' });
    expect(state.lastSeqId).toBe(2);
  });

  it('marks the stream as completed on end frames', () => {
    const assembler = new IncrementalAssembler({});

    const state = assembler.apply({ seqId: 3, key: [], action: 'end' });

    expect(state.completed).toBe(true);
    expect(state.lastSeqId).toBe(3);
  });
});
