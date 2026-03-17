import React from 'react';

import type { UploadedAttachmentInput } from '@kweaver-ai/chatkit-core';
import type { ChatMessageAttachment } from '@kweaver-ai/chatkit-core';

import { useChatKitI18n } from '../ChatKitProvider.js';

export interface ConversationFileItem {
  id: string;
  attachment: ChatMessageAttachment;
  usageCount: number;
}

export interface ConversationFilesPanelProps {
  files: ConversationFileItem[];
  selectedAttachmentKeys?: string[];
  onReuse?: (attachment: UploadedAttachmentInput) => void | Promise<void>;
  onRemoveReuse?: (attachment: UploadedAttachmentInput) => void | Promise<void>;
  onPreview?: (file: ConversationFileItem) => void | Promise<void>;
}

function formatFileSize(size?: number): string | undefined {
  if (size == null || Number.isNaN(size)) {
    return undefined;
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(size >= 10 * 1024 ? 0 : 1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function ConversationFilesPanel(props: ConversationFilesPanelProps) {
  const { t } = useChatKitI18n();

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
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>{t('assistant.files')}</div>
        <div style={{ fontSize: 12, color: 'var(--chatkit-muted, #6b7280)' }}>{props.files.length}</div>
      </div>

      {props.files.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--chatkit-muted, #6b7280)' }}>{t('assistant.emptyFiles')}</div>
      ) : (
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {props.files.map(file => {
            const attachmentKey =
              file.attachment.storageKey ?? file.attachment.fileId ?? file.attachment.url ?? file.attachment.fileName;
            const isSelected = props.selectedAttachmentKeys?.includes(attachmentKey) ?? false;
            const sourceText =
              file.attachment.source === 'uploaded'
                ? t('assistant.fileSource.uploaded')
                : t('assistant.fileSource.local');
            const sizeText = formatFileSize(
              file.attachment.size ?? (typeof file.attachment.metadata?.size === 'number' ? file.attachment.metadata.size : undefined)
            );
            const usageText = t('assistant.fileUsageCount', { value: file.usageCount });

            return (
              <article
                key={file.id}
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
                    title={file.attachment.fileName}
                    style={{
                      fontWeight: 700,
                      color: 'var(--chatkit-text, #111827)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.attachment.fileName}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    <span
                      style={{
                        borderRadius: 999,
                        padding: '4px 8px',
                        fontSize: 12,
                        background: file.attachment.source === 'uploaded' ? 'rgba(219, 234, 254, 0.9)' : 'rgba(226, 232, 240, 0.9)',
                        color: file.attachment.source === 'uploaded' ? '#1d4ed8' : '#334155',
                      }}
                    >
                      {sourceText}
                    </span>
                    {sizeText ? (
                      <span
                        style={{
                          borderRadius: 999,
                          padding: '4px 8px',
                          fontSize: 12,
                          background: 'rgba(241, 245, 249, 0.9)',
                          color: '#475569',
                        }}
                      >
                        {sizeText}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--chatkit-muted, #6b7280)' }}>{usageText}</div>

                {isSelected ? (
                  <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 700 }}>{t('assistant.selectedFile')}</div>
                ) : null}

                {file.attachment.url ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        void props.onPreview?.(file);
                      }}
                      style={{
                        alignSelf: 'flex-start',
                        borderRadius: 999,
                        border: '1px solid rgba(215, 222, 235, 0.9)',
                        background: 'rgba(248, 250, 252, 0.9)',
                        padding: '6px 10px',
                        fontSize: 12,
                        color: 'var(--chatkit-text, #111827)',
                        cursor: 'pointer',
                      }}
                    >
                      {t('assistant.previewFile')}
                    </button>
                    <a
                      href={file.attachment.url}
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
                    {file.attachment.source === 'uploaded' ? (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttachment = {
                            source: 'uploaded',
                            fileName: file.attachment.fileName,
                            url: file.attachment.url,
                            fileId: file.attachment.fileId,
                            storageKey: file.attachment.storageKey,
                            temporaryAreaId: file.attachment.temporaryAreaId,
                            contentType: file.attachment.contentType,
                            size: file.attachment.size,
                            metadata: file.attachment.metadata,
                          } satisfies UploadedAttachmentInput;

                          if (isSelected) {
                            void props.onRemoveReuse?.(nextAttachment);
                            return;
                          }

                          void props.onReuse?.(nextAttachment);
                        }}
                        style={{
                          borderRadius: 999,
                          border: '1px solid rgba(215, 222, 235, 0.9)',
                          background: '#ffffff',
                          padding: '6px 10px',
                          fontSize: 12,
                          color: 'var(--chatkit-text, #111827)',
                          cursor: 'pointer',
                        }}
                      >
                        {isSelected ? t('assistant.removeReusedFile') : t('assistant.reuseFile')}
                      </button>
                    ) : null}
                  </div>
                ) : file.attachment.source === 'uploaded' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const nextAttachment = {
                        source: 'uploaded',
                        fileName: file.attachment.fileName,
                        url: file.attachment.url,
                        fileId: file.attachment.fileId,
                        storageKey: file.attachment.storageKey,
                        temporaryAreaId: file.attachment.temporaryAreaId,
                        contentType: file.attachment.contentType,
                        size: file.attachment.size,
                        metadata: file.attachment.metadata,
                      } satisfies UploadedAttachmentInput;

                      if (isSelected) {
                        void props.onRemoveReuse?.(nextAttachment);
                        return;
                      }

                      void props.onReuse?.(nextAttachment);
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      borderRadius: 999,
                      border: '1px solid rgba(215, 222, 235, 0.9)',
                      background: '#ffffff',
                      padding: '6px 10px',
                      fontSize: 12,
                      color: 'var(--chatkit-text, #111827)',
                      cursor: 'pointer',
                    }}
                  >
                    {isSelected ? t('assistant.removeReusedFile') : t('assistant.reuseFile')}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
