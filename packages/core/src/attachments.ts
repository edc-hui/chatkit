import { uploadWithHostAdapter, type ChatKitFileUploadRequest, type ChatKitHostAdapter } from './hostAdapter.js';
import type { ChatMessageAttachment } from './types.js';
import type { ChatAttachmentInput, UploadedAttachmentInput } from './types.js';
import type { ChatProvider, SendMessageInput } from './provider.js';

export interface PrepareSendMessageInputOptions {
  hostAdapter?: ChatKitHostAdapter;
  provider?: string;
  providerUploadFile?: ChatProvider['uploadFile'];
}

export function isUploadedAttachment(attachment: ChatAttachmentInput): attachment is UploadedAttachmentInput {
  return attachment.source === 'uploaded';
}

export function toChatMessageAttachments(attachments: ChatAttachmentInput[] | undefined): ChatMessageAttachment[] | undefined {
  if (!attachments || attachments.length === 0) {
    return undefined;
  }

  return attachments.map(attachment => ({
    source: attachment.source,
    fileName: attachment.fileName,
    url: attachment.source === 'uploaded' ? attachment.url : undefined,
    fileId: attachment.source === 'uploaded' ? attachment.fileId : undefined,
    storageKey: attachment.source === 'uploaded' ? attachment.storageKey : undefined,
    temporaryAreaId: attachment.source === 'uploaded' ? attachment.temporaryAreaId : undefined,
    contentType: attachment.contentType,
    size: attachment.source === 'uploaded' ? attachment.size : undefined,
    metadata: attachment.metadata,
  }));
}

export interface PrepareAttachmentInputsInput {
  conversationId?: string;
  attachments?: ChatAttachmentInput[];
}

async function uploadAttachment(
  options: PrepareSendMessageInputOptions,
  request: ChatKitFileUploadRequest
) {
  if (options.hostAdapter?.uploadFile) {
    return uploadWithHostAdapter(options.hostAdapter, request);
  }

  if (options.providerUploadFile) {
    return options.providerUploadFile(request);
  }

  throw new Error('ChatKit host adapter does not provide uploadFile().');
}

export async function prepareAttachmentInputs(
  input: PrepareAttachmentInputsInput,
  options: PrepareSendMessageInputOptions = {}
): Promise<ChatAttachmentInput[]> {
  if (!input.attachments || input.attachments.length === 0) {
    return [];
  }

  return Promise.all(
    input.attachments.map(async attachment => {
      if (isUploadedAttachment(attachment)) {
        return attachment;
      }

      const uploaded = await uploadAttachment(options, {
        provider: options.provider,
        conversationId: input.conversationId,
        fileName: attachment.fileName,
        content: attachment.content,
        contentType: attachment.contentType,
        purpose: attachment.purpose,
        metadata: attachment.metadata,
      });

      return {
        source: 'uploaded' as const,
        fileName: uploaded.fileName,
        url: uploaded.url,
        fileId: uploaded.fileId,
        storageKey: uploaded.storageKey,
        temporaryAreaId: uploaded.temporaryAreaId,
        contentType: uploaded.contentType,
        size: uploaded.size,
        metadata: uploaded.metadata,
      };
    })
  );
}

export async function prepareSendMessageInput(
  input: SendMessageInput,
  options: PrepareSendMessageInputOptions = {}
): Promise<SendMessageInput> {
  const attachments = await prepareAttachmentInputs(input, options);

  if (attachments.length === 0) {
    return input;
  }

  return {
    ...input,
    attachments,
  };
}
