import type {
  ChatProvider,
  GetConversationSessionStatusInput,
  ConversationMessagesResult,
  ContextInfo,
  ControlConversationInput,
  CreateConversationInput,
  DeleteConversationInput,
  GetConversationMessagesInput,
  ListConversationsInput,
  OnboardingInfo,
  ProviderEvent,
  SendMessageInput,
  SubmitMessageFeedbackInput,
  UpdateConversationInput,
} from './provider.js';
import { prepareAttachmentInputs, prepareSendMessageInput, toChatMessageAttachments } from './attachments.js';
import type { ChatKitHostAdapter, ChatKitProviderName } from './hostAdapter.js';
import type {
  ApplicationContext,
  ChatAttachmentInput,
  ChatMessageErrorSource,
  ChatKitEventMap,
  ChatKitState,
  ChatMessage,
  ChatMessageAttachment,
  ChatMessageMetadata,
  ConversationSessionStatus,
  ConversationRecord,
  UploadedAttachmentInput,
} from './types.js';

function cloneMessageMetadata(metadata: ChatMessageMetadata | undefined): ChatMessageMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  return {
    ...metadata,
    attachments: metadata.attachments?.map(attachment => ({
      ...attachment,
      metadata: attachment.metadata ? { ...attachment.metadata } : undefined,
    })),
    messageIdentity: metadata.messageIdentity ? { ...metadata.messageIdentity } : undefined,
    responseMessageIds: metadata.responseMessageIds ? { ...metadata.responseMessageIds } : undefined,
    relatedQuestions: metadata.relatedQuestions ? [...metadata.relatedQuestions] : undefined,
    thinking: metadata.thinking,
    metrics: metadata.metrics ? { ...metadata.metrics } : undefined,
    error: metadata.error
      ? {
          ...metadata.error,
        }
      : undefined,
    interrupt: metadata.interrupt
      ? {
          handle: metadata.interrupt.handle,
          data: metadata.interrupt.data
            ? {
                ...metadata.interrupt.data,
                tool_args: metadata.interrupt.data.tool_args?.map(arg => ({ ...arg })),
                interrupt_config: metadata.interrupt.data.interrupt_config
                  ? { ...metadata.interrupt.data.interrupt_config }
                  : undefined,
              }
            : undefined,
        }
      : undefined,
    toolCalls: metadata.toolCalls?.map(toolCall => ({
      ...toolCall,
      metadata: toolCall.metadata ? { ...toolCall.metadata } : undefined,
    })),
  };
}

function resolveErrorSource(error: unknown, fallback?: ChatMessageErrorSource): ChatMessageErrorSource {
  if (fallback) {
    return fallback;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'chatkitErrorSource' in error &&
    typeof (error as { chatkitErrorSource?: unknown }).chatkitErrorSource === 'string'
  ) {
    const source = (error as { chatkitErrorSource?: string }).chatkitErrorSource;
    if (source === 'response' || source === 'stream' || source === 'unknown') {
      return source;
    }
  }

  return 'unknown';
}

export interface ChatKitEngine {
  getOnboardingInfo(): Promise<OnboardingInfo>;
  getContextInfo(): Promise<ContextInfo>;
  getConversationSessionStatus(input?: { conversationId?: string; signal?: AbortSignal }): Promise<ChatKitState>;
  recoverConversationSession(input?: { conversationId?: string; signal?: AbortSignal }): Promise<ChatKitState>;
  injectApplicationContext(context: ApplicationContext): ChatKitState;
  removeApplicationContext(): ChatKitState;
  createConversation(input?: CreateConversationInput): Promise<ChatKitState>;
  listConversations(input?: ListConversationsInput): Promise<ConversationRecord[]>;
  loadConversation(input: GetConversationMessagesInput): Promise<ChatKitState>;
  recoverConversation(input: GetConversationMessagesInput): Promise<ChatKitState>;
  markConversationRead(input: { conversationId: string; messageIndex?: number; signal?: AbortSignal }): Promise<ChatKitState>;
  renameConversation(input: UpdateConversationInput): Promise<ChatKitState>;
  deleteConversation(input: DeleteConversationInput): Promise<ChatKitState>;
  setInputFiles(input: SetInputFilesInput): ChatKitState;
  clearInputFiles(): ChatKitState;
  setTemporaryFiles(input: SetTemporaryFilesInput): ChatKitState;
  clearTemporaryFiles(): ChatKitState;
  uploadTemporaryFiles(input: UploadTemporaryFilesInput): Promise<ChatKitState>;
  updateMessage(input: UpdateMessageInput): ChatKitState;
  truncateMessages(input: TruncateMessagesInput): ChatKitState;
  submitMessageFeedback(input: SubmitMessageFeedbackInput): Promise<ChatKitState>;
  send(input: SendMessageInput): Promise<ChatKitState>;
  stop(): ChatKitState;
  cancel(): ChatKitState;
  terminate(input?: ControlConversationInput): Promise<ChatKitState>;
  getState(): ChatKitState;
  subscribe(listener: (state: ChatKitState) => void): () => void;
  on<K extends keyof ChatKitEventMap>(eventName: K, listener: (payload: ChatKitEventMap[K]) => void): () => void;
}

export interface CreateChatKitEngineOptions {
  provider: ChatProvider;
  hostAdapter?: ChatKitHostAdapter;
  providerName?: ChatKitProviderName;
  defaultApplicationContext?: ApplicationContext;
}

export interface UpdateMessageInput {
  conversationId?: string;
  messageId: string;
  content?: string;
  applicationContext?: ApplicationContext;
  attachments?: ChatMessageAttachment[];
}

export interface TruncateMessagesInput {
  conversationId?: string;
  fromMessageId: string;
  inclusive?: boolean;
}

export interface SetInputFilesInput {
  attachments: ChatAttachmentInput[];
  mode?: 'replace' | 'append';
}

export interface SetTemporaryFilesInput {
  attachments: UploadedAttachmentInput[];
  mode?: 'replace' | 'append';
}

export interface UploadTemporaryFilesInput {
  attachments: ChatAttachmentInput[];
  mode?: 'replace' | 'append';
  conversationId?: string;
}

function cloneApplicationContext(context: ApplicationContext | undefined): ApplicationContext | undefined {
  if (!context) {
    return undefined;
  }

  return {
    title: context.title,
    data:
      typeof context.data === 'object' && context.data !== null
        ? Array.isArray(context.data)
          ? [...context.data]
          : { ...(context.data as Record<string, unknown>) }
        : context.data,
  };
}

function cloneConversationSession(
  session: ConversationSessionStatus | undefined
): ConversationSessionStatus | undefined {
  if (!session) {
    return undefined;
  }

  return {
    ...session,
    metadata: session.metadata ? { ...session.metadata } : undefined,
  };
}

function cloneState(state: ChatKitState): ChatKitState {
  return {
    currentConversationId: state.currentConversationId,
    conversations: { ...state.conversations },
    messages: state.messages.map(message => ({
      ...message,
      applicationContext: cloneApplicationContext(message.applicationContext),
      metadata: cloneMessageMetadata(message.metadata),
    })),
    inputAttachments: cloneInputAttachments(state.inputAttachments),
    temporaryAttachments: cloneInputAttachments(state.temporaryAttachments) as UploadedAttachmentInput[],
    conversationSession: cloneConversationSession(state.conversationSession),
    applicationContext: cloneApplicationContext(state.applicationContext),
    pending: state.pending,
    streaming: state.streaming,
    error: state.error,
  };
}

function cloneAttachments(attachments: ChatMessageAttachment[] | undefined): ChatMessageAttachment[] | undefined {
  return attachments?.map(attachment => ({
    ...attachment,
    metadata: attachment.metadata ? { ...attachment.metadata } : undefined,
  }));
}

function cloneInputAttachments(attachments: ChatAttachmentInput[] | undefined): ChatAttachmentInput[] {
  return (attachments ?? []).map(attachment =>
    attachment.source === 'uploaded'
      ? {
          ...attachment,
          metadata: attachment.metadata ? { ...attachment.metadata } : undefined,
        }
      : {
          ...attachment,
          metadata: attachment.metadata ? { ...attachment.metadata } : undefined,
          content: attachment.content,
      }
  );
}

function resolveTemporaryAreaId(
  attachments: ChatAttachmentInput[] | undefined,
  explicitTemporaryAreaId?: string
): string | undefined {
  if (explicitTemporaryAreaId) {
    return explicitTemporaryAreaId;
  }

  for (const attachment of attachments ?? []) {
    if (attachment.source === 'uploaded' && attachment.temporaryAreaId) {
      return attachment.temporaryAreaId;
    }
  }

  return undefined;
}

function createInitialState(defaultApplicationContext?: ApplicationContext): ChatKitState {
  return {
    conversations: {},
    messages: [],
    inputAttachments: [],
    temporaryAttachments: [],
    conversationSession: undefined,
    applicationContext: cloneApplicationContext(defaultApplicationContext),
    pending: false,
    streaming: false,
  };
}

function createLocalMessageId(role: ChatMessage['role']): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${role}-${crypto.randomUUID()}`;
  }

  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeConversationMessagesResult(
  result: Awaited<ReturnType<NonNullable<ChatProvider['getConversationMessages']>>>
): ConversationMessagesResult {
  if (Array.isArray(result)) {
    return {
      messages: result,
    };
  }

  return result;
}

function normalizeConversationSessionStatus(
  session: ConversationSessionStatus | undefined
): ConversationSessionStatus | undefined {
  if (!session) {
    return undefined;
  }

  let expiresAt = session.expiresAt;
  if (!expiresAt && typeof session.ttlSeconds === 'number') {
    expiresAt = new Date(Date.now() + session.ttlSeconds * 1000).toISOString();
  }

  return {
    ...session,
    ...(expiresAt ? { expiresAt } : {}),
    metadata: session.metadata ? { ...session.metadata } : undefined,
  };
}

function upsertConversationRecord(
  state: ChatKitState,
  conversationId: string,
  updates?: Partial<ConversationRecord>
): ConversationRecord {
  const nextConversation: ConversationRecord = {
    ...(state.conversations[conversationId] ?? { id: conversationId }),
    ...(updates ?? {}),
    id: conversationId,
  };

  state.conversations[conversationId] = nextConversation;
  return nextConversation;
}

function upsertMessage(state: ChatKitState, nextMessage: ChatMessage, append: boolean): { message: ChatMessage; inserted: boolean } {
  const existingIndex = state.messages.findIndex(message => message.id === nextMessage.id);

  if (existingIndex === -1) {
    state.messages.push(nextMessage);
    return { message: nextMessage, inserted: true };
  }

  const previous = state.messages[existingIndex];
  const updated: ChatMessage = {
    ...previous,
    ...nextMessage,
    content: append ? previous.content + nextMessage.content : nextMessage.content,
  };

  state.messages[existingIndex] = updated;
  return { message: updated, inserted: false };
}

function finalizeStreamingMessages(
  state: ChatKitState,
  emitEvent: <K extends keyof ChatKitEventMap>(eventName: K, payload: ChatKitEventMap[K]) => void
) {
  for (let index = 0; index < state.messages.length; index += 1) {
    const message = state.messages[index];
    if (message.status !== 'streaming') {
      continue;
    }

    const updated: ChatMessage = {
      ...message,
      status: 'done',
    };
    state.messages[index] = updated;
    emitEvent('messageUpdated', { message: updated });
  }
}

function resetConversationRuntime(state: ChatKitState, defaultApplicationContext?: ApplicationContext) {
  state.messages = [];
  state.inputAttachments = [];
  state.conversationSession = undefined;
  state.applicationContext = cloneApplicationContext(defaultApplicationContext);
  state.pending = false;
  state.streaming = false;
  state.error = undefined;
}

async function consumeProviderStream(
  stream: AsyncIterable<ProviderEvent>,
  input: {
    conversationId: string;
    signal?: AbortSignal;
    controller?: AbortController;
  },
  runtime: {
    state: ChatKitState;
    completeActiveStream: (conversationId: string | undefined) => void;
    clearActiveStreamReferences: () => void;
    applyProviderEvent: (event: ProviderEvent) => void;
    emitState: () => void;
    getActiveSendController: () => AbortController | undefined;
    setActiveStream: (controller: AbortController, conversationId: string) => void;
  }
) {
  const controller = input.controller ?? new AbortController();
  const relayAbort = () => controller.abort(input.signal?.reason);
  const shouldRelayAbort = input.signal && input.signal !== controller.signal;

  if (shouldRelayAbort && input.signal?.aborted) {
    controller.abort(input.signal.reason);
  } else if (shouldRelayAbort) {
    input.signal?.addEventListener('abort', relayAbort, { once: true });
  }

  runtime.setActiveStream(controller, input.conversationId);
  runtime.state.pending = true;
  runtime.state.error = undefined;
  runtime.emitState();

  try {
    if (controller.signal.aborted) {
      if (runtime.getActiveSendController() === controller) {
        runtime.completeActiveStream(input.conversationId);
      }
      runtime.emitState();
      return;
    }

    for await (const event of stream) {
      runtime.applyProviderEvent(event);
    }

    runtime.completeActiveStream(input.conversationId);
    runtime.emitState();
  } catch (error) {
    if (controller.signal.aborted) {
      if (runtime.getActiveSendController() === controller) {
        runtime.completeActiveStream(input.conversationId);
      }
      runtime.emitState();
      return;
    }

    runtime.applyProviderEvent({ type: 'error', error, conversationId: input.conversationId });
    throw error;
  } finally {
    if (shouldRelayAbort) {
      input.signal?.removeEventListener('abort', relayAbort);
    }
    if (runtime.getActiveSendController() === controller) {
      runtime.clearActiveStreamReferences();
    }
  }
}

export function createChatKitEngine(options: CreateChatKitEngineOptions): ChatKitEngine {
  const state = createInitialState(options.defaultApplicationContext);
  const stateListeners = new Set<(state: ChatKitState) => void>();
  const eventListeners = new Map<keyof ChatKitEventMap, Set<(payload: any) => void>>();
  let activeSendController: AbortController | undefined;
  let activeConversationId: string | undefined;
  let activeOptimisticUserMessageId: string | undefined;
  let conversationSessionTimer: ReturnType<typeof setTimeout> | undefined;

  const emitState = () => {
    const snapshot = cloneState(state);
    stateListeners.forEach(listener => listener(snapshot));
    const listeners = eventListeners.get('stateChanged');
    listeners?.forEach(listener => listener(snapshot));
  };

  const emitEvent = <K extends keyof ChatKitEventMap>(eventName: K, payload: ChatKitEventMap[K]) => {
    const listeners = eventListeners.get(eventName);
    listeners?.forEach(listener => listener(payload));
  };

  const clearConversationSessionTimer = () => {
    if (conversationSessionTimer) {
      clearTimeout(conversationSessionTimer);
      conversationSessionTimer = undefined;
    }
  };

  const updateConversationSessionState = (
    conversationId: string,
    nextSession: ConversationSessionStatus | undefined,
    settings?: { emit?: boolean; scheduleRefresh?: boolean }
  ) => {
    if (state.currentConversationId !== conversationId) {
      return cloneConversationSession(state.conversationSession);
    }

    const normalizedSession = normalizeConversationSessionStatus(nextSession);
    state.conversationSession = normalizedSession;
    const currentConversation = state.conversations[conversationId];
    if (currentConversation) {
      state.conversations[conversationId] = {
        ...currentConversation,
        metadata: {
          ...(currentConversation.metadata ?? {}),
          ...(normalizedSession
            ? {
                session: normalizedSession,
              }
            : {}),
        },
      };
    }

    clearConversationSessionTimer();

    if (
      settings?.scheduleRefresh !== false &&
      normalizedSession?.expiresAt &&
      options.provider.recoverConversationSession &&
      state.currentConversationId === conversationId
    ) {
      const expiresAtMs = new Date(normalizedSession.expiresAt).getTime();
      if (!Number.isNaN(expiresAtMs)) {
        const refreshDelayMs = Math.max(expiresAtMs - Date.now() - 30_000, 1_000);
        conversationSessionTimer = setTimeout(() => {
          void recoverConversationSessionInternal({
            conversationId,
          }).catch(() => {
            // Session refresh is best-effort and should not break the current UI flow.
          });
        }, refreshDelayMs);
      }
    }

    if (settings?.emit !== false) {
      emitState();
    }

    return cloneConversationSession(normalizedSession);
  };

  const applyProviderEvent = (event: ProviderEvent) => {
    switch (event.type) {
      case 'conversation.created': {
        state.conversations[event.conversation.id] = event.conversation;
        state.currentConversationId = event.conversation.id;
        emitEvent('conversationChanged', { conversationId: event.conversation.id });
        break;
      }
      case 'stream.started': {
        state.pending = false;
        state.streaming = true;
        if (event.conversationId) {
          state.currentConversationId = event.conversationId;
        }
        emitEvent('streamStarted', { conversationId: event.conversationId });
        break;
      }
      case 'message.delta': {
        const result = upsertMessage(
          state,
          {
            ...event.message,
            status: 'streaming',
          },
          true
        );
        emitEvent(result.inserted ? 'messageAppended' : 'messageUpdated', { message: result.message });
        break;
      }
      case 'message.snapshot': {
        const responseUserMessageId = event.message.metadata?.responseMessageIds?.userMessageId;
        if (responseUserMessageId && activeOptimisticUserMessageId) {
          const optimisticUserMessageIndex = state.messages.findIndex(message => message.id === activeOptimisticUserMessageId);

          if (optimisticUserMessageIndex !== -1) {
            const previousUserMessage = state.messages[optimisticUserMessageIndex];
            const updatedUserMessage: ChatMessage = {
              ...previousUserMessage,
              id: responseUserMessageId,
              metadata: {
                ...previousUserMessage.metadata,
                messageIdentity: {
                  source: 'server',
                  localId: activeOptimisticUserMessageId,
                },
              },
            };
            state.messages[optimisticUserMessageIndex] = updatedUserMessage;
            emitEvent('messageUpdated', { message: updatedUserMessage });
            activeOptimisticUserMessageId = undefined;
          }
        }

        const result = upsertMessage(
          state,
          {
            ...event.message,
            status: state.streaming ? 'streaming' : 'done',
          },
          false
        );
        emitEvent(result.inserted ? 'messageAppended' : 'messageUpdated', { message: result.message });
        break;
      }
      case 'message.completed': {
        const existingIndex = state.messages.findIndex(message => message.id === event.messageId);
        if (existingIndex !== -1) {
          const updated: ChatMessage = {
            ...state.messages[existingIndex],
            status: 'done',
          };
          state.messages[existingIndex] = updated;
          emitEvent('messageUpdated', { message: updated });
        }
        break;
      }
      case 'stream.completed': {
        state.pending = false;
        state.streaming = false;
        finalizeStreamingMessages(state, emitEvent);
        emitEvent('streamCompleted', { conversationId: event.conversationId });
        break;
      }
      case 'error': {
        state.pending = false;
        state.streaming = false;
        state.error = event.error;
        const errorInfo = {
          source: resolveErrorSource(event.error, event.errorSource),
          detail: event.error,
        } as const;
        let attachedToAssistantMessage = false;
        for (let index = state.messages.length - 1; index >= 0; index -= 1) {
          const message = state.messages[index];
          if (message.role !== 'assistant') {
            continue;
          }

          const updatedMessage: ChatMessage = {
            ...message,
            status: 'error',
            metadata: {
              ...message.metadata,
              error: errorInfo,
            },
          };
          state.messages[index] = updatedMessage;
          emitEvent('messageUpdated', { message: updatedMessage });
          attachedToAssistantMessage = true;
          break;
        }
        if (!attachedToAssistantMessage) {
          const fallbackAssistantMessage: ChatMessage = {
            id: `assistant-error-${crypto.randomUUID()}`,
            role: 'assistant',
            content: '',
            status: 'error',
            metadata: {
              error: errorInfo,
            },
          };
          state.messages.push(fallbackAssistantMessage);
          emitEvent('messageAppended', { message: fallbackAssistantMessage });
        }
        emitEvent('streamError', {
          error: event.error,
          conversationId: event.conversationId,
          errorSource: errorInfo.source,
        });
        break;
      }
      default:
        break;
    }

    emitState();
  };

  const completeActiveStream = (conversationId: string | undefined) => {
    if (state.pending || state.streaming) {
      applyProviderEvent({
        type: 'stream.completed',
        conversationId,
      });
    }
  };

  const abortActiveStream = (reason: string, conversationId: string | undefined) => {
    activeSendController?.abort(reason);
    completeActiveStream(conversationId);
  };

  const clearActiveStreamReferences = () => {
    activeSendController = undefined;
    activeConversationId = undefined;
    activeOptimisticUserMessageId = undefined;
  };

  const setActiveStream = (controller: AbortController, conversationId: string) => {
    activeSendController = controller;
    activeConversationId = conversationId;
    activeOptimisticUserMessageId = undefined;
  };

  const getConversationSessionStatusInternal = async (
    input: { conversationId?: string; signal?: AbortSignal } = {}
  ) => {
    if (!options.provider.getConversationSessionStatus) {
      throw new Error('Current provider does not support reading conversation session status.');
    }

    const conversationId = input.conversationId ?? state.currentConversationId;
    if (!conversationId) {
      return cloneState(state);
    }

    const nextSession = await options.provider.getConversationSessionStatus({
      conversationId,
      signal: input.signal,
    });
    updateConversationSessionState(conversationId, nextSession);
    return cloneState(state);
  };

  const recoverConversationSessionInternal = async (
    input: { conversationId?: string; signal?: AbortSignal } = {}
  ) => {
    if (!options.provider.recoverConversationSession) {
      throw new Error('Current provider does not support refreshing conversation sessions.');
    }

    const conversationId = input.conversationId ?? state.currentConversationId;
    if (!conversationId) {
      return cloneState(state);
    }

    const nextSession = await options.provider.recoverConversationSession({
      conversationId,
      signal: input.signal,
    });
    updateConversationSessionState(conversationId, nextSession);
    return cloneState(state);
  };

  const recoverConversationInternal = async (input: GetConversationMessagesInput) => {
    if (!options.provider.recoverConversation) {
      throw new Error('Current provider does not support recovering conversations.');
    }

    activeSendController?.abort('chatkit-conversation-recover');
    clearActiveStreamReferences();
    await consumeProviderStream(options.provider.recoverConversation({
      conversationId: input.conversationId,
      signal: input.signal,
    }), {
      conversationId: input.conversationId,
      signal: input.signal,
    }, {
      state,
      completeActiveStream,
      clearActiveStreamReferences,
      applyProviderEvent,
      emitState,
      getActiveSendController: () => activeSendController,
      setActiveStream,
    });
    return cloneState(state);
  };

  const markConversationReadInternal = async (input: {
    conversationId: string;
    messageIndex?: number;
    signal?: AbortSignal;
  }) => {
    if (!options.provider.markConversationRead) {
      throw new Error('Current provider does not support marking conversations as read.');
    }

    const conversation = state.conversations[input.conversationId];
    const messageIndex = input.messageIndex ?? conversation?.messageIndex;
    if (messageIndex == null) {
      return cloneState(state);
    }

    await options.provider.markConversationRead({
      conversationId: input.conversationId,
      messageIndex,
      signal: input.signal,
    });

    upsertConversationRecord(state, input.conversationId, {
      unread: false,
      readMessageIndex: messageIndex,
      ...(conversation?.messageIndex !== undefined ? { messageIndex: conversation.messageIndex } : {}),
    });
    emitState();
    return cloneState(state);
  };

  return {
    async getOnboardingInfo() {
      if (!options.provider.getOnboardingInfo) {
        return {};
      }

      return options.provider.getOnboardingInfo();
    },

    async getContextInfo() {
      if (!options.provider.getContextInfo) {
        return {};
      }

      return options.provider.getContextInfo();
    },

    async getConversationSessionStatus(input) {
      return getConversationSessionStatusInternal(input);
    },

    async recoverConversationSession(input) {
      return recoverConversationSessionInternal(input);
    },

    injectApplicationContext(context) {
      state.applicationContext = cloneApplicationContext(context);
      emitState();
      return cloneState(state);
    },

    removeApplicationContext() {
      state.applicationContext = cloneApplicationContext(options.defaultApplicationContext);
      emitState();
      return cloneState(state);
    },

    async createConversation(input) {
      activeSendController?.abort('chatkit-conversation-created');
      clearActiveStreamReferences();
      clearConversationSessionTimer();
      resetConversationRuntime(state, options.defaultApplicationContext);
      const result = await options.provider.createConversation(input);
      applyProviderEvent({ type: 'conversation.created', conversation: result.conversation });
      if (options.provider.getConversationSessionStatus) {
        try {
          await getConversationSessionStatusInternal({
            conversationId: result.conversation.id,
          });
        } catch {
          // Session status is best-effort and should not block conversation creation.
        }
      }
      return cloneState(state);
    },

    async listConversations(input) {
      if (!options.provider.listConversations) {
        throw new Error('Current provider does not support listing conversations.');
      }

      const conversations = await options.provider.listConversations(input);
      if (input?.replace) {
        state.conversations = {};
      }
      for (const conversation of conversations) {
        state.conversations[conversation.id] = conversation;
      }
      emitState();
      return conversations.map(conversation => ({ ...conversation }));
    },

    async loadConversation(input) {
      if (!options.provider.getConversationMessages) {
        throw new Error('Current provider does not support loading conversation messages.');
      }

      activeSendController?.abort('chatkit-conversation-loaded');
      clearActiveStreamReferences();
      clearConversationSessionTimer();
      const messagesResult = normalizeConversationMessagesResult(await options.provider.getConversationMessages(input));
      state.currentConversationId = input.conversationId;
      resetConversationRuntime(state, options.defaultApplicationContext);
      state.messages = messagesResult.messages.map(message => ({
        ...message,
        status: 'done',
        applicationContext: cloneApplicationContext(message.applicationContext),
        metadata: cloneMessageMetadata(message.metadata),
      }));
      const nextConversation = upsertConversationRecord(state, input.conversationId, {
        ...(messagesResult.conversation ?? {}),
        ...(messagesResult.readMessageIndex !== undefined
          ? { readMessageIndex: messagesResult.readMessageIndex }
          : {}),
        ...(messagesResult.messageIndex !== undefined ? { messageIndex: messagesResult.messageIndex } : {}),
      });
      nextConversation.unread = false;

      const shouldMarkConversationRead =
        messagesResult.messageIndex !== undefined &&
        messagesResult.messageIndex > (messagesResult.readMessageIndex ?? 0);
      if (shouldMarkConversationRead) {
        if (options.provider.markConversationRead) {
          try {
            await options.provider.markConversationRead({
              conversationId: input.conversationId,
              messageIndex: messagesResult.messageIndex!,
              signal: input.signal,
            });
          } catch (error) {
            state.error = error;
          }
        }

        nextConversation.readMessageIndex = messagesResult.messageIndex;
        nextConversation.unread = false;
      }

      emitEvent('conversationChanged', { conversationId: input.conversationId });
      emitState();

      if (options.provider.getConversationSessionStatus) {
        try {
          await getConversationSessionStatusInternal({
            conversationId: input.conversationId,
            signal: input.signal,
          });
        } catch {
          // Session status is best-effort and should not block history loading.
        }
      }

      if (messagesResult.recoverConversation && options.provider.recoverConversation && !messagesResult.conversationLoading) {
        await recoverConversationInternal(input);
      }

      return cloneState(state);
    },

    async recoverConversation(input) {
      return recoverConversationInternal(input);
    },

    async markConversationRead(input) {
      return markConversationReadInternal(input);
    },

    async renameConversation(input) {
      if (!options.provider.updateConversation) {
        throw new Error('Current provider does not support updating conversations.');
      }

      const updatedConversation = await options.provider.updateConversation(input);
      const existingConversation = state.conversations[input.conversationId];
      state.conversations[input.conversationId] = {
        ...(existingConversation ?? { id: input.conversationId }),
        ...updatedConversation,
      };
      emitState();
      return cloneState(state);
    },

    async deleteConversation(input) {
      if (!options.provider.deleteConversation) {
        throw new Error('Current provider does not support deleting conversations.');
      }

      const isCurrentConversation = state.currentConversationId === input.conversationId;
      if (isCurrentConversation) {
        abortActiveStream('chatkit-conversation-deleted', input.conversationId);
        clearActiveStreamReferences();
        clearConversationSessionTimer();
        state.currentConversationId = undefined;
        resetConversationRuntime(state, options.defaultApplicationContext);
      }

      await options.provider.deleteConversation(input);
      delete state.conversations[input.conversationId];

      if (isCurrentConversation) {
        emitEvent('conversationChanged', { conversationId: undefined });
      }

      emitState();
      return cloneState(state);
    },

    setInputFiles(input) {
      const nextAttachments = cloneInputAttachments(input.attachments);
      if (input.mode === 'append') {
        state.inputAttachments = [...state.inputAttachments, ...nextAttachments];
      } else {
        state.inputAttachments = nextAttachments;
      }
      emitState();
      return cloneState(state);
    },

    clearInputFiles() {
      if (state.inputAttachments.length === 0) {
        return cloneState(state);
      }

      state.inputAttachments = [];
      emitState();
      return cloneState(state);
    },

    setTemporaryFiles(input) {
      const nextAttachments = cloneInputAttachments(input.attachments) as UploadedAttachmentInput[];
      if (input.mode === 'append') {
        state.temporaryAttachments = [...state.temporaryAttachments, ...nextAttachments];
      } else {
        state.temporaryAttachments = nextAttachments;
      }
      emitState();
      return cloneState(state);
    },

    clearTemporaryFiles() {
      if (state.temporaryAttachments.length === 0) {
        return cloneState(state);
      }

      state.temporaryAttachments = [];
      emitState();
      return cloneState(state);
    },

    async uploadTemporaryFiles(input) {
      const uploadedAttachments = (await prepareAttachmentInputs(
        {
          conversationId: input.conversationId ?? state.currentConversationId,
          attachments: input.attachments,
        },
        {
          hostAdapter: options.hostAdapter,
          provider: options.providerName,
          providerUploadFile: options.provider.uploadFile,
        }
      )) as UploadedAttachmentInput[];

      if (input.mode === 'append') {
        state.temporaryAttachments = [...state.temporaryAttachments, ...uploadedAttachments];
      } else {
        state.temporaryAttachments = uploadedAttachments;
      }

      emitState();
      return cloneState(state);
    },

    updateMessage(input) {
      if (
        input.conversationId &&
        state.currentConversationId &&
        input.conversationId !== state.currentConversationId
      ) {
        return cloneState(state);
      }

      const messageIndex = state.messages.findIndex(message => message.id === input.messageId);
      if (messageIndex === -1) {
        return cloneState(state);
      }

      const previousMessage = state.messages[messageIndex];
      const updatedMessage: ChatMessage = {
        ...previousMessage,
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.applicationContext
          ? {
              applicationContext: cloneApplicationContext(input.applicationContext),
            }
          : {}),
        metadata: {
          ...previousMessage.metadata,
          ...(input.attachments
            ? {
                attachments: cloneAttachments(input.attachments),
              }
            : {}),
        },
      };

      state.messages[messageIndex] = updatedMessage;
      emitEvent('messageUpdated', { message: updatedMessage });
      emitState();
      return cloneState(state);
    },

    truncateMessages(input) {
      if (
        input.conversationId &&
        state.currentConversationId &&
        input.conversationId !== state.currentConversationId
      ) {
        return cloneState(state);
      }

      const messageIndex = state.messages.findIndex(message => message.id === input.fromMessageId);
      if (messageIndex === -1) {
        return cloneState(state);
      }

      state.messages = state.messages.slice(0, input.inclusive ? messageIndex : messageIndex + 1);
      emitState();
      return cloneState(state);
    },

    async submitMessageFeedback(input) {
      if (!options.provider.submitMessageFeedback) {
        throw new Error('Current provider does not support message feedback.');
      }

      await options.provider.submitMessageFeedback(input);

      const existingIndex = state.messages.findIndex(message => message.id === input.messageId);
      if (existingIndex !== -1) {
        const previousMessage = state.messages[existingIndex];
        const updatedMessage: ChatMessage = {
          ...previousMessage,
          metadata: {
            ...previousMessage.metadata,
            feedback: input.feedback,
          },
        };
        state.messages[existingIndex] = updatedMessage;
        emitEvent('messageUpdated', { message: updatedMessage });
        emitState();
      }

      return cloneState(state);
    },

    async send(input) {
      if (activeSendController) {
        activeSendController.abort('chatkit-send-replaced');
      }

      let conversationId = input.conversationId ?? state.currentConversationId;
      if (!conversationId) {
        const created = await options.provider.createConversation();
        applyProviderEvent({ type: 'conversation.created', conversation: created.conversation });
        conversationId = created.conversation.id;
      }

      const controller = new AbortController();
      const relayAbort = () => controller.abort(input.signal?.reason);
      if (input.signal?.aborted) {
        controller.abort(input.signal.reason);
      } else {
        input.signal?.addEventListener('abort', relayAbort, { once: true });
      }

      if (input.applicationContext) {
        state.applicationContext = cloneApplicationContext(input.applicationContext);
        emitState();
      }

      activeSendController = controller;
      activeConversationId = conversationId;
      const finalInputAttachments = cloneInputAttachments(input.attachments ?? state.inputAttachments);
      const shouldAppendOptimisticUserMessage =
        !input.regenerateAssistantMessageId && !input.regenerateUserMessageId && !input.interrupt;
      const optimisticUserMessageId = shouldAppendOptimisticUserMessage
        ? createLocalMessageId('user')
        : undefined;
      const finalApplicationContext =
        cloneApplicationContext(input.applicationContext) ??
        cloneApplicationContext(state.applicationContext) ??
        cloneApplicationContext(options.defaultApplicationContext);

      if (shouldAppendOptimisticUserMessage) {
        activeOptimisticUserMessageId = optimisticUserMessageId;
        const userMessage: ChatMessage = {
          id: optimisticUserMessageId!,
          role: 'user',
          content: input.text,
          status: 'done',
          ...(finalApplicationContext ? { applicationContext: finalApplicationContext } : {}),
          metadata: {
            ...(toChatMessageAttachments(finalInputAttachments)
              ? {
                  attachments: toChatMessageAttachments(finalInputAttachments),
                }
              : {}),
            messageIdentity: {
              source: 'local',
              localId: optimisticUserMessageId,
            },
          },
        };
        state.messages.push(userMessage);
        emitEvent('messageAppended', { message: userMessage });
      }
      state.pending = true;
      state.error = undefined;
      emitState();

      try {
        const finalTemporaryAreaId = resolveTemporaryAreaId(finalInputAttachments, input.temporaryAreaId);
        const preparedInput = await prepareSendMessageInput(
          {
            ...input,
            conversationId,
            ...(finalApplicationContext ? { applicationContext: finalApplicationContext } : {}),
            ...(finalInputAttachments.length > 0 ? { attachments: finalInputAttachments } : {}),
            ...(finalTemporaryAreaId
              ? {
                  temporaryAreaId: finalTemporaryAreaId,
                }
              : {}),
          },
          {
            hostAdapter: options.hostAdapter,
            provider: options.providerName,
            providerUploadFile: options.provider.uploadFile,
          }
        );

        if (optimisticUserMessageId) {
          const optimisticUserMessageIndex = state.messages.findIndex(message => message.id === optimisticUserMessageId);
          const preparedAttachments = toChatMessageAttachments(preparedInput.attachments);

          if (optimisticUserMessageIndex !== -1 && preparedAttachments) {
            const previousMessage = state.messages[optimisticUserMessageIndex];
            const updatedMessage: ChatMessage = {
              ...previousMessage,
              metadata: {
                ...previousMessage.metadata,
                attachments: preparedAttachments,
              },
            };
            state.messages[optimisticUserMessageIndex] = updatedMessage;
            emitEvent('messageUpdated', { message: updatedMessage });
            emitState();
          }
        }

        state.inputAttachments = [];
        emitState();

        if (controller.signal.aborted) {
          if (activeSendController === controller) {
            completeActiveStream(conversationId);
          }
          return cloneState(state);
        }

        await consumeProviderStream(options.provider.send({ ...preparedInput, signal: controller.signal }), {
          conversationId,
          signal: controller.signal,
          controller,
        }, {
          state,
          completeActiveStream,
          clearActiveStreamReferences,
          applyProviderEvent,
          emitState,
          getActiveSendController: () => activeSendController,
          setActiveStream: (nextController, nextConversationId) => {
            activeSendController = nextController;
            activeConversationId = nextConversationId;
          },
        });
        return cloneState(state);
      } catch (error) {
        if (controller.signal.aborted) {
          state.inputAttachments = [];
          emitState();
          if (activeSendController === controller) {
            completeActiveStream(conversationId);
          }
          return cloneState(state);
        }

        state.inputAttachments = [];
        emitState();
        applyProviderEvent({ type: 'error', error, conversationId });
        throw error;
      } finally {
        input.signal?.removeEventListener('abort', relayAbort);
        if (activeSendController === controller) {
          clearActiveStreamReferences();
        }
      }
    },

    stop() {
      abortActiveStream('chatkit-stop', activeConversationId ?? state.currentConversationId);
      return cloneState(state);
    },

    cancel() {
      abortActiveStream('chatkit-cancel', activeConversationId ?? state.currentConversationId);
      return cloneState(state);
    },

    async terminate(input) {
      const conversationId = input?.conversationId ?? activeConversationId ?? state.currentConversationId;

      if (conversationId === activeConversationId || (!conversationId && activeSendController)) {
        abortActiveStream('chatkit-terminate', conversationId);
      }

      if (options.provider.terminateConversation) {
        await options.provider.terminateConversation({
          conversationId,
          mode: input?.mode ?? 'terminate',
          signal: input?.signal,
        });
      }

      return cloneState(state);
    },

    getState() {
      return cloneState(state);
    },

    subscribe(listener) {
      stateListeners.add(listener);
      listener(cloneState(state));
      return () => {
        stateListeners.delete(listener);
      };
    },

    on(eventName, listener) {
      const currentListeners = eventListeners.get(eventName) ?? new Set();
      currentListeners.add(listener as (payload: any) => void);
      eventListeners.set(eventName, currentListeners);
      return () => {
        currentListeners.delete(listener as (payload: any) => void);
      };
    },
  };
}
