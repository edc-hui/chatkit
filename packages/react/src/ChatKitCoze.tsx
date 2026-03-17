import React from 'react';

import type { ApplicationContext } from '@kweaver-ai/chatkit-core';
import { createCozeProvider, type CozeProviderConfig } from '@kweaver-ai/chatkit-provider-coze';
import type { ChatKitI18nConfig } from '@kweaver-ai/chatkit-shared';

import { ChatKitProvider } from './ChatKitProvider.js';
import { Copilot, type CopilotProps } from './Copilot.js';
import type { ChatKitRef } from './imperative.js';

export interface ChatKitCozeProps
  extends CozeProviderConfig,
    ChatKitI18nConfig,
    Omit<CopilotProps, 'title' | 'onClose'> {
  title?: string;
  onClose?: () => void;
  defaultApplicationContext?: ApplicationContext;
}

export const ChatKitCoze = React.forwardRef<ChatKitRef, ChatKitCozeProps>(function ChatKitCoze(props, ref) {
  const provider = React.useMemo(
    () =>
      createCozeProvider({
        botId: props.botId,
        apiToken: props.apiToken,
        baseUrl: props.baseUrl,
        userId: props.userId,
        hostAdapter: props.hostAdapter,
        getAccessToken: props.getAccessToken,
        createConversation: props.createConversation,
        listConversations: props.listConversations,
        getConversationMessages: props.getConversationMessages,
        updateConversation: props.updateConversation,
        deleteConversation: props.deleteConversation,
        submitMessageFeedback: props.submitMessageFeedback,
        terminateConversation: props.terminateConversation,
        getOnboardingInfo: props.getOnboardingInfo,
        getContextInfo: props.getContextInfo,
        streamTransport: props.streamTransport,
      }),
    [
      props.apiToken,
      props.baseUrl,
      props.botId,
      props.createConversation,
      props.deleteConversation,
      props.getAccessToken,
      props.getContextInfo,
      props.getConversationMessages,
      props.getOnboardingInfo,
      props.hostAdapter,
      props.listConversations,
      props.streamTransport,
      props.submitMessageFeedback,
      props.terminateConversation,
      props.updateConversation,
      props.userId,
    ]
  );

  return (
    <ChatKitProvider
      provider={provider}
      providerName="coze"
      locale={props.locale}
      fallbackLocale={props.fallbackLocale}
      messages={props.messages}
      t={props.t}
      hostAdapter={props.hostAdapter}
      defaultApplicationContext={props.defaultApplicationContext}
    >
      <Copilot
        ref={ref}
        visible={props.visible}
        title={props.title}
        width={props.width}
        onClose={props.onClose}
        allowAttachments={props.allowAttachments}
        allowDeepThink={props.allowDeepThink}
        showConversations={props.showConversations}
        showOnboarding={props.showOnboarding}
        showContextPanel={props.showContextPanel}
        showFilesPanel={props.showFilesPanel}
        allowFeedback={props.allowFeedback}
        initialQuestion={props.initialQuestion}
      />
    </ChatKitProvider>
  );
});

ChatKitCoze.displayName = 'ChatKitCoze';
