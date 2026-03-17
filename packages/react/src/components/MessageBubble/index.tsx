import React from 'react';

import type { ChatMessage, ChatMessageAttachment } from '@kweaver-ai/chatkit-core';
import { Button, Card, Flex, Input, Space, Tag, Typography } from 'antd';
import XMarkdown from '@ant-design/x-markdown';

import { useChatKitI18n } from '../../ChatKitProvider.js';
import styles from './MessageBubble.module.css';

function resolveErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export interface MessageBubbleProps {
  message: ChatMessage;
  disabled?: boolean;
  isLastAssistantMessage?: boolean;
  isLastUserMessage?: boolean;
  isEditing?: boolean;
  onCopy?: (message: ChatMessage) => void | Promise<void>;
  onStartEdit?: (message: ChatMessage) => void | Promise<void>;
  onSubmitEdit?: (message: ChatMessage, nextText: string) => void | Promise<void>;
  onCancelEdit?: (message: ChatMessage) => void | Promise<void>;
  onRegenerate?: (message: ChatMessage) => void | Promise<void>;
  onPreviewAttachment?: (attachment: ChatMessageAttachment, message: ChatMessage) => void | Promise<void>;
  onFeedback?: (message: ChatMessage, feedback: 'upvote' | 'downvote') => void | Promise<void>;
  onSelectRelatedQuestion?: (question: string) => void | Promise<void>;
}

export function MessageBubble(props: MessageBubbleProps) {
  const { t } = useChatKitI18n();
  const [editValue, setEditValue] = React.useState(props.message.content);
  const isAssistant = props.message.role === 'assistant';
  const attachments = props.message.metadata?.attachments ?? [];
  const relatedQuestions = props.message.metadata?.relatedQuestions ?? [];
  const messageError = props.message.metadata?.error;

  React.useEffect(() => {
    if (props.isEditing) {
      setEditValue(props.message.content);
    }
  }, [props.isEditing, props.message.content]);

  return (
    <Flex vertical align={isAssistant ? 'flex-start' : 'flex-end'} className={styles.wrapper}>
      {props.message.applicationContext?.title ? (
        <Tag color="blue">{t('assistant.context')}: {props.message.applicationContext.title}</Tag>
      ) : null}

      <Card className={`${styles.bubble} ${isAssistant ? styles.assistant : styles.user}`}>
        {props.isEditing && props.message.role === 'user' ? (
          <Flex vertical gap={8}>
            <Input.TextArea
              value={editValue}
              rows={4}
              disabled={props.disabled}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setEditValue(event.target.value)}
            />
            <Space>
              <Button
                size="small"
                type="primary"
                disabled={props.disabled || !editValue.trim()}
                onClick={() => {
                  void props.onSubmitEdit?.(props.message, editValue);
                }}
              >
                {t('message.confirmEdit')}
              </Button>
              <Button
                size="small"
                onClick={() => {
                  void props.onCancelEdit?.(props.message);
                }}
              >
                {t('message.cancelEdit')}
              </Button>
            </Space>
          </Flex>
        ) : (
          <XMarkdown content={props.message.content || ''} openLinksInNewTab />
        )}
      </Card>

      {attachments.length > 0 ? (
        <Space wrap size={6}>
          {attachments.map((attachment, index) => (
            <Tag
              key={`${attachment.fileName}-${index}`}
              className={styles.attachment}
              onClick={() => {
                void props.onPreviewAttachment?.(attachment, props.message);
              }}
            >
              {attachment.fileName}
            </Tag>
          ))}
        </Space>
      ) : null}

      {messageError ? (
        <Card size="small" className={styles.errorCard}>
          <Typography.Text type="danger">{resolveErrorText(messageError.detail)}</Typography.Text>
        </Card>
      ) : null}

      <Space wrap>
        {props.onCopy && props.message.content.trim() ? (
          <Button size="small" onClick={() => void props.onCopy?.(props.message)} disabled={props.disabled}>
            {t('message.copy')}
          </Button>
        ) : null}
        {props.onStartEdit && props.message.role === 'user' && props.isLastUserMessage && !props.isEditing ? (
          <Button size="small" onClick={() => void props.onStartEdit?.(props.message)} disabled={props.disabled}>
            {t('message.edit')}
          </Button>
        ) : null}
        {props.onRegenerate && props.message.role === 'assistant' ? (
          <Button size="small" onClick={() => void props.onRegenerate?.(props.message)} disabled={props.disabled}>
            {t('message.regenerate')}
          </Button>
        ) : null}
        {props.onFeedback && props.message.role === 'assistant' ? (
          <>
            <Button size="small" onClick={() => void props.onFeedback?.(props.message, 'upvote')} disabled={props.disabled}>
              {t('message.feedback.upvote')}
            </Button>
            <Button size="small" onClick={() => void props.onFeedback?.(props.message, 'downvote')} disabled={props.disabled}>
              {t('message.feedback.downvote')}
            </Button>
          </>
        ) : null}
      </Space>

      {props.onSelectRelatedQuestion && props.isLastAssistantMessage && relatedQuestions.length > 0 ? (
        <Space wrap>
          {relatedQuestions.map((question, index) => (
            <Button
              key={`${question}-${index}`}
              size="small"
              onClick={() => {
                void props.onSelectRelatedQuestion?.(question);
              }}
              disabled={props.disabled}
            >
              {question}
            </Button>
          ))}
        </Space>
      ) : null}

      <Typography.Text type="secondary" className={styles.statusText}>
        {props.message.status === 'streaming'
          ? t('message.status.streaming')
          : props.message.status === 'error'
            ? t('message.status.error')
            : t('message.status.done')}
      </Typography.Text>
    </Flex>
  );
}
