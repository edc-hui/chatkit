// @vitest-environment jsdom

import { defineComponent, h, onMounted, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { ChatProvider, ProviderEvent } from '@kweaver-ai/chatkit-core';

import { ChatKitProvider, useChatKit, useChatKitI18n } from './index.js';

function createAsyncIterable(events: ProviderEvent[]): AsyncIterable<ProviderEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
  };
}

describe('ChatKitProvider (Vue)', () => {
  it('exposes state, commands, and i18n through the Vue adapter', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-vue-1',
          },
        };
      },
      send() {
        return createAsyncIterable([
          { type: 'stream.started', conversationId: 'conversation-vue-1' },
          {
            type: 'message.snapshot',
            message: {
              id: 'assistant-vue-1',
              role: 'assistant',
              content: 'Hello Vue',
            },
          },
          { type: 'message.completed', messageId: 'assistant-vue-1' },
          { type: 'stream.completed', conversationId: 'conversation-vue-1' },
        ]);
      },
    };

    const Consumer = defineComponent({
      name: 'Consumer',
      setup() {
        const { state, commands } = useChatKit();
        const translator = useChatKitI18n();

        onMounted(() => {
          void commands.send({ text: 'hello' });
        });

        return () =>
          h(
            'div',
            [translator.t('sender.send'), state.value.messages.map(message => message.content).join('|')].join('|')
          );
      },
    });

    const wrapper = mount({
      render() {
        return h(
          ChatKitProvider,
          { provider, locale: 'zh-TW' },
          {
            default: () => h(Consumer),
          }
        );
      },
    });

    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('送出');
    expect(wrapper.text()).toContain('Hello Vue');
  });

  it('exposes conversation history commands through the Vue adapter', async () => {
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-vue-history-created',
          },
        };
      },
      async listConversations() {
        return [
          {
            id: 'conversation-vue-history-1',
            title: 'Vue History',
          },
        ];
      },
      async getConversationMessages() {
        return [
          {
            id: 'assistant-vue-history-1',
            role: 'assistant',
            content: 'Loaded from history',
          },
        ];
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    const Consumer = defineComponent({
      name: 'ConversationHistoryConsumer',
      setup() {
        const { state, commands } = useChatKit();

        onMounted(() => {
          void (async () => {
            await commands.listConversations();
            await commands.loadConversation({ conversationId: 'conversation-vue-history-1' });
          })();
        });

        return () =>
          h(
            'div',
            [
              Object.values(state.value.conversations)
                .map(conversation => conversation.title ?? conversation.id)
                .join('|'),
              state.value.messages.map(message => message.content).join('|'),
            ].join('|')
          );
      },
    });

    const wrapper = mount({
      render() {
        return h(
          ChatKitProvider,
          { provider, locale: 'en-US' },
          {
            default: () => h(Consumer),
          }
        );
      },
    });

    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Vue History');
    expect(wrapper.text()).toContain('Loaded from history');
  });

  it('exposes getOnboardingInfo through the Vue adapter commands', async () => {
    const provider: ChatProvider = {
      async getOnboardingInfo() {
        return {
          greeting: 'Vue onboarding',
        };
      },
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-vue-onboarding-created',
          },
        };
      },
      send() {
        return createAsyncIterable([]);
      },
    };

    const Consumer = defineComponent({
      name: 'OnboardingConsumer',
      setup() {
        const { commands } = useChatKit();
        const greeting = ref('');

        onMounted(() => {
          void (async () => {
            const info = await commands.getOnboardingInfo();
            greeting.value = info.greeting ?? '';
          })();
        });

        return () => h('div', greeting.value);
      },
    });

    const wrapper = mount({
      render() {
        return h(
          ChatKitProvider,
          { provider, locale: 'en-US' },
          {
            default: () => h(Consumer),
          }
        );
      },
    });

    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Vue onboarding');
  });

  it('exposes submitMessageFeedback through the Vue adapter commands', async () => {
    const submitMessageFeedback = vi.fn(async () => undefined);
    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-vue-feedback-created',
          },
        };
      },
      submitMessageFeedback,
      send() {
        return createAsyncIterable([]);
      },
    };

    const Consumer = defineComponent({
      name: 'FeedbackConsumer',
      setup() {
        const { commands } = useChatKit();
        const status = ref('idle');

        onMounted(() => {
          void (async () => {
            await commands.submitMessageFeedback({
              conversationId: 'conversation-vue-feedback-created',
              messageId: 'assistant-vue-feedback-1',
              feedback: 'upvote',
            });
            status.value = 'submitted';
          })();
        });

        return () => h('div', status.value);
      },
    });

    const wrapper = mount({
      render() {
        return h(
          ChatKitProvider,
          { provider, locale: 'en-US' },
          {
            default: () => h(Consumer),
          }
        );
      },
    });

    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('submitted');
    expect(submitMessageFeedback).toHaveBeenCalledWith({
      conversationId: 'conversation-vue-feedback-created',
      messageId: 'assistant-vue-feedback-1',
      feedback: 'upvote',
    });
  });

  it('exposes conversation session status commands through the Vue adapter', async () => {
    const getConversationSessionStatus = vi.fn(async () => ({
      status: 'active' as const,
      ttlSeconds: 120,
    }));
    const recoverConversationSession = vi.fn(async () => ({
      status: 'active' as const,
      ttlSeconds: 240,
    }));

    const provider: ChatProvider = {
      async createConversation() {
        return {
          conversation: {
            id: 'conversation-vue-session-1',
          },
        };
      },
      getConversationSessionStatus,
      recoverConversationSession,
      send() {
        return createAsyncIterable([]);
      },
    };

    const Consumer = defineComponent({
      name: 'SessionConsumer',
      setup() {
        const { commands, state } = useChatKit();
        const status = ref('');

        onMounted(() => {
          void (async () => {
            await commands.createConversation();
            await commands.getConversationSessionStatus();
            await commands.recoverConversationSession();
            status.value = state.value.conversationSession?.status ?? '';
          })();
        });

        return () => h('div', status.value);
      },
    });

    const wrapper = mount({
      render() {
        return h(
          ChatKitProvider,
          { provider, locale: 'en-US' },
          {
            default: () => h(Consumer),
          }
        );
      },
    });

    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('active');
    expect(getConversationSessionStatus).toHaveBeenCalledWith({
      conversationId: 'conversation-vue-session-1',
      signal: undefined,
    });
    expect(recoverConversationSession).toHaveBeenCalledWith({
      conversationId: 'conversation-vue-session-1',
      signal: undefined,
    });
  });
});
