import React from 'react';

import type { ConversationSessionStatus } from '@kweaver-ai/chatkit-core';

export interface ConversationSessionBadgeProps {
  session?: ConversationSessionStatus;
  loading?: boolean;
  active?: boolean;
  refreshText: string;
  resolveStatusText: (session?: ConversationSessionStatus) => string;
  resolveExpiresAtText: (session?: ConversationSessionStatus) => string | undefined;
  onRefresh?: () => void | Promise<void>;
}

export function ConversationSessionBadge(props: ConversationSessionBadgeProps) {
  if (!props.session && !props.loading) {
    return null;
  }

  const statusText = props.resolveStatusText(props.session);
  const expiresAtText = props.resolveExpiresAtText(props.session);

  return (
    <div
      style={{
        marginTop: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          borderRadius: 999,
          padding: '6px 10px',
          background: props.active ? 'rgba(37, 99, 235, 0.12)' : 'rgba(148, 163, 184, 0.14)',
          color: props.active ? '#1d4ed8' : 'var(--chatkit-muted, #6b7280)',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: props.active ? '#2563eb' : '#94a3b8',
          }}
        />
        {props.loading ? `${statusText}...` : statusText}
      </span>

      {expiresAtText ? (
        <span style={{ fontSize: 12, color: 'var(--chatkit-muted, #6b7280)' }}>{expiresAtText}</span>
      ) : null}

      {props.onRefresh ? (
        <button
          type="button"
          onClick={() => {
            void props.onRefresh?.();
          }}
          style={{
            borderRadius: 999,
            border: '1px solid var(--chatkit-border, #d7deeb)',
            background: '#ffffff',
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--chatkit-text, #111827)',
          }}
        >
          {props.refreshText}
        </button>
      ) : null}
    </div>
  );
}
