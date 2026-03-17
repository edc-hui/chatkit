import React from 'react';

import type {
  ApplicationContext,
  ChatAttachmentInput,
  UploadedAttachmentInput,
} from '@kweaver-ai/chatkit-core';
import { Sender as XSender } from '@ant-design/x';
import { Button, Space, Tag, Tooltip, message, Row, Col } from 'antd';
import { useChatKitI18n, useChatKit } from '../../ChatKitProvider.js';
import IconFont from '../IconFont/index.js';
import ResizeObserver from '../ResizeObserver/index.js';
import FileUploadBtn from '../FileUploadBtn/index.js';
import { uploadTemporaryFile } from '../FileUploadBtn/uploadTemporaryFile.js';
import { extractNewTemporaryAttachments, resolveSenderState } from './senderState.js';
import styles from './Sender.module.css';

export interface SenderProps {
  disabled?: boolean;
  loading?: boolean;
  allowAttachments?: boolean;
  allowDeepThink?: boolean;
  placeholder?: string;
  submitLabel?: string;
  applicationContext?: ApplicationContext;
  onRemoveApplicationContext?: () => void;
  inputAttachments?: ChatAttachmentInput[];
  onInputAttachmentsChange?: (attachments: ChatAttachmentInput[]) => void;
  tempFileList?: UploadedAttachmentInput[];
  onCancel?: () => void;
  onNewConversation?: () => void;
  onSend: (input: {
    text: string;
    attachments?: ChatAttachmentInput[];
    deepThink?: boolean;
  }) => Promise<void> | void;
}

export function Sender(props: SenderProps) {
  const { t } = useChatKitI18n();
  const { state, commands } = useChatKit();
  const [deepThink] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [colSpan, setColSpan] = React.useState(8);
  const [messageApi, contextHolder] = message.useMessage();

  const inputAttachments = props.inputAttachments ?? [];
  const tempFileList = props.tempFileList ?? [];
  const { displayFiles, attachmentsToSend, inputDisabled } = resolveSenderState({
    value,
    inputAttachments,
    tempFileList,
  });

  const removeAttachment = (indexToRemove: number) => {
    props.onInputAttachmentsChange?.(inputAttachments.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (message: string) => {
    const text = message.trim();
    if ((inputDisabled && !text) || props.loading) {
      return;
    }

    await props.onSend({
      text,
      ...(attachmentsToSend.length > 0 ? { attachments: attachmentsToSend } : {}),
      ...(props.allowDeepThink ? { deepThink } : {}),
    });

    setValue('');
  };

  const handleUploadFile = React.useCallback(
    async (file: File) => {
      const previousTemporaryAttachments = state.temporaryAttachments;
      const nextState = await uploadTemporaryFile({
        file,
        conversationId: state.currentConversationId,
        createConversation: commands.createConversation,
        uploadTemporaryFiles: commands.uploadTemporaryFiles,
      });

      const appendedAttachments = extractNewTemporaryAttachments({
        previousTemporaryAttachments,
        nextTemporaryAttachments: nextState.temporaryAttachments,
      });
      commands.setInputFiles({
        attachments: appendedAttachments,
        mode: 'append',
      });
    },
    [commands.createConversation, commands.setInputFiles, commands.uploadTemporaryFiles, state.currentConversationId, state.temporaryAttachments]
  );

  return (
    <div className={styles.container}>
      {contextHolder}
      <XSender
        className={`${styles.sender} agent-web-sender`}
        value={value}
        loading={props.loading}
        disabled={props.disabled}
        placeholder={props.placeholder ?? t('sender.placeholder')}
        onChange={(nextValue: string) => {
          setValue(nextValue);
        }}
        onSubmit={(message: string) => {
          void handleSubmit(message);
        }}
        onPasteFile={(files: FileList) => {
          Array.from(files).forEach(file => {
            void handleUploadFile(file).catch((error: unknown) => {
              const fallbackMessage = t('assistant.error');
              const errorMessage = error instanceof Error ? error.message : fallbackMessage;
              void messageApi.error(errorMessage || fallbackMessage);
            });
          });
        }}
        autoSize={{ minRows: 1, maxRows: 6 }}
        header={
          <XSender.Header title="" open={displayFiles.length > 0} closable={false}>
            <ResizeObserver
              onResize={({ width }) => {
                if (width < 400) {
                  setColSpan(12);
                } else {
                  setColSpan(8);
                }
              }}
            >
              <div className="dip-full">
                <Row gutter={[16, 16]} className={styles.fileWrapper}>
                  {displayFiles.map((file: any) => (
                    <Col span={colSpan} key={file.storageKey ?? file.fileId ?? file.url ?? file.fileName}>
                      <div className={styles.fileItem}>
                        <IconFont type="icon-dip-color-txt" style={{ fontSize: 20 }} />
                        <div className={styles.fileItemContent}>
                          <span className={styles.fileName} title={file.fileName}>
                            {file.fileName}
                          </span>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
            </ResizeObserver>
          </XSender.Header>
        }
        footer={(_, info: { components: any }) => {
          const { SendButton, LoadingButton } = info.components;
          return (
            <div className={styles.footer}>
              <span className={styles.left}>
                {props.allowAttachments ? (
                  <FileUploadBtn
                    disabled={props.disabled || props.loading}
                    onSuccess={({ temporaryAttachments, previousTemporaryAttachments }) => {
                      const appendedAttachments = extractNewTemporaryAttachments({
                        previousTemporaryAttachments,
                        nextTemporaryAttachments: temporaryAttachments,
                      });
                      commands.setInputFiles({
                        attachments: appendedAttachments,
                        mode: 'append',
                      });
                    }}
                  />
                ) : null}
                {props.onNewConversation ? (
                  <div className={styles.newConversation}>
                    <Button
                      type="text"
                      icon={<IconFont type="icon-dip-chat1" />}
                      onClick={props.onNewConversation}
                    >
                      {t('assistant.newChat')}
                    </Button>
                  </div>
                ) : null}
                {props.applicationContext?.title ? (
                  <Tag
                    color="blue"
                    closable={!props.disabled}
                    onClose={event => {
                      event.preventDefault();
                      props.onRemoveApplicationContext?.();
                    }}
                  >
                    {props.applicationContext.title}
                  </Tag>
                ) : null}
              </span>
              <span className={styles.right}>
                {props.loading ? (
                  <Tooltip title={t('assistant.stop')}>
                    <LoadingButton onClick={props.onCancel} type="default" disabled={false} />
                  </Tooltip>
                ) : (
                  <Tooltip title={t('sender.placeholder')} open={inputDisabled ? undefined : false}>
                    <SendButton
                      onClick={() => {
                        if (!value.trim()) {
                          void handleSubmit(value);
                        }
                      }}
                      shape="default"
                      type="primary"
                      disabled={inputDisabled}
                    >
                      {props.submitLabel}
                    </SendButton>
                  </Tooltip>
                )}
              </span>
            </div>
          );
        }}
        style={{ resize: 'none' }}
        suffix={false}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === 'Enter' && !event.shiftKey && !value.trim()) {
            event.preventDefault();
            void handleSubmit(value);
            return false;
          }
          return;
        }}
      />
    </div>
  );
}
