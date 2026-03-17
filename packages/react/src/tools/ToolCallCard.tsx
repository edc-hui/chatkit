import React, { useEffect, useMemo, useRef } from 'react';

import type { ChatToolCall } from '@kweaver-ai/chatkit-core';
import { defaultToolDefinitionRegistry } from '@kweaver-ai/chatkit-shared';

import { useChatKitI18n } from '../ChatKitProvider.js';
import './defaultRenderers.js';
import { ToolIcon } from './ToolIcon.js';
import { defaultToolRendererRegistry } from './ToolRendererRegistry.js';

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

export interface ToolCallCardProps {
  toolCall: ChatToolCall;
  selected?: boolean;
  onClick?: () => void;
}

export function ToolCallCard(props: ToolCallCardProps) {
  const { t } = useChatKitI18n();
  const definition = defaultToolDefinitionRegistry.getTool(props.toolCall.name);
  const renderer = defaultToolRendererRegistry.getTool(props.toolCall.name);
  const title = props.toolCall.title ?? definition?.title ?? props.toolCall.name;
  const clickCleanupRef = useRef<(() => void) | undefined>(undefined);
  const rendererContext = useMemo(
    () => ({
      toolName: props.toolCall.name,
      title,
      description: props.toolCall.description ?? definition?.description,
      input: props.toolCall.input,
      output: props.toolCall.output,
      metadata: props.toolCall.metadata,
    }),
    [definition?.description, props.toolCall.description, props.toolCall.input, props.toolCall.metadata, props.toolCall.name, props.toolCall.output, title]
  );
  const renderedBody = renderer?.render(rendererContext);
  const canHandleClick = Boolean(props.onClick || renderer?.onClick);
  const inputText = useMemo(
    () => (props.toolCall.input === undefined ? undefined : stringifyValue(props.toolCall.input)),
    [props.toolCall.input]
  );
  const outputText = useMemo(
    () => (props.toolCall.output === undefined ? undefined : stringifyValue(props.toolCall.output)),
    [props.toolCall.output]
  );

  useEffect(() => {
    return () => {
      clickCleanupRef.current?.();
      clickCleanupRef.current = undefined;
    };
  }, []);

  const handleClick = () => {
    clickCleanupRef.current?.();
    clickCleanupRef.current = undefined;

    if (props.onClick) {
      props.onClick();
      return;
    }

    const cleanup = renderer?.onClick?.(rendererContext);
    if (typeof cleanup === 'function') {
      clickCleanupRef.current = cleanup;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 14,
        borderRadius: 18,
        background: 'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(241,245,249,0.96) 100%)',
        border: props.selected
          ? '1px solid rgba(37, 99, 235, 0.34)'
          : '1px solid var(--chatkit-border, #d7deeb)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        cursor: canHandleClick ? 'pointer' : 'default',
      }}
      onClick={canHandleClick ? handleClick : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            display: 'inline-flex',
            width: 32,
            height: 32,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(37, 99, 235, 0.1)',
            color: '#1d4ed8',
          }}
        >
          {renderer?.icon ?? <ToolIcon icon={definition?.icon} size={18} />}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</div>
          {props.toolCall.description ?? definition?.description ? (
            <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>
              {props.toolCall.description ?? definition?.description}
            </div>
          ) : null}
        </div>
      </div>

      {inputText ? (
        <div>
          <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#475569' }}>{t('tool.input')}</div>
          <pre
            style={{
              margin: 0,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid rgba(215, 222, 235, 0.9)',
              fontSize: 13,
              color: '#0f172a',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {inputText}
          </pre>
        </div>
      ) : null}

      {renderedBody ? (
        <div>
          <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#475569' }}>{t('tool.output')}</div>
          {renderedBody}
        </div>
      ) : outputText ? (
        <div>
          <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#475569' }}>{t('tool.output')}</div>
          <pre
            style={{
              margin: 0,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid rgba(215, 222, 235, 0.9)',
              fontSize: 13,
              color: '#0f172a',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {outputText}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
