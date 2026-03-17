import { describe, expect, it } from 'vitest';

import { ToolRendererRegistry } from './ToolRendererRegistry.js';

describe('ToolRendererRegistry', () => {
  it('registers React renderers independently from tool definitions', () => {
    const registry = new ToolRendererRegistry();

    registry.registerTool({
      name: 'doc_qa',
      render(context) {
        return context.title ?? context.toolName;
      },
    });

    expect(registry.hasTool('doc_qa')).toBe(true);
    expect(registry.getTool('doc_qa')?.render({ toolName: 'doc_qa', title: 'Document QA' })).toBe('Document QA');
  });

  it('supports unregistering a renderer', () => {
    const registry = new ToolRendererRegistry();

    registry.registerTool({
      name: 'text2ngql',
      render() {
        return 'ngql';
      },
    });
    registry.unregisterTool('text2ngql');

    expect(registry.hasTool('text2ngql')).toBe(false);
  });
});