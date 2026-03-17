import React from 'react';

import type { ChatInterruptInfo } from '@kweaver-ai/chatkit-core';

import { useChatKitI18n } from '../ChatKitProvider.js';

export interface InterruptPanelProps {
  interrupt: ChatInterruptInfo;
  disabled?: boolean;
  onConfirm?: (modifiedArgs: Array<{ key: string; value: unknown }>) => void | Promise<void>;
  onSkip?: () => void | Promise<void>;
}

function isStructuredArgType(type: string | undefined): boolean {
  return type === 'object' || type === 'dict' || type === 'array';
}

function createInitialValues(interrupt: ChatInterruptInfo): Record<string, string> {
  const values: Record<string, string> = {};

  for (const arg of interrupt.data?.tool_args ?? []) {
    values[arg.key] = isStructuredArgType(arg.type)
      ? JSON.stringify(arg.value ?? null, null, 2)
      : typeof arg.value === 'string'
        ? arg.value
        : arg.value == null
          ? ''
          : String(arg.value);
  }

  return values;
}

function areValuesEqual(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return left === right;
  }
}

export function InterruptPanel(props: InterruptPanelProps) {
  const { t } = useChatKitI18n();
  const toolArgs = props.interrupt.data?.tool_args ?? [];
  const [values, setValues] = React.useState<Record<string, string>>(() => createInitialValues(props.interrupt));
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setValues(createInitialValues(props.interrupt));
    setErrors({});
  }, [props.interrupt]);

  const confirmationMessage =
    props.interrupt.data?.interrupt_config?.confirmation_message?.trim() || t('message.interrupt.defaultConfirmation');
  const requiresConfirmation = Boolean(props.interrupt.data?.interrupt_config?.requires_confirmation);

  const handleChange = (key: string, nextValue: string) => {
    setValues(currentValues => ({
      ...currentValues,
      [key]: nextValue,
    }));
    setErrors(currentErrors => {
      if (!currentErrors[key]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[key];
      return nextErrors;
    });
  };

  const handleConfirm = async () => {
    const nextErrors: Record<string, string> = {};
    const modifiedArgs: Array<{ key: string; value: unknown }> = [];

    for (const arg of toolArgs) {
      const rawValue = values[arg.key] ?? '';
      let parsedValue: unknown = rawValue;

      if (isStructuredArgType(arg.type)) {
        try {
          parsedValue = JSON.parse(rawValue);
        } catch {
          nextErrors[arg.key] = t('message.interrupt.invalidJson');
          continue;
        }
      }

      if (!areValuesEqual(parsedValue, arg.value)) {
        modifiedArgs.push({
          key: arg.key,
          value: parsedValue,
        });
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await props.onConfirm?.(modifiedArgs);
  };

  return (
    <div
      style={{
        alignSelf: 'flex-start',
        width: 'min(720px, 92%)',
        padding: '14px 16px',
        borderRadius: 18,
        border: '1px solid rgba(59, 130, 246, 0.18)',
        background: 'linear-gradient(180deg, rgba(239, 246, 255, 0.95), rgba(248, 250, 252, 0.96))',
        color: 'var(--chatkit-text, #111827)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          borderRadius: 14,
          border: '1px solid rgba(147, 197, 253, 0.38)',
          background: 'rgba(219, 234, 254, 0.58)',
          padding: '10px 12px',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          {requiresConfirmation ? t('message.interrupt.requiresConfirmation') : t('message.interrupt.reviewInput')}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>{confirmationMessage}</div>
      </div>

      {toolArgs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {toolArgs.map(arg => (
            <label key={arg.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{arg.key}</span>
              <textarea
                value={values[arg.key] ?? ''}
                disabled={props.disabled}
                onChange={event => handleChange(arg.key, event.target.value)}
                rows={isStructuredArgType(arg.type) ? 5 : 2}
                style={{
                  resize: 'vertical',
                  minHeight: isStructuredArgType(arg.type) ? 110 : 72,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: `1px solid ${errors[arg.key] ? 'rgba(248, 113, 113, 0.65)' : 'var(--chatkit-border, #d7deeb)'}`,
                  background: '#ffffff',
                  color: 'var(--chatkit-text, #111827)',
                  outline: 'none',
                  font: isStructuredArgType(arg.type) ? '12px/1.6 Consolas, Monaco, monospace' : 'inherit',
                  lineHeight: 1.6,
                }}
              />
              {errors[arg.key] ? (
                <span style={{ fontSize: 12, color: '#b91c1c' }}>{errors[arg.key]}</span>
              ) : null}
            </label>
          ))}
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={props.disabled}
          onClick={() => void props.onSkip?.()}
          style={{
            borderRadius: 999,
            border: '1px solid rgba(215, 222, 235, 0.9)',
            background: '#ffffff',
            padding: '8px 14px',
            cursor: props.disabled ? 'not-allowed' : 'pointer',
            color: 'var(--chatkit-text, #111827)',
            fontSize: 12,
          }}
        >
          {t('message.interrupt.skip')}
        </button>
        <button
          type="button"
          disabled={props.disabled}
          onClick={() => void handleConfirm()}
          style={{
            borderRadius: 999,
            border: '1px solid transparent',
            background: 'var(--chatkit-primary, #111827)',
            padding: '8px 14px',
            cursor: props.disabled ? 'not-allowed' : 'pointer',
            color: '#ffffff',
            fontSize: 12,
          }}
        >
          {t('message.interrupt.continue')}
        </button>
      </div>
    </div>
  );
}
