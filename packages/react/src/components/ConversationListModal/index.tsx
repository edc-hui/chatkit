import React from 'react';

import type { ConversationRecord } from '@kweaver-ai/chatkit-core';
import { Modal } from 'antd';

import { useChatKitI18n } from '../../ChatKitProvider.js';
import { ConversationsPanel } from '../ConversationsPanel/index.js';
import styles from './ConversationListModal.module.css';

export interface ConversationListModalProps {
  open?: boolean;
  conversations: ConversationRecord[];
  currentConversationId?: string;
  unreadSummary?: string;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  searchQuery: string;
  onClose?: () => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  onLoadMore?: () => void | Promise<void>;
  onSearchChange: (nextValue: string) => void;
  onSelect: (conversationId: string) => void | Promise<void>;
  onRename?: (conversation: ConversationRecord) => void | Promise<void>;
  onDelete?: (conversation: ConversationRecord) => void | Promise<void>;
}

export function ConversationListModal(props: ConversationListModalProps) {
  const { t } = useChatKitI18n();

  return (
    <Modal
      className={styles.modal}
      title={t('assistant.allConversations')}
      width={860}
      open={props.open}
      footer={null}
      onCancel={() => {
        void props.onClose?.();
      }}
    >
      <ConversationsPanel
        conversations={props.conversations}
        currentConversationId={props.currentConversationId}
        unreadSummary={props.unreadSummary}
        loading={props.loading}
        loadingMore={props.loadingMore}
        hasMore={props.hasMore}
        searchQuery={props.searchQuery}
        title={t('assistant.conversations')}
        emptyText={t('assistant.emptyConversations')}
        loadingText={t('assistant.loadingConversations')}
        searchPlaceholder={t('assistant.searchConversations')}
        refreshText={t('assistant.refreshConversations')}
        loadMoreText={t('assistant.loadMoreConversations')}
        renameText={t('assistant.renameConversation')}
        deleteText={t('assistant.deleteConversation')}
        onSearchChange={props.onSearchChange}
        onRefresh={props.onRefresh}
        onLoadMore={props.onLoadMore}
        onSelect={async conversationId => {
          await props.onSelect(conversationId);
          await props.onClose?.();
        }}
        onRename={props.onRename}
        onDelete={props.onDelete}
      />
    </Modal>
  );
}
