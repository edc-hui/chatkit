import { describe, expect, it } from 'vitest';

import { ToolDefinitionRegistry } from './ToolDefinitionRegistry.js';

describe('ToolDefinitionRegistry', () => {
  it('registers and reads tool definitions without depending on any UI framework', () => {
    const registry = new ToolDefinitionRegistry();

    registry.registerTool({
      name: 'doc_qa',
      title: 'Document QA',
      icon: {
        kind: 'glyph',
        text: 'DQ',
      },
    });

    expect(registry.hasTool('doc_qa')).toBe(true);
    expect(registry.getTool('doc_qa')).toEqual({
      name: 'doc_qa',
      title: 'Document QA',
      icon: {
        kind: 'glyph',
        text: 'DQ',
      },
    });
  });

  it('supports batch registration and clearing', () => {
    const registry = new ToolDefinitionRegistry();

    registry.registerTools([
      { name: 'online_search_cite_tool', title: 'Online Search' },
      { name: 'text2ngql', title: 'NGQL' },
    ]);

    expect(registry.getAllToolNames()).toEqual(['online_search_cite_tool', 'text2ngql']);

    registry.clearAll();

    expect(registry.getAllTools()).toEqual([]);
  });
});