import { inject, onMounted, onUnmounted, provide, readonly, ref, type InjectionKey, type Ref } from 'vue';

import {
  type ApplicationContext,
  createChatKitEngine,
  type ChatKitEngine,
  type ChatKitHostAdapter,
  type ChatKitProviderName,
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
}

const engineKey: InjectionKey<ChatKitEngine> = Symbol('ChatKitEngine');
const stateKey: InjectionKey<Ref<ChatKitState>> = Symbol('ChatKitState');
const i18nKey: InjectionKey<ChatKitTranslator> = Symbol('ChatKitI18n');

export function provideChatKit(props: ChatKitProviderProps) {
  const engine =
    props.engine ??
    (props.provider
      ? createChatKitEngine({
          provider: props.provider,
          hostAdapter: props.hostAdapter,
          providerName: props.providerName,
          defaultApplicationContext: props.defaultApplicationContext,
        })
      : null);

  if (!engine) {
    throw new Error('provideChatKit requires either an engine or a provider.');
  }

  const state = ref(engine.getState()) as Ref<ChatKitState>;
  const translator = createChatKitTranslator({
    locale: props.locale,
    fallbackLocale: props.fallbackLocale,
    messages: props.messages,
    t: props.t,
  });
  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    unsubscribe = engine.subscribe(nextState => {
      state.value = nextState;
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  provide(engineKey, engine);
  provide(stateKey, readonly(state) as Ref<ChatKitState>);
  provide(i18nKey, translator);

  return {
    engine,
    state,
    translator,
  };
}

export function useChatKitEngine(): ChatKitEngine {
  const engine = inject(engineKey, null);
  if (!engine) {
    throw new Error('useChatKitEngine must be used inside ChatKitProvider.');
  }
  return engine;
}

export function useChatKitI18n(): ChatKitTranslator {
  const translator = inject(i18nKey, null);
  if (!translator) {
    throw new Error('useChatKitI18n must be used inside ChatKitProvider.');
  }
  return translator;
}

export function useChatKit() {
  const engine = useChatKitEngine();
  const state = inject(stateKey, null);

  if (!state) {
    throw new Error('useChatKit must be used inside ChatKitProvider.');
  }

  return {
    state,
    engine,
    commands: {
      getOnboardingInfo: engine.getOnboardingInfo,
      getContextInfo: engine.getContextInfo,
      getConversationSessionStatus: engine.getConversationSessionStatus,
      recoverConversationSession: engine.recoverConversationSession,
      injectApplicationContext: engine.injectApplicationContext,
      removeApplicationContext: engine.removeApplicationContext,
      createConversation: engine.createConversation,
      listConversations: engine.listConversations,
      loadConversation: engine.loadConversation,
      recoverConversation: engine.recoverConversation,
      markConversationRead: engine.markConversationRead,
      renameConversation: engine.renameConversation,
      deleteConversation: engine.deleteConversation,
      setInputFiles: engine.setInputFiles,
      clearInputFiles: engine.clearInputFiles,
      setTemporaryFiles: engine.setTemporaryFiles,
      clearTemporaryFiles: engine.clearTemporaryFiles,
      uploadTemporaryFiles: engine.uploadTemporaryFiles,
      updateMessage: engine.updateMessage,
      truncateMessages: engine.truncateMessages,
      send: engine.send,
      submitMessageFeedback: engine.submitMessageFeedback,
      stop: engine.stop,
      cancel: engine.cancel,
      terminate: engine.terminate,
    },
  };
}
