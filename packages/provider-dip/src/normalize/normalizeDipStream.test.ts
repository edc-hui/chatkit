import { describe, expect, it } from 'vitest';

import { normalizeDipStream } from './normalizeDipStream.js';

function createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield item;
      }
    },
  };
}

describe('normalizeDipStream', () => {
  it('normalizes full snapshot chunks into provider events', async () => {
    const events = [];

    for await (const event of normalizeDipStream(
      createAsyncIterable([
        {
          assistant_message_id: 'assistant-1',
          message: {
            content: {
              final_answer: {
                answer: {
                  text: 'Hello',
                },
              },
            },
          },
        },
      ]),
      'conversation-1'
    )) {
      events.push(event);
    }

    expect(events[0]).toEqual({ type: 'stream.started', conversationId: 'conversation-1' });
    expect(events[1]).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'assistant-1',
        content: 'Hello',
      },
    });
    expect(events[2]).toEqual({ type: 'stream.completed', conversationId: 'conversation-1' });
  });

  it('assembles incremental chunks before emitting message snapshots', async () => {
    const events: Array<Record<string, unknown>> = [];

    for await (const event of normalizeDipStream(
      createAsyncIterable([
        { seq_id: 1, key: ['assistant_message_id'], action: 'upsert', content: 'assistant-2' },
        { seq_id: 2, key: ['message', 'content', 'final_answer', 'answer', 'text'], action: 'upsert', content: 'Hel' },
        { seq_id: 3, key: ['message', 'content', 'final_answer', 'answer', 'text'], action: 'append', content: 'lo' },
        { seq_id: 4, key: [], action: 'end' },
      ]),
      'conversation-2'
    )) {
      events.push(event);
    }

    expect(events).toContainEqual({ type: 'stream.started', conversationId: 'conversation-2' });
    const finalSnapshot = [...events].reverse().find(event => event.type === 'message.snapshot');

    expect(finalSnapshot).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'assistant-2',
        role: 'assistant',
        content: 'Hello',
        raw: {
          assistant_message_id: 'assistant-2',
          message: {
            content: {
              final_answer: {
                answer: {
                  text: 'Hello',
                },
              },
            },
          },
        },
        metadata: {
          responseMessageIds: {
            assistantMessageId: 'assistant-2',
          },
        },
      },
    });
  });

  it('extracts toolCalls metadata from middle_answer progress', async () => {
    const events = [];

    for await (const event of normalizeDipStream(
      createAsyncIterable([
        {
          assistant_message_id: 'assistant-3',
          message: {
            content: {
              final_answer: {
                answer: {
                  text: 'Done',
                },
              },
              middle_answer: {
                progress: [
                  {
                    skill_info: {
                      name: 'execute_code',
                      args: [
                        {
                          name: 'code',
                          value: 'print("hello")',
                        },
                      ],
                    },
                    answer: {
                      result: {
                        result: {
                          stdout: 'hello',
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
                ],
              },
            },
          },
        },
      ]),
      'conversation-3'
    )) {
      events.push(event);
    }

    expect(events[1]).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'assistant-3',
        metadata: {
          toolCalls: [
            {
              name: 'execute_code',
              title: 'Code Execution',
              input: 'print("hello")',
              output: {
                stdout: 'hello',
              },
            },
            {
              name: 'execute_command',
              title: 'Execute Command',
              input: 'ls -la',
              output: {
                action: 'execute_command',
                actionMessage: 'Directory listing ready',
                result: {
                  files: ['README.md', 'src'],
                },
              },
            },
          ],
        },
      },
    });
  });

  it('extracts doc_qa and text2ngql toolCalls from middle_answer progress', async () => {
    const events = [];

    for await (const event of normalizeDipStream(
      createAsyncIterable([
        {
          assistant_message_id: 'assistant-4',
          message: {
            content: {
              final_answer: {
                answer: {
                  text: 'Tool-rich response',
                },
              },
              middle_answer: {
                progress: [
                  {
                    skill_info: {
                      name: 'doc_qa',
                      args: [
                        {
                          name: 'query',
                          value: 'What is ChatKit v2?',
                        },
                      ],
                    },
                    answer: {
                      result: {
                        text: '<p>ChatKit v2 is framework-free at the core.</p>',
                        cites: [
                          {
                            title: 'Architecture Doc',
                            quote: 'Core is framework-free',
                            doc_id: 'source-1/doc-1',
                          },
                        ],
                        data_source: {
                          doc: [
                            {
                              ds_id: 'datasource-1',
                              fields: [
                                {
                                  source: 'source-1',
                                },
                              ],
                            },
                          ],
                        },
                      },
                    },
                  },
                  {
                    skill_info: {
                      name: 'text2ngql',
                      args: [
                        {
                          name: 'query',
                          value: 'Find related agents',
                        },
                      ],
                    },
                    answer: {
                      result: {
                        sql: 'MATCH (n)-[:RELATES_TO]->(m) RETURN n.name, m.name',
                        data: {
                          'n.name': ['Agent A'],
                          'm.name': ['Agent B'],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      ]),
      'conversation-4'
    )) {
      events.push(event);
    }

    expect(events[1]).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'assistant-4',
        metadata: {
          toolCalls: [
            {
              name: 'doc_qa',
              input: 'What is ChatKit v2?',
              output: {
                htmlText: '<p>ChatKit v2 is framework-free at the core.</p>',
                cites: [
                  {
                    title: 'Architecture Doc',
                    ds_id: 'datasource-1',
                  },
                ],
              },
            },
            {
              name: 'text2ngql',
              input: 'Find related agents',
              output: {
                sql: 'MATCH (n)-[:RELATES_TO]->(m) RETURN n.name, m.name',
                tableColumns: ['name'],
                tableData: [
                  {
                    name: 'Agent B',
                  },
                ],
              },
            },
          ],
        },
      },
    });
  });

  it('extracts DipChat interrupt metadata from the assistant message ext payload', async () => {
    const events = [];

    for await (const event of normalizeDipStream(
      createAsyncIterable([
        {
          user_message_id: 'user-interrupt-1',
          assistant_message_id: 'assistant-interrupt-1',
          message: {
            role: 'assistant',
            ext: {
              interrupt_info: {
                handle: {
                  run_id: 'run-1',
                },
                data: {
                  tool_name: 'execute_command',
                  tool_description: 'Execute shell command',
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
                    confirmation_message: 'Please confirm the command before continuing.',
                  },
                },
              },
            },
            content: {
              final_answer: {
                answer: {
                  text: 'Command interrupted',
                },
              },
            },
          },
        },
      ]),
      'conversation-interrupt-1'
    )) {
      events.push(event);
    }

    expect(events[1]).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'assistant-interrupt-1',
        content: 'Command interrupted',
        metadata: {
          responseMessageIds: {
            userMessageId: 'user-interrupt-1',
            assistantMessageId: 'assistant-interrupt-1',
          },
          interrupt: {
            handle: {
              run_id: 'run-1',
            },
            data: {
              tool_name: 'execute_command',
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
                confirmation_message: 'Please confirm the command before continuing.',
              },
            },
          },
        },
      },
    });
  });

  it('extracts text2sql and json2plot toolCalls from middle_answer progress', async () => {
    const events = [];

    for await (const event of normalizeDipStream(
      createAsyncIterable([
        {
          assistant_message_id: 'assistant-4b',
          message: {
            content: {
              final_answer: {
                answer: {
                  text: 'Chart and SQL response',
                },
              },
              middle_answer: {
                progress: [
                  {
                    skill_info: {
                      name: 'text2sql',
                      args: [
                        {
                          name: 'input',
                          value: 'Show orders by day',
                        },
                      ],
                    },
                    answer: {
                      result: {
                        title: 'Orders by day',
                        sql: 'SELECT day, orders FROM daily_orders',
                        data: [
                          {
                            day: '2026-03-01',
                            orders: 32,
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
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      ]),
      'conversation-4b'
    )) {
      events.push(event);
    }

    expect(events[1]).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'assistant-4b',
        metadata: {
          toolCalls: [
            {
              name: 'text2sql',
              title: 'Orders by day',
              input: 'Show orders by day',
              output: {
                sql: 'SELECT day, orders FROM daily_orders',
                tableColumns: ['day', 'orders'],
                tableData: [
                  {
                    day: '2026-03-01',
                    orders: 32,
                  },
                ],
              },
            },
            {
              name: 'json2plot',
              title: 'Orders trend',
              input: 'Orders trend',
              output: {
                chartType: 'Line',
                tableColumns: ['day', 'orders', 'metric'],
                tableData: [
                  {
                    day: '2026-03-01',
                    orders: 32,
                    metric: 'orders',
                  },
                ],
              },
            },
          ],
        },
      },
    });
  });

  it('extracts text2metric toolCalls from middle_answer progress', async () => {
    const events = [];

    for await (const event of normalizeDipStream(
      createAsyncIterable([
        {
          assistant_message_id: 'assistant-4c',
          message: {
            content: {
              final_answer: {
                answer: {
                  text: 'Metric response',
                },
              },
              middle_answer: {
                progress: [
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
                ],
              },
            },
          },
        },
      ]),
      'conversation-4c'
    )) {
      events.push(event);
    }

    expect(events[1]).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'assistant-4c',
        metadata: {
          toolCalls: [
            {
              name: 'text2metric',
              title: 'Key metrics',
              output: {
                tableColumns: ['metric', 'value'],
                tableData: [
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
          ],
        },
      },
    });
  });

  it('extracts web_processor toolCalls from middle_answer progress', async () => {
    const events = [];

    for await (const event of normalizeDipStream(
      createAsyncIterable([
        {
          assistant_message_id: 'assistant-4d',
          message: {
            content: {
              final_answer: {
                answer: {
                  text: 'Web preview ready',
                },
              },
              middle_answer: {
                progress: [
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
                ],
              },
            },
          },
        },
      ]),
      'conversation-4d'
    )) {
      events.push(event);
    }

    expect(events[1]).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'assistant-4d',
        metadata: {
          toolCalls: [
            {
              name: 'web_processor',
              title: 'Orders dashboard',
              output: {
                title: 'Orders dashboard',
                url: 'https://example.com/orders/dashboard',
                size: [1280, 720],
              },
            },
          ],
        },
      },
    });
  });

  it('extracts llm thinking and timing metrics from dip payload ext data', async () => {
    const events = [];

    for await (const event of normalizeDipStream(
      createAsyncIterable([
        {
          user_message_id: 'user-5',
          assistant_message_id: 'assistant-5',
          message: {
            ext: {
              total_time: 4.32,
              total_tokens: 256,
              ttft: 320,
            },
            content: {
              final_answer: {
                answer: {
                  text: 'Final answer',
                },
              },
              middle_answer: {
                progress: [
                  {
                    stage: 'llm',
                    status: 'completed',
                    think: 'First inspect the provider contract, then align the UI adapters.',
                  },
                ],
              },
            },
          },
        },
      ]),
      'conversation-5'
    )) {
      events.push(event);
    }

    expect(events[1]).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'assistant-5',
          metadata: {
            responseMessageIds: {
              userMessageId: 'user-5',
              assistantMessageId: 'assistant-5',
            },
            thinking: 'First inspect the provider contract, then align the UI adapters.',
            metrics: {
              totalTimeSeconds: 4.32,
            totalTokens: 256,
            ttftMs: 320,
          },
        },
      },
    });
  });

  it('extracts related questions from dip payload ext data', async () => {
    const events = [];

    for await (const event of normalizeDipStream(
      createAsyncIterable([
        {
          assistant_message_id: 'assistant-5b',
          ext: {
            related_queries: ['How does the engine consume provider events?', 'How is React wired to the core?'],
          },
          message: {
            content: {
              final_answer: {
                answer: {
                  text: 'Here is the latest answer.',
                },
              },
            },
          },
        },
      ]),
      'conversation-5b'
    )) {
      events.push(event);
    }

    expect(events[1]).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'assistant-5b',
        metadata: {
          relatedQuestions: ['How does the engine consume provider events?', 'How is React wired to the core?'],
        },
      },
    });
  });

  it('extracts af_sailor, datasource_filter, and datasource_rerank toolCalls', async () => {
    const events = [];

    for await (const event of normalizeDipStream(
      createAsyncIterable([
        {
          assistant_message_id: 'assistant-6',
          message: {
            content: {
              final_answer: {
                answer: {
                  text: 'Datasource tools ready',
                },
              },
              middle_answer: {
                progress: [
                  {
                    skill_info: {
                      name: 'af_sailor',
                      args: [
                        {
                          name: 'query',
                          value: '查找指标',
                        },
                      ],
                    },
                    answer: {
                      result: {
                        text: ['Metric A', 'Metric B'],
                        cites: [
                          {
                            title: 'Metric A',
                            owner: 'Ops',
                          },
                        ],
                        result_cache_key: 'af-cache-1',
                      },
                    },
                  },
                  {
                    skill_info: {
                      name: 'datasource_filter',
                    },
                    answer: {
                      result: {
                        result: [
                          {
                            id: 'ds-1',
                            name: 'Orders',
                          },
                        ],
                        result_cache_key: 'filter-cache-1',
                      },
                    },
                  },
                  {
                    skill_info: {
                      name: 'datasource_rerank',
                    },
                    answer: {
                      result: {
                        result: [
                          {
                            id: 'ds-2',
                            name: 'Payments',
                          },
                        ],
                        result_cache_key: 'rerank-cache-1',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      ]),
      'conversation-6'
    )) {
      events.push(event);
    }

    expect(events[1]).toMatchObject({
      type: 'message.snapshot',
      message: {
        id: 'assistant-6',
        metadata: {
          toolCalls: [
            {
              name: 'af_sailor',
              input: '查找指标',
              output: {
                data: [
                  {
                    title: 'Metric A',
                    owner: 'Ops',
                  },
                ],
                resultCacheKey: 'af-cache-1',
              },
            },
            {
              name: 'datasource_filter',
              output: {
                data: [
                  {
                    id: 'ds-1',
                    name: 'Orders',
                  },
                ],
                resultCacheKey: 'filter-cache-1',
              },
            },
            {
              name: 'datasource_rerank',
              output: {
                data: [
                  {
                    id: 'ds-2',
                    name: 'Payments',
                  },
                ],
                resultCacheKey: 'rerank-cache-1',
              },
            },
          ],
        },
      },
    });
  });
});
