import React, { useEffect, useMemo, useState } from 'react';

import type { ChatMessage } from '@kweaver-ai/chatkit-core';
import { renderMarkdown } from '@kweaver-ai/chatkit-shared';

import { useChatKitI18n } from '../ChatKitProvider.js';
import { ToolCallCard } from '../tools/ToolCallCard.js';

function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

interface WorkbenchProgressEntry {
  id: string;
  label: string;
  payload: Record<string, unknown>;
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getNestedRecord(root: unknown, path: string[]): Record<string, unknown> | undefined {
  let current: unknown = root;

  for (const segment of path) {
    const record = toRecord(current);
    if (!record) {
      return undefined;
    }
    current = record[segment];
  }

  return toRecord(current);
}

function extractProgressEntries(raw: unknown): WorkbenchProgressEntry[] {
  const middleAnswer = getNestedRecord(raw, ['message', 'content', 'middle_answer']);
  const progress = Array.isArray(middleAnswer?.progress) ? middleAnswer.progress : [];

  return progress
    .map((item, index) => {
      const record = toRecord(item);
      if (!record) {
        return undefined;
      }

      const stage = typeof record.stage === 'string' ? record.stage : typeof record.type === 'string' ? record.type : 'step';
      const agentName =
        typeof record.agent_name === 'string'
          ? record.agent_name
          : typeof record.agentName === 'string'
            ? record.agentName
            : undefined;
      const skillInfo = toRecord(record.skill_info);
      const skillName = typeof skillInfo?.name === 'string' ? skillInfo.name : undefined;
      const label = agentName || skillName ? `${agentName ?? skillName} (${stage})` : `${stage} #${index + 1}`;

      return {
        id: `${stage}-${index}`,
        label,
        payload: record,
      } satisfies WorkbenchProgressEntry;
    })
    .filter((entry): entry is WorkbenchProgressEntry => Boolean(entry));
}

export interface WorkbenchPanelProps {
  message?: ChatMessage;
  selectedToolIndex?: number;
  onSelectToolIndex?: (toolIndex: number) => void;
  onClose?: () => void;
}

export function WorkbenchPanel(props: WorkbenchPanelProps) {
  const { t } = useChatKitI18n();
  const [selectedProgressId, setSelectedProgressId] = useState<string>();
  const thinkingHtml = useMemo(
    () => renderMarkdown(props.message?.metadata?.thinking?.trim() ?? ''),
    [props.message?.metadata?.thinking]
  );
  const toolCalls = props.message?.metadata?.toolCalls ?? [];
  const selectedToolCall =
    typeof props.selectedToolIndex === 'number' ? toolCalls[props.selectedToolIndex] : toolCalls[0];
  const progressEntries = useMemo(() => extractProgressEntries(props.message?.raw), [props.message?.raw]);
  const selectedProgressEntry = useMemo(() => {
    if (!progressEntries.length) {
      return undefined;
    }

    return progressEntries.find(entry => entry.id === selectedProgressId) ?? progressEntries[progressEntries.length - 1];
  }, [progressEntries, selectedProgressId]);

  useEffect(() => {
    if (!progressEntries.length) {
      setSelectedProgressId(undefined);
      return;
    }

    if (!selectedProgressId || !progressEntries.some(entry => entry.id === selectedProgressId)) {
      setSelectedProgressId(progressEntries[progressEntries.length - 1]?.id);
    }
  }, [progressEntries, selectedProgressId]);

  if (!props.message) {
    return (
      <aside
        style={{
          width: 360,
          minWidth: 320,
          borderRadius: 24,
          border: '1px solid var(--chatkit-border, #d7deeb)',
          background: 'rgba(255,255,255,0.82)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>{t('assistant.workbench')}</div>
        <div style={{ fontSize: 13, color: 'var(--chatkit-muted, #6b7280)', lineHeight: 1.6 }}>
          {t('assistant.emptyWorkbench')}
        </div>
      </aside>
    );
  }

  return (
    <aside
      style={{
        width: 380,
        minWidth: 340,
        borderRadius: 24,
        border: '1px solid var(--chatkit-border, #d7deeb)',
        background: 'rgba(255,255,255,0.82)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>{t('assistant.workbench')}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--chatkit-muted, #6b7280)' }}>
            {props.message.role} · {props.message.id}
          </div>
        </div>
        {props.onClose ? (
          <button
            type="button"
            onClick={props.onClose}
            style={{
              borderRadius: 999,
              border: '1px solid var(--chatkit-border, #d7deeb)',
              background: '#ffffff',
              padding: '8px 12px',
              cursor: 'pointer',
              color: 'var(--chatkit-text, #111827)',
            }}
          >
            {t('assistant.closeWorkbench')}
          </button>
        ) : null}
      </div>

      {props.message.metadata?.thinking?.trim() ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>
            {t('assistant.workbenchThinking')}
          </div>
          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(215, 222, 235, 0.9)',
              background: 'rgba(248, 250, 252, 0.92)',
              padding: 14,
              color: 'var(--chatkit-text, #111827)',
              lineHeight: 1.6,
            }}
            dangerouslySetInnerHTML={{ __html: thinkingHtml }}
          />
        </section>
      ) : null}

      {toolCalls.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>
            {t('assistant.workbenchTools')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {toolCalls.map((toolCall, index) => {
              const isActive = toolCall === selectedToolCall;
              return (
                <button
                  key={`${toolCall.name}-${index}`}
                  type="button"
                  onClick={() => props.onSelectToolIndex?.(index)}
                  style={{
                    borderRadius: 999,
                    border: isActive ? '1px solid rgba(37, 99, 235, 0.34)' : '1px solid rgba(215, 222, 235, 0.9)',
                    background: isActive ? 'rgba(219, 234, 254, 0.78)' : '#ffffff',
                    color: isActive ? '#1d4ed8' : 'var(--chatkit-text, #111827)',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {toolCall.title ?? toolCall.name}
                </button>
              );
            })}
          </div>

          {selectedToolCall ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>
                {t('assistant.workbenchToolDetails')}
              </div>
              <ToolCallCard toolCall={selectedToolCall} selected />
            </div>
          ) : null}
        </section>
      ) : null}

      {progressEntries.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>
            {t('assistant.workbenchProgress')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
            {progressEntries.map(entry => {
              const active = entry.id === selectedProgressEntry?.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setSelectedProgressId(entry.id);
                  }}
                  style={{
                    textAlign: 'left',
                    borderRadius: 12,
                    border: active
                      ? '1px solid rgba(37, 99, 235, 0.34)'
                      : '1px solid rgba(215, 222, 235, 0.9)',
                    background: active ? 'rgba(219, 234, 254, 0.78)' : '#ffffff',
                    color: active ? '#1d4ed8' : 'var(--chatkit-text, #111827)',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>
            {t('assistant.workbenchProgressDetails')}
          </div>
          <pre
            style={{
              margin: 0,
              padding: '12px 14px',
              borderRadius: 16,
              border: '1px solid rgba(215, 222, 235, 0.9)',
              background: '#0f172a',
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 12,
              maxHeight: 260,
              overflowY: 'auto',
            }}
          >
            {selectedProgressEntry ? formatValue(selectedProgressEntry.payload) : t('assistant.emptyWorkbenchProgress')}
          </pre>
        </section>
      ) : null}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>
          {t('assistant.workbenchRaw')}
        </div>
        <pre
          style={{
            margin: 0,
            padding: '12px 14px',
            borderRadius: 16,
            border: '1px solid rgba(215, 222, 235, 0.9)',
            background: '#0f172a',
            color: '#e2e8f0',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: 12,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {formatValue(props.message.raw ?? props.message.metadata ?? props.message.content)}
        </pre>
      </section>
    </aside>
  );
}
