import React, { useEffect, useMemo, useState } from 'react';

import type { ChatKitDebugCommandEntry, ChatKitDebugCommandStatus } from './ChatKitProvider.js';
import { useChatKit, useChatKitCommandLog, useChatKitI18n } from './ChatKitProvider.js';
import { useChatKitEventLog } from './useChatKitEventLog.js';
import { useChatKitRawTraceLog } from './useChatKitRawTraceLog.js';

export interface DebuggerPanelProps {
  visible?: boolean;
  maxEvents?: number;
  title?: string;
}

function formatDebugValue(value: unknown): string {
  if (value instanceof Error) {
    return JSON.stringify(
      {
        name: value.name,
        message: value.message,
        stack: value.stack,
      },
      null,
      2
    );
  }

  try {
    return JSON.stringify(
      value,
      (_, nestedValue) => {
        if (nestedValue instanceof Error) {
          return {
            name: nestedValue.name,
            message: nestedValue.message,
            stack: nestedValue.stack,
          };
        }

        if (typeof nestedValue === 'bigint') {
          return nestedValue.toString();
        }

        if (typeof File !== 'undefined' && nestedValue instanceof File) {
          return {
            name: nestedValue.name,
            size: nestedValue.size,
            type: nestedValue.type,
          };
        }

        return nestedValue;
      },
      2
    );
  } catch (error) {
    return String(error);
  }
}

function formatBoolean(value: boolean, activeText: string, inactiveText: string): string {
  return value ? activeText : inactiveText;
}

function getCommandStatusColors(status: ChatKitDebugCommandStatus): { color: string; background: string } {
  switch (status) {
    case 'success':
      return {
        color: '#86efac',
        background: 'rgba(34, 197, 94, 0.12)',
      };
    case 'error':
      return {
        color: '#fca5a5',
        background: 'rgba(239, 68, 68, 0.12)',
      };
    case 'pending':
    default:
      return {
        color: '#fde68a',
        background: 'rgba(245, 158, 11, 0.12)',
      };
  }
}

function resolveCommandStatusText(status: ChatKitDebugCommandStatus, t: (key: any) => string): string {
  switch (status) {
    case 'success':
      return t('debugger.commandStatus.success');
    case 'error':
      return t('debugger.commandStatus.error');
    case 'pending':
    default:
      return t('debugger.commandStatus.pending');
  }
}

function renderCommandPayloadSection(title: string, value: unknown, color = '#cbd5e1') {
  if (typeof value === 'undefined') {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>{title}</div>
      <pre
        style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontSize: 12,
          color,
        }}
      >
        {formatDebugValue(value)}
      </pre>
    </div>
  );
}

interface DebuggerProgressEntry {
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

function extractProgressEntries(raw: unknown): DebuggerProgressEntry[] {
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
      } satisfies DebuggerProgressEntry;
    })
    .filter((entry): entry is DebuggerProgressEntry => Boolean(entry));
}

function CommandLogCard(props: {
  commands: ChatKitDebugCommandEntry[];
  t: (key: any, params?: Record<string, unknown>) => string;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        background: 'rgba(15, 23, 42, 0.72)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 280,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>{props.t('debugger.commandLog')}</div>
        <div style={{ color: '#94a3b8', fontSize: 12 }}>{props.commands.length}</div>
      </div>
      {props.commands.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 480 }}>
          {props.commands
            .slice()
            .reverse()
            .map(command => {
              const statusColors = getCommandStatusColors(command.status);

              return (
                <article
                  key={command.id}
                  style={{
                    borderRadius: 12,
                    padding: 12,
                    background: 'rgba(30, 41, 59, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.14)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 13 }}>{command.name}</strong>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          color: statusColors.color,
                          background: statusColors.background,
                        }}
                      >
                        {resolveCommandStatusText(command.status, props.t)}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(command.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {typeof command.durationMs === 'number' ? (
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>
                      {props.t('debugger.duration', { value: command.durationMs })}
                    </div>
                  ) : null}

                  {renderCommandPayloadSection(props.t('debugger.commandInput'), command.input)}
                  {command.status === 'error'
                    ? renderCommandPayloadSection(props.t('debugger.commandError'), command.error, '#fecaca')
                    : renderCommandPayloadSection(props.t('debugger.commandOutput'), command.output)}
                </article>
              );
            })}
        </div>
      ) : (
        <div style={{ color: '#94a3b8', fontSize: 13 }}>{props.t('debugger.emptyCommands')}</div>
      )}
    </div>
  );
}

export function DebuggerPanel(props: DebuggerPanelProps) {
  const { state, commands } = useChatKit();
  const { t } = useChatKitI18n();
  const events = useChatKitEventLog({ maxEvents: props.maxEvents });
  const rawTraceEntries = useChatKitRawTraceLog({ maxEntries: props.maxEvents });
  const commandEntries = useChatKitCommandLog();
  const [selectedProgressId, setSelectedProgressId] = useState<string>();

  const stateSnapshot = useMemo(() => formatDebugValue(state), [state]);
  const errorSnapshot = useMemo(
    () => (state.error ? formatDebugValue(state.error) : t('debugger.noError')),
    [state.error, t]
  );
  const latestCommand = useMemo(() => commandEntries[commandEntries.length - 1], [commandEntries]);
  const latestEvent = useMemo(() => events[events.length - 1], [events]);
  const latestRawMessage = useMemo(() => {
    for (let index = state.messages.length - 1; index >= 0; index -= 1) {
      const message = state.messages[index];
      if (message.role === 'assistant' && typeof message.raw !== 'undefined') {
        return message.raw;
      }
    }

    return undefined;
  }, [state.messages]);
  const progressEntries = useMemo(() => extractProgressEntries(latestRawMessage), [latestRawMessage]);
  const selectedProgressEntry = useMemo(() => {
    if (!progressEntries.length) {
      return undefined;
    }

    return progressEntries.find(entry => entry.id === selectedProgressId) ?? progressEntries[progressEntries.length - 1];
  }, [progressEntries, selectedProgressId]);
  const eventCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const event of events) {
      counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
    }

    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
  }, [events]);
  const canControlConversation = Boolean(state.currentConversationId) || state.pending || state.streaming;

  useEffect(() => {
    if (!progressEntries.length) {
      setSelectedProgressId(undefined);
      return;
    }

    if (!selectedProgressId || !progressEntries.some(entry => entry.id === selectedProgressId)) {
      setSelectedProgressId(progressEntries[progressEntries.length - 1]?.id);
    }
  }, [progressEntries, selectedProgressId]);

  if (props.visible === false) {
    return null;
  }

  return (
    <section
      aria-label={props.title ?? t('debugger.title')}
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
        border: '1px solid rgba(148, 163, 184, 0.24)',
        borderRadius: 20,
        color: '#e2e8f0',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: '0 16px 48px rgba(15, 23, 42, 0.18)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{props.title ?? t('debugger.title')}</div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            {t('debugger.currentConversation')}: {state.currentConversationId ?? '-'}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            {
              label: t('debugger.pending'),
              value: formatBoolean(state.pending, t('debugger.active'), t('debugger.inactive')),
            },
            {
              label: t('debugger.streaming'),
              value: formatBoolean(state.streaming, t('debugger.active'), t('debugger.inactive')),
            },
            {
              label: t('debugger.messageCount'),
              value: String(state.messages.length),
            },
            {
              label: t('debugger.conversationCount'),
              value: String(Object.keys(state.conversations).length),
            },
            {
              label: t('debugger.commandCount'),
              value: String(commandEntries.length),
            },
          ].map(item => (
            <div
              key={item.label}
              style={{
                minWidth: 112,
                padding: '8px 10px',
                borderRadius: 12,
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
              }}
            >
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ marginTop: 4, fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          padding: 14,
          borderRadius: 16,
          background: 'rgba(30, 41, 59, 0.72)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
        }}
      >
        <div style={{ fontWeight: 700, marginRight: 8, alignSelf: 'center' }}>{t('debugger.controls')}</div>
        {[
          {
            label: t('debugger.control.stop'),
            action: () => {
              commands.stop();
            },
          },
          {
            label: t('debugger.control.cancel'),
            action: () => {
              commands.cancel();
            },
          },
          {
            label: t('debugger.control.terminate'),
            action: () => {
              void commands.terminate({
                conversationId: state.currentConversationId,
              });
            },
          },
        ].map(control => (
          <button
            key={control.label}
            type="button"
            disabled={!canControlConversation}
            onClick={control.action}
            style={{
              borderRadius: 999,
              border: '1px solid rgba(148, 163, 184, 0.22)',
              background: canControlConversation ? 'rgba(255,255,255,0.08)' : 'rgba(148, 163, 184, 0.08)',
              color: canControlConversation ? '#e2e8f0' : '#94a3b8',
              padding: '8px 12px',
              cursor: canControlConversation ? 'pointer' : 'not-allowed',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {control.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        <div
          style={{
            borderRadius: 16,
            border: '1px solid rgba(148, 163, 184, 0.18)',
            background: 'rgba(15, 23, 42, 0.72)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 280,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>{t('debugger.eventLog')}</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>{events.length}</div>
          </div>
          {events.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 480 }}>
              {events
                .slice()
                .reverse()
                .map(event => (
                  <article
                    key={event.id}
                    style={{
                      borderRadius: 12,
                      padding: 12,
                      background: 'rgba(30, 41, 59, 0.85)',
                      border: '1px solid rgba(148, 163, 184, 0.14)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <strong style={{ fontSize: 13 }}>{event.name}</strong>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre
                      style={{
                        margin: '10px 0 0',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: 12,
                        color: '#cbd5e1',
                      }}
                    >
                      {formatDebugValue(event.payload)}
                    </pre>
                  </article>
                ))}
            </div>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>{t('debugger.emptyEvents')}</div>
          )}
        </div>

        <CommandLogCard commands={commandEntries} t={t} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(148, 163, 184, 0.18)',
              background: 'rgba(15, 23, 42, 0.72)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>{t('debugger.latestEvent')}</div>
            {latestEvent ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <strong>{latestEvent.name}</strong>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>
                    {new Date(latestEvent.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: 12,
                    color: '#cbd5e1',
                  }}
                >
                  {formatDebugValue(latestEvent.payload)}
                </pre>
              </>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>{t('debugger.noLatestEvent')}</div>
            )}
          </div>

          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(148, 163, 184, 0.18)',
              background: 'rgba(15, 23, 42, 0.72)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>{t('debugger.eventSummary')}</div>
            {eventCounts.length ? (
              eventCounts.map(([eventName, count]) => (
                <div
                  key={eventName}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    fontSize: 13,
                    color: '#cbd5e1',
                  }}
                >
                  <span>{eventName}</span>
                  <strong>{count}</strong>
                </div>
              ))
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>{t('debugger.emptyEvents')}</div>
            )}
          </div>

          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(148, 163, 184, 0.18)',
              background: 'rgba(15, 23, 42, 0.72)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>{t('debugger.latestCommand')}</div>
            {latestCommand ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <strong>{latestCommand.name}</strong>
                  <span style={{ color: getCommandStatusColors(latestCommand.status).color, fontSize: 12, fontWeight: 700 }}>
                    {resolveCommandStatusText(latestCommand.status, t)}
                  </span>
                </div>
                {typeof latestCommand.durationMs === 'number' ? (
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>
                    {t('debugger.duration', { value: latestCommand.durationMs })}
                  </div>
                ) : null}
                {renderCommandPayloadSection(t('debugger.commandInput'), latestCommand.input)}
                {latestCommand.status === 'error'
                  ? renderCommandPayloadSection(t('debugger.commandError'), latestCommand.error, '#fecaca')
                  : renderCommandPayloadSection(t('debugger.commandOutput'), latestCommand.output)}
              </>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>{t('debugger.emptyCommands')}</div>
            )}
          </div>

          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(148, 163, 184, 0.18)',
              background: 'rgba(15, 23, 42, 0.72)',
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('debugger.error')}</div>
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
                color: state.error ? '#fecaca' : '#cbd5e1',
              }}
            >
              {errorSnapshot}
            </pre>
          </div>
          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(148, 163, 184, 0.18)',
              background: 'rgba(15, 23, 42, 0.72)',
              padding: 16,
            }}
            >
              <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('debugger.latestRawMessage')}</div>
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
                color: latestRawMessage ? '#cbd5e1' : '#94a3b8',
                maxHeight: 320,
                overflowY: 'auto',
              }}
            >
              {latestRawMessage ? formatDebugValue(latestRawMessage) : t('debugger.noRawMessage')}
            </pre>
          </div>
          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(148, 163, 184, 0.18)',
              background: 'rgba(15, 23, 42, 0.72)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 700 }}>{t('debugger.progress')}</div>
            {progressEntries.length ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
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
                            ? '1px solid rgba(96, 165, 250, 0.6)'
                            : '1px solid rgba(148, 163, 184, 0.14)',
                          background: active ? 'rgba(37, 99, 235, 0.16)' : 'rgba(30, 41, 59, 0.85)',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          color: '#e2e8f0',
                          fontSize: 13,
                        }}
                      >
                        {entry.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{t('debugger.selectedProgress')}</div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: 12,
                    color: '#cbd5e1',
                    maxHeight: 320,
                    overflowY: 'auto',
                  }}
                >
                  {selectedProgressEntry ? formatDebugValue(selectedProgressEntry.payload) : t('debugger.emptyProgress')}
                </pre>
              </>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>{t('debugger.emptyProgress')}</div>
            )}
          </div>
          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(148, 163, 184, 0.18)',
              background: 'rgba(15, 23, 42, 0.72)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>{t('debugger.rawTrace')}</div>
            {rawTraceEntries.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                {rawTraceEntries
                  .slice()
                  .reverse()
                  .map(entry => (
                    <article
                      key={entry.id}
                      style={{
                        borderRadius: 12,
                        border: '1px solid rgba(148, 163, 184, 0.14)',
                        background: 'rgba(30, 41, 59, 0.85)',
                        padding: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <strong style={{ fontSize: 13 }}>{entry.messageId}</strong>
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre
                        style={{
                          margin: '10px 0 0',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontSize: 12,
                          color: '#cbd5e1',
                        }}
                      >
                        {formatDebugValue(entry.raw)}
                      </pre>
                    </article>
                  ))}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>{t('debugger.emptyRawTrace')}</div>
            )}
          </div>
          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(148, 163, 184, 0.18)',
              background: 'rgba(15, 23, 42, 0.72)',
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('debugger.stateSnapshot')}</div>
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
                color: '#cbd5e1',
                maxHeight: 440,
                overflowY: 'auto',
              }}
            >
              {stateSnapshot}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
