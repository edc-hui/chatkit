export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'streaming' | 'done' | 'error';

export interface ConversationRecord {
  id: string;
  title?: string;
  status?: 'processing' | 'failed' | 'cancelled' | 'completed' | string;
  unread?: boolean;
  readMessageIndex?: number;
  messageIndex?: number;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationSessionStatus {
  status?: 'active' | 'expiring' | 'expired' | 'unknown' | string;
  ttlSeconds?: number;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ApplicationContext {
  title: string;
  data: unknown;
}

export interface ChatToolCall {
  name: string;
  title?: string;
  description?: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
}

export interface ChatMessageAttachment {
  source: 'local' | 'uploaded';
  fileName: string;
  url?: string;
  fileId?: string;
  storageKey?: string;
  temporaryAreaId?: string;
  contentType?: string;
  size?: number;
  metadata?: Record<string, unknown>;
}

export type ChatAttachmentSource = 'local' | 'uploaded';

export interface LocalAttachmentInput {
  source: 'local';
  fileName: string;
  content: Blob | ArrayBuffer | Uint8Array | string;
  contentType?: string;
  purpose?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadedAttachmentInput {
  source: 'uploaded';
  fileName: string;
  url?: string;
  fileId?: string;
  storageKey?: string;
  temporaryAreaId?: string;
  contentType?: string;
  size?: number;
  metadata?: Record<string, unknown>;
}

export type ChatAttachmentInput = LocalAttachmentInput | UploadedAttachmentInput;

export interface ChatMessageIdentity {
  source?: 'local' | 'server';
  localId?: string;
}

export interface ChatMessageResponseIds {
  userMessageId?: string;
  assistantMessageId?: string;
}

export interface ChatMessageMetrics {
  totalTokens?: number;
  totalTimeSeconds?: number;
  ttftMs?: number;
}

export type ChatMessageFeedback = 'upvote' | 'downvote';
export type ChatInterruptAction = 'confirm' | 'skip';
export type ChatMessageErrorSource = 'response' | 'stream' | 'unknown';

export interface ChatInterruptToolArg {
  key: string;
  value: unknown;
  type?: string;
}

export interface ChatInterruptData {
  tool_name?: string;
  tool_description?: string;
  tool_args?: ChatInterruptToolArg[];
  interrupt_config?: {
    requires_confirmation?: boolean;
    confirmation_message?: string;
  };
  [key: string]: unknown;
}

export interface ChatInterruptInfo {
  handle?: unknown;
  data?: ChatInterruptData;
}

export interface ChatInterruptResumeInput {
  handle?: unknown;
  data?: ChatInterruptData;
  action: ChatInterruptAction;
  modifiedArgs?: Array<{ key: string; value: unknown }>;
  interruptedAssistantMessageId: string;
}

export interface ChatMessageErrorInfo {
  source: ChatMessageErrorSource;
  detail: unknown;
}

export interface ChatMessageMetadata {
  attachments?: ChatMessageAttachment[];
  messageIdentity?: ChatMessageIdentity;
  responseMessageIds?: ChatMessageResponseIds;
  toolCalls?: ChatToolCall[];
  relatedQuestions?: string[];
  thinking?: string;
  metrics?: ChatMessageMetrics;
  feedback?: ChatMessageFeedback;
  interrupt?: ChatInterruptInfo;
  error?: ChatMessageErrorInfo;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  raw?: unknown;
  applicationContext?: ApplicationContext;
  metadata?: ChatMessageMetadata;
}

export interface ChatKitState {
  currentConversationId?: string;
  conversations: Record<string, ConversationRecord>;
  messages: ChatMessage[];
  inputAttachments: ChatAttachmentInput[];
  temporaryAttachments: UploadedAttachmentInput[];
  conversationSession?: ConversationSessionStatus;
  applicationContext?: ApplicationContext;
  pending: boolean;
  streaming: boolean;
  error?: unknown;
}

export interface ChatKitEventMap {
  stateChanged: ChatKitState;
  conversationChanged: { conversationId?: string };
  streamStarted: { conversationId?: string };
  streamCompleted: { conversationId?: string };
  messageAppended: { message: ChatMessage };
  messageUpdated: { message: ChatMessage };
  streamError: { error: unknown; conversationId?: string; errorSource?: ChatMessageErrorSource };
}
