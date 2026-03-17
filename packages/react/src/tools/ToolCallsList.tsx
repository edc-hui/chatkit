import React from 'react';

import type { ChatToolCall } from '@kweaver-ai/chatkit-core';

import { ToolCallCard } from './ToolCallCard.js';

export interface ToolCallsListProps {
  toolCalls: ChatToolCall[];
  selectedToolIndex?: number;
  onSelectTool?: (toolCall: ChatToolCall, index: number) => void | Promise<void>;
}

export function ToolCallsList(props: ToolCallsListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {props.toolCalls.map((toolCall, index) => (
        <ToolCallCard
          key={`${toolCall.name}-${index}`}
          toolCall={toolCall}
          selected={props.selectedToolIndex === index}
          onClick={props.onSelectTool ? () => void props.onSelectTool?.(toolCall, index) : undefined}
        />
      ))}
    </div>
  );
}
