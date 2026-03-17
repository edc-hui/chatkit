import type {
  ChatKitHostAdapter,
  ConversationMessagesResult,
  ConversationSessionStatus,
  ControlConversationInput,
  ConversationRecord,
  DeleteConversationInput,
  GetConversationSessionStatusInput,
  GetConversationMessagesInput,
  ContextInfo,
  ListConversationsInput,
  MarkConversationReadInput,
  OnboardingInfo,
  ProviderMessage,
  ProviderEvent,
  RecoverConversationInput,
  RecoverConversationSessionInput,
  SubmitMessageFeedbackInput,
  UpdateConversationInput,
} from '@kweaver-ai/chatkit-core';

export interface CozeSseEvent {
  event?: string;
  data: string;
}

export interface CozeStreamRequest {
  url: string;
  method?: 'POST' | 'GET';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export type CozeStreamTransport = (request: CozeStreamRequest) => AsyncIterable<CozeSseEvent>;

export interface CozeProviderConfig {
  botId: string;
  apiToken?: string;
  baseUrl?: string;
  userId?: string;
  hostAdapter?: ChatKitHostAdapter;
  getAccessToken?: () => Promise<string | undefined> | string | undefined;
  createConversation?: () => Promise<{ conversation: { id: string; title?: string } }>;
  listConversations?: (input?: ListConversationsInput) => Promise<ConversationRecord[]>;
  getConversationMessages?: (
    input: GetConversationMessagesInput
  ) => Promise<ProviderMessage[] | ConversationMessagesResult>;
  recoverConversation?: (input: RecoverConversationInput) => AsyncIterable<ProviderEvent>;
  markConversationRead?: (input: MarkConversationReadInput) => Promise<void>;
  getConversationSessionStatus?: (input: GetConversationSessionStatusInput) => Promise<ConversationSessionStatus>;
  recoverConversationSession?: (input: RecoverConversationSessionInput) => Promise<ConversationSessionStatus>;
  updateConversation?: (input: UpdateConversationInput) => Promise<ConversationRecord>;
  deleteConversation?: (input: DeleteConversationInput) => Promise<void>;
  submitMessageFeedback?: (input: SubmitMessageFeedbackInput) => Promise<void>;
  terminateConversation?: (input?: ControlConversationInput) => Promise<void>;
  getOnboardingInfo?: () => Promise<OnboardingInfo>;
  getContextInfo?: () => Promise<ContextInfo>;
  streamTransport?: CozeStreamTransport;
}
