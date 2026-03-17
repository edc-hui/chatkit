import type {
  ApplicationContext,
  ChatAttachmentInput,
  ChatMessageErrorSource,
  ChatInterruptResumeInput,
  ChatMessageFeedback,
  ChatMessageMetadata,
  ConversationSessionStatus,
  ConversationRecord,
  MessageRole,
} from './types.js';
import type { ChatKitFileUploadRequest, ChatKitFileUploadResult } from './hostAdapter.js';

export interface OnboardingPrompt {
  id?: string;
  label: string;
  message?: string;
  description?: string;
}

export interface OnboardingInfo {
  name?: string;
  avatar?: string;
  avatarType?: string;
  greeting?: string;
  description?: string;
  prompts?: OnboardingPrompt[];
}

export interface ContextInfoItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  value?: string;
  url?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ContextInfoSection {
  id: string;
  title?: string;
  description?: string;
  items: ContextInfoItem[];
}

export interface ContextInfo {
  title?: string;
  description?: string;
  sections?: ContextInfoSection[];
}

export interface CreateConversationInput {
  title?: string;
}

export interface CreateConversationResult {
  conversation: ConversationRecord;
}

export interface ListConversationsInput {
  page?: number;
  size?: number;
  replace?: boolean;
  signal?: AbortSignal;
}

export interface GetConversationMessagesInput {
  conversationId: string;
  signal?: AbortSignal;
}

export interface ConversationMessagesResult {
  messages: ProviderMessage[];
  recoverConversation?: boolean;
  conversationLoading?: boolean;
  readMessageIndex?: number;
  messageIndex?: number;
  conversation?: ConversationRecord;
}

export interface RecoverConversationInput {
  conversationId: string;
  signal?: AbortSignal;
}

export interface MarkConversationReadInput {
  conversationId: string;
  messageIndex: number;
  signal?: AbortSignal;
}

export interface GetConversationSessionStatusInput {
  conversationId: string;
  signal?: AbortSignal;
}

export interface RecoverConversationSessionInput {
  conversationId: string;
  signal?: AbortSignal;
}

export interface UpdateConversationInput {
  conversationId: string;
  title: string;
  signal?: AbortSignal;
}

export interface DeleteConversationInput {
  conversationId: string;
  signal?: AbortSignal;
}

export type ChatMode = 'normal' | 'deep_thinking';
export type ConversationControlMode = 'cancel' | 'terminate';

export interface SendMessageInput {
  conversationId?: string;
  text: string;
  applicationContext?: ApplicationContext;
  temporaryAreaId?: string;
  deepThink?: boolean;
  chatMode?: ChatMode;
  regenerateUserMessageId?: string;
  regenerateAssistantMessageId?: string;
  interrupt?: ChatInterruptResumeInput;
  attachments?: ChatAttachmentInput[];
  signal?: AbortSignal;
}

export interface ControlConversationInput {
  conversationId?: string;
  mode?: ConversationControlMode;
  signal?: AbortSignal;
}

export interface SubmitMessageFeedbackInput {
  conversationId?: string;
  messageId: string;
  feedback: ChatMessageFeedback;
  reason?: string;
  signal?: AbortSignal;
}

export interface ProviderMessage {
  id: string;
  role: MessageRole;
  content: string;
  raw?: unknown;
  applicationContext?: ApplicationContext;
  metadata?: ChatMessageMetadata;
}

export type ProviderEvent =
  | { type: 'conversation.created'; conversation: ConversationRecord }
  | { type: 'stream.started'; conversationId?: string }
  | { type: 'message.delta'; message: ProviderMessage }
  | { type: 'message.snapshot'; message: ProviderMessage }
  | { type: 'message.completed'; messageId: string }
  | { type: 'stream.completed'; conversationId?: string }
  | { type: 'error'; error: unknown; conversationId?: string; errorSource?: ChatMessageErrorSource };

export interface ChatProvider {
  getOnboardingInfo?(): Promise<OnboardingInfo>;
  getContextInfo?(): Promise<ContextInfo>;
  createConversation(input?: CreateConversationInput): Promise<CreateConversationResult>;
  uploadFile?(input: ChatKitFileUploadRequest): Promise<ChatKitFileUploadResult>;
  listConversations?(input?: ListConversationsInput): Promise<ConversationRecord[]>;
  getConversationMessages?(input: GetConversationMessagesInput): Promise<ProviderMessage[] | ConversationMessagesResult>;
  recoverConversation?(input: RecoverConversationInput): AsyncIterable<ProviderEvent>;
  markConversationRead?(input: MarkConversationReadInput): Promise<void>;
  getConversationSessionStatus?(input: GetConversationSessionStatusInput): Promise<ConversationSessionStatus>;
  recoverConversationSession?(input: RecoverConversationSessionInput): Promise<ConversationSessionStatus>;
  updateConversation?(input: UpdateConversationInput): Promise<ConversationRecord>;
  deleteConversation?(input: DeleteConversationInput): Promise<void>;
  send(input: SendMessageInput): AsyncIterable<ProviderEvent>;
  submitMessageFeedback?(input: SubmitMessageFeedbackInput): Promise<void>;
  terminateConversation?(input?: ControlConversationInput): Promise<void>;
}
