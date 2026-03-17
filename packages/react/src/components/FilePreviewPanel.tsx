import React from 'react';

import type { ChatAttachmentInput, ChatMessageAttachment } from '@kweaver-ai/chatkit-core';

import { useChatKitI18n } from '../ChatKitProvider.js';

export interface PreviewAttachment {
  source: 'local' | 'uploaded';
  fileName: string;
  url?: string;
  contentType?: string;
  content?: Blob | ArrayBuffer | Uint8Array | string;
}

export interface FilePreviewPanelProps {
  file: PreviewAttachment;
  onClose?: () => void;
}

function toPreviewUrl(file: PreviewAttachment): string | undefined {
  if (file.url) {
    return file.url;
  }

  if (typeof Blob !== 'undefined' && file.content instanceof Blob) {
    return URL.createObjectURL(file.content);
  }

  if (typeof Blob !== 'undefined' && file.content instanceof ArrayBuffer) {
    return URL.createObjectURL(new Blob([file.content], { type: file.contentType || 'application/octet-stream' }));
  }

  if (typeof Blob !== 'undefined' && file.content instanceof Uint8Array) {
    const copied = new Uint8Array(file.content.byteLength);
    copied.set(file.content);
    return URL.createObjectURL(
      new Blob([copied], {
        type: file.contentType || 'application/octet-stream',
      })
    );
  }

  return undefined;
}

function canRenderTextInline(file: PreviewAttachment): file is PreviewAttachment & { content: string } {
  return typeof file.content === 'string';
}

export function toPreviewAttachment(attachment: ChatMessageAttachment | ChatAttachmentInput): PreviewAttachment {
  if ('content' in attachment && attachment.source === 'local') {
    return {
      source: attachment.source,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      content: attachment.content,
    };
  }

  return {
    source: attachment.source,
    fileName: attachment.fileName,
    url: attachment.url,
    contentType: attachment.contentType,
  };
}

export function FilePreviewPanel(props: FilePreviewPanelProps) {
  const { t } = useChatKitI18n();
  const previewUrl = React.useMemo(() => toPreviewUrl(props.file), [props.file]);

  React.useEffect(() => {
    return () => {
      if (previewUrl && !props.file.url) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, props.file.url]);

  return (
    <section
      style={{
        borderRadius: 18,
        border: '1px solid var(--chatkit-border, #d7deeb)',
        background: 'rgba(255,255,255,0.92)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--chatkit-text, #111827)' }}>{t('assistant.previewFile')}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--chatkit-muted, #6b7280)' }}>{props.file.fileName}</div>
        </div>
        <button
          type="button"
          onClick={() => props.onClose?.()}
          style={{
            borderRadius: 999,
            border: '1px solid var(--chatkit-border, #d7deeb)',
            background: '#ffffff',
            padding: '8px 12px',
            cursor: 'pointer',
            color: 'var(--chatkit-text, #111827)',
          }}
        >
          {t('assistant.closePreview')}
        </button>
      </div>

      {canRenderTextInline(props.file) ? (
        <pre
          style={{
            margin: 0,
            padding: 16,
            borderRadius: 14,
            background: 'rgba(248, 250, 252, 0.92)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            color: 'var(--chatkit-text, #111827)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 420,
            overflow: 'auto',
          }}
        >
          {props.file.content}
        </pre>
      ) : previewUrl ? (
        props.file.contentType?.startsWith('image/') ? (
          <img
            src={previewUrl}
            alt={props.file.fileName}
            style={{
              width: '100%',
              maxHeight: 520,
              objectFit: 'contain',
              borderRadius: 14,
              border: '1px solid rgba(226, 232, 240, 0.9)',
              background: 'rgba(248, 250, 252, 0.92)',
            }}
          />
        ) : (
          <iframe
            title={props.file.fileName}
            src={previewUrl}
            style={{
              width: '100%',
              minHeight: 420,
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: 14,
              background: 'rgba(248, 250, 252, 0.92)',
            }}
          />
        )
      ) : (
        <div
          style={{
            borderRadius: 14,
            border: '1px dashed rgba(203, 213, 225, 0.92)',
            background: 'rgba(248, 250, 252, 0.92)',
            color: 'var(--chatkit-muted, #6b7280)',
            padding: 24,
            textAlign: 'center',
          }}
        >
          {t('assistant.noPreview')}
        </div>
      )}
    </section>
  );
}
