import {
  resolveHostAccessToken,
  type ChatAttachmentInput,
  type ChatKitFileUploadRequest,
  type ChatKitFileUploadResult,
  type ChatProvider,
  type CreateConversationResult,
  type SendMessageInput,
} from '@kweaver-ai/chatkit-core';

import { normalizeDipStream } from './normalize/normalizeDipStream.js';
import { createSseChunkStream } from './transport/createSseChunkStream.js';
import type { DipProviderConfig } from './transport/types.js';

const DEFAULT_DIP_BASE_URL = '/api/agent-factory/v1';
const DEFAULT_AGENT_FACTORY_BASE_URL_V3 = '/api/agent-factory/v3';
const DEFAULT_SANDBOX_BASE_URL = '/api/v1/sessions';
const DEFAULT_SANDBOX_SESSION_ID = 'sess-agent-default';
const DEFAULT_AGENT_VERSION = 'v0';
const DEFAULT_BUSINESS_DOMAIN = 'bd_public';
const BUSINESS_DOMAIN_HEADER = 'X-Business-Domain';
const DEFAULT_EXECUTOR_VERSION = 'v2';
const DEFAULT_CHAT_OPTION = {
  is_need_history: true,
  is_need_doc_retrival_post_process: true,
  is_need_progress: true,
  enable_dependency_cache: true,
};

interface DipAgentDetails {
  id: string;
}

function resolveBaseUrl(baseUrl: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return normalizedBase;
}

function createStreamUrl(baseUrl: string, agentKey: string): string {
  return `${resolveBaseUrl(baseUrl)}/app/${agentKey}/chat/completion`;
}

function toBlob(content: ChatKitFileUploadRequest['content'], contentType?: string): Blob {
  if (content instanceof Blob) {
    return content;
  }

  if (content instanceof ArrayBuffer) {
    return new Blob([content], contentType ? { type: contentType } : undefined);
  }

  if (content instanceof Uint8Array) {
    const bytes = new Uint8Array(content.byteLength);
    bytes.set(content);
    return new Blob(
      [bytes.buffer],
      contentType ? { type: contentType } : undefined
    );
  }

  return new Blob([content], contentType ? { type: contentType } : undefined);
}

function getFetcher(config: DipProviderConfig): typeof fetch {
  return config.fetcher ?? fetch;
}

function resolveBusinessDomain(config: DipProviderConfig): string {
  const businessDomain = config.businessDomain?.trim();
  return businessDomain || DEFAULT_BUSINESS_DOMAIN;
}

function createRequestHeaders(
  config: DipProviderConfig,
  accessToken: string | undefined,
  options: { includeContentType?: boolean } = {}
): Record<string, string> {
  return {
    ...(options.includeContentType === false ? {} : { 'Content-Type': 'application/json' }),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    [BUSINESS_DOMAIN_HEADER]: resolveBusinessDomain(config),
  };
}

async function parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const payload = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('DIP API returns an invalid response.');
  }

  return payload as Record<string, unknown>;
}

async function fetchAgentDetails(
  config: DipProviderConfig,
  accessToken: string | undefined,
  agentVersion: string
): Promise<DipAgentDetails> {
  const agentDetailsUrl = `${resolveBaseUrl(DEFAULT_AGENT_FACTORY_BASE_URL_V3)}/agent-market/agent/${config.agentKey}/version/${agentVersion}?is_visit=true`;
  const fetcher = getFetcher(config);
  const headers = createRequestHeaders(config, accessToken);
  const response = await fetcher(agentDetailsUrl, {
    method: 'GET',
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to get agent details: ${response.status}`);
  }

  const payload = await parseJsonResponse(response);
  const agentId = payload.id;
  if (typeof agentId !== 'string' || !agentId.trim()) {
    throw new Error('DIP agent details response missing id.');
  }

  return {
    id: agentId,
  };
}

async function createConversationWithDipApi(
  config: DipProviderConfig,
  accessToken: string | undefined,
  agentId: string,
  agentVersion: string,
  input?: { title?: string }
): Promise<CreateConversationResult> {
  const fetcher = getFetcher(config);
  const url = `${resolveBaseUrl(config.baseUrl ?? DEFAULT_DIP_BASE_URL)}/app/${config.agentKey}/conversation`;
  const conversationHeaders = createRequestHeaders(config, accessToken);
  const response = await fetcher(url, {
    method: 'POST',
    headers: conversationHeaders,
    body: JSON.stringify({
      ...(input ?? {}),
      agent_id: agentId,
      agent_version: agentVersion,
      executor_version: DEFAULT_EXECUTOR_VERSION,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create conversation: ${response.status}`);
  }

  const payload = await parseJsonResponse(response);
  const conversationId = payload.id;
  if (typeof conversationId !== 'string' || !conversationId.trim()) {
    throw new Error('DIP create conversation response missing id.');
  }

  const title = typeof payload.title === 'string' ? payload.title : input?.title;

  return {
    conversation: {
      id: conversationId,
      ...(title ? { title } : {}),
    },
  };
}

async function uploadFileWithDipSandbox(
  config: DipProviderConfig,
  accessToken: string | undefined,
  input: ChatKitFileUploadRequest
): Promise<ChatKitFileUploadResult> {
  if (!input.conversationId) {
    throw new Error('Conversation id is required when uploading files.');
  }

  const sandboxBaseUrl = resolveBaseUrl(config.sandboxBaseUrl ?? DEFAULT_SANDBOX_BASE_URL);
  const sessionId = config.sandboxSessionId ?? DEFAULT_SANDBOX_SESSION_ID;
  const filePath = `conversation-${input.conversationId}/uploads/temparea/${encodeURIComponent(input.fileName)}`;
  const uploadUrl = `${sandboxBaseUrl}/${sessionId}/files/upload?path=${filePath}`;
  const fileBlob = toBlob(input.content, input.contentType);
  const formData = new FormData();
  formData.append('file', fileBlob, input.fileName);

  const headers = createRequestHeaders(config, accessToken, { includeContentType: false });
  const fetcher = getFetcher(config);
  const response = await fetcher(uploadUrl, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.status}`);
  }

  const payload = await parseJsonResponse(response);
  const storageKey = typeof payload.file_path === 'string' ? payload.file_path : filePath;

  return {
    fileName: input.fileName,
    url: storageKey,
    storageKey,
    contentType: input.contentType,
    size: fileBlob.size,
    metadata: input.metadata,
  };
}

async function resolveAccessToken(config: DipProviderConfig): Promise<string | undefined> {
  if (config.getAccessToken) {
    return config.getAccessToken();
  }

  return resolveHostAccessToken(config.hostAdapter, {
    provider: 'dip',
    reason: 'request',
  });
}

function mapSelectedFiles(attachments: ChatAttachmentInput[] | undefined) {
  if (!attachments || attachments.length === 0) {
    return undefined;
  }

  return attachments.map(attachment => ({
    file_name:
      attachment.source === 'uploaded'
        ? attachment.storageKey ?? attachment.fileId ?? attachment.fileName
        : attachment.fileName,
  }));
}

function resolveTemporaryAreaId(input: SendMessageInput): string | undefined {
  if (input.temporaryAreaId) {
    return input.temporaryAreaId;
  }

  for (const attachment of input.attachments ?? []) {
    if (attachment.source === 'uploaded' && attachment.temporaryAreaId) {
      return attachment.temporaryAreaId;
    }
  }

  return undefined;
}

function createDefaultRequestBody(input: SendMessageInput, _agentKey: string): Record<string, unknown> {
  const chatMode = input.chatMode ?? (input.deepThink ? 'deep_thinking' : undefined);
  const selectedFiles = mapSelectedFiles(input.attachments);
  const temporaryAreaId = resolveTemporaryAreaId(input);
  const interruptResumeInfo = input.interrupt
    ? {
        resume_handle: input.interrupt.handle,
        data: input.interrupt.data,
        action: input.interrupt.action,
        modified_args: input.interrupt.modifiedArgs ?? [],
      }
    : undefined;

  return {
    application_context: input.applicationContext,
    ...((!input.interrupt || input.text.trim().length > 0) ? { query: input.text } : {}),
    ...(temporaryAreaId ? { temporary_area_id: temporaryAreaId } : {}),
    ...(selectedFiles ? { selected_files: selectedFiles } : {}),
    ...(chatMode ? { chat_mode: chatMode } : {}),
    ...(input.regenerateUserMessageId
      ? { regenerate_user_message_id: input.regenerateUserMessageId }
      : {}),
    ...(input.regenerateAssistantMessageId
      ? { regenerate_assistant_message_id: input.regenerateAssistantMessageId }
      : {}),
    ...(interruptResumeInfo ? { resume_interrupt_info: interruptResumeInfo } : {}),
    ...(input.interrupt?.interruptedAssistantMessageId
      ? { interrupted_assistant_message_id: input.interrupt.interruptedAssistantMessageId }
      : {}),
  };
}

export function createDipProvider(config: DipProviderConfig): ChatProvider {
  const streamTransport = config.streamTransport ?? createSseChunkStream;
  const dipBaseUrl = config.baseUrl ?? DEFAULT_DIP_BASE_URL;
  const effectiveAgentVersion = config.agentVersion ?? DEFAULT_AGENT_VERSION;
  let agentDetailsCache: DipAgentDetails | undefined;
  let agentDetailsPromise: Promise<DipAgentDetails> | undefined;

  const getAgentDetails = async (accessToken?: string): Promise<DipAgentDetails> => {
    if (agentDetailsCache) {
      return agentDetailsCache;
    }

    if (!agentDetailsPromise) {
      agentDetailsPromise = (async () => {
        const resolvedAccessToken = accessToken ?? (await resolveAccessToken(config));
        const details = await fetchAgentDetails(config, resolvedAccessToken, effectiveAgentVersion);
        agentDetailsCache = details;
        return details;
      })().catch(error => {
        agentDetailsPromise = undefined;
        throw error;
      });
    }

    return agentDetailsPromise;
  };

  // Preload agent details once and reuse in later built-in requests.
  void getAgentDetails().catch(() => {});

  return {
    async getOnboardingInfo() {
      if (config.getOnboardingInfo) {
        return config.getOnboardingInfo();
      }

      return {};
    },

    async getContextInfo() {
      if (config.getContextInfo) {
        return config.getContextInfo();
      }

      return {};
    },

    async createConversation(input) {
      if (config.createConversation) {
        return config.createConversation(input);
      }

      const accessToken = await resolveAccessToken(config);
      const agentDetails = await getAgentDetails(accessToken);
      return createConversationWithDipApi(config, accessToken, agentDetails.id, effectiveAgentVersion, input);
    },

    async uploadFile(input) {
      const accessToken = await resolveAccessToken(config);
      return uploadFileWithDipSandbox(config, accessToken, input);
    },

    async listConversations(input) {
      if (!config.listConversations) {
        throw new Error('Conversation listing is not configured for this DIP provider.');
      }

      return config.listConversations(input);
    },

    async getConversationMessages(input) {
      if (!config.getConversationMessages) {
        throw new Error('Conversation message loading is not configured for this DIP provider.');
      }

      return config.getConversationMessages(input);
    },

    recoverConversation(input) {
      if (!config.recoverConversation) {
        throw new Error('Conversation recovery is not configured for this DIP provider.');
      }

      return config.recoverConversation(input);
    },

    async markConversationRead(input) {
      if (!config.markConversationRead) {
        throw new Error('Conversation read tracking is not configured for this DIP provider.');
      }

      await config.markConversationRead(input);
    },

    async getConversationSessionStatus(input) {
      if (!config.getConversationSessionStatus) {
        throw new Error('Conversation session status is not configured for this DIP provider.');
      }

      return config.getConversationSessionStatus(input);
    },

    async recoverConversationSession(input) {
      if (!config.recoverConversationSession) {
        throw new Error('Conversation session recovery is not configured for this DIP provider.');
      }

      return config.recoverConversationSession(input);
    },

    async updateConversation(input) {
      if (!config.updateConversation) {
        throw new Error('Conversation updating is not configured for this DIP provider.');
      }

      return config.updateConversation(input);
    },

    async deleteConversation(input) {
      if (!config.deleteConversation) {
        throw new Error('Conversation deletion is not configured for this DIP provider.');
      }

      await config.deleteConversation(input);
    },

    async submitMessageFeedback(input) {
      if (!config.submitMessageFeedback) {
        throw new Error('Message feedback is not configured for this DIP provider.');
      }

      await config.submitMessageFeedback(input);
    },

    async *send(input) {
      const accessToken = await resolveAccessToken(config);
      const agentDetails = await getAgentDetails(accessToken);
      const requestBody = (config.buildRequestBody ?? createDefaultRequestBody)(input, config.agentKey);
      const dipRequestBody = {
        ...requestBody,
        conversation_id: input.conversationId,
        agent_id: agentDetails.id,
        agent_version: effectiveAgentVersion,
        stream: true,
        inc_stream: true,
        executor_version: DEFAULT_EXECUTOR_VERSION,
        chat_option: DEFAULT_CHAT_OPTION,
      };
      const headers = createRequestHeaders(config, accessToken);
      const streamUrl = createStreamUrl(dipBaseUrl, config.agentKey);
      const rawStream = streamTransport({
        url: streamUrl,
        method: 'POST',
        headers,
        body: dipRequestBody,
        signal: input.signal,
      });

      for await (const event of normalizeDipStream(rawStream, input.conversationId)) {
        yield event;
      }
    },

    async terminateConversation(input) {
      await config.terminateConversation?.(input);
    },
  };
}
