import React from 'react';

import type { ContextInfo } from '@kweaver-ai/chatkit-core';

import { useChatKitI18n } from '../ChatKitProvider.js';

export interface ContextPanelProps {
  info?: ContextInfo | null;
  loading?: boolean;
}

function renderMetadataValue(value: unknown): string {
  if (value == null) {
    return '-';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function ContextPanel(props: ContextPanelProps) {
  const { t } = useChatKitI18n();
  const sections = props.info?.sections?.filter(section => section.items.length > 0) ?? [];

  return (
    <div
      style={{
        borderRadius: 18,
        border: '1px solid var(--chatkit-border, #d7deeb)',
        background: 'rgba(255,255,255,0.72)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>
            {props.info?.title?.trim() || t('assistant.context')}
          </div>
          {props.info?.description ? (
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--chatkit-muted, #6b7280)' }}>{props.info.description}</div>
          ) : null}
        </div>
        <div style={{ fontSize: 12, color: 'var(--chatkit-muted, #6b7280)' }}>
          {sections.reduce((count, section) => count + section.items.length, 0)}
        </div>
      </div>

      {props.loading ? <div style={{ fontSize: 13, color: 'var(--chatkit-muted, #6b7280)' }}>{t('assistant.loadingContext')}</div> : null}

      {!props.loading && sections.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--chatkit-muted, #6b7280)' }}>{t('assistant.emptyContext')}</div>
      ) : null}

      {sections.map(section => (
        <div key={section.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>
              {section.title?.trim() || section.id}
            </div>
            {section.description ? (
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--chatkit-muted, #6b7280)' }}>{section.description}</div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {section.items.map(item => (
              <article
                key={item.id}
                style={{
                  borderRadius: 14,
                  border: '1px solid rgba(215, 222, 235, 0.9)',
                  background: '#ffffff',
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div>
                  <div
                    title={item.title}
                    style={{
                      fontWeight: 700,
                      color: 'var(--chatkit-text, #111827)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.title}
                  </div>
                  {item.subtitle ? (
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--chatkit-muted, #6b7280)' }}>{item.subtitle}</div>
                  ) : null}
                  {item.value ? (
                    <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, color: '#1d4ed8' }}>{item.value}</div>
                  ) : null}
                </div>

                {item.tags?.length ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {item.tags.map(tag => (
                      <span
                        key={`${item.id}-${tag}`}
                        style={{
                          borderRadius: 999,
                          padding: '4px 8px',
                          fontSize: 12,
                          background: 'rgba(219, 234, 254, 0.9)',
                          color: '#1d4ed8',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {item.description ? (
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: '#475569' }}>{item.description}</div>
                ) : null}

                {item.metadata && Object.keys(item.metadata).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(item.metadata).map(([key, value]) => (
                      <div key={`${item.id}-${key}`} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#64748b' }}>
                        <div style={{ minWidth: 72, fontWeight: 700, color: '#0f172a' }}>{key}</div>
                        <div style={{ flex: 1, overflowWrap: 'anywhere' }}>{renderMetadataValue(value)}</div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      alignSelf: 'flex-start',
                      textDecoration: 'none',
                      borderRadius: 999,
                      border: '1px solid rgba(215, 222, 235, 0.9)',
                      background: 'rgba(248, 250, 252, 0.9)',
                      padding: '6px 10px',
                      fontSize: 12,
                      color: 'var(--chatkit-text, #111827)',
                    }}
                  >
                    {t('assistant.openFile')}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
