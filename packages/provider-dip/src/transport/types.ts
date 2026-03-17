import type {
  ChatKitHostAdapter,
  ConversationMessagesResult,
  ConversationSessionStatus,
  ControlConversationInput,
  CreateConversationInput,
  CreateConversationResult,
  DeleteConversationInput,
  GetConversationSessionStatusInput,
  GetConversationMessagesInput,
  ContextInfo,
  ProviderMessage,
  SendMessageInput,
  ListConversationsInput,
  MarkConversationReadInput,
  OnboardingInfo,
  ConversationRecord,
  ProviderEvent,
  SubmitMessageFeedbackInput,
  RecoverConversationInput,
  RecoverConversationSessionInput,
  UpdateConversationInput,
} from '@kweaver-ai/chatkit-core';

import type { DipRawStreamChunk } from '../normalize/normalizeDipStream.js';

export interface DipStreamRequest {
  url: string;
  method?: 'POST' | 'GET';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export type DipStreamTransport = (request: DipStreamRequest) => AsyncIterable<DipRawStreamChunk>;

export interface DipProviderConfig {
  baseUrl?: string;
  agentKey: string;
  agentVersion?: string;
  businessDomain?: string;
  sandboxBaseUrl?: string;
  sandboxSessionId?: string;
  fetcher?: typeof fetch;
  hostAdapter?: ChatKitHostAdapter;
  getAccessToken?: () => Promise<string | undefined> | string | undefined;
  createConversation?: (input?: CreateConversationInput) => Promise<CreateConversationResult>;
  getOnboardingInfo?: () => Promise<OnboardingInfo>;
  getContextInfo?: () => Promise<ContextInfo>;
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
  streamTransport?: DipStreamTransport;
  buildRequestBody?: (input: SendMessageInput, agentKey: string) => Record<string, unknown>;
}
