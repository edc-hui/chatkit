import type {
  ApplicationContext,
  ChatAttachmentInput,
  ChatKitEngine,
  ChatKitState,
  ContextInfo,
  ControlConversationInput,
  ConversationRecord,
  CreateConversationInput,
  OnboardingInfo,
  SendMessageInput,
  UploadedAttachmentInput,
} from '@kweaver-ai/chatkit-core';

import type { UseChatKitResult } from './ChatKitProvider.js';

export interface ChatKitRef {
  getState(): ChatKitState;
  getOnboardingInfo(): Promise<OnboardingInfo>;
  getContextInfo(): Promise<ContextInfo>;
  getConversationSessionStatus(conversationId?: string): Promise<ChatKitState>;
  recoverConversationSession(conversationId?: string): Promise<ChatKitState>;
  injectApplicationContext(context: ApplicationContext): ChatKitState;
  removeApplicationContext(): ChatKitState;
  createConversation(input?: CreateConversationInput): Promise<ChatKitState>;
  getConversations(page?: number, size?: number): Promise<ConversationRecord[]>;
  loadConversation(conversationId: string): Promise<ChatKitState>;
  recoverConversation(conversationId: string): Promise<ChatKitState>;
  markConversationRead(conversationId: string, messageIndex?: number): Promise<ChatKitState>;
  renameConversation(conversationId: string, title: string): Promise<ChatKitState>;
  deleteConversation(conversationId: string): Promise<ChatKitState>;
  setInputFiles(attachments: ChatAttachmentInput[], mode?: 'replace' | 'append'): ChatKitState;
  clearInputFiles(): ChatKitState;
  setTemporaryFiles(attachments: UploadedAttachmentInput[], mode?: 'replace' | 'append'): ChatKitState;
  clearTemporaryFiles(): ChatKitState;
  uploadTemporaryFiles(attachments: ChatAttachmentInput[], mode?: 'replace' | 'append'): Promise<ChatKitState>;
  send(input: string | SendMessageInput, applicationContext?: ApplicationContext): Promise<ChatKitState>;
  stop(): ChatKitState;
  cancel(): ChatKitState;
  terminate(input?: ControlConversationInput): Promise<ChatKitState>;
  terminateConversation(mode?: ControlConversationInput['mode']): Promise<ChatKitState>;
}

export function createChatKitImperativeHandle(
  engine: ChatKitEngine,
  commands: UseChatKitResult['commands']
): ChatKitRef {
  return {
    getState: engine.getState,
    getOnboardingInfo: commands.getOnboardingInfo,
    getContextInfo: commands.getContextInfo,
    getConversationSessionStatus: conversationId =>
      commands.getConversationSessionStatus(
        conversationId
          ? {
              conversationId,
            }
          : {}
      ),
    recoverConversationSession: conversationId =>
      commands.recoverConversationSession(
        conversationId
          ? {
              conversationId,
            }
          : {}
      ),
    injectApplicationContext: commands.injectApplicationContext,
    removeApplicationContext: commands.removeApplicationContext,
    createConversation: commands.createConversation,
    getConversations: (page?: number, size?: number) =>
      commands.listConversations({
        ...(page != null ? { page } : {}),
        ...(size != null ? { size } : {}),
      }),
    loadConversation: conversationId =>
      commands.loadConversation({
        conversationId,
      }),
    recoverConversation: conversationId =>
      commands.recoverConversation({
        conversationId,
      }),
    markConversationRead: (conversationId, messageIndex) =>
      commands.markConversationRead({
        conversationId,
        ...(messageIndex != null ? { messageIndex } : {}),
      }),
    renameConversation: (conversationId, title) =>
      commands.renameConversation({
        conversationId,
        title,
      }),
    deleteConversation: conversationId =>
      commands.deleteConversation({
        conversationId,
      }),
    setInputFiles: (attachments, mode) =>
      commands.setInputFiles({
        attachments,
        ...(mode ? { mode } : {}),
      }),
    clearInputFiles: commands.clearInputFiles,
    setTemporaryFiles: (attachments, mode) =>
      commands.setTemporaryFiles({
        attachments,
        ...(mode ? { mode } : {}),
      }),
    clearTemporaryFiles: commands.clearTemporaryFiles,
    uploadTemporaryFiles: (attachments, mode) =>
      commands.uploadTemporaryFiles({
        attachments,
        ...(mode ? { mode } : {}),
      }),
    send: (input, applicationContext) =>
      commands.send(
        typeof input === 'string'
          ? {
              text: input,
              ...(applicationContext ? { applicationContext } : {}),
            }
          : input
      ),
    stop: commands.stop,
    cancel: commands.cancel,
    terminate: commands.terminate,
    terminateConversation: mode =>
      commands.terminate({
        mode,
      }),
  };
}
