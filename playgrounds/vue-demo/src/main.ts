import { createApp, defineComponent, h, onMounted, ref, watch } from 'vue';

import type {
  ApplicationContext,
  ChatMessage,
  ChatMessageAttachment,
  ChatMessageFeedback,
  ContextInfo,
  ChatToolCall,
  LocalAttachmentInput,
  OnboardingInfo,
  UploadedAttachmentInput,
} from '@kweaver-ai/chatkit-core';
import { createDipProvider } from '@kweaver-ai/chatkit-provider-dip';
import {
  buildWebProcessorEmbedUrl,
  createDefaultMarkdownSanitizer,
  defaultToolDefinitionRegistry,
  getSafeWebProcessorUrl,
  getWebProcessorDisplayUrl,
  getWebProcessorHeight,
  getWebProcessorTitle,
  renderMarkdown,
} from '@kweaver-ai/chatkit-shared';
import { ChatKitProvider, useChatKit, useChatKitI18n } from '@kweaver-ai/chatkit-vue';

function createAsyncIterable(items: unknown[]): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        await new Promise(resolve => setTimeout(resolve, 120));
        yield item;
      }
    },
  };
}

const historyMessages = [
  {
    id: 'history-user-vue-1',
    role: 'user' as const,
    content: 'Why does Vue start from bindings first?',
  },
  {
    id: 'history-assistant-vue-1',
    role: 'assistant' as const,
    content:
      'Vue starts by validating the provider and composition bindings first, then layers built-in UI afterward so the framework-free engine contract stays stable.',
    metadata: {
      thinking: 'Summarize the staged rollout so the sidebar can load a realistic history thread.',
      metrics: {
        totalTokens: 92,
        totalTimeSeconds: 1.8,
        ttftMs: 205,
      },
    },
  },
];

const demoConversations = [
  { id: 'conversation-history-vue-demo', title: 'Migration Recap' },
  { id: 'conversation-vue-demo-2', title: 'Provider Notes' },
  { id: 'conversation-vue-demo-3', title: 'Markdown Rendering' },
  { id: 'conversation-vue-demo-4', title: 'Attachment Workflow' },
  { id: 'conversation-vue-demo-5', title: 'Tool Cards' },
  { id: 'conversation-vue-demo-6', title: 'Thinking Display' },
  { id: 'conversation-vue-demo-7', title: 'Regenerate Flow' },
  { id: 'conversation-vue-demo-8', title: 'Conversation Search' },
  { id: 'conversation-vue-demo-9', title: 'Conversation Actions' },
  { id: 'conversation-vue-demo-10', title: 'Streaming Metrics' },
  { id: 'conversation-vue-demo-11', title: 'Pagination Demo' },
  { id: 'conversation-vue-demo-12', title: 'DIP Normalization' },
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
const initialPrompt = 'hello from vue demo';

function createDemoSnapshot(question: string, chatMode: 'deep_thinking' | 'normal', selectedFiles: string[]) {
  const selectedFilesMarkdown =
    selectedFiles.length > 0 ? selectedFiles.map(file => `- ${file}`).join('\n') : '- none';

  return {
    assistant_message_id: `assistant-vue-demo-${Date.now()}`,
    ext: {
      related_queries: ['Explain the Vue binding flow', 'Show the related question follow-up flow'],
    },
    message: {
      ext: {
        total_time: 5.1,
        total_tokens: 348,
        ttft: 295,
      },
      content: {
        middle_answer: {
          progress: [
            {
              stage: 'llm',
              status: 'completed',
              think:
                '先验证 Vue binding 能不能无缝消费 framework-free core 的消息模型，再把 thinking、toolCalls 和 timing metrics 一起交给自定义 UI 渲染。',
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
                              title: 'Vue Binding',
                              link: 'https://example.com/vue-binding',
                              content: 'Shows how useChatKit and provider injection connect the framework-free engine to Vue.',
                            },
                            {
                              title: 'Custom UI Path',
                              link: 'https://example.com/custom-ui',
                              content: 'Explains how Vue can keep its own rendering while sharing the same provider normalization and message model.',
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
                    value: `const runtime = "vue-demo";\nconst mode = "${chatMode}";\nconsole.log(runtime, mode);`,
                  },
                ],
              },
              answer: {
                result: {
                  result: {
                    stdout: `vue-demo ${chatMode}`,
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
                    value: 'Why does Vue start with bindings before built-in UI?',
                  },
                ],
              },
              answer: {
                result: {
                  text: '<p>Vue starts with provider and composition bindings first so we can validate the framework-free engine contract before building a full built-in Assistant and Copilot UI layer.</p>',
                  cites: [
                    {
                      title: 'Migration Plan',
                      quote: 'Stage four validates the binding layer; built-in Vue UI follows after that.',
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
                    value: 'Show the surfaces supported by ChatKit v2',
                  },
                ],
              },
              answer: {
                result: {
                  sql: 'MATCH (c:ChatKit)-[:SUPPORTS]->(s:Surface) RETURN s.name',
                  data: {
                    's.name': ['Plain JavaScript', 'React', 'Vue'],
                  },
                },
              },
            },
          ],
        },
        final_answer: {
          answer: {
            text: `# Vue Demo

Current prompt: **${question}**

Chat mode: **${chatMode}**

Selected files:
${selectedFilesMarkdown}

Vue currently starts with the binding layer first, while still sharing the same provider, attachment upload flow, deep thinking mode, and tool result model used by the framework-free core.

- Provider
- useChatKit
- useChatKitI18n
- Custom UI

Math also works here: $e^{i\\pi} + 1 = 0$`,
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
      storageKey: `${input.conversationId ?? 'conversation-vue-demo'}/uploads/${encodeURIComponent(input.fileName)}`,
    };
  },
};

const provider = createDipProvider({
  baseUrl: 'https://dip.example.com',
  agentKey: 'demo-agent',
  async getOnboardingInfo() {
    return {
      greeting: 'Welcome to ChatKit Vue Demo',
      description: 'Use a starter prompt to validate the Vue binding layer while sharing the same framework-free engine and provider contract.',
      prompts: [
        {
          id: 'starter-vue-binding',
          label: 'Explain the Vue binding flow',
          description: 'Review provider injection, useChatKit, and custom UI rendering.',
        },
        {
          id: 'starter-vue-tools',
          label: 'Show the available tool cards',
          description: 'Exercise search, code, doc QA, and NGQL cards in the Vue custom UI.',
        },
        {
          id: 'starter-vue-interrupt',
          label: 'Trigger interrupt confirmation',
          description: 'Exercise DipChat-style confirm and skip flows in Vue.',
        },
      ],
    };
  },
  async getContextInfo() {
    return {
      title: 'Assistant Context',
      description: 'This demo keeps datasource, knowledge network, and metric context outside the message stream so the Vue binding can render it alongside conversations.',
      sections: [
        {
          id: 'knowledge-networks',
          title: 'Knowledge Networks',
          items: [
            {
              id: 'kn-vue-orders',
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
              id: 'metric-vue-gmv',
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
              id: 'ds-vue-orders',
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
    // The engine keeps the latest feedback selection in local state for the demo.
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

type TranslateFn = ReturnType<typeof useChatKitI18n>['t'];
interface ConversationFileItem {
  id: string;
  attachment: ChatMessageAttachment;
  usageCount: number;
}

interface ConversationContextSection {
  id: string;
  title?: string;
  description?: string;
  items: NonNullable<ContextInfo['sections']>[number]['items'];
}

const sanitizeHtml = createDefaultMarkdownSanitizer();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveStatusText(message: ChatMessage, t: TranslateFn): string {
  if (message.status === 'streaming') {
    return t('message.status.streaming');
  }

  if (message.status === 'error') {
    return t('message.status.error');
  }

  return t('message.status.done');
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

function shouldTriggerInterrupt(question: string): boolean {
  return question.toLowerCase().includes('interrupt');
}

function createDemoInterruptSnapshot(question: string, chatMode: 'deep_thinking' | 'normal', selectedFiles: string[]) {
  const selectedFilesMarkdown =
    selectedFiles.length > 0 ? selectedFiles.map(file => `- ${file}`).join('\n') : '- none';

  return {
    assistant_message_id: `assistant-vue-interrupt-${Date.now()}`,
    message: {
      ext: {
        interrupt_info: {
          handle: {
            run_id: 'vue-interrupt-run-1',
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
    assistant_message_id: `assistant-vue-interrupt-resume-${Date.now()}`,
    message: {
      ext: {
        total_time: 2.6,
        total_tokens: 174,
        ttft: 230,
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

function isStructuredInterruptArgType(type: string | undefined): boolean {
  return type === 'object' || type === 'dict' || type === 'array';
}

function createInterruptFieldValue(value: unknown, type?: string): string {
  if (isStructuredInterruptArgType(type)) {
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

function mapAttachmentsForResend(attachments: ChatMessageAttachment[] | undefined): UploadedAttachmentInput[] | undefined {
  if (!attachments || attachments.length === 0) {
    return undefined;
  }

  return attachments.map(attachment => ({
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

function renderToolInput(toolCall: ChatToolCall, t: TranslateFn): string {
  if (typeof toolCall.input === 'string') {
    return `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">${escapeHtml(t('tool.input'))}</div>
        <pre style="margin: 0; padding: 10px 12px; border-radius: 12px; background: #0f172a; color: #e2e8f0; overflow-x: auto; font-size: 13px; white-space: pre-wrap;">${escapeHtml(toolCall.input)}</pre>
      </div>
    `;
  }

  if (toolCall.input && typeof toolCall.input === 'object') {
    return `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">${escapeHtml(t('tool.input'))}</div>
        <div style="display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 12px; background: #ffffff; border: 1px solid rgba(215, 222, 235, 0.9);">
          ${renderKeyValueRows(toolCall.input as Record<string, unknown>)}
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

function renderToolCallsHtml(toolCalls: ChatToolCall[], t: TranslateFn): string {
  if (toolCalls.length === 0) {
    return '';
  }

  return toolCalls
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
          ${renderToolInput(toolCall, t)}
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">${escapeHtml(t('tool.output'))}</div>
            ${renderToolOutput(toolCall)}
          </div>
        </div>
      `;
    })
    .join('');
}

function renderThinkingHtml(thinking: string, t: TranslateFn): string {
  return `
    <details open style="align-self: flex-start; width: 100%; padding: 12px 14px; border-radius: 16px; background: rgba(255,255,255,0.82); border: 1px solid rgba(215, 222, 235, 0.9); color: #111827;">
      <summary style="cursor: pointer; font-weight: 700;">${escapeHtml(t('message.deepThinking'))}</summary>
      <div style="margin-top: 10px; line-height: 1.6; overflow-wrap: anywhere;">${renderMarkdown(thinking)}</div>
    </details>
  `;
}

function renderMetricsHtml(message: ChatMessage, t: TranslateFn): string {
  const metrics = message.metadata?.metrics;
  const items = [
    metrics?.totalTimeSeconds != null
      ? t('message.metrics.totalTime', {
          value: metrics.totalTimeSeconds.toFixed(metrics.totalTimeSeconds >= 10 ? 0 : 2).replace(/\.00$/, ''),
        })
      : '',
    metrics?.totalTokens != null
      ? t('message.metrics.totalTokens', {
          value: metrics.totalTokens,
        })
      : '',
    metrics?.ttftMs != null
      ? t('message.metrics.ttft', {
          value: metrics.ttftMs,
        })
      : '',
  ].filter(Boolean);

  if (items.length === 0) {
    return '';
  }

  return `<div style="font-size: 12px; color: rgba(15, 23, 42, 0.65);">${escapeHtml(items.join(' · '))}</div>`;
}

function renderRelatedQuestionsHtml(message: ChatMessage, isLatestAssistantMessage: boolean): string {
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

function renderAttachmentsHtml(attachments: ChatMessageAttachment[]): string {
  if (attachments.length === 0) {
    return '';
  }

  return `
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
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

const Consumer = defineComponent({
  name: 'VueDemoConsumer',
  setup() {
    const { state, commands } = useChatKit();
    const { t } = useChatKitI18n();
    const draft = ref('');
    const attachments = ref<LocalAttachmentInput[]>([]);
    const reusedAttachments = ref<UploadedAttachmentInput[]>([]);
    const interruptDrafts = ref<Record<string, Record<string, string>>>({});
    const deepThink = ref(false);
    const loadingConversations = ref(false);
    const conversationQuery = ref('');
    const conversationPage = ref(1);
    const hasMoreConversations = ref(false);
    const onboardingInfo = ref<OnboardingInfo | null>(null);
    const contextInfo = ref<ContextInfo | null>(null);
    const loadingContext = ref(false);
    let fileInputElement: HTMLInputElement | null = null;

    const refreshConversations = async () => {
      loadingConversations.value = true;
      try {
        const fetchedConversations = await commands.listConversations({
          page: 1,
          size: 10,
          replace: true,
        });
        conversationPage.value = 1;
        hasMoreConversations.value = fetchedConversations.length >= 10;
      } catch {
        // Keep the demo interactive even if history APIs are not wired yet.
        hasMoreConversations.value = false;
      } finally {
        loadingConversations.value = false;
      }
    };

    const loadMoreConversations = async () => {
      if (!hasMoreConversations.value) {
        return;
      }

      loadingConversations.value = true;
      try {
        const nextPage = conversationPage.value + 1;
        const fetchedConversations = await commands.listConversations({
          page: nextPage,
          size: 10,
        });
        conversationPage.value = nextPage;
        hasMoreConversations.value = fetchedConversations.length >= 10;
      } finally {
        loadingConversations.value = false;
      }
    };

    const loadConversation = async (conversationId: string) => {
      loadingConversations.value = true;
      try {
        await commands.loadConversation({ conversationId });
      } finally {
        loadingConversations.value = false;
      }
    };

    const renameConversation = async (conversation: { id: string; title?: string }) => {
      if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
        return;
      }

      const nextTitle = window.prompt(t('assistant.renameConversationPrompt'), conversation.title ?? '');
      if (!nextTitle || !nextTitle.trim()) {
        return;
      }

      loadingConversations.value = true;
      try {
        await commands.renameConversation({
          conversationId: conversation.id,
          title: nextTitle.trim(),
        });
      } finally {
        loadingConversations.value = false;
      }
    };

    const deleteConversation = async (conversation: { id: string }) => {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const confirmed = window.confirm(t('assistant.deleteConversationConfirm'));
        if (!confirmed) {
          return;
        }
      }

      loadingConversations.value = true;
      try {
        await commands.deleteConversation({
          conversationId: conversation.id,
        });
      } finally {
        loadingConversations.value = false;
      }
    };

    const submit = async () => {
      const nextValue = draft.value.trim();
      if (
        (!nextValue && attachments.value.length === 0 && reusedAttachments.value.length === 0) ||
        state.value.pending ||
        state.value.streaming
      ) {
        return;
      }

      const nextAttachments = [...reusedAttachments.value, ...attachments.value];
      attachments.value = [];
      reusedAttachments.value = [];
      draft.value = '';
      await commands.send({
        text: nextValue,
        ...(nextAttachments.length > 0 ? { attachments: nextAttachments } : {}),
        deepThink: deepThink.value,
      });
    };

    const submitFeedback = async (messageId: string, feedback: ChatMessageFeedback) => {
      await commands.submitMessageFeedback({
        conversationId: state.value.currentConversationId,
        messageId,
        feedback,
      });
    };

    const submitRelatedQuestion = async (question: string) => {
      const nextText = question.trim();
      if (!nextText || state.value.pending || state.value.streaming) {
        return;
      }

      await commands.send({
        conversationId: state.value.currentConversationId,
        text: nextText,
      });
    };

    const reuseConversationAttachment = (attachment: ChatMessageAttachment) => {
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
        reusedAttachments.value.some(
          currentAttachment =>
            (currentAttachment.storageKey ??
              currentAttachment.fileId ??
              currentAttachment.url ??
              currentAttachment.fileName) === attachmentKey
        )
      ) {
        return;
      }

      reusedAttachments.value = [...reusedAttachments.value, nextAttachment];
    };

    const updateInterruptDraft = (messageId: string, key: string, value: string) => {
      interruptDrafts.value = {
        ...interruptDrafts.value,
        [messageId]: {
          ...(interruptDrafts.value[messageId] ?? {}),
          [key]: value,
        },
      };
    };

    const getInterruptDraft = (message: ChatMessage, key: string, type?: string, originalValue?: unknown) =>
      interruptDrafts.value[message.id]?.[key] ?? createInterruptFieldValue(originalValue, type);

    const submitInterrupt = async (message: ChatMessage, action: 'confirm' | 'skip') => {
      const interrupt = message.metadata?.interrupt;
      if (!interrupt) {
        return;
      }

      const messageIndex = state.value.messages.findIndex(item => item.id === message.id);
      const previousUserMessage =
        messageIndex >= 0
          ? [...state.value.messages.slice(0, messageIndex)].reverse().find(item => item.role === 'user')
          : undefined;
      const modifiedArgs: Array<{ key: string; value: unknown }> = [];

      if (action === 'confirm') {
        for (const arg of interrupt.data?.tool_args ?? []) {
          const rawValue = getInterruptDraft(message, arg.key, arg.type, arg.value);
          let parsedValue: unknown = rawValue;

          if (isStructuredInterruptArgType(arg.type)) {
            try {
              parsedValue = JSON.parse(rawValue);
            } catch {
              window.alert(t('message.interrupt.invalidJson'));
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

      await commands.send({
        conversationId: state.value.currentConversationId,
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
    };

    const renderInterruptPanel = (message: ChatMessage, isLatestAssistantMessage: boolean) => {
      const interrupt = isLatestAssistantMessage ? message.metadata?.interrupt : undefined;
      if (!interrupt || message.role !== 'assistant') {
        return null;
      }

      const toolArgs = interrupt.data?.tool_args ?? [];
      const requiresConfirmation = Boolean(interrupt.data?.interrupt_config?.requires_confirmation);
      const confirmationMessage =
        interrupt.data?.interrupt_config?.confirmation_message?.trim() || t('message.interrupt.defaultConfirmation');

      return h('div', {
        style: {
          ...toolCallsWrapStyle,
          padding: '14px 16px',
          borderRadius: '18px',
          border: '1px solid rgba(59, 130, 246, 0.18)',
          background: 'linear-gradient(180deg, rgba(239, 246, 255, 0.95), rgba(248, 250, 252, 0.96))',
        },
      }, [
        h('div', {
          style: {
            borderRadius: '14px',
            border: '1px solid rgba(147, 197, 253, 0.38)',
            background: 'rgba(219, 234, 254, 0.58)',
            padding: '10px 12px',
            color: '#111827',
          },
        }, [
          h('div', { style: { fontWeight: 700, marginBottom: '6px' } }, requiresConfirmation ? t('message.interrupt.requiresConfirmation') : t('message.interrupt.reviewInput')),
          h('div', { style: { fontSize: '13px', lineHeight: 1.6 } }, confirmationMessage),
        ]),
        ...toolArgs.map(arg =>
          h('label', { key: `${message.id}-${arg.key}`, style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, [
            h('span', { style: { fontSize: '12px', fontWeight: 700, color: '#111827' } }, arg.key),
            h('textarea', {
              value: getInterruptDraft(message, arg.key, arg.type, arg.value),
              rows: isStructuredInterruptArgType(arg.type) ? 5 : 2,
              disabled: state.value.pending || state.value.streaming,
              style: {
                resize: 'vertical',
                minHeight: isStructuredInterruptArgType(arg.type) ? '110px' : '72px',
                padding: '12px 14px',
                borderRadius: '14px',
                border: '1px solid #d7deeb',
                background: '#ffffff',
                color: '#111827',
                outline: 'none',
                lineHeight: 1.6,
                font: isStructuredInterruptArgType(arg.type) ? '12px/1.6 Consolas, Monaco, monospace' : 'inherit',
              },
              onInput: (event: Event) => {
                updateInterruptDraft(message.id, arg.key, (event.target as HTMLTextAreaElement).value);
              },
            }),
          ])
        ),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' } }, [
          h('button', {
            type: 'button',
            style: actionButtonStyle,
            disabled: state.value.pending || state.value.streaming,
            onClick: () => {
              void submitInterrupt(message, 'skip');
            },
          }, t('message.interrupt.skip')),
          h('button', {
            type: 'button',
            style: actionButtonPrimaryStyle,
            disabled: state.value.pending || state.value.streaming,
            onClick: () => {
              void submitInterrupt(message, 'confirm');
            },
          }, t('message.interrupt.continue')),
        ]),
      ]);
    };

    watch(
      () => state.value.currentConversationId,
      () => {
        reusedAttachments.value = [];
        interruptDrafts.value = {};
      }
    );

    onMounted(() => {
      void (async () => {
        await refreshConversations();
        try {
          onboardingInfo.value = await commands.getOnboardingInfo();
        } catch {
          onboardingInfo.value = null;
        }

        const hasOnboarding = Boolean(
          onboardingInfo.value?.greeting || onboardingInfo.value?.description || onboardingInfo.value?.prompts?.length
        );

        if (!hasOnboarding) {
          await commands.send({ text: initialPrompt });
        }
      })();

      void (async () => {
        loadingContext.value = true;
        try {
          contextInfo.value = await commands.getContextInfo();
        } catch {
          contextInfo.value = null;
        } finally {
          loadingContext.value = false;
        }
      })();
    });

    return () => {
      const normalizedQuery = conversationQuery.value.trim().toLowerCase();
      const conversationFiles = collectConversationFiles(state.value.messages);
      let latestAssistantMessageId: string | undefined;
      for (let index = state.value.messages.length - 1; index >= 0; index -= 1) {
        if (state.value.messages[index]?.role === 'assistant') {
          latestAssistantMessageId = state.value.messages[index].id;
          break;
        }
      }
      const contextSections = (contextInfo.value?.sections?.filter(section => section.items.length > 0) ??
        []) as ConversationContextSection[];
      const conversationItems = Object.values(state.value.conversations)
        .sort((left, right) => {
          if (left.id === state.value.currentConversationId) {
            return -1;
          }
          if (right.id === state.value.currentConversationId) {
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

      return h('div', { style: layoutStyle }, [
        h('aside', { style: sidebarStyle }, [
          h('div', { style: sidebarHeaderStyle }, [
            h('div', { style: titleStyle }, t('assistant.conversations')),
            h(
              'button',
              {
                type: 'button',
                style: sidebarRefreshButtonStyle,
                onClick: () => {
                  void refreshConversations();
                },
              },
              t('assistant.refreshConversations')
            ),
          ]),
          h(
            'div',
            { style: sidebarSubtitleStyle },
            loadingConversations.value
              ? t('assistant.loadingConversations')
              : conversationItems.length === 0
                ? t('assistant.emptyConversations')
                : `${conversationItems.length} conversation(s)`
          ),
          h('input', {
            value: conversationQuery.value,
            placeholder: t('assistant.searchConversations'),
            style: sidebarSearchInputStyle,
            onInput: (event: Event) => {
              conversationQuery.value = (event.target as HTMLInputElement).value;
            },
          }),
          ...conversationItems.map(conversation =>
            h('div', {
              key: conversation.id,
              style:
                conversation.id === state.value.currentConversationId
                  ? sidebarItemActiveStyle
                  : sidebarItemStyle,
            }, [
              h(
                'button',
                {
                  type: 'button',
                  style: sidebarSelectButtonStyle,
                  onClick: () => {
                    void loadConversation(conversation.id);
                  },
                },
                [
                  h(
                    'div',
                    {
                      style: {
                        fontSize: '14px',
                        fontWeight: 700,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      },
                      title: conversation.title?.trim() || conversation.id,
                    },
                    conversation.title?.trim() || conversation.id
                  ),
                  h(
                    'div',
                    { style: { marginTop: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.64)' } },
                    conversation.id
                  ),
                ]
              ),
              h('div', { style: sidebarActionsStyle }, [
                h(
                  'button',
                  {
                    type: 'button',
                    style: sidebarActionButtonStyle,
                    onClick: () => {
                      void renameConversation(conversation);
                    },
                  },
                  t('assistant.renameConversation')
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    style: sidebarDeleteButtonStyle,
                    onClick: () => {
                      void deleteConversation(conversation);
                    },
                  },
                  t('assistant.deleteConversation')
                ),
              ]),
            ])
          ),
          hasMoreConversations.value
            ? h(
                'button',
                {
                  type: 'button',
                  style: sidebarLoadMoreButtonStyle,
                  disabled: loadingConversations.value,
                  onClick: () => {
                    void loadMoreConversations();
                  },
                },
                loadingConversations.value ? t('assistant.loadingConversations') : t('assistant.loadMoreConversations')
              )
            : null,
          h('div', { style: sidebarSectionStyle }, [
            h('div', { style: sidebarHeaderStyle }, [
              h('div', { style: sidebarSectionTitleStyle }, contextInfo.value?.title?.trim() || t('assistant.context')),
              h(
                'div',
                { style: sidebarSectionCountStyle },
                String(contextSections.reduce((count, section) => count + section.items.length, 0))
              ),
            ]),
            contextInfo.value?.description
              ? h('div', { style: sidebarSubtitleStyle }, contextInfo.value.description)
              : null,
            loadingContext.value
              ? h('div', { style: sidebarSubtitleStyle }, t('assistant.loadingContext'))
              : contextSections.length === 0
                ? h('div', { style: sidebarSubtitleStyle }, t('assistant.emptyContext'))
                : h(
                    'div',
                    { style: filePanelGridStyle },
                    contextSections.flatMap(section => [
                      h('div', { key: `${section.id}-title`, style: sidebarSubsectionStyle }, [
                        h('div', { style: sidebarSubsectionTitleStyle }, section.title?.trim() || section.id),
                        section.description
                          ? h('div', { style: sidebarSubsectionDescriptionStyle }, section.description)
                          : null,
                      ]),
                      ...section.items.map(item => {
                        const metadataEntries = item.metadata ? Object.entries(item.metadata) : [];

                        return h('article', { key: item.id, style: fileCardStyle }, [
                          h('div', null, [
                            h(
                              'div',
                              {
                                style: fileNameStyle,
                                title: item.title,
                              },
                              item.title
                            ),
                            item.subtitle
                              ? h('div', { style: sidebarSubsectionDescriptionStyle }, item.subtitle)
                              : null,
                            item.value
                              ? h('div', { style: contextValueStyle }, item.value)
                              : null,
                            item.tags?.length
                              ? h(
                                  'div',
                                  { style: fileBadgeRowStyle },
                                  item.tags.map(tag => h('span', { key: `${item.id}-${tag}`, style: fileBadgeUploadedStyle }, tag))
                                )
                              : null,
                          ]),
                          item.description
                            ? h('div', { style: contextDescriptionStyle }, item.description)
                            : null,
                          metadataEntries.length
                            ? h(
                                'div',
                                { style: contextMetadataStyle },
                                metadataEntries.map(([key, value]) =>
                                  h('div', { key: `${item.id}-${key}`, style: contextMetadataRowStyle }, [
                                    h('div', { style: contextMetadataKeyStyle }, key),
                                    h(
                                      'div',
                                      { style: contextMetadataValueStyle },
                                      typeof value === 'string' ? value : JSON.stringify(value)
                                    ),
                                  ])
                                )
                              )
                            : null,
                          item.url
                            ? h(
                                'a',
                                {
                                  href: item.url,
                                  target: '_blank',
                                  rel: 'noreferrer',
                                  style: fileOpenButtonStyle,
                                },
                                t('assistant.openFile')
                              )
                            : null,
                        ]);
                      }),
                    ])
                  ),
          ]),
          h('div', { style: sidebarSectionStyle }, [
            h('div', { style: sidebarHeaderStyle }, [
              h('div', { style: sidebarSectionTitleStyle }, t('assistant.files')),
              h('div', { style: sidebarSectionCountStyle }, String(conversationFiles.length)),
            ]),
            conversationFiles.length === 0
              ? h('div', { style: sidebarSubtitleStyle }, t('assistant.emptyFiles'))
              : h(
                  'div',
                  { style: filePanelGridStyle },
                  conversationFiles.map(file => {
                    const sourceText =
                      file.attachment.source === 'uploaded'
                        ? t('assistant.fileSource.uploaded')
                        : t('assistant.fileSource.local');
                    const sizeText = formatFileSize(file.attachment);
                    const usageText = t('assistant.fileUsageCount', { value: file.usageCount });

                    return h('article', { key: file.id, style: fileCardStyle }, [
                      h('div', null, [
                        h(
                          'div',
                          {
                            style: fileNameStyle,
                            title: file.attachment.fileName,
                          },
                          file.attachment.fileName
                        ),
                        h('div', { style: fileBadgeRowStyle }, [
                          h(
                            'span',
                            {
                              style:
                                file.attachment.source === 'uploaded'
                                  ? fileBadgeUploadedStyle
                                  : fileBadgeStyle,
                            },
                            sourceText
                          ),
                          sizeText
                            ? h('span', { style: fileBadgeMutedStyle }, sizeText)
                            : null,
                        ]),
                      ]),
                      h('div', { style: fileUsageStyle }, usageText),
                      file.attachment.url
                        ? h('div', { style: filePanelActionsStyle }, [
                            h(
                              'a',
                              {
                                href: file.attachment.url,
                                target: '_blank',
                                rel: 'noreferrer',
                                style: fileOpenButtonStyle,
                              },
                              t('assistant.openFile')
                            ),
                            file.attachment.source === 'uploaded'
                              ? h(
                                  'button',
                                  {
                                    type: 'button',
                                    style: sidebarActionButtonStyle,
                                    disabled: state.value.pending || state.value.streaming,
                                    onClick: () => {
                                      reuseConversationAttachment(file.attachment);
                                    },
                                  },
                                  t('assistant.reuseFile')
                                )
                              : null,
                          ])
                        : file.attachment.source === 'uploaded'
                          ? h(
                              'button',
                              {
                                type: 'button',
                                style: sidebarActionButtonStyle,
                                disabled: state.value.pending || state.value.streaming,
                                onClick: () => {
                                  reuseConversationAttachment(file.attachment);
                                },
                              },
                              t('assistant.reuseFile')
                            )
                          : null,
                    ]);
                  })
                ),
          ]),
        ]),
        h('div', { style: containerStyle }, [
          h('div', { style: headerStyle }, [
            h('div', null, [
              h('h1', { style: titleStyle }, 'ChatKit Vue Demo'),
              h('p', { style: subtitleStyle }, state.value.streaming ? t('assistant.streaming') : t('assistant.ready')),
            ]),
            h(
              'button',
              {
                type: 'button',
                style: state.value.pending || state.value.streaming ? actionButtonPrimaryStyle : actionButtonStyle,
                onClick: () => {
                  if (state.value.pending || state.value.streaming) {
                    void commands.terminate({
                      conversationId: state.value.currentConversationId,
                      mode: 'terminate',
                    });
                    return;
                  }

                  void (async () => {
                    await commands.createConversation();
                    await refreshConversations();
                  })();
                },
              },
              state.value.pending || state.value.streaming ? t('assistant.stop') : t('assistant.newChat')
            ),
          ]),
          state.value.error
            ? h('div', { style: errorBannerStyle }, [
                h('div', { style: errorBannerTitleStyle }, t('assistant.error')),
                h('div', { style: errorBannerContentStyle }, resolveErrorText(state.value.error)),
              ])
            : null,
          state.value.messages.length === 0
            ? onboardingInfo.value?.greeting || onboardingInfo.value?.description || onboardingInfo.value?.prompts?.length
              ? h('div', { style: onboardingPanelStyle }, [
                  onboardingInfo.value?.greeting
                    ? h('div', { style: onboardingTitleStyle }, onboardingInfo.value.greeting)
                    : null,
                  onboardingInfo.value?.description
                    ? h('div', { style: onboardingDescriptionStyle }, onboardingInfo.value.description)
                    : null,
                  onboardingInfo.value?.prompts?.length
                    ? h(
                        'div',
                        { style: onboardingPromptListStyle },
                        onboardingInfo.value.prompts.map(prompt =>
                          h(
                            'button',
                            {
                              key: prompt.id ?? prompt.label,
                              type: 'button',
                              'aria-label': prompt.label,
                              style: onboardingPromptButtonStyle,
                              onClick: () => {
                                const nextText = prompt.message?.trim() || prompt.label.trim();
                                if (!nextText) {
                                  return;
                                }

                                void commands.send({
                                  conversationId: state.value.currentConversationId,
                                  text: nextText,
                                });
                              },
                            },
                            [
                              h('div', { style: onboardingPromptLabelStyle }, prompt.label),
                              prompt.description
                                ? h('div', { style: onboardingPromptDescriptionStyle }, prompt.description)
                                : null,
                            ]
                          )
                        )
                      )
                    : null,
                ])
              : h('div', { style: emptyStyle }, t('empty.startConversation'))
            : state.value.messages.map(message =>
                h('div', { key: message.id, style: bubbleWrapStyle }, [
                  message.applicationContext?.title
                    ? h(
                        'div',
                        {
                          style: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                            borderRadius: '999px',
                            border: '1px solid rgba(59, 130, 246, 0.24)',
                            background: 'rgba(219, 234, 254, 0.72)',
                            color: '#111827',
                            padding: '6px 10px',
                            fontSize: '12px',
                            fontWeight: 700,
                          },
                        },
                        `${t('assistant.context')}: ${message.applicationContext.title}`
                      )
                    : null,
                  message.metadata?.thinking?.trim()
                    ? h('div', {
                        style: toolCallsWrapStyle,
                        innerHTML: renderThinkingHtml(message.metadata.thinking, t),
                      })
                    : null,
                  message.metadata?.toolCalls?.length
                    ? h('div', {
                        style: toolCallsWrapStyle,
                        innerHTML: renderToolCallsHtml(message.metadata.toolCalls, t),
                      })
                    : null,
                  message.metadata?.attachments?.length
                    ? h('div', {
                        style: toolCallsWrapStyle,
                        innerHTML: renderAttachmentsHtml(message.metadata.attachments),
                      })
                    : null,
                  message.content
                    ? h('div', {
                        style: bubbleStyle,
                        innerHTML: renderMarkdown(message.content),
                      })
                    : null,
                  renderInterruptPanel(message, message.id === latestAssistantMessageId),
                  renderRelatedQuestionsHtml(message, message.id === latestAssistantMessageId)
                    ? h('div', {
                        style: toolCallsWrapStyle,
                        innerHTML: renderRelatedQuestionsHtml(message, message.id === latestAssistantMessageId),
                        onClick: (event: Event) => {
                          const target = event.target as HTMLElement | null;
                          const button = target?.closest<HTMLButtonElement>('[data-related-question]');
                          const question = button?.dataset.relatedQuestion?.trim();
                          if (!question) {
                            return;
                          }

                          void submitRelatedQuestion(question);
                        },
                      })
                    : null,
                  h('div', { style: metaStyle }, resolveStatusText(message, t)),
                  renderMetricsHtml(message, t)
                    ? h('div', {
                        style: metricsStyle,
                        innerHTML: renderMetricsHtml(message, t),
                      })
                    : null,
                  message.role === 'assistant'
                    ? h('div', { style: feedbackRowStyle }, [
                        h(
                          'button',
                          {
                            type: 'button',
                            style:
                              message.metadata?.feedback === 'upvote'
                                ? feedbackButtonActiveStyle
                                : feedbackButtonStyle,
                            disabled: state.value.pending || state.value.streaming,
                            onClick: () => {
                              void submitFeedback(message.id, 'upvote');
                            },
                          },
                          t('message.feedback.upvote')
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            style:
                              message.metadata?.feedback === 'downvote'
                                ? feedbackButtonActiveStyle
                                : feedbackButtonStyle,
                            disabled: state.value.pending || state.value.streaming,
                            onClick: () => {
                              void submitFeedback(message.id, 'downvote');
                            },
                          },
                          t('message.feedback.downvote')
                        ),
                      ])
                    : null,
                ])
              ),
          h('div', { style: controlsRowStyle }, [
            h(
              'input',
              {
                ref: (element: Element | null) => {
                  fileInputElement = element as HTMLInputElement | null;
                },
                type: 'file',
                multiple: true,
                hidden: true,
                onChange: (event: Event) => {
                  const target = event.target as HTMLInputElement;
                  const files = target.files ? Array.from(target.files) : [];
                  if (files.length === 0) {
                    return;
                  }

                  attachments.value = [
                    ...attachments.value,
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
                },
              },
              null
            ),
            h(
              'button',
              {
                type: 'button',
                style: actionButtonStyle,
                disabled: state.value.pending || state.value.streaming,
                onClick: () => fileInputElement?.click(),
              },
              t('sender.attach')
            ),
            ...reusedAttachments.value.map((attachment, index) =>
              h(
                'button',
                {
                  key: `reused-${attachment.fileName}-${index}`,
                  type: 'button',
                  style: attachmentChipReusedStyle,
                  title: t('sender.removeAttachment'),
                  disabled: state.value.pending || state.value.streaming,
                  onClick: () => {
                    reusedAttachments.value = reusedAttachments.value.filter((_, attachmentIndex) => attachmentIndex !== index);
                  },
                },
                attachment.fileName
              )
            ),
            ...attachments.value.map((attachment, index) =>
              h(
                'button',
                {
                  key: `${attachment.fileName}-${index}`,
                  type: 'button',
                  style: attachmentChipStyle,
                  title: t('sender.removeAttachment'),
                  disabled: state.value.pending || state.value.streaming,
                  onClick: () => {
                    attachments.value = attachments.value.filter((_, attachmentIndex) => attachmentIndex !== index);
                  },
                },
                attachment.fileName
              )
            ),
            h(
              'button',
              {
                type: 'button',
                style: deepThink.value ? actionButtonPrimaryStyle : actionButtonStyle,
                disabled: state.value.pending || state.value.streaming,
                onClick: () => {
                  deepThink.value = !deepThink.value;
                },
              },
              t('sender.deepThink')
            ),
            ...demoApplicationContexts.map(context =>
              h(
                'button',
                {
                  key: `context-${context.title}`,
                  type: 'button',
                  style:
                    state.value.applicationContext?.title === context.title
                      ? actionButtonPrimaryStyle
                      : actionButtonStyle,
                  disabled: state.value.pending || state.value.streaming,
                  onClick: () => {
                    commands.injectApplicationContext(context);
                  },
                },
                context.title
              )
            ),
            h(
              'button',
              {
                type: 'button',
                style: {
                  ...actionButtonStyle,
                  border: '1px solid rgba(239, 68, 68, 0.24)',
                  background: 'rgba(254, 242, 242, 0.92)',
                  color: '#991b1b',
                  fontWeight: 600,
                },
                disabled: state.value.pending || state.value.streaming,
                onClick: () => {
                  commands.removeApplicationContext();
                },
              },
              'Clear Context'
            ),
          ]),
          state.value.applicationContext?.title
            ? h(
                'div',
                {
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '999px',
                    border: '1px solid rgba(59, 130, 246, 0.24)',
                    background: 'rgba(219, 234, 254, 0.72)',
                    color: '#111827',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    maxWidth: '100%',
                  },
                },
                `${t('assistant.context')}: ${state.value.applicationContext.title}`
              )
            : null,
          h('div', { style: composerStyle }, [
            h('textarea', {
              value: draft.value,
              rows: 4,
              disabled: state.value.pending || state.value.streaming,
              placeholder: t('sender.placeholder'),
              style: textareaStyle,
              onInput: (event: Event) => {
                draft.value = (event.target as HTMLTextAreaElement).value;
              },
            }),
            h(
              'button',
              {
                type: 'button',
                style: sendButtonStyle,
                disabled: state.value.pending || state.value.streaming,
                onClick: () => {
                  void submit();
                },
              },
              t('sender.send')
            ),
          ]),
        ]),
      ]);
    };
  },
});

const layoutStyle = {
  maxWidth: '1240px',
  margin: '40px auto',
  display: 'grid',
  gap: '20px',
  gridTemplateColumns: 'minmax(240px, 280px) minmax(0, 1fr)',
  alignItems: 'start',
};

const sidebarStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '20px',
  borderRadius: '20px',
  background: 'rgba(17, 24, 39, 0.92)',
  color: '#f9fafb',
  boxShadow: '0 16px 48px rgba(15, 23, 42, 0.18)',
};

const sidebarHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
};

const sidebarSubtitleStyle = {
  fontSize: '13px',
  color: 'rgba(255,255,255,0.72)',
  marginBottom: '8px',
};

const sidebarRefreshButtonStyle = {
  borderRadius: '999px',
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.08)',
  color: '#f8fafc',
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: '12px',
};

const sidebarSearchInputStyle = {
  width: '100%',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.08)',
  color: '#f8fafc',
  padding: '10px 12px',
  outline: 'none',
};

const sidebarLoadMoreButtonStyle = {
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.08)',
  color: '#f8fafc',
  padding: '10px 12px',
  cursor: 'pointer',
  fontSize: '13px',
};

const sidebarSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const sidebarSectionTitleStyle = {
  fontSize: '18px',
  fontWeight: 700,
};

const sidebarSectionCountStyle = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.72)',
};

const sidebarSubsectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const sidebarSubsectionTitleStyle = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#f8fafc',
};

const sidebarSubsectionDescriptionStyle = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.72)',
  lineHeight: 1.5,
};

const sidebarItemStyle = {
  borderRadius: '14px',
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.06)',
  padding: '8px',
  color: '#f8fafc',
};

const sidebarItemActiveStyle = {
  ...sidebarItemStyle,
  border: '1px solid transparent',
  background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.28), rgba(255,255,255,0.08))',
};

const sidebarSelectButtonStyle = {
  width: '100%',
  textAlign: 'left',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  padding: '4px 6px 10px',
  cursor: 'pointer',
};

const sidebarActionsStyle = {
  display: 'flex',
  gap: '8px',
  padding: '0 6px 4px',
};

const sidebarActionButtonStyle = {
  borderRadius: '999px',
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.12)',
  color: '#f8fafc',
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: '12px',
};

const sidebarDeleteButtonStyle = {
  ...sidebarActionButtonStyle,
  border: '1px solid rgba(248,113,113,0.24)',
  background: 'rgba(127,29,29,0.24)',
  color: '#fecaca',
};

const filePanelGridStyle = {
  display: 'grid',
  gap: '10px',
};

const fileCardStyle = {
  borderRadius: '14px',
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.06)',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const fileNameStyle = {
  fontWeight: 700,
  color: '#f8fafc',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const fileBadgeRowStyle = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  marginTop: '8px',
};

const fileBadgeStyle = {
  borderRadius: '999px',
  padding: '4px 8px',
  fontSize: '12px',
  background: 'rgba(226, 232, 240, 0.18)',
  color: '#e2e8f0',
};

const fileBadgeUploadedStyle = {
  ...fileBadgeStyle,
  background: 'rgba(219, 234, 254, 0.2)',
  color: '#bfdbfe',
};

const fileBadgeMutedStyle = {
  borderRadius: '999px',
  padding: '4px 8px',
  fontSize: '12px',
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.74)',
};

const fileUsageStyle = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.72)',
};

const contextValueStyle = {
  marginTop: '8px',
  fontSize: '20px',
  fontWeight: 700,
  color: '#bfdbfe',
};

const contextDescriptionStyle = {
  fontSize: '13px',
  lineHeight: 1.6,
  color: 'rgba(255,255,255,0.82)',
};

const contextMetadataStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const contextMetadataRowStyle = {
  display: 'flex',
  gap: '8px',
  fontSize: '12px',
  color: 'rgba(255,255,255,0.72)',
};

const contextMetadataKeyStyle = {
  minWidth: '72px',
  fontWeight: 700,
  color: '#f8fafc',
};

const contextMetadataValueStyle = {
  flex: 1,
  overflowWrap: 'anywhere',
};

const fileOpenButtonStyle = {
  alignSelf: 'flex-start',
  textDecoration: 'none',
  borderRadius: '999px',
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.08)',
  padding: '6px 10px',
  fontSize: '12px',
  color: '#f8fafc',
};

const filePanelActionsStyle = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const containerStyle = {
  padding: '24px',
  borderRadius: '20px',
  background: '#ffffff',
  boxShadow: '0 16px 48px rgba(15, 23, 42, 0.08)',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  marginBottom: '20px',
};

const titleStyle = {
  marginTop: '0',
  marginBottom: '6px',
};

const subtitleStyle = {
  color: '#6b7280',
  margin: 0,
};

const actionButtonStyle = {
  borderRadius: '999px',
  border: '1px solid #d7deeb',
  background: '#ffffff',
  padding: '10px 14px',
  cursor: 'pointer',
  color: '#111827',
};

const actionButtonPrimaryStyle = {
  ...actionButtonStyle,
  background: '#111827',
  color: '#ffffff',
  fontWeight: 700,
};

const bubbleWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  marginTop: '12px',
};

const toolCallsWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const bubbleStyle = {
  padding: '12px 14px',
  borderRadius: '14px',
  background: '#f5f7fb',
  lineHeight: 1.6,
};

const metaStyle = {
  fontSize: '12px',
  color: '#6b7280',
};

const metricsStyle = {
  fontSize: '12px',
  color: 'rgba(15, 23, 42, 0.65)',
};

const feedbackRowStyle = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const feedbackButtonStyle = {
  borderRadius: '999px',
  border: '1px solid #d7deeb',
  background: '#ffffff',
  padding: '8px 12px',
  cursor: 'pointer',
  color: '#111827',
  fontSize: '12px',
};

const feedbackButtonActiveStyle = {
  ...feedbackButtonStyle,
  border: '1px solid #111827',
  background: '#111827',
  color: '#ffffff',
  fontWeight: 700,
};

const emptyStyle = {
  padding: '32px 16px',
  textAlign: 'center',
  color: '#6b7280',
  border: '1px dashed #d7deeb',
  borderRadius: '18px',
  background: 'rgba(245,247,251,0.6)',
};

const controlsRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  alignItems: 'center',
  marginTop: '16px',
};

const attachmentChipStyle = {
  borderRadius: '999px',
  border: '1px solid #d7deeb',
  background: 'rgba(226, 232, 240, 0.7)',
  padding: '8px 12px',
  cursor: 'pointer',
  maxWidth: '220px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const attachmentChipReusedStyle = {
  ...attachmentChipStyle,
  background: 'rgba(219, 234, 254, 0.72)',
};

const composerStyle = {
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-end',
  marginTop: '12px',
};

const textareaStyle = {
  flex: 1,
  resize: 'vertical',
  minHeight: '96px',
  padding: '14px 16px',
  borderRadius: '18px',
  border: '1px solid #d7deeb',
  background: '#ffffff',
  color: '#111827',
  font: 'inherit',
  outline: 'none',
};

const sendButtonStyle = {
  border: 'none',
  borderRadius: '999px',
  padding: '12px 18px',
  background: '#111827',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 600,
};

const errorBannerStyle = {
  borderRadius: '16px',
  border: '1px solid rgba(248, 113, 113, 0.25)',
  background: 'rgba(254, 226, 226, 0.65)',
  color: '#7f1d1d',
  padding: '12px 14px',
  marginBottom: '16px',
};

const errorBannerTitleStyle = {
  fontWeight: 700,
  marginBottom: '6px',
};

const errorBannerContentStyle = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontSize: '13px',
};

const onboardingPanelStyle = {
  borderRadius: '20px',
  border: '1px solid #d7deeb',
  background:
    'radial-gradient(circle at top right, rgba(191, 219, 254, 0.45), transparent 38%), linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.96) 100%)',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
};

const onboardingTitleStyle = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#111827',
};

const onboardingDescriptionStyle = {
  color: '#6b7280',
  lineHeight: 1.6,
};

const onboardingPromptListStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
};

const onboardingPromptButtonStyle = {
  textAlign: 'left',
  borderRadius: '18px',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  background: '#ffffff',
  padding: '12px 14px',
  cursor: 'pointer',
  color: '#111827',
  minWidth: '220px',
  maxWidth: '320px',
  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
};

const onboardingPromptLabelStyle = {
  fontWeight: 600,
};

const onboardingPromptDescriptionStyle = {
  marginTop: '6px',
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: 1.5,
};

const App = defineComponent({
  name: 'VueDemoApp',
  setup() {
    return () =>
      h(
        'div',
        { style: { minHeight: '100vh', background: '#edf2ff', padding: '24px' } },
        h(
          ChatKitProvider,
          {
            provider,
            providerName: 'dip',
            hostAdapter,
            locale: 'zh-CN',
          },
          { default: () => h(Consumer) }
        )
      );
  },
});

createApp(App).mount('#app');

