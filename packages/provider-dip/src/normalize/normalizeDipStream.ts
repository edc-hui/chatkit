import type { ChatInterruptInfo, ChatMessageMetrics, ChatToolCall, ProviderEvent, ProviderMessage } from '@kweaver-ai/chatkit-core';

import { IncrementalAssembler } from '../stream/IncrementalAssembler.js';
import type { IncrementalPatchFrame } from '../stream/types.js';

interface DipSkillInfoArg {
  name?: string;
  type?: string;
  value?: string;
}

interface DipProgressPayload {
  stage?: string;
  status?: string;
  think?: string;
  answer?: unknown;
  skill_info?: {
    name?: string;
    args?: DipSkillInfoArg[];
  };
  start_time?: number;
  end_time?: number;
  token_usage?: {
    total_tokens?: number;
  };
}

interface DipMessagePayload {
  conversation_id?: string;
  user_message_id?: string;
  assistant_message_id?: string;
  ext?: {
    ttft?: number | string;
    total_tokens?: number | string;
    total_time?: number | string;
    related_queries?: string[];
    interrupt_info?: ChatInterruptInfo;
  };
  message?: {
    role?: 'assistant' | 'user' | 'system';
    ext?: {
      ttft?: number | string;
      total_tokens?: number | string;
      total_time?: number | string;
      related_queries?: string[];
      interrupt_info?: ChatInterruptInfo;
    };
    content?: {
      text?: string;
      middle_answer?: {
        progress?: DipProgressPayload[];
      };
      final_answer?: {
        answer?: {
          text?: string;
        };
      };
      answer?: {
        text?: string;
      };
    };
  };
}

export type DipRawStreamChunk = string | Record<string, unknown>;

function isIncrementalFrame(value: unknown): value is {
  seq_id: number;
  key: string[];
  content?: unknown;
  action: IncrementalPatchFrame['action'];
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { seq_id?: unknown }).seq_id === 'number' &&
    Array.isArray((value as { key?: unknown }).key) &&
    typeof (value as { action?: unknown }).action === 'string'
  );
}

function parseChunk(chunk: DipRawStreamChunk): Record<string, unknown> {
  if (typeof chunk === 'string') {
    return JSON.parse(chunk) as Record<string, unknown>;
  }

  return chunk;
}

function extractAssistantText(payload: DipMessagePayload): string {
  return (
    payload.message?.content?.final_answer?.answer?.text ??
    payload.message?.content?.answer?.text ??
    payload.message?.content?.text ??
    ''
  );
}

function isPlainEmptyObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0;
}

function resolveFinalToolResult(answer: any): any {
  if (answer?.full_result !== undefined && !isPlainEmptyObject(answer.full_result)) {
    return answer.full_result;
  }

  if (answer?.result !== undefined) {
    return answer.result;
  }

  return answer;
}

function findArgValue(args: DipSkillInfoArg[] | undefined, ...names: string[]): string {
  const matched = args?.find(arg => arg.name && names.includes(arg.name));
  return matched?.value ?? '';
}

function getTableColumnsByRows(rows: Array<Record<string, unknown>>): string[] {
  const keys = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keys.add(key);
    }
  }

  return Array.from(keys);
}

function ngqlDataToTableData(data: unknown): { tableColumns: string[]; tableData: Array<Record<string, unknown>> } {
  const tableColumns: string[] = [];
  const tableData: Array<Record<string, unknown>> = [];

  if (Array.isArray(data)) {
    const normalizedRows = data.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
    return {
      tableColumns: getTableColumnsByRows(normalizedRows),
      tableData: normalizedRows,
    };
  }

  if (typeof data !== 'object' || data === null) {
    return { tableColumns, tableData };
  }

  for (const [rawKey, value] of Object.entries(data)) {
    if (!Array.isArray(value)) {
      continue;
    }

    const key = rawKey.split('.').pop() ?? rawKey;

    if (value.length === 0) {
      continue;
    }

    if (typeof value[0] === 'object' && value[0] !== null) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          tableData.push(item as Record<string, unknown>);
        }
      }
      continue;
    }

    if (!tableColumns.includes(key)) {
      tableColumns.push(key);
    }

    value.forEach((item, index) => {
      if (!tableData[index]) {
        tableData[index] = {};
      }
      tableData[index][key] = item;
    });
  }

  return {
    tableColumns: tableColumns.length > 0 ? tableColumns : getTableColumnsByRows(tableData),
    tableData,
  };
}

function extractSearchToolCall(answer: any, skillName: string): ChatToolCall | null {
  const toolCalls = answer?.choices?.[0]?.message?.tool_calls;
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    return null;
  }

  const typedSearchIntents = toolCalls.filter((item: any) => item?.type === 'search_intent');

  if (typedSearchIntents.length > 0) {
    const queries: string[] = [];
    const results: Array<{ title?: string; link?: string; content?: string }> = [];

    for (const intent of typedSearchIntents) {
      const searchIntentEntries = Array.isArray(intent?.search_intent) ? intent.search_intent : [];
      for (const entry of searchIntentEntries) {
        const query = entry?.query ?? entry?.keywords;
        if (query) {
          queries.push(query);
        }
      }

      const matchedResult = toolCalls.find((item: any) => item?.id === intent?.id && item?.type === 'search_result');
      const searchResults = Array.isArray(matchedResult?.search_result) ? matchedResult.search_result : [];
      for (const result of searchResults) {
        results.push({
          title: result?.title ?? '',
          link: result?.link ?? '',
          content: result?.content ?? '',
        });
      }
    }

    if (results.length === 0) {
      return null;
    }

    return {
      name: skillName,
      title: skillName === 'online_search_cite_tool' ? 'Online Search' : 'Web Search',
      input: queries.join(' / '),
      output: { results },
    };
  }

  const searchIntentObj = toolCalls[0];
  const searchIntentArray = searchIntentObj?.search_intent;
  const searchIntent = Array.isArray(searchIntentArray) ? searchIntentArray[0] : searchIntentArray;
  const query = searchIntent?.query ?? searchIntent?.keywords ?? '';
  const searchResultObj = toolCalls[1];
  const searchResultArray = searchResultObj?.search_result;

  if (!Array.isArray(searchResultArray)) {
    return null;
  }

  return {
    name: skillName,
    title: skillName === 'online_search_cite_tool' ? 'Online Search' : 'Web Search',
    input: query,
    output: {
      results: searchResultArray.map((item: any) => ({
        title: item?.title ?? '',
        link: item?.link ?? '',
        content: item?.content ?? '',
      })),
    },
  };
}

function extractOnlineSearchCiteToolCall(args: DipSkillInfoArg[] | undefined, answer: any): ChatToolCall | null {
  const references = Array.isArray(answer?.references) ? answer.references : [];
  if (references.length === 0) {
    return null;
  }

  return {
    name: 'online_search_cite_tool',
    title: 'Online Search',
    input: findArgValue(args, 'query', 'input'),
    output: {
      results: references.map((reference: any) => ({
        title: reference?.title ?? reference?.name ?? '',
        link: reference?.link ?? reference?.url ?? '',
        content: reference?.content ?? reference?.snippet ?? reference?.text ?? '',
      })),
    },
  };
}

const sandboxToolTitles: Record<string, string> = {
  execute_code: 'Code Execution',
  create_file: 'Create File',
  read_file: 'Read File',
  list_files: 'List Files',
  execute_command: 'Execute Command',
  upload_file: 'Upload File',
  download_file: 'Download File',
  get_status: 'Get Sandbox Status',
  close_sandbox: 'Close Sandbox',
};

function extractSandboxToolCall(skillName: string, args: DipSkillInfoArg[] | undefined, answer: any): ChatToolCall | null {
  const finalResult = resolveFinalToolResult(answer);
  const primaryInput =
    findArgValue(args, 'code', 'script', 'command', 'content', 'query', 'filename', 'filepath', 'path') ||
    findArgValue(args, 'input');
  const argsObject = args?.reduce<Record<string, string>>((accumulator, arg, index) => {
    accumulator[arg.name ?? `arg_${index}`] = arg.value ?? '';
    return accumulator;
  }, {});

  if (skillName === 'execute_code') {
    const stdout =
      finalResult?.result?.stdout ??
      finalResult?.stdout ??
      answer?.result?.result?.stdout ??
      answer?.result?.stdout ??
      '';

    if (!primaryInput && !stdout) {
      return null;
    }

    return {
      name: skillName,
      title: sandboxToolTitles[skillName],
      input: primaryInput || argsObject,
      output: {
        stdout: stdout || 'Execution completed',
      },
    };
  }

  const actionMessage = finalResult?.message ?? finalResult?.title ?? answer?.message ?? '';
  const result = finalResult?.result ?? finalResult?.content ?? finalResult?.data ?? finalResult?.files ?? finalResult;

  if (!primaryInput && !actionMessage && (result == null || isPlainEmptyObject(result))) {
    return null;
  }

  return {
    name: skillName,
    title: sandboxToolTitles[skillName] ?? skillName,
    input: primaryInput || argsObject,
    output: {
      action: finalResult?.action ?? skillName,
      actionMessage,
      result,
    },
  };
}

function extractNgqlToolCall(args: DipSkillInfoArg[] | undefined, answer: any): ChatToolCall | null {
  const finalResult = resolveFinalToolResult(answer);
  if (!finalResult || typeof finalResult !== 'object') {
    return null;
  }

  const query = findArgValue(args, 'query');
  const sql = finalResult.sql ?? '';
  const data = finalResult.data;
  const table = ngqlDataToTableData(data);

  if (!query && !sql && table.tableData.length === 0) {
    return null;
  }

  return {
    name: 'text2ngql',
    title: 'NGQL Query',
    input: query,
    output: {
      sql,
      tableColumns: table.tableColumns,
      tableData: table.tableData,
    },
  };
}

function extractSqlToolCall(args: DipSkillInfoArg[] | undefined, answer: any): ChatToolCall | null {
  const finalResult = resolveFinalToolResult(answer);
  if (!finalResult || typeof finalResult !== 'object') {
    return null;
  }

  const query = findArgValue(args, 'input', 'query');
  const sql = finalResult.sql ?? '';
  const tableData = Array.isArray(finalResult.data) ? finalResult.data : [];
  const title = finalResult.title ?? query ?? 'SQL Query';

  if (!isPlainEmptyObject(finalResult) && !sql) {
    return null;
  }

  return {
    name: 'text2sql',
    title,
    input: query,
    output: {
      sql,
      tableColumns: getTableColumnsByRows(tableData),
      tableData,
    },
  };
}

function extractMetricToolCall(args: DipSkillInfoArg[] | undefined, answer: any): ChatToolCall | null {
  const finalResult = resolveFinalToolResult(answer);
  if (!finalResult || typeof finalResult !== 'object') {
    return null;
  }

  const query = findArgValue(args, 'input', 'query');
  const tableData = Array.isArray(finalResult.data) ? finalResult.data : [];
  const title = finalResult.title ?? query ?? 'Metric Query';

  if (tableData.length === 0) {
    return null;
  }

  return {
    name: 'text2metric',
    title,
    input: query || args,
    output: {
      tableColumns: getTableColumnsByRows(tableData),
      tableData,
    },
  };
}

function extractChartToolCall(args: DipSkillInfoArg[] | undefined, answer: any): ChatToolCall | null {
  const finalResult = resolveFinalToolResult(answer);
  if (!finalResult || typeof finalResult !== 'object') {
    return null;
  }

  const title = finalResult.title ?? findArgValue(args, 'title', 'input') ?? 'Chart Builder';
  const tableData = Array.isArray(finalResult.data) ? finalResult.data : [];
  const chartConfig = finalResult.chart_config;
  const chartType = finalResult.chart_config?.chart_type;

  if (!chartConfig && tableData.length === 0) {
    return null;
  }

  return {
    name: 'json2plot',
    title,
    input: findArgValue(args, 'title', 'input'),
    output: {
      chartType,
      chartConfig,
      tableColumns: getTableColumnsByRows(tableData),
      tableData,
    },
  };
}

function extractWebProcessorToolCall(answer: any): ChatToolCall | null {
  const answerObject = answer ?? {};
  const finalResult = resolveFinalToolResult(answer);
  if (!finalResult || typeof finalResult !== 'object') {
    return null;
  }

  const url = typeof finalResult.url === 'string' ? finalResult.url.trim() : '';
  if (!url) {
    return null;
  }

  const title =
    (typeof finalResult.title === 'string' && finalResult.title.trim().length > 0
      ? finalResult.title.trim()
      : typeof answerObject.title === 'string' && answerObject.title.trim().length > 0
        ? answerObject.title.trim()
        : 'Web Processor');

  const size =
    Array.isArray(finalResult.size) &&
    finalResult.size.length >= 2 &&
    Number.isFinite(Number(finalResult.size[0])) &&
    Number.isFinite(Number(finalResult.size[1]))
      ? ([Number(finalResult.size[0]), Number(finalResult.size[1])] as [number, number])
      : undefined;

  return {
    name: 'web_processor',
    title,
    output: {
      ...(title ? { title } : {}),
      url,
      ...(size ? { size } : {}),
    },
  };
}

function extractDocQaToolCall(args: DipSkillInfoArg[] | undefined, answer: any): ChatToolCall | null {
  const finalResult = resolveFinalToolResult(answer);
  if (!finalResult || typeof finalResult !== 'object') {
    return null;
  }

  const htmlText = finalResult.text ?? '';
  const cites = Array.isArray(finalResult.cites) ? finalResult.cites : [];
  const dataSources = Array.isArray(finalResult.data_source?.doc) ? finalResult.data_source.doc : [];
  const mappedCites = cites.map((cite: any) => {
    let dsId: string | undefined;

    for (const source of dataSources) {
      const fields = Array.isArray(source?.fields) ? source.fields : [];
      for (const field of fields) {
        if (cite?.doc_id && typeof field?.source === 'string' && cite.doc_id.startsWith(field.source)) {
          dsId = source?.ds_id;
        }
      }
    }

    return {
      ...cite,
      ds_id: dsId,
    };
  });

  if (!htmlText && mappedCites.length === 0) {
    return null;
  }

  return {
    name: 'doc_qa',
    title: 'Document QA',
    input: findArgValue(args, 'query', 'input'),
    output: {
      htmlText,
      cites: mappedCites,
    },
  };
}

function mapAfSailorTextToRows(text: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(text)) {
    return [];
  }

  return text
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          index,
          value: item,
        };
      }

      if (typeof item === 'object' && item !== null) {
        return item as Record<string, unknown>;
      }

      return {
        index,
        value: String(item),
      };
    })
    .filter((item): item is Record<string, unknown> => item != null);
}

function extractAfSailorToolCall(args: DipSkillInfoArg[] | undefined, answer: any): ChatToolCall | null {
  const result = answer?.result;
  if (!result || typeof result !== 'object') {
    return null;
  }

  const text = Array.isArray(result.text) ? result.text : [];
  const cites = Array.isArray(result.cites) ? result.cites : [];
  const data = cites.length > 0 ? cites : mapAfSailorTextToRows(text);
  const query = findArgValue(args, 'query', 'input');

  if (!query && data.length === 0) {
    return null;
  }

  return {
    name: 'af_sailor',
    title: 'AF Sailor',
    input: query || text,
    output: {
      data,
      resultCacheKey: result.result_cache_key,
    },
  };
}

function extractDatasourceFilterToolCall(answer: any): ChatToolCall | null {
  const resultData = answer?.result;
  const rows = Array.isArray(resultData?.result) ? resultData.result : [];

  if (rows.length === 0) {
    return null;
  }

  return {
    name: 'datasource_filter',
    title: 'Datasource Filter',
    output: {
      data: rows,
      resultCacheKey: resultData?.result_cache_key,
    },
  };
}

function extractDatasourceRerankToolCall(answer: any): ChatToolCall | null {
  const resultSource = answer && answer.result !== undefined ? answer.result : answer;
  const rows = Array.isArray(resultSource?.result) ? resultSource.result : Array.isArray(resultSource) ? resultSource : [];

  if (rows.length === 0) {
    return null;
  }

  return {
    name: 'datasource_rerank',
    title: 'Datasource Rerank',
    output: {
      data: rows,
      resultCacheKey: resultSource?.result_cache_key ?? answer?.result_cache_key,
    },
  };
}

function extractGenericToolCall(progress: DipProgressPayload): ChatToolCall | null {
  const skillName = progress.skill_info?.name;
  if (!skillName) {
    return null;
  }

  if (skillName === 'zhipu_search_tool') {
    return extractSearchToolCall(progress.answer, skillName);
  }

  if (skillName === 'online_search_cite_tool') {
    return extractOnlineSearchCiteToolCall(progress.skill_info?.args, progress.answer);
  }

  if (skillName in sandboxToolTitles) {
    return extractSandboxToolCall(skillName, progress.skill_info?.args, progress.answer);
  }

  if (skillName === 'text2metric') {
    return extractMetricToolCall(progress.skill_info?.args, progress.answer);
  }

  if (skillName === 'text2sql' || skillName === 'sql_helper') {
    return extractSqlToolCall(progress.skill_info?.args, progress.answer);
  }

  if (skillName === 'json2plot') {
    return extractChartToolCall(progress.skill_info?.args, progress.answer);
  }

  if (skillName === 'web_processor') {
    return extractWebProcessorToolCall(progress.answer);
  }

  if (skillName === 'text2ngql') {
    return extractNgqlToolCall(progress.skill_info?.args, progress.answer);
  }

  if (skillName === 'doc_qa') {
    return extractDocQaToolCall(progress.skill_info?.args, progress.answer);
  }

  if (skillName === 'af_sailor') {
    return extractAfSailorToolCall(progress.skill_info?.args, progress.answer);
  }

  if (skillName === 'datasource_filter') {
    return extractDatasourceFilterToolCall(progress.answer);
  }

  if (skillName === 'datasource_rerank') {
    return extractDatasourceRerankToolCall(progress.answer);
  }

  const argsObject = progress.skill_info?.args?.reduce<Record<string, string>>((accumulator, arg, index) => {
    accumulator[arg.name ?? `arg_${index}`] = arg.value ?? '';
    return accumulator;
  }, {});

  return {
    name: skillName,
    input: argsObject,
    output: progress.answer,
    metadata:
      progress.start_time != null && progress.end_time != null
        ? {
            consumeTime: progress.end_time - progress.start_time,
          }
        : undefined,
  };
}

function extractToolCalls(payload: DipMessagePayload): ChatToolCall[] | undefined {
  const progressItems = payload.message?.content?.middle_answer?.progress;
  if (!Array.isArray(progressItems)) {
    return undefined;
  }

  const toolCalls = progressItems
    .map(progress => extractGenericToolCall(progress))
    .filter((toolCall): toolCall is ChatToolCall => toolCall != null);

  return toolCalls.length > 0 ? toolCalls : undefined;
}

function extractThinking(payload: DipMessagePayload): string | undefined {
  const progressItems = payload.message?.content?.middle_answer?.progress;
  if (!Array.isArray(progressItems)) {
    return undefined;
  }

  for (let index = progressItems.length - 1; index >= 0; index -= 1) {
    const progress = progressItems[index];
    if (progress?.stage === 'llm' && typeof progress.think === 'string' && progress.think.trim().length > 0) {
      return progress.think;
    }
  }

  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function extractMetrics(payload: DipMessagePayload): ChatMessageMetrics | undefined {
  const ext = payload.message?.ext ?? payload.ext;
  if (!ext) {
    return undefined;
  }

  const totalTokens = toNumber(ext.total_tokens);
  const totalTimeSeconds = toNumber(ext.total_time);
  const ttftMs = toNumber(ext.ttft);

  if (totalTokens == null && totalTimeSeconds == null && ttftMs == null) {
    return undefined;
  }

  return {
    ...(totalTokens != null ? { totalTokens } : {}),
    ...(totalTimeSeconds != null ? { totalTimeSeconds } : {}),
    ...(ttftMs != null ? { ttftMs } : {}),
  };
}

function extractRelatedQuestions(payload: DipMessagePayload): string[] | undefined {
  const ext = payload.message?.ext ?? payload.ext;
  const relatedQueries = ext?.related_queries;

  if (!Array.isArray(relatedQueries)) {
    return undefined;
  }

  const questions = relatedQueries
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0);

  return questions.length > 0 ? questions : undefined;
}

function extractInterrupt(payload: DipMessagePayload): ChatInterruptInfo | undefined {
  const ext = payload.message?.ext ?? payload.ext;
  const interruptInfo = ext?.interrupt_info;

  if (!interruptInfo || typeof interruptInfo !== 'object') {
    return undefined;
  }

  return {
    handle: interruptInfo.handle,
    data: interruptInfo.data
      ? {
          ...interruptInfo.data,
          tool_args: interruptInfo.data.tool_args?.map(arg => ({ ...arg })),
          interrupt_config: interruptInfo.data.interrupt_config
            ? {
                ...interruptInfo.data.interrupt_config,
              }
            : undefined,
        }
      : undefined,
  };
}

function toMessageSnapshot(payload: DipMessagePayload): ProviderMessage | null {
  if (!payload.assistant_message_id) {
    return null;
  }

  const toolCalls = extractToolCalls(payload);
  const thinking = extractThinking(payload);
  const metrics = extractMetrics(payload);
  const relatedQuestions = extractRelatedQuestions(payload);
  const interrupt = extractInterrupt(payload);
  const responseMessageIds =
    payload.user_message_id || payload.assistant_message_id
      ? {
          ...(payload.user_message_id ? { userMessageId: payload.user_message_id } : {}),
          ...(payload.assistant_message_id ? { assistantMessageId: payload.assistant_message_id } : {}),
        }
      : undefined;

  return {
    id: payload.assistant_message_id,
    role: payload.message?.role ?? 'assistant',
    content: extractAssistantText(payload),
    raw: payload,
    ...(toolCalls || relatedQuestions || thinking || metrics || interrupt || responseMessageIds
      ? {
          metadata: {
            ...(toolCalls ? { toolCalls } : {}),
            ...(relatedQuestions ? { relatedQuestions } : {}),
            ...(thinking ? { thinking } : {}),
            ...(metrics ? { metrics } : {}),
            ...(interrupt ? { interrupt } : {}),
            ...(responseMessageIds ? { responseMessageIds } : {}),
          },
        }
      : {}),
  };
}

export async function* normalizeDipStream(
  stream: AsyncIterable<DipRawStreamChunk>,
  conversationId?: string
): AsyncIterable<ProviderEvent> {
  const assembler = new IncrementalAssembler({});
  let started = false;
  let completed = false;

  for await (const chunk of stream) {
    const parsed = parseChunk(chunk);

    if (!started) {
      started = true;
      yield { type: 'stream.started', conversationId };
    }

    if (isIncrementalFrame(parsed)) {
      const state = assembler.apply({
        seqId: parsed.seq_id,
        key: parsed.key,
        content: parsed.content,
        action: parsed.action,
      });

      if (parsed.action === 'end') {
        completed = true;
        yield { type: 'stream.completed', conversationId };
        continue;
      }

      const message = toMessageSnapshot(state.value as DipMessagePayload);
      if (message) {
        yield { type: 'message.snapshot', message };
      }
      continue;
    }

    assembler.reset(parsed);
    const message = toMessageSnapshot(parsed as DipMessagePayload);
    if (message) {
      yield { type: 'message.snapshot', message };
    }
  }

  if (started && !completed) {
    yield { type: 'stream.completed', conversationId };
  }
}
