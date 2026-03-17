import React from 'react';

import type { OnboardingPrompt } from '@kweaver-ai/chatkit-core';

export interface OnboardingPanelProps {
  greeting?: string;
  description?: string;
  prompts?: OnboardingPrompt[];
  onSelectPrompt?: (prompt: OnboardingPrompt) => Promise<void> | void;
}

export function OnboardingPanel(props: OnboardingPanelProps) {
  const hasPrompts = Boolean(props.prompts?.length);

  return (
    <div
      style={{
        borderRadius: 20,
        border: '1px solid var(--chatkit-border, #d7deeb)',
        background:
          'radial-gradient(circle at top right, rgba(191, 219, 254, 0.45), transparent 38%), linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.96) 100%)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {props.greeting ? (
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>{props.greeting}</div>
      ) : null}
      {props.description ? (
        <div style={{ color: 'var(--chatkit-muted, #6b7280)', lineHeight: 1.6 }}>{props.description}</div>
      ) : null}
      {hasPrompts ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {props.prompts!.map(prompt => (
            <button
              key={prompt.id ?? prompt.label}
              type="button"
              aria-label={prompt.label}
              onClick={() => props.onSelectPrompt?.(prompt)}
              style={{
                textAlign: 'left',
                borderRadius: 18,
                border: '1px solid rgba(148, 163, 184, 0.28)',
                background: '#ffffff',
                padding: '12px 14px',
                cursor: 'pointer',
                color: 'var(--chatkit-text, #111827)',
                minWidth: 220,
                maxWidth: 320,
                boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
              }}
            >
              <div style={{ fontWeight: 600 }}>{prompt.label}</div>
              {prompt.description ? (
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--chatkit-muted, #6b7280)', lineHeight: 1.5 }}>
                  {prompt.description}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
