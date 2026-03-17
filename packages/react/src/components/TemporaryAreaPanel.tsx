import React from 'react';

import type { UploadedAttachmentInput } from '@kweaver-ai/chatkit-core';

import { useChatKitI18n } from '../ChatKitProvider.js';

function getAttachmentKey(attachment: UploadedAttachmentInput): string {
  return attachment.storageKey ?? attachment.fileId ?? attachment.url ?? attachment.fileName;
}

export interface TemporaryAreaPanelProps {
  files: UploadedAttachmentInput[];
  selectedAttachmentKeys?: string[];
  disabled?: boolean;
  onUpload?: (files: FileList | null) => void | Promise<void>;
  onToggleSelect?: (attachment: UploadedAttachmentInput, selected: boolean) => void | Promise<void>;
  onPreview?: (attachment: UploadedAttachmentInput) => void | Promise<void>;
  onRemove?: (attachment: UploadedAttachmentInput) => void | Promise<void>;
  onClear?: () => void | Promise<void>;
}

export function TemporaryAreaPanel(props: TemporaryAreaPanelProps) {
  const { t } = useChatKitI18n();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div
      style={{
        borderRadius: 18,
        border: '1px solid var(--chatkit-border, #d7deeb)',
        background: 'rgba(255,255,255,0.72)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>
            {t('assistant.temporaryArea')}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--chatkit-muted, #6b7280)' }}>{props.files.length}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            disabled={props.disabled}
            onChange={event => {
              void props.onUpload?.(event.target.files);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={props.disabled}
            onClick={() => fileInputRef.current?.click()}
            style={{
              borderRadius: 999,
              border: '1px solid var(--chatkit-border, #d7deeb)',
              background: '#ffffff',
              padding: '8px 12px',
              cursor: props.disabled ? 'not-allowed' : 'pointer',
              color: 'var(--chatkit-text, #111827)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {t('assistant.addTemporaryFiles')}
          </button>
          {props.files.length > 0 ? (
            <button
              type="button"
              disabled={props.disabled}
              onClick={() => void props.onClear?.()}
              style={{
                borderRadius: 999,
                border: '1px solid rgba(248, 113, 113, 0.24)',
                background: 'rgba(254, 242, 242, 0.92)',
                padding: '8px 12px',
                cursor: props.disabled ? 'not-allowed' : 'pointer',
                color: '#991b1b',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {t('assistant.clearTemporaryArea')}
            </button>
          ) : null}
        </div>
      </div>

      {props.files.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--chatkit-muted, #6b7280)' }}>{t('assistant.emptyTemporaryArea')}</div>
      ) : (
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {props.files.map(file => {
            const attachmentKey = getAttachmentKey(file);
            const isSelected = props.selectedAttachmentKeys?.includes(attachmentKey) ?? false;

            return (
              <article
                key={attachmentKey}
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
                <div
                  title={file.fileName}
                  style={{
                    fontWeight: 700,
                    color: 'var(--chatkit-text, #111827)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file.fileName}
                </div>

                {isSelected ? (
                  <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 700 }}>{t('assistant.selectedFile')}</div>
                ) : null}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={props.disabled}
                    onClick={() => void props.onToggleSelect?.(file, isSelected)}
                    style={{
                      borderRadius: 999,
                      border: '1px solid var(--chatkit-border, #d7deeb)',
                      background: isSelected ? 'rgba(219, 234, 254, 0.72)' : '#ffffff',
                      padding: '6px 10px',
                      cursor: props.disabled ? 'not-allowed' : 'pointer',
                      color: 'var(--chatkit-text, #111827)',
                      fontSize: 12,
                    }}
                  >
                    {isSelected ? t('assistant.unselectTemporaryFile') : t('assistant.selectTemporaryFile')}
                  </button>
                  {file.url ? (
                    <button
                      type="button"
                      disabled={props.disabled}
                      onClick={() => void props.onPreview?.(file)}
                      style={{
                        borderRadius: 999,
                        border: '1px solid var(--chatkit-border, #d7deeb)',
                        background: '#ffffff',
                        padding: '6px 10px',
                        cursor: props.disabled ? 'not-allowed' : 'pointer',
                        color: 'var(--chatkit-text, #111827)',
                        fontSize: 12,
                      }}
                    >
                      {t('assistant.previewFile')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={props.disabled}
                    onClick={() => void props.onRemove?.(file)}
                    style={{
                      borderRadius: 999,
                      border: '1px solid rgba(248, 113, 113, 0.24)',
                      background: 'rgba(254, 242, 242, 0.92)',
                      padding: '6px 10px',
                      cursor: props.disabled ? 'not-allowed' : 'pointer',
                      color: '#991b1b',
                      fontSize: 12,
                    }}
                  >
                    {t('assistant.removeTemporaryFile')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
