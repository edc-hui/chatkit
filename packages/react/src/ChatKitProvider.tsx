import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  type ApplicationContext,
  createChatKitEngine,
  type ChatKitEngine,
  type ChatKitHostAdapter,
  type ChatKitProviderName,
  type ContextInfo,
  type OnboardingInfo,
  type ChatKitState,
  type ChatProvider,
} from '@kweaver-ai/chatkit-core';
import {
  createChatKitTranslator,
  type ChatKitI18nConfig,
  type ChatKitTranslator,
} from '@kweaver-ai/chatkit-shared';

export interface ChatKitProviderProps extends ChatKitI18nConfig {
  provider?: ChatProvider;
  engine?: ChatKitEngine;
  hostAdapter?: ChatKitHostAdapter;
  providerName?: ChatKitProviderName;
  defaultApplicationContext?: ApplicationContext;
  children: React.ReactNode;
}

const ChatKitContext = createContext<ChatKitEngine | null>(null);
const ChatKitI18nContext = createContext<ChatKitTranslator | null>(null);
const ChatKitDebugEntriesContext = createContext<ChatKitDebugCommandEntry[] | null>(null);
const ChatKitDebugActionsContext = createContext<ChatKitDebugActionsContextValue | null>(null);

export type ChatKitDebugCommandStatus = 'pending' | 'success' | 'error';

export interface ChatKitDebugCommandEntry {
  id: string;
  name: keyof UseChatKitResult['commands'];
  timestamp: number;
  status: ChatKitDebugCommandStatus;
  input?: unknown;
  output?: unknown;
  error?: unknown;
  durationMs?: number;
}

interface ChatKitDebugActionsContextValue {
  startCommand: (name: ChatKitDebugCommandEntry['name'], input?: unknown) => string;
  finishCommand: (id: string, status: Exclude<ChatKitDebugCommandStatus, 'pending'>, output?: unknown, error?: unknown) => void;
}

const MAX_DEBUG_COMMAND_ENTRIES = 50;

function createDebugCommandId(name: ChatKitDebugCommandEntry['name']): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${name}-${crypto.randomUUID()}`;
  }

  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isChatKitStateSnapshot(value: unknown): value is ChatKitState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ChatKitState>;
  return (
    Array.isArray(candidate.messages) &&
    typeof candidate.conversations === 'object' &&
    candidate.conversations !== null &&
    typeof candidate.pending === 'boolean' &&
    typeof candidate.streaming === 'boolean'
  );
}

function summarizeDebugOutput(value: unknown): unknown {
  if (isChatKitStateSnapshot(value)) {
    return {
      currentConversationId: value.currentConversationId,
      messageCount: value.messages.length,
      conversationCount: Object.keys(value.conversations).length,
      pending: value.pending,
      streaming: value.streaming,
      hasError: Boolean(value.error),
    };
  }

  return value;
}

export function ChatKitProvider(props: ChatKitProviderProps) {
  const [commandEntries, setCommandEntries] = useState<ChatKitDebugCommandEntry[]>([]);
  const engine = useMemo(() => {
    if (props.engine) {
      return props.engine;
    }

    if (!props.provider) {
      throw new Error('ChatKitProvider requires either an engine or a provider.');
    }

    return createChatKitEngine({
      provider: props.provider,
      hostAdapter: props.hostAdapter,
      providerName: props.providerName,
      defaultApplicationContext: props.defaultApplicationContext,
    });
  }, [props.defaultApplicationContext, props.engine, props.hostAdapter, props.provider, props.providerName]);

  const translator = useMemo(
    () =>
      createChatKitTranslator({
        locale: props.locale,
        fallbackLocale: props.fallbackLocale,
        messages: props.messages,
        t: props.t,
      }),
    [props.fallbackLocale, props.locale, props.messages, props.t]
  );

  const startCommand = useCallback((name: ChatKitDebugCommandEntry['name'], input?: unknown) => {
    const id = createDebugCommandId(name);

    setCommandEntries(currentEntries =>
      currentEntries
        .concat({
          id,
          name,
          timestamp: Date.now(),
          status: 'pending',
          input,
        })
        .slice(-MAX_DEBUG_COMMAND_ENTRIES)
    );

    return id;
  }, []);

  const finishCommand = useCallback(
    (id: string, status: Exclude<ChatKitDebugCommandStatus, 'pending'>, output?: unknown, error?: unknown) => {
      setCommandEntries(currentEntries =>
        currentEntries.map(entry =>
          entry.id === id
            ? {
                ...entry,
                status,
                durationMs: Date.now() - entry.timestamp,
                ...(status === 'success'
                  ? {
                      output: summarizeDebugOutput(output),
                      error: undefined,
                    }
                  : {
                      output: undefined,
                      error,
                    }),
              }
            : entry
        )
      );
    },
    []
  );

  const debugActionsContextValue = useMemo<ChatKitDebugActionsContextValue>(
    () => ({
      startCommand,
      finishCommand,
    }),
    [finishCommand, startCommand]
  );

  return (
    <ChatKitContext.Provider value={engine}>
      <ChatKitI18nContext.Provider value={translator}>
        <ChatKitDebugActionsContext.Provider value={debugActionsContextValue}>
          <ChatKitDebugEntriesContext.Provider value={commandEntries}>{props.children}</ChatKitDebugEntriesContext.Provider>
        </ChatKitDebugActionsContext.Provider>
      </ChatKitI18nContext.Provider>
    </ChatKitContext.Provider>
  );
}

export function useChatKitEngine(): ChatKitEngine {
  const engine = useContext(ChatKitContext);
  if (!engine) {
    throw new Error('useChatKitEngine must be used inside ChatKitProvider.');
  }
  return engine;
}

export function useChatKitI18n(): ChatKitTranslator {
  const translator = useContext(ChatKitI18nContext);
  if (!translator) {
    throw new Error('useChatKitI18n must be used inside ChatKitProvider.');
  }
  return translator;
}

export function useChatKitCommandLog(): ChatKitDebugCommandEntry[] {
  const commandEntries = useContext(ChatKitDebugEntriesContext);
  if (!commandEntries) {
    throw new Error('useChatKitCommandLog must be used inside ChatKitProvider.');
  }

  return commandEntries;
}

export interface UseChatKitResult {
  state: ChatKitState;
  commands: {
    getOnboardingInfo: () => Promise<OnboardingInfo>;
    getContextInfo: () => Promise<ContextInfo>;
    getConversationSessionStatus: ChatKitEngine['getConversationSessionStatus'];
    recoverConversationSession: ChatKitEngine['recoverConversationSession'];
    injectApplicationContext: ChatKitEngine['injectApplicationContext'];
    removeApplicationContext: ChatKitEngine['removeApplicationContext'];
    createConversation: ChatKitEngine['createConversation'];
    listConversations: ChatKitEngine['listConversations'];
    loadConversation: ChatKitEngine['loadConversation'];
    recoverConversation: ChatKitEngine['recoverConversation'];
    markConversationRead: ChatKitEngine['markConversationRead'];
    renameConversation: ChatKitEngine['renameConversation'];
    deleteConversation: ChatKitEngine['deleteConversation'];
    setInputFiles: ChatKitEngine['setInputFiles'];
    clearInputFiles: ChatKitEngine['clearInputFiles'];
    setTemporaryFiles: ChatKitEngine['setTemporaryFiles'];
    clearTemporaryFiles: ChatKitEngine['clearTemporaryFiles'];
    uploadTemporaryFiles: ChatKitEngine['uploadTemporaryFiles'];
    updateMessage: ChatKitEngine['updateMessage'];
    truncateMessages: ChatKitEngine['truncateMessages'];
    submitMessageFeedback: ChatKitEngine['submitMessageFeedback'];
    send: ChatKitEngine['send'];
    stop: ChatKitEngine['stop'];
    cancel: ChatKitEngine['cancel'];
    terminate: ChatKitEngine['terminate'];
  };
  engine: ChatKitEngine;
}

export function useChatKit(): UseChatKitResult {
  const engine = useChatKitEngine();
  const debugActions = useContext(ChatKitDebugActionsContext);
  const [state, setState] = useState(() => engine.getState());

  useEffect(() => {
    return engine.subscribe(nextState => {
      setState(nextState);
    });
  }, [engine]);

  const commands = useMemo<UseChatKitResult['commands']>(() => {
    const wrapInput = (args: unknown[]) => (args.length <= 1 ? args[0] : args);
    const startCommand = (name: keyof UseChatKitResult['commands'], args: unknown[]) =>
      debugActions?.startCommand(name, wrapInput(args));
    const finishCommand = (
      entryId: string | undefined,
      status: Exclude<ChatKitDebugCommandStatus, 'pending'>,
      output?: unknown,
      error?: unknown
    ) => {
      if (!entryId) {
        return;
      }

      debugActions?.finishCommand(entryId, status, output, error);
    };

    const wrapAsync = <Args extends unknown[], Result>(
      name: keyof UseChatKitResult['commands'],
      command: (...args: Args) => Promise<Result>
    ) => {
      return async (...args: Args): Promise<Result> => {
        const entryId = startCommand(name, args);

        try {
          const result = await command(...args);
          finishCommand(entryId, 'success', result);
          return result;
        } catch (error) {
          finishCommand(entryId, 'error', undefined, error);
          throw error;
        }
      };
    };

    const wrapSync = <Args extends unknown[], Result>(
      name: keyof UseChatKitResult['commands'],
      command: (...args: Args) => Result
    ) => {
      return (...args: Args): Result => {
        const entryId = startCommand(name, args);

        try {
          const result = command(...args);
          finishCommand(entryId, 'success', result);
          return result;
        } catch (error) {
          finishCommand(entryId, 'error', undefined, error);
          throw error;
        }
      };
    };

    return {
      getOnboardingInfo: wrapAsync('getOnboardingInfo', engine.getOnboardingInfo),
      getContextInfo: wrapAsync('getContextInfo', engine.getContextInfo),
      getConversationSessionStatus: wrapAsync('getConversationSessionStatus', engine.getConversationSessionStatus),
      recoverConversationSession: wrapAsync('recoverConversationSession', engine.recoverConversationSession),
      injectApplicationContext: wrapSync('injectApplicationContext', engine.injectApplicationContext),
      removeApplicationContext: wrapSync('removeApplicationContext', engine.removeApplicationContext),
      createConversation: wrapAsync('createConversation', engine.createConversation),
      listConversations: wrapAsync('listConversations', engine.listConversations),
      loadConversation: wrapAsync('loadConversation', engine.loadConversation),
      recoverConversation: wrapAsync('recoverConversation', engine.recoverConversation),
      markConversationRead: wrapAsync('markConversationRead', engine.markConversationRead),
      renameConversation: wrapAsync('renameConversation', engine.renameConversation),
      deleteConversation: wrapAsync('deleteConversation', engine.deleteConversation),
      setInputFiles: wrapSync('setInputFiles', engine.setInputFiles),
      clearInputFiles: wrapSync('clearInputFiles', engine.clearInputFiles),
      setTemporaryFiles: wrapSync('setTemporaryFiles', engine.setTemporaryFiles),
      clearTemporaryFiles: wrapSync('clearTemporaryFiles', engine.clearTemporaryFiles),
      uploadTemporaryFiles: wrapAsync('uploadTemporaryFiles', engine.uploadTemporaryFiles),
      updateMessage: wrapSync('updateMessage', engine.updateMessage),
      truncateMessages: wrapSync('truncateMessages', engine.truncateMessages),
      submitMessageFeedback: wrapAsync('submitMessageFeedback', engine.submitMessageFeedback),
      send: wrapAsync('send', engine.send),
      stop: wrapSync('stop', engine.stop),
      cancel: wrapSync('cancel', engine.cancel),
      terminate: wrapAsync('terminate', engine.terminate),
    };
  }, [debugActions, engine]);

  return {
    state,
    commands,
    engine,
  };
}
