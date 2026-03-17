import { defineComponent, h, type PropType } from 'vue';

import type { ChatKitEngine, ChatKitHostAdapter, ChatKitProviderName, ChatProvider } from '@kweaver-ai/chatkit-core';
import type { ChatKitLocale, ChatKitMessageKey, ChatKitMessages } from '@kweaver-ai/chatkit-shared';

import { provideChatKit } from './ChatKitProvider.js';

export const ChatKitProvider = defineComponent({
  name: 'ChatKitProvider',
  props: {
    provider: {
      type: Object as () => ChatProvider | undefined,
      required: false,
    },
    engine: {
      type: Object as () => ChatKitEngine | undefined,
      required: false,
    },
    hostAdapter: {
      type: Object as () => ChatKitHostAdapter | undefined,
      required: false,
    },
    providerName: {
      type: String as PropType<ChatKitProviderName | undefined>,
      required: false,
    },
    locale: {
      type: String as PropType<ChatKitLocale | undefined>,
      required: false,
    },
    fallbackLocale: {
      type: String as PropType<ChatKitLocale | undefined>,
      required: false,
    },
    messages: {
      type: Object as PropType<Partial<Record<ChatKitLocale, ChatKitMessages>> | undefined>,
      required: false,
    },
    t: {
      type: Function as PropType<((key: ChatKitMessageKey, params?: Record<string, unknown>) => string) | undefined>,
      required: false,
    },
  },
  setup(props, { slots }) {
    provideChatKit({
      provider: props.provider,
      engine: props.engine,
      hostAdapter: props.hostAdapter,
      providerName: props.providerName,
      locale: props.locale,
      fallbackLocale: props.fallbackLocale,
      messages: props.messages,
      t: props.t,
    });

    return () => slots.default?.() ?? h('div');
  },
});
