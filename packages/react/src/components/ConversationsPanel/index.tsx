import React from 'react';

import type { ConversationRecord } from '@kweaver-ai/chatkit-core';
import { Conversations } from '@ant-design/x';
import { Button, Flex, Input, Spin, Typography } from 'antd';

import styles from './ConversationsPanel.module.css';

export interface ConversationsPanelProps {
  conversations: ConversationRecord[];
  currentConversationId?: string;
  loading?: boolean;
  title: string;
  unreadSummary?: string;
  emptyText: string;
  loadingText: string;
  searchPlaceholder: string;
  refreshText: string;
  loadMoreText: string;
  renameText: string;
  deleteText: string;
  secondaryActionText?: string;
  searchQuery: string;
  hasMore?: boolean;
  loadingMore?: boolean;
  onSearchChange: (nextValue: string) => void;
  onRefresh?: () => void | Promise<void>;
  onLoadMore?: () => void | Promise<void>;
  onSecondaryAction?: () => void | Promise<void>;
  onSelect: (conversationId: string) => void | Promise<void>;
  onRename?: (conversation: ConversationRecord) => void | Promise<void>;
  onDelete?: (conversation: ConversationRecord) => void | Promise<void>;
}

function getConversationLabel(conversation: ConversationRecord): string {
  return conversation.title?.trim() || conversation.id;
}

export function ConversationsPanel(props: ConversationsPanelProps) {
  const filteredConversations = React.useMemo(() => {
    const normalizedQuery = props.searchQuery.trim().toLowerCase();

    const sortedConversations = [...props.conversations].sort((left, right) => {
      if (left.id === props.currentConversationId) {
        return -1;
      }
      if (right.id === props.currentConversationId) {
        return 1;
      }
      return getConversationLabel(left).localeCompare(getConversationLabel(right));
    });

    if (!normalizedQuery) {
      return sortedConversations;
    }

    return sortedConversations.filter(conversation => {
      const label = getConversationLabel(conversation).toLowerCase();
      return label.includes(normalizedQuery) || conversation.id.toLowerCase().includes(normalizedQuery);
    });
  }, [props.conversations, props.currentConversationId, props.searchQuery]);

  return (
    <aside className={styles.root}>
      <Flex justify="space-between" align="center" gap={8}>
        <div>
          <Typography.Text strong>{props.title}</Typography.Text>
          {props.unreadSummary ? (
            <div>
              <Typography.Text type="secondary">{props.unreadSummary}</Typography.Text>
            </div>
          ) : null}
        </div>
        <Flex gap={8}>
          {props.onSecondaryAction ? (
            <Button size="small" onClick={() => void props.onSecondaryAction?.()}>
              {props.secondaryActionText}
            </Button>
          ) : null}
          {props.onRefresh ? (
            <Button size="small" onClick={() => void props.onRefresh?.()}>
              {props.refreshText}
            </Button>
          ) : null}
        </Flex>
      </Flex>

      <Input
        size="small"
        value={props.searchQuery}
        placeholder={props.searchPlaceholder}
        onChange={event => {
          props.onSearchChange(event.target.value);
        }}
      />

      {props.loading ? (
        <Flex className={styles.loading} gap={8} align="center">
          <Spin size="small" />
          <Typography.Text type="secondary">{props.loadingText}</Typography.Text>
        </Flex>
      ) : null}

      {!props.loading && filteredConversations.length === 0 ? (
        <Typography.Text type="secondary">{props.emptyText}</Typography.Text>
      ) : null}

      <Conversations
        className={styles.conversations}
        activeKey={props.currentConversationId}
        items={filteredConversations.map(conversation => ({
          key: conversation.id,
          label: getConversationLabel(conversation),
        }))}
        onActiveChange={value => {
          if (typeof value === 'string') {
            void props.onSelect(value);
          }
        }}
        menu={
          props.onRename || props.onDelete
            ? conversation => ({
                items: [
                  ...(props.onRename
                    ? [
                        {
                          key: 'rename',
                          label: props.renameText,
                        },
                      ]
                    : []),
                  ...(props.onDelete
                    ? [
                        {
                          key: 'delete',
                          label: props.deleteText,
                          danger: true,
                        },
                      ]
                    : []),
                ],
                onClick: ({ key }) => {
                  const targetConversation = props.conversations.find(item => item.id === conversation.key);
                  if (!targetConversation) {
                    return;
                  }

                  if (key === 'rename') {
                    void props.onRename?.(targetConversation);
                    return;
                  }

                  if (key === 'delete') {
                    void props.onDelete?.(targetConversation);
                  }
                },
              })
            : undefined
        }
      />

      {props.hasMore ? (
        <Button size="small" block loading={props.loadingMore} onClick={() => void props.onLoadMore?.()}>
          {props.loadMoreText}
        </Button>
      ) : null}
    </aside>
  );
}
