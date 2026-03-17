import React from 'react';

import type {
  ApplicationContext,
  ChatAttachmentInput,
  ChatMessage,
  ChatMessageAttachment,
  ConversationRecord,
  OnboardingInfo,
  UploadedAttachmentInput,
} from '@kweaver-ai/chatkit-core';
import XMarkdown from '@ant-design/x-markdown';
import { Alert, Button, Card, Flex, Modal, Space, Typography } from 'antd';
import classNames from 'classnames';

import { useChatKit, useChatKitI18n } from '../ChatKitProvider.js';
import IconFont from '../components/IconFont/index.js';
import { ConversationListModal } from '../components/ConversationListModal/index.js';
import { ConversationsPanel } from '../components/ConversationsPanel/index.js';
import { MessageList } from '../components/MessageList/index.js';
import { Sender } from '../components/Sender/index.js';
import { createChatKitImperativeHandle, type ChatKitRef } from '../imperative.js';
import styles from './Assistant.module.css';

export interface AssistantProps {
  visible?: boolean;
  title?: string;
  allowAttachments?: boolean;
  allowDeepThink?: boolean;
  showConversations?: boolean;
  showOnboarding?: boolean;
  showContextPanel?: boolean;
  showFilesPanel?: boolean;
  showWorkbench?: boolean;
  allowFeedback?: boolean;
  initialQuestion?: string;
  defaultApplicationContext?: ApplicationContext;
}

function resolveErrorText(error: unknown): string {
  if (!error) {
    return '';
  }

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

function isSameApplicationContext(left?: ApplicationContext, right?: ApplicationContext): boolean {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  if (left.title !== right.title) {
    return false;
  }

  try {
    return JSON.stringify(left.data) === JSON.stringify(right.data);
  } catch {
    return left.data === right.data;
  }
}

export const Assistant = React.forwardRef<ChatKitRef, AssistantProps>(function Assistant(props, ref) {
  const { state, commands, engine } = useChatKit();
  const { t } = useChatKitI18n();
  const [modal, contextHolder] = Modal.useModal();

  const conversationPageSize = 10;
  const [loadingConversations, setLoadingConversations] = React.useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = React.useState(false);
  const [conversationQuery, setConversationQuery] = React.useState('');
  const [conversationPage, setConversationPage] = React.useState(1);
  const [hasMoreConversations, setHasMoreConversations] = React.useState(false);
  const [conversationModalOpen, setConversationModalOpen] = React.useState(false);
  const [onboardingInfo, setOnboardingInfo] = React.useState<OnboardingInfo | null>(null);
  const [editingUserMessageId, setEditingUserMessageId] = React.useState<string>();
  const initialQuestionRef = React.useRef<string | undefined>(undefined);

  React.useImperativeHandle(ref, () => createChatKitImperativeHandle(engine, commands), [commands, engine]);

  const conversationItems = React.useMemo(() => {
    const sortedConversations = Object.values(state.conversations).sort((left, right) => {
      if (left.id === state.currentConversationId) {
        return -1;
      }
      if (right.id === state.currentConversationId) {
        return 1;
      }
      return (left.title?.trim() || left.id).localeCompare(right.title?.trim() || right.id);
    });

    const normalizedQuery = conversationQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return sortedConversations;
    }

    return sortedConversations.filter(conversation => {
      const label = (conversation.title?.trim() || conversation.id).toLowerCase();
      return label.includes(normalizedQuery) || conversation.id.toLowerCase().includes(normalizedQuery);
    });
  }, [conversationQuery, state.conversations, state.currentConversationId]);

  React.useEffect(() => {
    if (props.showConversations === false) {
      return;
    }

    let disposed = false;

    void (async () => {
      setLoadingConversations(true);
      try {
        const fetchedConversations = await commands.listConversations({
          page: 1,
          size: conversationPageSize,
          replace: true,
        });

        if (!disposed) {
          setConversationPage(1);
          setHasMoreConversations(fetchedConversations.length >= conversationPageSize);
        }
      } catch {
        if (!disposed) {
          setHasMoreConversations(false);
        }
      } finally {
        if (!disposed) {
          setLoadingConversations(false);
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, [commands, props.showConversations]);

  React.useEffect(() => {
    if (props.showOnboarding === false) {
      setOnboardingInfo(null);
      return;
    }

    let disposed = false;

    void (async () => {
      try {
        const nextOnboardingInfo = await commands.getOnboardingInfo();
        if (!disposed) {
          setOnboardingInfo(nextOnboardingInfo);
        }
      } catch {
        if (!disposed) {
          setOnboardingInfo(null);
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, [commands, props.showOnboarding]);

  React.useEffect(() => {
    if (!props.defaultApplicationContext) {
      return;
    }

    if (!isSameApplicationContext(props.defaultApplicationContext, state.applicationContext)) {
      commands.injectApplicationContext(props.defaultApplicationContext);
    }
  }, [commands, props.defaultApplicationContext, state.applicationContext]);

  React.useEffect(() => {
    const nextInitialQuestion = props.initialQuestion?.trim();
    if (!nextInitialQuestion) {
      initialQuestionRef.current = undefined;
      return;
    }

    if (initialQuestionRef.current === nextInitialQuestion) {
      return;
    }

    if (state.messages.length > 0 || state.pending || state.streaming) {
      return;
    }

    initialQuestionRef.current = nextInitialQuestion;
    void commands.send({
      conversationId: state.currentConversationId,
      text: nextInitialQuestion,
    });
  }, [commands, props.initialQuestion, state.currentConversationId, state.messages.length, state.pending, state.streaming]);

  const mapAttachmentsForResend = (attachments: ChatMessageAttachment[] | undefined): UploadedAttachmentInput[] | undefined => {
    if (!attachments || attachments.length === 0) {
      return undefined;
    }

    return attachments.map(attachment => ({
      source: 'uploaded',
      fileName: attachment.fileName,
      url: attachment.url,
      fileId: attachment.fileId,
      storageKey: attachment.storageKey,
      temporaryAreaId: attachment.temporaryAreaId,
      contentType: attachment.contentType,
      size: attachment.size,
      metadata: attachment.metadata,
    }));
  };

  const refreshConversations = React.useCallback(async () => {
    if (props.showConversations === false) {
      return;
    }

    setLoadingConversations(true);
    try {
      const fetchedConversations = await commands.listConversations({
        page: 1,
        size: conversationPageSize,
        replace: true,
      });
      setConversationPage(1);
      setHasMoreConversations(fetchedConversations.length >= conversationPageSize);
    } catch {
      setHasMoreConversations(false);
    } finally {
      setLoadingConversations(false);
    }
  }, [commands, props.showConversations]);

  const loadMoreConversations = React.useCallback(async () => {
    if (!hasMoreConversations || loadingMoreConversations) {
      return;
    }

    const nextPage = conversationPage + 1;
    setLoadingMoreConversations(true);

    try {
      const fetchedConversations = await commands.listConversations({
        page: nextPage,
        size: conversationPageSize,
      });
      setConversationPage(nextPage);
      setHasMoreConversations(fetchedConversations.length >= conversationPageSize);
    } catch {
      setHasMoreConversations(false);
    } finally {
      setLoadingMoreConversations(false);
    }
  }, [commands, conversationPage, hasMoreConversations, loadingMoreConversations]);

  const handleCreateConversation = async () => {
    if (state.pending || state.streaming) {
      await commands.terminate({
        conversationId: state.currentConversationId,
        mode: 'terminate',
      });
      return;
    }

    await commands.createConversation();
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (!conversationId || conversationId === state.currentConversationId) {
      return;
    }

    await commands.loadConversation({ conversationId });
  };

  const handleRenameConversation = async (conversation: ConversationRecord) => {
    let nextTitle = conversation.title ?? '';

    modal.confirm({
      title: t('assistant.renameConversationPrompt'),
      content: (
        <input
          defaultValue={nextTitle}
          onChange={event => {
            nextTitle = event.target.value;
          }}
          className={styles.renameInput}
        />
      ),
      onOk: async () => {
        const value = nextTitle.trim();
        if (!value) {
          return;
        }

        await commands.renameConversation({
          conversationId: conversation.id,
          title: value,
        });
      },
    });
  };

  const handleDeleteConversation = async (conversation: ConversationRecord) => {
    modal.confirm({
      title: t('assistant.deleteConversationConfirm'),
      okButtonProps: { danger: true },
      onOk: async () => {
        await commands.deleteConversation({
          conversationId: conversation.id,
        });
      },
    });
  };

  const handleCopy = async (messageRecord: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(messageRecord.content);
    } catch {}
  };

  const handleRegenerate = async (messageRecord: ChatMessage, index: number) => {
    const previousUserMessage = [...state.messages.slice(0, index)].reverse().find(nextMessage => nextMessage.role === 'user');
    if (!previousUserMessage?.content.trim()) {
      return;
    }

    await commands.send({
      conversationId: state.currentConversationId,
      text: previousUserMessage.content,
      applicationContext: previousUserMessage.applicationContext,
      attachments: mapAttachmentsForResend(previousUserMessage.metadata?.attachments),
      regenerateAssistantMessageId: messageRecord.id,
      regenerateUserMessageId:
        previousUserMessage.metadata?.messageIdentity?.source === 'server' ? previousUserMessage.id : undefined,
    });
  };

  const handleSubmitEditUserMessage = async (messageRecord: ChatMessage, nextText: string) => {
    const trimmedText = nextText.trim();
    if (!trimmedText) {
      return;
    }

    commands.updateMessage({
      conversationId: state.currentConversationId,
      messageId: messageRecord.id,
      content: trimmedText,
    });
    commands.truncateMessages({
      conversationId: state.currentConversationId,
      fromMessageId: messageRecord.id,
      inclusive: false,
    });
    setEditingUserMessageId(undefined);

    await commands.send({
      conversationId: state.currentConversationId,
      text: trimmedText,
      applicationContext: messageRecord.applicationContext,
      attachments: mapAttachmentsForResend(messageRecord.metadata?.attachments),
      regenerateUserMessageId: messageRecord.id,
    });
  };

  const handleFeedback = async (messageRecord: ChatMessage, feedback: 'upvote' | 'downvote') => {
    await commands.submitMessageFeedback({
      conversationId: state.currentConversationId,
      messageId: messageRecord.id,
      feedback,
    });
  };

  const handleUploadTemporaryFiles = React.useCallback(
    async (files: FileList) => {
      const attachments = Array.from(files).map(
        file =>
          ({
            source: 'local',
            fileName: file.name,
            content: file,
            ...(file.type
              ? {
                  contentType: file.type,
                }
              : {}),
            metadata: {
              size: file.size,
              lastModified: file.lastModified,
            },
          }) satisfies ChatAttachmentInput
      );

      if (attachments.length === 0) {
        return;
      }

      const nextState = await commands.uploadTemporaryFiles({
        conversationId: state.currentConversationId,
        attachments,
        mode: 'append',
      });

      commands.setInputFiles({
        attachments: nextState.temporaryAttachments,
      });
    },
    [commands, state.currentConversationId]
  );

  const shouldShowOnboarding =
    props.showOnboarding !== false &&
    !state.pending &&
    !state.streaming &&
    state.messages.length === 0 &&
    Boolean(onboardingInfo?.greeting || onboardingInfo?.description || onboardingInfo?.prompts?.length);

  if (props.visible === false) {
    return null;
  }

  return (
    <section className={styles.container}>
      {contextHolder}
      {props.showConversations ? (
        <ConversationsPanel
          conversations={conversationItems}
          currentConversationId={state.currentConversationId}
          loading={loadingConversations}
          title={t('assistant.conversations')}
          unreadSummary={undefined}
          loadingText={t('assistant.loadingConversations')}
          emptyText={t('assistant.emptyConversations')}
          searchPlaceholder={t('assistant.searchConversations')}
          refreshText={t('assistant.refreshConversations')}
          loadMoreText={t('assistant.loadMoreConversations')}
          renameText={t('assistant.renameConversation')}
          deleteText={t('assistant.deleteConversation')}
          secondaryActionText={t('assistant.openConversationModal')}
          searchQuery={conversationQuery}
          hasMore={hasMoreConversations}
          loadingMore={loadingMoreConversations}
          onSearchChange={setConversationQuery}
          onRefresh={refreshConversations}
          onLoadMore={loadMoreConversations}
          onSecondaryAction={() => {
            setConversationModalOpen(true);
          }}
          onSelect={handleSelectConversation}
          onRename={handleRenameConversation}
          onDelete={handleDeleteConversation}
        />
      ) : null}

      <div className={styles.main}>
        <Card className={styles.headerCard}>
          <Flex justify="space-between" align="center" gap={12}>
            <div>
              <Typography.Title level={4} className={styles.title}>
                {props.title ?? t('assistant.title')}
              </Typography.Title>
              <Typography.Text type="secondary">
                {state.streaming ? t('assistant.streaming') : t('assistant.ready')}
              </Typography.Text>
            </div>
            <Space>
              <Button onClick={() => setConversationModalOpen(true)}>{t('assistant.allConversations')}</Button>
              <Button type="primary" onClick={() => void handleCreateConversation()}>
                {state.pending || state.streaming ? t('assistant.stop') : t('assistant.newChat')}
              </Button>
            </Space>
          </Flex>
        </Card>

        {state.error ? <Alert type="error" message={t('assistant.error')} description={resolveErrorText(state.error)} showIcon /> : null}

        <Card className={styles.messagesCard}>
          {shouldShowOnboarding ? (
            <div className={styles.welcomeContainer}>
              <Flex vertical align="center" style={{ width: '100%' }}>
              {onboardingInfo?.avatar ? (
                <img src={onboardingInfo.avatar} alt="agent-avatar" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <IconFont type={onboardingInfo?.avatarType || 'icon-dip-chat1'} style={{ fontSize: 90, color: '#1677ff' }} />
              )}
              <div className={classNames(styles.welcomeName, 'dip-mt-16')}>
                {onboardingInfo?.name || props.title || t('assistant.title')}
              </div>
              </Flex>
              <div style={{ marginTop: 24, flex: 1, width: '100%' }}>
                <div style={{ opacity: 0.65, marginBottom: 8 }}>
                  {onboardingInfo?.description ? <XMarkdown content={onboardingInfo.description} /> : null}
                </div>
                {(onboardingInfo?.prompts ?? []).length > 0 && (
                  <div style={{ marginTop: 28, width: '100%' }}>
                    <div style={{ color: 'rgba(0, 0, 0, 0.45)', marginBottom: 4 }}>你可以问我：</div>
                    {(onboardingInfo?.prompts ?? []).map((prompt, index) => (
                      <div
                        key={prompt.id || index}
                        className={styles.welcomeQuestion}
                        onClick={() => {
                          const text = prompt.message?.trim() || prompt.label.trim();
                          if (!text) {
                            return;
                          }
                          void commands.send({
                            conversationId: state.currentConversationId,
                            text,
                          });
                        }}
                      >
                        <div title={prompt.label} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {prompt.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <MessageList
              messages={state.messages}
              emptyText={t('empty.startConversation')}
              disabled={state.pending || state.streaming}
              editingMessageId={editingUserMessageId}
              onCopy={handleCopy}
              onStartEdit={messageRecord => {
                setEditingUserMessageId(messageRecord.id);
              }}
              onCancelEdit={() => {
                setEditingUserMessageId(undefined);
              }}
              onSubmitEdit={handleSubmitEditUserMessage}
              onRegenerate={handleRegenerate}
              onFeedback={props.allowFeedback ? handleFeedback : undefined}
              onSelectRelatedQuestion={question => {
                void commands.send({
                  conversationId: state.currentConversationId,
                  text: question,
                });
              }}
            />
          )}
        </Card>

        <Sender
          applicationContext={state.applicationContext}
          allowAttachments={props.allowAttachments}
          allowDeepThink={props.allowDeepThink}
          disabled={state.pending || state.streaming}
          loading={state.pending || state.streaming}
          inputAttachments={state.inputAttachments}
          tempFileList={state.temporaryAttachments}
          onRemoveApplicationContext={() => {
            commands.removeApplicationContext();
          }}
          onInputAttachmentsChange={attachments => {
            commands.setInputFiles({ attachments });
          }}
          onCancel={() => {
            commands.stop();
          }}
          onSend={async input => {
            await commands.send(input);
          }}
          onNewConversation={handleCreateConversation}
        />
      </div>

      <ConversationListModal
        open={conversationModalOpen}
        conversations={conversationItems}
        currentConversationId={state.currentConversationId}
        loading={loadingConversations}
        loadingMore={loadingMoreConversations}
        hasMore={hasMoreConversations}
        searchQuery={conversationQuery}
        onClose={() => {
          setConversationModalOpen(false);
        }}
        onRefresh={refreshConversations}
        onLoadMore={loadMoreConversations}
        onSearchChange={setConversationQuery}
        onSelect={handleSelectConversation}
        onRename={handleRenameConversation}
        onDelete={handleDeleteConversation}
      />
    </section>
  );
});

Assistant.displayName = 'Assistant';
