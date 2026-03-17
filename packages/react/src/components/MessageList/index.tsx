import React from 'react';

import type { ChatMessage, ChatMessageAttachment } from '@kweaver-ai/chatkit-core';
import { Empty, List } from 'antd';

import { useChatKitI18n } from '../../ChatKitProvider.js';
import { MessageBubble } from '../MessageBubble/index.js';
import styles from './MessageList.module.css';

export interface MessageListProps {
  messages: ChatMessage[];
  emptyText?: string;
  disabled?: boolean;
  editingMessageId?: string;
  onCopy?: (message: ChatMessage) => void | Promise<void>;
  onStartEdit?: (message: ChatMessage, index: number) => void | Promise<void>;
  onSubmitEdit?: (message: ChatMessage, nextText: string, index: number) => void | Promise<void>;
  onCancelEdit?: (message: ChatMessage, index: number) => void | Promise<void>;
  onRegenerate?: (message: ChatMessage, index: number) => void | Promise<void>;
  onPreviewAttachment?: (attachment: ChatMessageAttachment, message: ChatMessage, index: number) => void | Promise<void>;
  onFeedback?: (message: ChatMessage, feedback: 'upvote' | 'downvote') => void | Promise<void>;
  onSelectRelatedQuestion?: (question: string, message: ChatMessage, index: number) => void | Promise<void>;
}

export function MessageList(props: MessageListProps) {
  const { t } = useChatKitI18n();

  const lastAssistantMessageIndex = React.useMemo(() => {
    for (let index = props.messages.length - 1; index >= 0; index -= 1) {
      if (props.messages[index]?.role === 'assistant') {
        return index;
      }
    }

    return -1;
  }, [props.messages]);

  const lastUserMessageIndex = React.useMemo(() => {
    for (let index = props.messages.length - 1; index >= 0; index -= 1) {
      if (props.messages[index]?.role === 'user') {
        return index;
      }
    }

    return -1;
  }, [props.messages]);

  if (props.messages.length === 0) {
    return <Empty description={props.emptyText ?? t('empty.startConversation')} />;
  }

  return (
    <List
      className={styles.list}
      dataSource={props.messages}
      split={false}
      renderItem={(message, index) => (
        <List.Item className={styles.item}>
          <MessageBubble
            message={message}
            disabled={props.disabled}
            isLastAssistantMessage={index === lastAssistantMessageIndex}
            isLastUserMessage={index === lastUserMessageIndex}
            isEditing={props.editingMessageId === message.id}
            onCopy={props.onCopy}
            onStartEdit={props.onStartEdit ? nextMessage => props.onStartEdit?.(nextMessage, index) : undefined}
            onSubmitEdit={
              props.onSubmitEdit
                ? (nextMessage, nextText) => props.onSubmitEdit?.(nextMessage, nextText, index)
                : undefined
            }
            onCancelEdit={props.onCancelEdit ? nextMessage => props.onCancelEdit?.(nextMessage, index) : undefined}
            onRegenerate={props.onRegenerate ? nextMessage => props.onRegenerate?.(nextMessage, index) : undefined}
            onPreviewAttachment={
              props.onPreviewAttachment
                ? (attachment, nextMessage) => props.onPreviewAttachment?.(attachment, nextMessage, index)
                : undefined
            }
            onFeedback={props.onFeedback}
            onSelectRelatedQuestion={
              props.onSelectRelatedQuestion
                ? question => props.onSelectRelatedQuestion?.(question, message, index)
                : undefined
            }
          />
        </List.Item>
      )}
    />
  );
}
