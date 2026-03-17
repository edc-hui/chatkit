import {
  createChatKitEngine,
  type ApplicationContext,
  type ChatKitEventMap,
  type ContextInfo,
  type OnboardingInfo,
  type ChatKitState,
  type ChatMessage,
  type ChatMessageFeedback,
  type ChatMessageAttachment,
  type ChatToolCall,
  type LocalAttachmentInput,
  type UploadedAttachmentInput,
} from '@kweaver-ai/chatkit-core';
import { createDipProvider } from '@kweaver-ai/chatkit-provider-dip';
import {
  buildWebProcessorEmbedUrl,
  createChatKitTranslator,
  createDefaultMarkdownSanitizer,
  defaultToolDefinitionRegistry,
  getSafeWebProcessorUrl,
  getWebProcessorDisplayUrl,
  getWebProcessorHeight,
  getWebProcessorTitle,
  renderMarkdown,
} from '@kweaver-ai/chatkit-shared';

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createAsyncIterable(items: unknown[]): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        await wait(140);
        yield item;
      }
    },
  };
}

const translator = createChatKitTranslator({ locale: 'zh-CN' });
const sanitizeHtml = createDefaultMarkdownSanitizer();
const initialPrompt = 'Please show the framework-free ChatKit capabilities';
const historyMessages = [
  {
    id: 'history-user-js-1',
    role: 'user' as const,
    content: 'What already works in ChatKit v2?',
  },
  {
    id: 'history-assistant-js-1',
    role: 'assistant' as const,
    content:
      'The pure JavaScript flow already supports the framework-free core, DIP provider normalization, attachments, deep thinking, tool cards, and event subscriptions.',
    metadata: {
      thinking: 'Summarize the milestones clearly so the history panel can demonstrate loading a finished conversation.',
      metrics: {
        totalTokens: 88,
        totalTimeSeconds: 1.4,
        ttftMs: 170,
      },
    },
  },
];
const demoConversations = [
  { id: 'conversation-history-js-demo', title: 'Architecture Recap' },
  { id: 'conversation-js-demo-2', title: 'Provider Notes' },
  { id: 'conversation-js-demo-3', title: 'Markdown Rendering' },
  { id: 'conversation-js-demo-4', title: 'Attachment Workflow' },
  { id: 'conversation-js-demo-5', title: 'Tool Cards' },
  { id: 'conversation-js-demo-6', title: 'Thinking Display' },
  { id: 'conversation-js-demo-7', title: 'Regenerate Flow' },
  { id: 'conversation-js-demo-8', title: 'Conversation Search' },
  { id: 'conversation-js-demo-9', title: 'Conversation Actions' },
  { id: 'conversation-js-demo-10', title: 'Streaming Metrics' },
  { id: 'conversation-js-demo-11', title: 'Pagination Demo' },
  { id: 'conversation-js-demo-12', title: 'DIP Normalization' },
];

const demoApplicationContexts: ApplicationContext[] = [
  {
    title: 'Order Graph Node',
    data: {
      node_id: 'order-node-001',
      source: 'knowledge-network',
      type: 'order',
    },
  },
  {
    title: 'GMV Metric',
    data: {
      metric_id: 'metric-gmv',
      source: 'metric',
      granularity: 'daily',
    },
  },
];

function createDemoSnapshot(question: string, chatMode: 'deep_thinking' | 'normal', selectedFiles: string[]) {
  const selectedFilesMarkdown =
    selectedFiles.length > 0 ? selectedFiles.map(file => `- ${file}`).join('\n') : '- none';

  return {
    assistant_message_id: `assistant-js-${Date.now()}`,
    ext: {
      related_queries: [
        'Show the provider contract',
        'How does the engine map related questions into message metadata?',
      ],
    },
    message: {
      ext: {
        total_time: 4.8,
        total_tokens: 336,
        ttft: 310,
      },
      content: {
        middle_answer: {
          progress: [
            {
              stage: 'llm',
              status: 'completed',
              think:
                '先把 provider 归一化成统一消息模型，再把 toolCalls、thinking 和 timing metrics 一起映射到 framework-free core，最后交给自定义 DOM UI 渲染。',
            },
            {
              skill_info: {
                name: 'zhipu_search_tool',
              },
              answer: {
                choices: [
                  {
                    message: {
                      tool_calls: [
                        {
                          search_intent: [
                            {
                              query: question,
                            },
                          ],
                        },
                        {
                          search_result: [
                            {
                              title: 'Core Runtime',
                              link: 'https://example.com/core-runtime',
                              content: 'Covers the framework-free engine, provider contract, and event model.',
                            },
                            {
                              title: 'Host Adapter',
                              link: 'https://example.com/host-adapter',
                              content: 'Explains upload, token refresh, and navigation hooks for host integration.',
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              skill_info: {
                name: 'execute_code',
                args: [
                  {
                    name: 'code',
                    value: `const runtime = "pure-js";\nconst mode = "${chatMode}";\nconsole.log(runtime, mode);`,
                  },
                ],
              },
              answer: {
                result: {
                  result: {
                    stdout: `pure-js ${chatMode}`,
                  },
                },
              },
            },
            {
              skill_info: {
                name: 'execute_command',
                args: [
                  {
                    name: 'command',
                    value: 'ls -la',
                  },
                ],
              },
              answer: {
                result: {
                  action: 'execute_command',
                  message: 'Directory listing ready',
                  result: {
                    files: ['README.md', 'src'],
                  },
                },
              },
            },
            {
              skill_info: {
                name: 'doc_qa',
                args: [
                  {
                    name: 'query',
                    value: 'What does framework-free mean for ChatKit v2?',
                  },
                ],
              },
              answer: {
                result: {
                  text: '<p>Framework-free means the core engine, provider normalization, file workflow, and i18n runtime can be consumed directly from plain JavaScript without React or Vue.</p>',
                  cites: [
                    {
                      title: 'Architecture Summary',
                      quote: 'Core owns state and protocol; UI stays in adapter packages.',
                    },
                  ],
                },
              },
            },
            {
              skill_info: {
                name: 'text2metric',
                args: [
                  {
                    name: 'input',
                    value: 'Show GMV and conversion rate',
                  },
                ],
              },
              answer: {
                result: {
                  title: 'Key metrics',
                  data: [
                    {
                      metric: 'GMV',
                      value: 128000,
                    },
                    {
                      metric: 'Conversion Rate',
                      value: 0.072,
                    },
                  ],
                },
              },
            },
            {
              skill_info: {
                name: 'text2sql',
                args: [
                  {
                    name: 'input',
                    value: 'Show daily order volume',
                  },
                ],
              },
              answer: {
                result: {
                  title: 'Daily order volume',
                  sql: 'SELECT day, orders FROM daily_orders',
                  data: [
                    {
                      day: '2026-03-01',
                      orders: 32,
                    },
                    {
                      day: '2026-03-02',
                      orders: 41,
                    },
                  ],
                },
              },
            },
              {
                skill_info: {
                  name: 'json2plot',
                args: [
                  {
                    name: 'title',
                    value: 'Orders trend',
                  },
                ],
              },
              answer: {
                result: {
                  title: 'Orders trend',
                  chart_config: {
                    chart_type: 'Line',
                    xField: 'day',
                    yField: 'orders',
                    seriesField: 'metric',
                  },
                  data: [
                    {
                      day: '2026-03-01',
                      orders: 32,
                      metric: 'orders',
                    },
                    {
                      day: '2026-03-02',
                      orders: 41,
                      metric: 'orders',
                    },
                  ],
                  },
                },
              },
              {
                skill_info: {
                  name: 'web_processor',
                },
                answer: {
                  result: {
                    title: 'Orders dashboard',
                    url: 'https://example.com/orders/dashboard',
                    size: [1280, 720],
                  },
                },
              },
              {
                skill_info: {
                  name: 'text2ngql',
                args: [
                  {
                    name: 'query',
                    value: 'Show the adapters supported by ChatKit v2',
                  },
                ],
              },
              answer: {
                result: {
                  sql: 'MATCH (c:Core)-[:SUPPORTS]->(a:Adapter) RETURN a.name',
                  data: {
                    'a.name': ['Plain JavaScript', 'React', 'Vue'],
                  },
                },
              },
            },
          ],
        },
        final_answer: {
          answer: {
            text: `# Pure JavaScript Demo

Current prompt: **${question}**

Chat mode: **${chatMode}**

Selected files:
${selectedFilesMarkdown}

This demo drives the DOM directly from the framework-free engine while still sharing the same provider, attachment upload flow, deep thinking mode, and tool result model used by the React and Vue adapters.

Math is also supported: $x^2 + y^2 = z^2$

\`\`\`ts
const runtime = "pure-js";
const renderer = "custom-dom";
\`\`\``,
          },
        },
      },
    },
  };
}

const hostAdapter = {
  async uploadFile(input: {
    conversationId?: string;
    fileName: string;
    contentType?: string;
  }) {
    return {
      fileName: input.fileName,
      contentType: input.contentType,
      url: `https://cdn.example.com/${encodeURIComponent(input.fileName)}`,
      storageKey: `${input.conversationId ?? 'conversation-js-demo'}/uploads/${encodeURIComponent(input.fileName)}`,
    };
  },
};

const provider = createDipProvider({
  baseUrl: 'https://dip.example.com',
  agentKey: 'demo-agent',
  async getOnboardingInfo() {
    return {
      greeting: 'Welcome to ChatKit JS Demo',
      description: 'Use a starter prompt to exercise the framework-free engine, provider normalization, and custom DOM rendering flow.',
      prompts: [
        {
          id: 'starter-js-architecture',
          label: 'Summarize the framework-free architecture',
          description: 'Review the engine, provider, and adapter layering.',
        },
        {
          id: 'starter-js-tools',
          label: 'Show the available tool cards',
          description: 'Exercise search, code, doc QA, and NGQL cards.',
        },
        {
          id: 'starter-js-interrupt',
          label: 'Trigger interrupt confirmation',
          description: 'Exercise DipChat-style confirm and skip flows.',
        },
      ],
    };
  },
  async getContextInfo() {
    return {
      title: 'Assistant Context',
      description: 'This demo keeps datasource, knowledge network, and metric context outside the message stream so custom DOM UIs can render it independently.',
      sections: [
        {
          id: 'knowledge-networks',
          title: 'Knowledge Networks',
          items: [
            {
              id: 'kn-js-orders',
              title: 'Order Graph',
              subtitle: 'Knowledge network',
              description: 'Connects orders, payments, and shipments for operational analysis.',
              tags: ['Graph', 'Operational'],
              metadata: {
                objectTypes: 12,
                relations: 28,
              },
            },
          ],
        },
        {
          id: 'metrics',
          title: 'Metrics',
          items: [
            {
              id: 'metric-js-gmv',
              title: 'GMV',
              subtitle: 'Metric model',
              value: '12',
              metadata: {
                owner: 'BI Team',
              },
            },
          ],
        },
        {
          id: 'datasources',
          title: 'Datasources',
          items: [
            {
              id: 'ds-js-orders',
              title: 'Orders Warehouse',
              subtitle: 'Snowflake',
              description: 'Source of truth for order facts and status rollups.',
              url: 'https://example.com/datasource/orders',
            },
          ],
        },
      ],
    };
  },
  async listConversations(input) {
    const page = input?.page ?? 1;
    const size = input?.size ?? demoConversations.length;
    const start = (page - 1) * size;
    const end = start + size;

    return demoConversations.slice(start, end).map(conversation => ({ ...conversation }));
  },
  async getConversationMessages() {
    return historyMessages.map(message => ({
      ...message,
      metadata: message.metadata ? { ...message.metadata } : undefined,
    }));
  },
  async updateConversation(input) {
    const targetConversation = demoConversations.find(conversation => conversation.id === input.conversationId);
    if (targetConversation) {
      targetConversation.title = input.title;
    }

    return {
      id: input.conversationId,
      title: input.title,
    };
  },
  async deleteConversation(input) {
    const targetIndex = demoConversations.findIndex(conversation => conversation.id === input.conversationId);
    if (targetIndex !== -1) {
      demoConversations.splice(targetIndex, 1);
    }
  },
  async submitMessageFeedback() {
    // The engine owns the optimistic feedback state for the demo.
  },
  streamTransport(request) {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const question = typeof body.text === 'string' ? body.text : 'Untitled prompt';
    const chatMode = body.chat_mode === 'deep_thinking' ? 'deep_thinking' : 'normal';
    const selectedFiles = Array.isArray(body.selected_files)
      ? (body.selected_files as Array<{ file_name?: string }>).map(file => file.file_name ?? 'unknown-file')
      : [];
    const resumeInterruptInfo =
      body.resume_interrupt_info && typeof body.resume_interrupt_info === 'object'
        ? (body.resume_interrupt_info as {
            action?: 'confirm' | 'skip';
            modified_args?: Array<{ key?: string; value?: unknown }>;
          })
        : undefined;

    if (resumeInterruptInfo) {
      return createAsyncIterable([
        createDemoInterruptResumeSnapshot(question, chatMode, selectedFiles, resumeInterruptInfo),
      ]);
    }

    if (shouldTriggerInterrupt(question)) {
      return createAsyncIterable([createDemoInterruptSnapshot(question, chatMode, selectedFiles)]);
    }

    return createAsyncIterable([createDemoSnapshot(question, chatMode, selectedFiles)]);
  },
});

const engine = createChatKitEngine({
  provider,
  providerName: 'dip',
  hostAdapter,
});
const app = document.getElementById('app');

if (!app) {
  throw new Error('Missing #app root node.');
}

app.innerHTML = `
  <div style="min-height: 100vh; padding: 24px; background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%); color: #111827; font-family: 'Segoe UI', 'PingFang SC', sans-serif;">
    <div style="max-width: 1120px; margin: 0 auto; display: grid; gap: 20px; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); align-items: start;">
      <section style="display: flex; flex-direction: column; gap: 20px; min-height: 640px; padding: 24px; border-radius: 24px; background: rgba(255,255,255,0.88); box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08); border: 1px solid rgba(215, 222, 235, 0.9); backdrop-filter: blur(10px);">
        <header style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
          <div>
            <div style="font-size: 24px; font-weight: 700;">ChatKit JS Demo</div>
            <div id="statusText" style="margin-top: 6px; color: #6b7280; font-size: 13px;"></div>
          </div>
          <button id="newChatButton" type="button" style="border: 1px solid #d7deeb; border-radius: 999px; background: #fff; padding: 10px 14px; cursor: pointer;"></button>
        </header>
        <div id="errorBanner" style="display: none; border-radius: 16px; border: 1px solid rgba(248, 113, 113, 0.25); background: rgba(254, 226, 226, 0.65); color: #7f1d1d; padding: 12px 14px; white-space: pre-wrap; word-break: break-word;"></div>
        <div id="messages" style="display: flex; flex-direction: column; gap: 14px; min-height: 320px;"></div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
          <input id="fileInput" type="file" multiple hidden />
          <button id="attachButton" type="button" style="border: 1px solid #d7deeb; border-radius: 999px; background: #fff; padding: 8px 12px; cursor: pointer;"></button>
          <button id="deepThinkButton" type="button" style="border: 1px solid #d7deeb; border-radius: 999px; background: #fff; padding: 8px 12px; cursor: pointer;"></button>
          <button id="injectNodeContextButton" type="button" style="border: 1px solid #d7deeb; border-radius: 999px; background: #fff; padding: 8px 12px; cursor: pointer;">Order Graph Node</button>
          <button id="injectMetricContextButton" type="button" style="border: 1px solid #d7deeb; border-radius: 999px; background: #fff; padding: 8px 12px; cursor: pointer;">GMV Metric</button>
          <button id="clearContextButton" type="button" style="border: 1px solid rgba(239,68,68,0.24); border-radius: 999px; background: rgba(254,242,242,0.92); color: #991b1b; padding: 8px 12px; cursor: pointer; font-weight: 600;">Clear Context</button>
          <div id="attachmentList" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
        </div>
        <div id="applicationContextBar" style="display: none; align-items: center; gap: 8px; flex-wrap: wrap;"></div>
        <form id="composer" style="display: flex; gap: 12px; align-items: flex-end;">
          <textarea id="composerInput" rows="4" style="flex: 1; resize: vertical; min-height: 96px; padding: 14px 16px; border-radius: 18px; border: 1px solid #d7deeb; background: #fff; color: #111827; font: inherit; outline: none;"></textarea>
          <button id="sendButton" type="submit" style="border: none; border-radius: 999px; padding: 12px 18px; background: #111827; color: #fff; cursor: pointer; font-weight: 600;"></button>
        </form>
      </section>
      <aside style="display: flex; flex-direction: column; gap: 16px; padding: 20px; border-radius: 24px; background: rgba(17, 24, 39, 0.92); color: #f9fafb; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div id="conversationListTitle" style="font-size: 18px; font-weight: 700;"></div>
            <button id="refreshConversationsButton" type="button" style="border: 1px solid rgba(255,255,255,0.14); border-radius: 999px; background: rgba(255,255,255,0.08); color: #f8fafc; padding: 6px 10px; cursor: pointer; font-size: 12px;"></button>
          </div>
          <div id="conversationListHint" style="margin-top: 6px; font-size: 13px; color: rgba(255,255,255,0.7);"></div>
        </div>
        <input id="conversationSearchInput" type="text" style="width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.08); color: #f8fafc; padding: 10px 12px; outline: none;" />
        <div id="conversationList" style="display: flex; flex-direction: column; gap: 10px;"></div>
        <button id="loadMoreConversationsButton" type="button" style="display: none; border: 1px solid rgba(255,255,255,0.14); border-radius: 12px; background: rgba(255,255,255,0.08); color: #f8fafc; padding: 10px 12px; cursor: pointer; font-size: 13px;"></button>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div id="contextPanelTitle" style="font-size: 18px; font-weight: 700;"></div>
          <div id="contextPanel" style="display: flex; flex-direction: column; gap: 10px;"></div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div id="conversationFilesTitle" style="font-size: 18px; font-weight: 700;"></div>
            <div id="conversationFilesCount" style="font-size: 12px; color: rgba(255,255,255,0.72);">0</div>
          </div>
          <div id="conversationFiles" style="display: flex; flex-direction: column; gap: 10px;"></div>
        </div>
        <div>
          <div style="font-size: 18px; font-weight: 700;">Engine Events</div>
          <div style="margin-top: 6px; font-size: 13px; color: rgba(255,255,255,0.7);">This panel shows both subscribe(state) snapshots and on(eventName) event payloads.</div>
        </div>
        <div id="eventLog" style="display: flex; flex-direction: column; gap: 10px; max-height: 560px; overflow: auto;"></div>
      </aside>
    </div>
  </div>
`;

const messagesElement = document.getElementById('messages') as HTMLDivElement;
const errorBannerElement = document.getElementById('errorBanner') as HTMLDivElement;
const eventLogElement = document.getElementById('eventLog') as HTMLDivElement;
const conversationListTitleElement = document.getElementById('conversationListTitle') as HTMLDivElement;
const conversationListHintElement = document.getElementById('conversationListHint') as HTMLDivElement;
const contextPanelTitleElement = document.getElementById('contextPanelTitle') as HTMLDivElement;
const contextPanelElement = document.getElementById('contextPanel') as HTMLDivElement;
const conversationFilesTitleElement = document.getElementById('conversationFilesTitle') as HTMLDivElement;
const conversationFilesCountElement = document.getElementById('conversationFilesCount') as HTMLDivElement;
const conversationFilesElement = document.getElementById('conversationFiles') as HTMLDivElement;
const refreshConversationsButtonElement = document.getElementById('refreshConversationsButton') as HTMLButtonElement;
const conversationSearchInputElement = document.getElementById('conversationSearchInput') as HTMLInputElement;
const conversationListElement = document.getElementById('conversationList') as HTMLDivElement;
const loadMoreConversationsButtonElement = document.getElementById('loadMoreConversationsButton') as HTMLButtonElement;
const statusTextElement = document.getElementById('statusText') as HTMLDivElement;
const inputElement = document.getElementById('composerInput') as HTMLTextAreaElement;
const sendButtonElement = document.getElementById('sendButton') as HTMLButtonElement;
const newChatButtonElement = document.getElementById('newChatButton') as HTMLButtonElement;
const composerElement = document.getElementById('composer') as HTMLFormElement;
const attachButtonElement = document.getElementById('attachButton') as HTMLButtonElement;
const deepThinkButtonElement = document.getElementById('deepThinkButton') as HTMLButtonElement;
const injectNodeContextButtonElement = document.getElementById('injectNodeContextButton') as HTMLButtonElement;
const injectMetricContextButtonElement = document.getElementById('injectMetricContextButton') as HTMLButtonElement;
const clearContextButtonElement = document.getElementById('clearContextButton') as HTMLButtonElement;
const applicationContextBarElement = document.getElementById('applicationContextBar') as HTMLDivElement;
const attachmentListElement = document.getElementById('attachmentList') as HTMLDivElement;
const fileInputElement = document.getElementById('fileInput') as HTMLInputElement;

conversationListTitleElement.textContent = translator.t('assistant.conversations');
conversationListHintElement.textContent = translator.t('assistant.emptyConversations');
contextPanelTitleElement.textContent = translator.t('assistant.context');
conversationFilesTitleElement.textContent = translator.t('assistant.files');
refreshConversationsButtonElement.textContent = translator.t('assistant.refreshConversations');
conversationSearchInputElement.placeholder = translator.t('assistant.searchConversations');
loadMoreConversationsButtonElement.textContent = translator.t('assistant.loadMoreConversations');
inputElement.placeholder = translator.t('sender.placeholder');
sendButtonElement.textContent = translator.t('sender.send');
newChatButtonElement.textContent = translator.t('assistant.newChat');
statusTextElement.textContent = translator.t('assistant.ready');
attachButtonElement.textContent = translator.t('sender.attach');
deepThinkButtonElement.textContent = translator.t('sender.deepThink');
inputElement.value = '';

let deepThinkEnabled = false;
let attachments: LocalAttachmentInput[] = [];
let reusedAttachments: UploadedAttachmentInput[] = [];
let conversationQuery = '';
let conversationPage = 1;
let hasMoreConversations = false;
let onboardingInfo: OnboardingInfo | null = null;
let contextInfo: ContextInfo | null = null;
let lastConversationId: string | undefined = undefined;

interface ConversationFileItem {
  id: string;
  attachment: ChatMessageAttachment;
  usageCount: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveErrorText(error: unknown): string {
  if (!error) {
    return '';
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

function resolveStatusText(message: ChatMessage): string {
  if (message.status === 'streaming') {
    return translator.t('message.status.streaming');
  }

  if (message.status === 'error') {
    return translator.t('message.status.error');
  }

  return translator.t('message.status.done');
}

function shouldTriggerInterrupt(question: string): boolean {
  return question.toLowerCase().includes('interrupt');
}

function createDemoInterruptSnapshot(question: string, chatMode: 'deep_thinking' | 'normal', selectedFiles: string[]) {
  const selectedFilesMarkdown =
    selectedFiles.length > 0 ? selectedFiles.map(file => `- ${file}`).join('\n') : '- none';

  return {
    assistant_message_id: `assistant-js-interrupt-${Date.now()}`,
    message: {
      ext: {
        interrupt_info: {
          handle: {
            run_id: 'js-interrupt-run-1',
          },
          data: {
            tool_name: 'execute_command',
            tool_description: 'Execute a shell command',
            tool_args: [
              {
                key: 'command',
                value: 'ls -la',
                type: 'string',
              },
              {
                key: 'options',
                value: {
                  cwd: '/workspace',
                },
                type: 'object',
              },
            ],
            interrupt_config: {
              requires_confirmation: true,
              confirmation_message: 'Please confirm the shell command before continuing.',
            },
          },
        },
      },
      content: {
        middle_answer: {
          progress: [
            {
              skill_info: {
                name: 'execute_command',
                args: [
                  {
                    name: 'command',
                    value: 'ls -la',
                  },
                ],
              },
              answer: {
                result: {
                  action: 'execute_command',
                  message: 'Command is waiting for confirmation.',
                  result: {
                    command: 'ls -la',
                    mode: chatMode,
                    selected_files: selectedFiles,
                  },
                },
              },
            },
          ],
        },
        final_answer: {
          answer: {
            text: `# Interrupt Required

Prompt: **${question}**

Chat mode: **${chatMode}**

Selected files:
${selectedFilesMarkdown}

The assistant is ready to run \`ls -la\`, but this step now waits for a DipChat-style confirmation or skip decision.`,
          },
        },
      },
    },
  };
}

function createDemoInterruptResumeSnapshot(
  question: string,
  chatMode: 'deep_thinking' | 'normal',
  selectedFiles: string[],
  resumeInterruptInfo: {
    action?: 'confirm' | 'skip';
    modified_args?: Array<{ key?: string; value?: unknown }>;
  }
) {
  const modifiedCommand = resumeInterruptInfo.modified_args?.find(item => item.key === 'command')?.value;
  const command = typeof modifiedCommand === 'string' && modifiedCommand.trim().length > 0 ? modifiedCommand : 'ls -la';
  const action = resumeInterruptInfo.action === 'skip' ? 'skip' : 'confirm';
  const outputText =
    action === 'skip'
      ? 'Skipped the interruptible command and continued the flow.'
      : `Executed "${command}" after confirmation.`;

  return {
    assistant_message_id: `assistant-js-interrupt-resume-${Date.now()}`,
    message: {
      ext: {
        total_time: 2.4,
        total_tokens: 168,
        ttft: 220,
      },
      content: {
        middle_answer: {
          progress: [
            {
              skill_info: {
                name: 'execute_command',
                args: [
                  {
                    name: 'command',
                    value: command,
                  },
                ],
              },
              answer: {
                result: {
                  action: 'execute_command',
                  message: action === 'skip' ? 'Command skipped' : 'Command executed',
                  result: {
                    stdout: outputText,
                    question,
                    mode: chatMode,
                    selected_files: selectedFiles,
                  },
                },
              },
            },
          ],
        },
        final_answer: {
          answer: {
            text: `# Interrupt Resolved

Action: **${action}**

${outputText}`,
          },
        },
      },
    },
  };
}

function createInterruptFieldValue(value: unknown, type?: string): string {
  if (type === 'object' || type === 'dict' || type === 'array') {
    return JSON.stringify(value ?? null, null, 2);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value == null) {
    return '';
  }

  return String(value);
}

function mapAttachmentsForResend(attachmentsToMap: ChatMessageAttachment[] | undefined): UploadedAttachmentInput[] | undefined {
  if (!attachmentsToMap || attachmentsToMap.length === 0) {
    return undefined;
  }

  return attachmentsToMap.map(attachment => ({
    source: 'uploaded',
    fileName: attachment.fileName,
    url: attachment.url,
    fileId: attachment.fileId,
    storageKey: attachment.storageKey,
    contentType: attachment.contentType,
    size: attachment.size,
    metadata: attachment.metadata,
  }));
}

function renderKeyValueRows(value: Record<string, unknown>): string {
  const entries = Object.entries(value);

  if (entries.length === 0) {
    return '<div style="font-size: 13px; color: #64748b;">-</div>';
  }

  return entries
    .map(
      ([key, entry]) => `
        <div style="display: flex; gap: 8px; align-items: flex-start; font-size: 13px; color: #334155;">
          <div style="min-width: 84px; font-weight: 600; color: #0f172a;">${escapeHtml(key)}</div>
          <div style="flex: 1;">${escapeHtml(typeof entry === 'string' ? entry : JSON.stringify(entry, null, 2))}</div>
        </div>
      `
    )
    .join('');
}

function renderToolInput(input: unknown): string {
  if (typeof input === 'string') {
    return `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">${escapeHtml(translator.t('tool.input'))}</div>
        <pre style="margin: 0; padding: 10px 12px; border-radius: 12px; background: #0f172a; color: #e2e8f0; overflow-x: auto; font-size: 13px; white-space: pre-wrap;">${escapeHtml(input)}</pre>
      </div>
    `;
  }

  if (input && typeof input === 'object') {
    return `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">${escapeHtml(translator.t('tool.input'))}</div>
        <div style="display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 12px; background: #ffffff; border: 1px solid rgba(215, 222, 235, 0.9);">
          ${renderKeyValueRows(input as Record<string, unknown>)}
        </div>
      </div>
    `;
  }

  return '';
}

function renderSearchResults(results: Array<{ title?: string; link?: string; content?: string }>): string {
  if (results.length === 0) {
    return '<div style="font-size: 13px; color: #64748b;">No search results</div>';
  }

  return results
    .slice(0, 3)
    .map(
      (result, index) => `
        <div style="padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,0.7); border: 1px solid rgba(215, 222, 235, 0.9);">
          <div style="font-weight: 600;">${escapeHtml(result.title ?? `Result ${index + 1}`)}</div>
          ${
            result.link
              ? `<a href="${escapeHtml(result.link)}" target="_blank" rel="noreferrer" style="color: #2563eb; font-size: 13px;">${escapeHtml(result.link)}</a>`
              : ''
          }
          ${result.content ? `<div style="margin-top: 6px; font-size: 13px; color: #475569;">${escapeHtml(result.content)}</div>` : ''}
        </div>
      `
    )
    .join('');
}

function renderDocQa(output: { htmlText?: string; cites?: Array<{ title?: string; doc_name?: string; quote?: string; ds_id?: string }> }): string {
  const safeHtml = sanitizeHtml && output.htmlText ? sanitizeHtml(output.htmlText) : output.htmlText ?? '';
  const cites = output.cites ?? [];

  return `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${
        safeHtml
          ? `<div style="padding: 10px 12px; border-radius: 12px; background: #ffffff; border: 1px solid rgba(215, 222, 235, 0.9); color: #0f172a;">${safeHtml}</div>`
          : ''
      }
      ${cites
        .slice(0, 3)
        .map(
          (cite, index) => `
            <div style="padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,0.7); border: 1px solid rgba(215, 222, 235, 0.9);">
              <div style="font-weight: 600;">${escapeHtml(cite.title ?? cite.doc_name ?? `Citation ${index + 1}`)}</div>
              ${cite.quote ? `<div style="margin-top: 6px; font-size: 13px; color: #475569;">${escapeHtml(cite.quote)}</div>` : ''}
              ${cite.ds_id ? `<div style="margin-top: 4px; font-size: 12px; color: #94a3b8;">ds_id: ${escapeHtml(cite.ds_id)}</div>` : ''}
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function renderTable(columns: string[], rows: Array<Record<string, unknown>>): string {
  if (columns.length === 0 || rows.length === 0) {
    return '<div style="font-size: 13px; color: #64748b;">No table data</div>';
  }

  return `
    <div style="overflow-x: auto; border-radius: 12px; border: 1px solid rgba(215, 222, 235, 0.9);">
      <table style="width: 100%; border-collapse: collapse; background: #ffffff; font-size: 13px;">
        <thead>
          <tr>
            ${columns
              .map(
                column => `
                  <th style="text-align: left; padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid rgba(215, 222, 235, 0.9);">${escapeHtml(column)}</th>
                `
              )
              .join('')}
          </tr>
        </thead>
        <tbody>
          ${rows
            .slice(0, 5)
            .map(
              row => `
                <tr>
                  ${columns
                    .map(
                      column => `
                        <td style="padding: 10px 12px; border-bottom: 1px solid rgba(226, 232, 240, 0.7); color: #334155;">${escapeHtml(String(row[column] ?? ''))}</td>
                      `
                    )
                    .join('')}
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderToolOutput(toolCall: ChatToolCall): string {
  if (toolCall.name === 'zhipu_search_tool' || toolCall.name === 'online_search_cite_tool') {
    const output = (toolCall.output ?? {}) as { results?: Array<{ title?: string; link?: string; content?: string }> };
    return renderSearchResults(output.results ?? []);
  }

  if (toolCall.name === 'execute_code') {
    const output = toolCall.output;
    const text =
      typeof output === 'string'
        ? output
        : typeof output === 'object' && output !== null
          ? (output as { stdout?: string; output?: string }).stdout ?? (output as { stdout?: string; output?: string }).output ?? ''
          : '';

    return `
      <pre style="margin: 0; padding: 10px 12px; border-radius: 12px; background: #0f172a; color: #e2e8f0; overflow-x: auto; font-size: 13px; white-space: pre-wrap;">${escapeHtml(text || 'No output')}</pre>
    `;
  }

  if (toolCall.name === 'doc_qa') {
    return renderDocQa((toolCall.output ?? {}) as { htmlText?: string; cites?: Array<{ title?: string; doc_name?: string; quote?: string; ds_id?: string }> });
  }

  if (toolCall.name === 'text2metric') {
    const output = (toolCall.output ?? {}) as {
      tableColumns?: string[];
      tableData?: Array<Record<string, unknown>>;
    };

    return renderTable(output.tableColumns ?? [], output.tableData ?? []);
  }

  if (toolCall.name === 'text2sql') {
    const output = (toolCall.output ?? {}) as {
      sql?: string;
      tableColumns?: string[];
      tableData?: Array<Record<string, unknown>>;
    };

    return `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${
          output.sql
            ? `<pre style="margin: 0; padding: 10px 12px; border-radius: 12px; background: #0f172a; color: #e2e8f0; overflow-x: auto; font-size: 13px; white-space: pre-wrap;">${escapeHtml(output.sql)}</pre>`
            : ''
        }
        ${renderTable(output.tableColumns ?? [], output.tableData ?? [])}
      </div>
    `;
  }

  if (toolCall.name === 'json2plot') {
    const output = (toolCall.output ?? {}) as {
      chartType?: string;
      chartConfig?: unknown;
      tableColumns?: string[];
      tableData?: Array<Record<string, unknown>>;
    };

    return `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${output.chartType ? `<div style="font-size: 13px; color: #475569; font-weight: 600;">Chart Type: ${escapeHtml(output.chartType)}</div>` : ''}
        ${
          output.chartConfig
            ? `<pre style="margin: 0; padding: 10px 12px; border-radius: 12px; background: #0f172a; color: #e2e8f0; overflow-x: auto; font-size: 13px; white-space: pre-wrap;">${escapeHtml(JSON.stringify(output.chartConfig, null, 2))}</pre>`
            : ''
        }
        ${renderTable(output.tableColumns ?? [], output.tableData ?? [])}
      </div>
      `;
  }

  if (toolCall.name === 'web_processor') {
    const output = (toolCall.output ?? {}) as {
      title?: string;
      url?: string;
      size?: [number, number];
    };
    const safeUrl = getSafeWebProcessorUrl(output.url);
    const embedUrl = buildWebProcessorEmbedUrl(output.url);

    if (!safeUrl || !embedUrl) {
      return '';
    }

    return `
      <div style="overflow: hidden; border-radius: 12px; border: 1px solid rgba(215, 222, 235, 0.9); background: #ffffff;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-bottom: 1px solid rgba(215, 222, 235, 0.9);">
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 14px; font-weight: 700; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(getWebProcessorTitle(output))}</div>
            <div style="margin-top: 4px; font-size: 12px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(getWebProcessorDisplayUrl(output.url))}</div>
          </div>
          <a href="${escapeHtml(safeUrl.toString())}" target="_blank" rel="noreferrer" style="color: #2563eb; font-size: 13px;">Open</a>
        </div>
        <iframe
          src="${escapeHtml(embedUrl)}"
          title="${escapeHtml(getWebProcessorTitle(output))}"
          style="display: block; width: 100%; height: ${escapeHtml(getWebProcessorHeight(output))}; border: none; background: #ffffff;"
          loading="lazy"
          referrerpolicy="no-referrer"
        ></iframe>
      </div>
    `;
  }

  if (toolCall.name === 'text2ngql') {
    const output = (toolCall.output ?? {}) as {
      sql?: string;
      tableColumns?: string[];
      tableData?: Array<Record<string, unknown>>;
    };

    return `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${
          output.sql
            ? `<pre style="margin: 0; padding: 10px 12px; border-radius: 12px; background: #0f172a; color: #e2e8f0; overflow-x: auto; font-size: 13px; white-space: pre-wrap;">${escapeHtml(output.sql)}</pre>`
            : ''
        }
        ${renderTable(output.tableColumns ?? [], output.tableData ?? [])}
      </div>
    `;
  }

  if (toolCall.output && typeof toolCall.output === 'object') {
    return `
      <div style="display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 12px; background: #ffffff; border: 1px solid rgba(215, 222, 235, 0.9);">
        ${renderKeyValueRows(toolCall.output as Record<string, unknown>)}
      </div>
    `;
  }

  if (typeof toolCall.output === 'string') {
    return `<div style="font-size: 13px; color: #334155;">${escapeHtml(toolCall.output)}</div>`;
  }

  return '<div style="font-size: 13px; color: #64748b;">No output</div>';
}

function renderToolCalls(toolCalls: ChatToolCall[]): string {
  if (toolCalls.length === 0) {
    return '';
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
      ${toolCalls
        .map(toolCall => {
          const definition = defaultToolDefinitionRegistry.getTool(toolCall.name);
          const title = toolCall.title ?? definition?.title ?? toolCall.name;
          const glyph = definition?.icon?.kind === 'glyph' ? definition.icon.text : title.slice(0, 2).toUpperCase();

          return `
            <div style="display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 16px; background: rgba(255,255,255,0.78); border: 1px solid rgba(215, 222, 235, 0.9);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 999px; background: #111827; color: #ffffff; font-size: 12px; font-weight: 700;">${escapeHtml(glyph)}</div>
                <div>
                  <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${escapeHtml(title)}</div>
                  ${
                    toolCall.description
                      ? `<div style="font-size: 12px; color: #64748b;">${escapeHtml(toolCall.description)}</div>`
                      : ''
                  }
                </div>
              </div>
              ${renderToolInput(toolCall.input)}
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">${escapeHtml(translator.t('tool.output'))}</div>
                ${renderToolOutput(toolCall)}
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderThinking(thinking: string): string {
  return `
    <details open style="align-self: flex-start; width: min(760px, 92%); padding: 12px 14px; border-radius: 16px; background: rgba(255,255,255,0.82); border: 1px solid rgba(215, 222, 235, 0.9); color: #111827;">
      <summary style="cursor: pointer; font-weight: 700;">${escapeHtml(translator.t('message.deepThinking'))}</summary>
      <div style="margin-top: 10px; line-height: 1.6; overflow-wrap: anywhere;">${renderMarkdown(thinking)}</div>
    </details>
  `;
}

function renderMetrics(message: ChatMessage): string {
  const metrics = message.metadata?.metrics;
  const items = [
    metrics?.totalTimeSeconds != null
      ? translator.t('message.metrics.totalTime', {
          value: metrics.totalTimeSeconds.toFixed(metrics.totalTimeSeconds >= 10 ? 0 : 2).replace(/\.00$/, ''),
        })
      : '',
    metrics?.totalTokens != null
      ? translator.t('message.metrics.totalTokens', {
          value: metrics.totalTokens,
        })
      : '',
    metrics?.ttftMs != null
      ? translator.t('message.metrics.ttft', {
          value: metrics.ttftMs,
        })
      : '',
  ].filter(Boolean);

  if (items.length === 0) {
    return '';
  }

  return `<div style="font-size: 12px; color: rgba(15, 23, 42, 0.65);">${escapeHtml(items.join(' · '))}</div>`;
}

function renderAttachments(attachments: ChatMessageAttachment[]): string {
  if (attachments.length === 0) {
    return '';
  }

  return `
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
      ${attachments
        .map(attachment =>
          attachment.url
            ? `<a href="${escapeHtml(attachment.url)}" target="_blank" rel="noreferrer" style="border-radius: 999px; border: 1px solid rgba(215, 222, 235, 0.9); background: rgba(226, 232, 240, 0.7); padding: 8px 12px; color: #111827; font-size: 12px; text-decoration: none;">${escapeHtml(attachment.fileName)}</a>`
            : `<span style="border-radius: 999px; border: 1px solid rgba(215, 222, 235, 0.9); background: rgba(226, 232, 240, 0.7); padding: 8px 12px; color: #111827; font-size: 12px;">${escapeHtml(attachment.fileName)}</span>`
        )
        .join('')}
    </div>
  `;
}

function formatFileSize(attachment: ChatMessageAttachment): string {
  const size =
    attachment.size ?? (typeof attachment.metadata?.size === 'number' ? attachment.metadata.size : undefined);

  if (size == null || Number.isNaN(size)) {
    return '';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(size >= 10 * 1024 ? 0 : 1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function collectConversationFiles(messages: ChatMessage[]): ConversationFileItem[] {
  const files = new Map<string, ConversationFileItem>();

  for (const message of messages) {
    for (const attachment of message.metadata?.attachments ?? []) {
      const key = attachment.storageKey ?? attachment.fileId ?? attachment.url ?? attachment.fileName;
      const existing = files.get(key);

      if (existing) {
        existing.usageCount += 1;
        continue;
      }

      files.set(key, {
        id: key,
        attachment,
        usageCount: 1,
      });
    }
  }

  return Array.from(files.values());
}

function renderConversationFiles(state: ChatKitState) {
  const files = collectConversationFiles(state.messages);
  conversationFilesCountElement.textContent = String(files.length);

  if (files.length === 0) {
    conversationFilesElement.innerHTML = `
      <div style="font-size: 13px; color: rgba(255,255,255,0.72);">
        ${escapeHtml(translator.t('assistant.emptyFiles'))}
      </div>
    `;
    return;
  }

  conversationFilesElement.innerHTML = files
    .map(file => {
      const sourceText =
        file.attachment.source === 'uploaded'
          ? translator.t('assistant.fileSource.uploaded')
          : translator.t('assistant.fileSource.local');
      const sizeText = formatFileSize(file.attachment);
      const usageText = translator.t('assistant.fileUsageCount', { value: file.usageCount });

      return `
        <article style="border-radius: 14px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); padding: 12px; display: flex; flex-direction: column; gap: 10px;">
          <div>
            <div style="font-weight: 700; color: #f8fafc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(file.attachment.fileName)}">
              ${escapeHtml(file.attachment.fileName)}
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
              <span style="border-radius: 999px; padding: 4px 8px; font-size: 12px; background: ${
                file.attachment.source === 'uploaded' ? 'rgba(219, 234, 254, 0.2)' : 'rgba(226, 232, 240, 0.18)'
              }; color: ${file.attachment.source === 'uploaded' ? '#bfdbfe' : '#e2e8f0'};">${escapeHtml(sourceText)}</span>
              ${
                sizeText
                  ? `<span style="border-radius: 999px; padding: 4px 8px; font-size: 12px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.74);">${escapeHtml(sizeText)}</span>`
                  : ''
              }
            </div>
          </div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.72);">${escapeHtml(usageText)}</div>
          ${
            file.attachment.url
              ? `<div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <a href="${escapeHtml(file.attachment.url)}" target="_blank" rel="noreferrer" style="align-self: flex-start; text-decoration: none; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.08); padding: 6px 10px; font-size: 12px; color: #f8fafc;">${escapeHtml(translator.t('assistant.openFile'))}</a>
                  ${
                    file.attachment.source === 'uploaded'
                      ? `<button type="button" data-reuse-file-id="${escapeHtml(file.id)}" style="border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.12); color: #f8fafc; padding: 6px 10px; cursor: pointer; font-size: 12px;">${escapeHtml(translator.t('assistant.reuseFile'))}</button>`
                      : ''
                  }
                </div>`
              : file.attachment.source === 'uploaded'
                ? `<button type="button" data-reuse-file-id="${escapeHtml(file.id)}" style="align-self: flex-start; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.12); color: #f8fafc; padding: 6px 10px; cursor: pointer; font-size: 12px;">${escapeHtml(translator.t('assistant.reuseFile'))}</button>`
              : ''
          }
        </article>
      `;
    })
    .join('');
}

function renderContextPanel() {
  const sections = contextInfo?.sections?.filter(section => section.items.length > 0) ?? [];

  if (sections.length === 0) {
    contextPanelElement.innerHTML = `
      <div style="font-size: 13px; color: rgba(255,255,255,0.72);">
        ${escapeHtml(translator.t('assistant.emptyContext'))}
      </div>
    `;
    return;
  }

  contextPanelElement.innerHTML = sections
    .map(section => {
      return `
        <section style="display: flex; flex-direction: column; gap: 10px;">
          <div>
            <div style="font-size: 14px; font-weight: 700; color: #f8fafc;">${escapeHtml(section.title?.trim() || section.id)}</div>
            ${
              section.description
                ? `<div style="margin-top: 4px; font-size: 12px; color: rgba(255,255,255,0.72);">${escapeHtml(section.description)}</div>`
                : ''
            }
          </div>
          ${section.items
            .map(item => {
              const metadataEntries = item.metadata ? Object.entries(item.metadata) : [];
              return `
                <article style="border-radius: 14px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); padding: 12px; display: flex; flex-direction: column; gap: 10px;">
                  <div>
                    <div style="font-weight: 700; color: #f8fafc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.title)}">
                      ${escapeHtml(item.title)}
                    </div>
                    ${item.subtitle ? `<div style="margin-top: 4px; font-size: 12px; color: rgba(255,255,255,0.72);">${escapeHtml(item.subtitle)}</div>` : ''}
                    ${item.value ? `<div style="margin-top: 8px; font-size: 20px; font-weight: 700; color: #bfdbfe;">${escapeHtml(item.value)}</div>` : ''}
                  </div>
                  ${
                    item.tags?.length
                      ? `<div style="display: flex; gap: 8px; flex-wrap: wrap;">
                          ${item.tags
                            .map(tag => `<span style="border-radius: 999px; padding: 4px 8px; font-size: 12px; background: rgba(219, 234, 254, 0.2); color: #bfdbfe;">${escapeHtml(tag)}</span>`)
                            .join('')}
                        </div>`
                      : ''
                  }
                  ${item.description ? `<div style="font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.82);">${escapeHtml(item.description)}</div>` : ''}
                  ${
                    metadataEntries.length
                      ? `<div style="display: flex; flex-direction: column; gap: 6px;">
                          ${metadataEntries
                            .map(
                              ([key, value]) => `<div style="display: flex; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.72);">
                                  <div style="min-width: 72px; font-weight: 700; color: #f8fafc;">${escapeHtml(key)}</div>
                                  <div style="flex: 1; overflow-wrap: anywhere;">${escapeHtml(typeof value === 'string' ? value : JSON.stringify(value))}</div>
                                </div>`
                            )
                            .join('')}
                        </div>`
                      : ''
                  }
                  ${
                    item.url
                      ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" style="align-self: flex-start; text-decoration: none; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.08); padding: 6px 10px; font-size: 12px; color: #f8fafc;">${escapeHtml(translator.t('assistant.openFile'))}</a>`
                      : ''
                  }
                </article>
              `;
            })
            .join('')}
        </section>
      `;
    })
    .join('');
}

function renderRelatedQuestions(message: ChatMessage, isLatestAssistantMessage: boolean): string {
  const relatedQuestions =
    message.role === 'assistant' && isLatestAssistantMessage && message.status !== 'streaming'
      ? message.metadata?.relatedQuestions ?? []
      : [];

  if (relatedQuestions.length === 0) {
    return '';
  }

  return `
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
      ${relatedQuestions
        .map(
          question => `
            <button
              type="button"
              data-related-question="${escapeHtml(question)}"
              style="border-radius: 999px; border: 1px solid rgba(191, 219, 254, 0.92); background: linear-gradient(135deg, rgba(239, 246, 255, 0.98), rgba(224, 242, 254, 0.96)); color: #111827; padding: 8px 12px; cursor: pointer; font-size: 12px; line-height: 1.5; text-align: left; box-shadow: 0 8px 24px rgba(59, 130, 246, 0.08);">
              ${escapeHtml(question)}
            </button>
          `
        )
        .join('')}
    </div>
  `;
}

function renderMessage(message: ChatMessage, isLatestAssistantMessage: boolean): string {
  const isAssistant = message.role === 'assistant';
  const bubbleBackground = isAssistant ? '#f5f7fb' : '#111827';
  const bubbleColor = isAssistant ? '#111827' : '#ffffff';
  const alignSelf = isAssistant ? 'flex-start' : 'flex-end';
  const toolCalls = message.metadata?.toolCalls ?? [];
  const attachments = message.metadata?.attachments ?? [];
  const thinking = message.metadata?.thinking?.trim() ?? '';
  const markdownHtml = message.content ? renderMarkdown(message.content) : '';

  return `
    <div style="display: flex; flex-direction: column; gap: 6px; align-items: ${alignSelf};">
      <div style="align-self: ${alignSelf}; width: min(760px, 92%);">
        ${
          message.applicationContext?.title
            ? `<div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 8px; border-radius: 999px; border: 1px solid rgba(59, 130, 246, 0.24); background: rgba(219, 234, 254, 0.72); color: #111827; padding: 6px 10px; font-size: 12px; font-weight: 700;">${escapeHtml(
                `${translator.t('assistant.context')}: ${message.applicationContext.title}`
              )}</div>`
            : ''
        }
        ${isAssistant && thinking ? renderThinking(thinking) : ''}
        ${isAssistant ? renderToolCalls(toolCalls) : ''}
        ${attachments.length > 0 ? renderAttachments(attachments) : ''}
        ${
          markdownHtml
            ? `<div style="padding: 12px 14px; border-radius: 16px; background: ${bubbleBackground}; color: ${bubbleColor}; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); line-height: 1.6; overflow-wrap: anywhere;">${markdownHtml}</div>`
            : ''
        }
        ${isAssistant ? renderInterruptPanel(message, isLatestAssistantMessage) : ''}
      </div>
      <div style="font-size: 12px; opacity: 0.6; color: #6b7280;">${escapeHtml(resolveStatusText(message))}</div>
      ${renderMetrics(message)}
      ${isAssistant ? renderFeedbackActions(message) : ''}
      ${renderRelatedQuestions(message, isLatestAssistantMessage)}
    </div>
  `;
}

function renderFeedbackActions(message: ChatMessage): string {
  const currentFeedback = message.metadata?.feedback;
  const actions: Array<{ value: ChatMessageFeedback; label: string }> = [
    { value: 'upvote', label: translator.t('message.feedback.upvote') },
    { value: 'downvote', label: translator.t('message.feedback.downvote') },
  ];

  return `
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      ${actions
        .map(action => {
          const active = currentFeedback === action.value;
          return `
            <button
              type="button"
              data-feedback-message-id="${escapeHtml(message.id)}"
              data-feedback-value="${action.value}"
              style="border-radius: 999px; border: 1px solid ${active ? '#111827' : '#d7deeb'}; background: ${
                active ? '#111827' : '#ffffff'
              }; color: ${active ? '#ffffff' : '#111827'}; padding: 8px 12px; cursor: pointer; font-size: 12px; font-weight: ${
                active ? 700 : 500
              };">
              ${escapeHtml(action.label)}
            </button>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderInterruptPanel(message: ChatMessage, isLatestAssistantMessage: boolean): string {
  if (!isLatestAssistantMessage || message.role !== 'assistant' || !message.metadata?.interrupt) {
    return '';
  }

  const interrupt = message.metadata.interrupt;
  const toolArgs = interrupt.data?.tool_args ?? [];
  const requiresConfirmation = Boolean(interrupt.data?.interrupt_config?.requires_confirmation);
  const confirmationMessage =
    interrupt.data?.interrupt_config?.confirmation_message?.trim() || translator.t('message.interrupt.defaultConfirmation');

  return `
    <div
      data-interrupt-panel-id="${escapeHtml(message.id)}"
      style="margin-top: 12px; padding: 14px 16px; border-radius: 18px; border: 1px solid rgba(59, 130, 246, 0.18); background: linear-gradient(180deg, rgba(239, 246, 255, 0.95), rgba(248, 250, 252, 0.96)); color: #111827; display: flex; flex-direction: column; gap: 12px;"
    >
      <div style="border-radius: 14px; border: 1px solid rgba(147, 197, 253, 0.38); background: rgba(219, 234, 254, 0.58); padding: 10px 12px;">
        <div style="font-weight: 700; margin-bottom: 6px;">
          ${escapeHtml(requiresConfirmation ? translator.t('message.interrupt.requiresConfirmation') : translator.t('message.interrupt.reviewInput'))}
        </div>
        <div style="font-size: 13px; line-height: 1.6;">${escapeHtml(confirmationMessage)}</div>
      </div>
      ${
        toolArgs.length > 0
          ? `<div style="display: flex; flex-direction: column; gap: 12px;">
              ${toolArgs
                .map(
                  (arg, index) => `
                    <label style="display: flex; flex-direction: column; gap: 6px;">
                      <span style="font-size: 12px; font-weight: 700;">${escapeHtml(arg.key)}</span>
                      <textarea
                        data-interrupt-input-index="${index}"
                        rows="${arg.type === 'object' || arg.type === 'dict' || arg.type === 'array' ? '5' : '2'}"
                        style="resize: vertical; min-height: ${arg.type === 'object' || arg.type === 'dict' || arg.type === 'array' ? '110px' : '72px'}; padding: 12px 14px; border-radius: 14px; border: 1px solid #d7deeb; background: #ffffff; color: #111827; outline: none; line-height: 1.6; font: ${arg.type === 'object' || arg.type === 'dict' || arg.type === 'array' ? "12px/1.6 Consolas, Monaco, monospace" : 'inherit'};"
                      >${escapeHtml(createInterruptFieldValue(arg.value, arg.type))}</textarea>
                    </label>
                  `
                )
                .join('')}
            </div>`
          : ''
      }
      <div style="display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
        <button
          type="button"
          data-interrupt-action="skip"
          data-interrupt-message-id="${escapeHtml(message.id)}"
          style="border-radius: 999px; border: 1px solid rgba(215, 222, 235, 0.9); background: #ffffff; padding: 8px 14px; cursor: pointer; color: #111827; font-size: 12px;"
        >
          ${escapeHtml(translator.t('message.interrupt.skip'))}
        </button>
        <button
          type="button"
          data-interrupt-action="confirm"
          data-interrupt-message-id="${escapeHtml(message.id)}"
          style="border-radius: 999px; border: 1px solid transparent; background: #111827; padding: 8px 14px; cursor: pointer; color: #ffffff; font-size: 12px;"
        >
          ${escapeHtml(translator.t('message.interrupt.continue'))}
        </button>
      </div>
    </div>
  `;
}

function renderMessages(state: ChatKitState) {
  if (state.messages.length === 0) {
    const hasOnboarding =
      !state.pending &&
      !state.streaming &&
      Boolean(onboardingInfo?.greeting || onboardingInfo?.description || onboardingInfo?.prompts?.length);

    if (hasOnboarding) {
      messagesElement.innerHTML = `
        <div style="padding: 20px; border-radius: 20px; border: 1px solid #d7deeb; background: radial-gradient(circle at top right, rgba(191, 219, 254, 0.45), transparent 38%), linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.96) 100%); display: flex; flex-direction: column; gap: 14px;">
          ${
            onboardingInfo?.greeting
              ? `<div style="font-size: 22px; font-weight: 700; color: #111827;">${escapeHtml(onboardingInfo.greeting)}</div>`
              : ''
          }
          ${
            onboardingInfo?.description
              ? `<div style="color: #6b7280; line-height: 1.6;">${escapeHtml(onboardingInfo.description)}</div>`
              : ''
          }
          ${
            onboardingInfo?.prompts?.length
              ? `<div style="display: flex; flex-wrap: wrap; gap: 10px;">
                  ${onboardingInfo.prompts
                    .map(
                      (prompt, index) => `
                        <button
                          type="button"
                          data-starter-prompt-index="${index}"
                          aria-label="${escapeHtml(prompt.label)}"
                          style="text-align: left; border-radius: 18px; border: 1px solid rgba(148, 163, 184, 0.28); background: #ffffff; padding: 12px 14px; cursor: pointer; color: #111827; min-width: 220px; max-width: 320px; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);">
                          <div style="font-weight: 600;">${escapeHtml(prompt.label)}</div>
                          ${
                            prompt.description
                              ? `<div style="margin-top: 6px; font-size: 13px; color: #6b7280; line-height: 1.5;">${escapeHtml(prompt.description)}</div>`
                              : ''
                          }
                        </button>
                      `
                    )
                    .join('')}
                </div>`
              : ''
          }
        </div>
      `;
      return;
    }

    messagesElement.innerHTML = `
      <div style="padding: 32px 16px; text-align: center; color: #6b7280; border: 1px dashed #d7deeb; border-radius: 18px; background: rgba(245,247,251,0.6);">
        ${escapeHtml(translator.t('empty.startConversation'))}
      </div>
    `;
    return;
  }

  let lastAssistantMessageId: string | undefined;
  for (let index = state.messages.length - 1; index >= 0; index -= 1) {
    if (state.messages[index]?.role === 'assistant') {
      lastAssistantMessageId = state.messages[index].id;
      break;
    }
  }

  messagesElement.innerHTML = state.messages
    .map(message => renderMessage(message, message.id === lastAssistantMessageId))
    .join('');
}

function renderAttachmentList() {
  attachmentListElement.innerHTML = '';

  for (const [index, attachment] of attachments.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = attachment.fileName;
    button.title = translator.t('sender.removeAttachment');
    button.style.border = '1px solid #d7deeb';
    button.style.borderRadius = '999px';
    button.style.background = 'rgba(226,232,240,0.7)';
    button.style.padding = '8px 12px';
    button.style.cursor = 'pointer';
    button.style.maxWidth = '220px';
    button.style.overflow = 'hidden';
    button.style.textOverflow = 'ellipsis';
    button.style.whiteSpace = 'nowrap';
    button.addEventListener('click', () => {
      attachments = attachments.filter((_, attachmentIndex) => attachmentIndex !== index);
      renderAttachmentList();
    });
    attachmentListElement.appendChild(button);
  }

  for (const [index, attachment] of reusedAttachments.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = attachment.fileName;
    button.title = translator.t('sender.removeAttachment');
    button.style.border = '1px solid #d7deeb';
    button.style.borderRadius = '999px';
    button.style.background = 'rgba(219,234,254,0.72)';
    button.style.padding = '8px 12px';
    button.style.cursor = 'pointer';
    button.style.maxWidth = '220px';
    button.style.overflow = 'hidden';
    button.style.textOverflow = 'ellipsis';
    button.style.whiteSpace = 'nowrap';
    button.addEventListener('click', () => {
      reusedAttachments = reusedAttachments.filter((_, attachmentIndex) => attachmentIndex !== index);
      renderAttachmentList();
    });
    attachmentListElement.appendChild(button);
  }
}

function reuseConversationAttachment(attachment: ChatMessageAttachment) {
  const nextAttachment: UploadedAttachmentInput = {
    source: 'uploaded',
    fileName: attachment.fileName,
    url: attachment.url,
    fileId: attachment.fileId,
    storageKey: attachment.storageKey,
    contentType: attachment.contentType,
    size: attachment.size,
    metadata: attachment.metadata,
  };
  const attachmentKey =
    nextAttachment.storageKey ?? nextAttachment.fileId ?? nextAttachment.url ?? nextAttachment.fileName;

  if (
    reusedAttachments.some(
      currentAttachment =>
        (currentAttachment.storageKey ??
          currentAttachment.fileId ??
          currentAttachment.url ??
          currentAttachment.fileName) === attachmentKey
    )
  ) {
    return;
  }

  reusedAttachments = [...reusedAttachments, nextAttachment];
  renderAttachmentList();
}

function renderConversationList(state: ChatKitState) {
  const normalizedQuery = conversationQuery.trim().toLowerCase();
  const conversations = Object.values(state.conversations)
    .sort((left, right) => {
      if (left.id === state.currentConversationId) {
        return -1;
      }
    if (right.id === state.currentConversationId) {
      return 1;
    }

      const leftLabel = left.title?.trim() || left.id;
      const rightLabel = right.title?.trim() || right.id;
      return leftLabel.localeCompare(rightLabel);
    })
    .filter(conversation => {
      if (!normalizedQuery) {
        return true;
      }

      const label = (conversation.title?.trim() || conversation.id).toLowerCase();
      return label.includes(normalizedQuery) || conversation.id.toLowerCase().includes(normalizedQuery);
    });

  conversationListHintElement.textContent =
    conversations.length === 0 ? translator.t('assistant.emptyConversations') : translator.t('assistant.loadingConversations');

  if (conversations.length === 0) {
    conversationListElement.innerHTML = '';
    loadMoreConversationsButtonElement.style.display = 'none';
    return;
  }

  conversationListHintElement.textContent = `${conversations.length} conversation(s)`;
  loadMoreConversationsButtonElement.style.display = hasMoreConversations ? 'block' : 'none';
  conversationListElement.innerHTML = conversations
    .map(conversation => {
      const active = conversation.id === state.currentConversationId;
      const label = conversation.title?.trim() || conversation.id;

      return `
        <div
          style="width: 100%; border-radius: 14px; border: ${
            active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.14)'
          }; background: ${
            active ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.28), rgba(255,255,255,0.08))' : 'rgba(255,255,255,0.06)'
          }; color: #f8fafc; padding: 8px;">
          <button
            type="button"
            data-conversation-id="${escapeHtml(conversation.id)}"
            style="text-align: left; width: 100%; border: none; background: transparent; color: inherit; padding: 4px 6px 10px; cursor: pointer;">
            <div style="font-size: 14px; font-weight: ${active ? 700 : 600}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(label)}</div>
            <div style="margin-top: 4px; font-size: 12px; color: rgba(255,255,255,0.64);">${escapeHtml(conversation.id)}</div>
          </button>
          <div style="display: flex; gap: 8px; padding: 0 6px 4px;">
            <button
              type="button"
              data-action="rename"
              data-conversation-id="${escapeHtml(conversation.id)}"
              style="border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.12); color: #f8fafc; padding: 6px 10px; cursor: pointer; font-size: 12px;">
              ${escapeHtml(translator.t('assistant.renameConversation'))}
            </button>
            <button
              type="button"
              data-action="delete"
              data-conversation-id="${escapeHtml(conversation.id)}"
              style="border-radius: 999px; border: 1px solid rgba(248,113,113,0.24); background: rgba(127,29,29,0.24); color: #fecaca; padding: 6px 10px; cursor: pointer; font-size: 12px;">
              ${escapeHtml(translator.t('assistant.deleteConversation'))}
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderDeepThinkButton() {
  deepThinkButtonElement.textContent = translator.t('sender.deepThink');
  deepThinkButtonElement.style.background = deepThinkEnabled ? '#111827' : '#ffffff';
  deepThinkButtonElement.style.color = deepThinkEnabled ? '#ffffff' : '#111827';
  deepThinkButtonElement.style.fontWeight = deepThinkEnabled ? '700' : '500';
}

function renderApplicationContextBar(state: ChatKitState) {
  const activeContext = state.applicationContext;

  injectNodeContextButtonElement.style.background =
    activeContext?.title === demoApplicationContexts[0].title ? 'rgba(37, 99, 235, 0.12)' : '#ffffff';
  injectNodeContextButtonElement.style.fontWeight =
    activeContext?.title === demoApplicationContexts[0].title ? '700' : '500';
  injectMetricContextButtonElement.style.background =
    activeContext?.title === demoApplicationContexts[1].title ? 'rgba(37, 99, 235, 0.12)' : '#ffffff';
  injectMetricContextButtonElement.style.fontWeight =
    activeContext?.title === demoApplicationContexts[1].title ? '700' : '500';

  if (!activeContext?.title) {
    applicationContextBarElement.style.display = 'none';
    applicationContextBarElement.innerHTML = '';
    return;
  }

  applicationContextBarElement.style.display = 'flex';
  applicationContextBarElement.innerHTML = `
    <div style="display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; border: 1px solid rgba(59, 130, 246, 0.24); background: rgba(219, 234, 254, 0.72); padding: 8px 12px; color: #111827; max-width: 100%;">
      <div style="font-size: 12px; font-weight: 700; white-space: nowrap;">${escapeHtml(translator.t('assistant.context'))}:</div>
      <div style="font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(
        activeContext.title
      )}</div>
    </div>
  `;
}

function appendEvent<K extends keyof ChatKitEventMap>(eventName: K, payload: ChatKitEventMap[K]) {
  const node = document.createElement('div');
  node.style.padding = '10px 12px';
  node.style.borderRadius = '14px';
  node.style.background = 'rgba(255,255,255,0.08)';
  node.style.border = '1px solid rgba(255,255,255,0.08)';
  node.innerHTML = `
    <div style="font-size: 12px; color: rgba(255,255,255,0.65);">${new Date().toLocaleTimeString('zh-CN')}</div>
    <div style="margin-top: 4px; font-size: 13px; font-weight: 600;">${eventName}</div>
    <pre style="margin: 8px 0 0; white-space: pre-wrap; word-break: break-word; font-size: 12px; color: rgba(255,255,255,0.82);">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
  `;
  eventLogElement.prepend(node);
}

function renderState(state: ChatKitState) {
  if (state.currentConversationId !== lastConversationId) {
    lastConversationId = state.currentConversationId;
    reusedAttachments = [];
  }

  statusTextElement.textContent = state.streaming ? translator.t('assistant.streaming') : translator.t('assistant.ready');
  newChatButtonElement.textContent = state.pending || state.streaming ? translator.t('assistant.stop') : translator.t('assistant.newChat');
  newChatButtonElement.style.background = state.pending || state.streaming ? '#111827' : '#ffffff';
  newChatButtonElement.style.color = state.pending || state.streaming ? '#ffffff' : '#111827';
  sendButtonElement.disabled = state.pending || state.streaming;
  sendButtonElement.style.opacity = sendButtonElement.disabled ? '0.65' : '1';
  sendButtonElement.style.cursor = sendButtonElement.disabled ? 'not-allowed' : 'pointer';
  attachButtonElement.disabled = state.pending || state.streaming;
  deepThinkButtonElement.disabled = state.pending || state.streaming;
  injectNodeContextButtonElement.disabled = state.pending || state.streaming;
  injectMetricContextButtonElement.disabled = state.pending || state.streaming;
  clearContextButtonElement.disabled = state.pending || state.streaming;
  attachButtonElement.style.opacity = attachButtonElement.disabled ? '0.65' : '1';
  deepThinkButtonElement.style.opacity = deepThinkButtonElement.disabled ? '0.65' : '1';
  injectNodeContextButtonElement.style.opacity = injectNodeContextButtonElement.disabled ? '0.65' : '1';
  injectMetricContextButtonElement.style.opacity = injectMetricContextButtonElement.disabled ? '0.65' : '1';
  clearContextButtonElement.style.opacity = clearContextButtonElement.disabled ? '0.65' : '1';
  const errorText = resolveErrorText(state.error);
  errorBannerElement.style.display = errorText ? 'block' : 'none';
  errorBannerElement.innerHTML = errorText
    ? `<div style="font-weight: 700; margin-bottom: 6px;">${escapeHtml(translator.t('assistant.error'))}</div><div>${escapeHtml(errorText)}</div>`
    : '';
  conversationListHintElement.textContent = state.pending || state.streaming
    ? translator.t('assistant.loadingConversations')
    : conversationListHintElement.textContent;
  renderMessages(state);
  renderAttachmentList();
  renderConversationList(state);
  renderContextPanel();
  renderConversationFiles(state);
  renderDeepThinkButton();
  renderApplicationContextBar(state);
}

engine.subscribe(state => {
  renderState(state);
});

const watchedEvents: Array<keyof ChatKitEventMap> = [
  'conversationChanged',
  'streamStarted',
  'messageAppended',
  'messageUpdated',
  'streamCompleted',
  'streamError',
];

for (const eventName of watchedEvents) {
  engine.on(eventName, payload => {
    appendEvent(eventName, payload);
  });
}

attachButtonElement.addEventListener('click', () => {
  fileInputElement.click();
});

conversationSearchInputElement.addEventListener('input', event => {
  conversationQuery = (event.target as HTMLInputElement).value;
  renderConversationList(engine.getState());
});

fileInputElement.addEventListener('change', event => {
  const target = event.target as HTMLInputElement;
  const files = target.files ? Array.from(target.files) : [];
  if (files.length === 0) {
    return;
  }

  attachments = [
    ...attachments,
    ...files.map<LocalAttachmentInput>(file => ({
      source: 'local',
      fileName: file.name,
      content: file,
      contentType: file.type || undefined,
      metadata: {
        size: file.size,
        lastModified: file.lastModified,
      },
    })),
  ];
  target.value = '';
  renderAttachmentList();
});

deepThinkButtonElement.addEventListener('click', () => {
  deepThinkEnabled = !deepThinkEnabled;
  renderDeepThinkButton();
});

injectNodeContextButtonElement.addEventListener('click', () => {
  engine.injectApplicationContext(demoApplicationContexts[0]);
});

injectMetricContextButtonElement.addEventListener('click', () => {
  engine.injectApplicationContext(demoApplicationContexts[1]);
});

clearContextButtonElement.addEventListener('click', () => {
  engine.removeApplicationContext();
});

composerElement.addEventListener('submit', async event => {
  event.preventDefault();
  const nextValue = inputElement.value.trim();
  if (!nextValue && attachments.length === 0 && reusedAttachments.length === 0) {
    return;
  }

  const nextAttachments = [...reusedAttachments, ...attachments];
  attachments = [];
  reusedAttachments = [];
  renderAttachmentList();
  inputElement.value = '';

  await engine.send({
    text: nextValue,
    ...(nextAttachments.length > 0 ? { attachments: nextAttachments } : {}),
    deepThink: deepThinkEnabled,
  });
});

conversationFilesElement.addEventListener('click', event => {
  const target = event.target as HTMLElement | null;
  const reuseButton = target?.closest<HTMLButtonElement>('[data-reuse-file-id]');
  if (!reuseButton) {
    return;
  }

  const fileId = reuseButton.dataset.reuseFileId;
  if (!fileId) {
    return;
  }

  const currentFile = collectConversationFiles(engine.getState().messages).find(file => file.id === fileId);
  if (!currentFile || currentFile.attachment.source !== 'uploaded') {
    return;
  }

  reuseConversationAttachment(currentFile.attachment);
});

messagesElement.addEventListener('click', async event => {
  const target = event.target as HTMLElement | null;
  const interruptButton = target?.closest<HTMLButtonElement>('[data-interrupt-action]');
  if (interruptButton) {
    const action = interruptButton.dataset.interruptAction === 'skip' ? 'skip' : 'confirm';
    const messageId = interruptButton.dataset.interruptMessageId;
    if (!messageId) {
      return;
    }

    const state = engine.getState();
    const messageIndex = state.messages.findIndex(message => message.id === messageId);
    const message = messageIndex >= 0 ? state.messages[messageIndex] : undefined;
    const interrupt = message?.metadata?.interrupt;
    if (!message || !interrupt) {
      return;
    }

    const previousUserMessage = [...state.messages.slice(0, messageIndex)].reverse().find(nextMessage => nextMessage.role === 'user');
    const modifiedArgs: Array<{ key: string; value: unknown }> = [];

    if (action === 'confirm') {
      const panel = messagesElement.querySelector<HTMLElement>(`[data-interrupt-panel-id="${messageId}"]`);
      const toolArgs = interrupt.data?.tool_args ?? [];

      for (const [index, arg] of toolArgs.entries()) {
        const input = panel?.querySelector<HTMLTextAreaElement>(`[data-interrupt-input-index="${index}"]`);
        const rawValue = input?.value ?? '';
        let parsedValue: unknown = rawValue;

        if (arg.type === 'object' || arg.type === 'dict' || arg.type === 'array') {
          try {
            parsedValue = JSON.parse(rawValue);
          } catch {
            window.alert(translator.t('message.interrupt.invalidJson'));
            input?.focus();
            return;
          }
        }

        if (JSON.stringify(parsedValue) !== JSON.stringify(arg.value)) {
          modifiedArgs.push({
            key: arg.key,
            value: parsedValue,
          });
        }
      }
    }

    await engine.send({
      conversationId: state.currentConversationId,
      text: '',
      attachments: mapAttachmentsForResend(previousUserMessage?.metadata?.attachments),
      interrupt: {
        handle: interrupt.handle,
        data: interrupt.data,
        action,
        ...(modifiedArgs.length > 0 ? { modifiedArgs } : {}),
        interruptedAssistantMessageId: message.id,
      },
    });
    return;
  }

  const feedbackButton = target?.closest<HTMLButtonElement>('[data-feedback-message-id]');
  if (feedbackButton) {
    const messageId = feedbackButton.dataset.feedbackMessageId;
    const feedbackValue = feedbackButton.dataset.feedbackValue;
    if (!messageId || (feedbackValue !== 'upvote' && feedbackValue !== 'downvote')) {
      return;
    }

    await engine.submitMessageFeedback({
      conversationId: engine.getState().currentConversationId,
      messageId,
      feedback: feedbackValue,
    });
    return;
  }

  const relatedQuestionButton = target?.closest<HTMLButtonElement>('[data-related-question]');
  if (relatedQuestionButton) {
    const nextText = relatedQuestionButton.dataset.relatedQuestion?.trim();
    if (!nextText) {
      return;
    }

    await engine.send({
      conversationId: engine.getState().currentConversationId,
      text: nextText,
    });
    return;
  }

  const starterPromptButton = target?.closest<HTMLButtonElement>('[data-starter-prompt-index]');
  if (!starterPromptButton) {
    return;
  }

  const promptIndex = Number(starterPromptButton.dataset.starterPromptIndex);
  const prompt = onboardingInfo?.prompts?.[promptIndex];
  const nextText = prompt?.message?.trim() || prompt?.label?.trim();
  if (!nextText) {
    return;
  }

  await engine.send({
    conversationId: engine.getState().currentConversationId,
    text: nextText,
  });
});

newChatButtonElement.addEventListener('click', async () => {
  if (engine.getState().pending || engine.getState().streaming) {
    await engine.terminate({
      conversationId: engine.getState().currentConversationId,
      mode: 'terminate',
    });
    return;
  }

  await engine.createConversation();
  await refreshConversations();
});

refreshConversationsButtonElement.addEventListener('click', async () => {
  await refreshConversations();
});

loadMoreConversationsButtonElement.addEventListener('click', async () => {
  await loadMoreConversations();
});

conversationListElement.addEventListener('click', async event => {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>('[data-conversation-id]');

  if (!button) {
    return;
  }

  const conversationId = button.dataset.conversationId;
  if (!conversationId) {
    return;
  }

  const action = button.dataset.action;
  if (action === 'rename') {
    const currentConversation = engine.getState().conversations[conversationId];
    const nextTitle = window.prompt(
      translator.t('assistant.renameConversationPrompt'),
      currentConversation?.title ?? ''
    );
    if (!nextTitle || !nextTitle.trim()) {
      return;
    }

    await engine.renameConversation({
      conversationId,
      title: nextTitle.trim(),
    });
    return;
  }

  if (action === 'delete') {
    const confirmed = window.confirm(translator.t('assistant.deleteConversationConfirm'));
    if (!confirmed) {
      return;
    }

    await engine.deleteConversation({
      conversationId,
    });
    return;
  }

  await engine.loadConversation({ conversationId });
});

async function refreshConversations() {
  try {
    const fetchedConversations = await engine.listConversations({
      page: 1,
      size: 10,
      replace: true,
    });
    conversationPage = 1;
    hasMoreConversations = fetchedConversations.length >= 10;
  } catch {
    conversationListHintElement.textContent = translator.t('assistant.emptyConversations');
    hasMoreConversations = false;
  }
}

async function loadMoreConversations() {
  if (!hasMoreConversations) {
    return;
  }

  const nextPage = conversationPage + 1;
  const fetchedConversations = await engine.listConversations({
    page: nextPage,
    size: 10,
  });
  conversationPage = nextPage;
  hasMoreConversations = fetchedConversations.length >= 10;
}

void (async () => {
  await refreshConversations();
  try {
    onboardingInfo = await engine.getOnboardingInfo();
  } catch {
    onboardingInfo = null;
  }
  try {
    contextInfo = await engine.getContextInfo();
  } catch {
    contextInfo = null;
  }
  renderState(engine.getState());

  const hasOnboarding =
    Boolean(onboardingInfo?.greeting || onboardingInfo?.description || onboardingInfo?.prompts?.length);

  if (!hasOnboarding) {
    await engine.send({ text: initialPrompt });
  }
})();

