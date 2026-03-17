import type { ChatAttachmentInput, UploadedAttachmentInput } from '@kweaver-ai/chatkit-core';

export interface ResolveSenderStateInput {
  value: string;
  inputAttachments?: ChatAttachmentInput[];
  tempFileList?: UploadedAttachmentInput[];
}

export interface ResolveSenderStateResult {
  displayFiles: ChatAttachmentInput[];
  attachmentsToSend: ChatAttachmentInput[];
  inputDisabled: boolean;
}

function getAttachmentIdentity(attachment: {
  source: string;
  fileName: string;
  storageKey?: string;
  fileId?: string;
  url?: string;
  temporaryAreaId?: string;
}): string {
  return [
    attachment.source,
    attachment.fileName,
    attachment.storageKey ?? '',
    attachment.fileId ?? '',
    attachment.url ?? '',
    attachment.temporaryAreaId ?? '',
  ].join('|');
}

export function extractNewTemporaryAttachments(input: {
  previousTemporaryAttachments?: UploadedAttachmentInput[];
  nextTemporaryAttachments?: UploadedAttachmentInput[];
}): UploadedAttachmentInput[] {
  const previous = input.previousTemporaryAttachments ?? [];
  const next = input.nextTemporaryAttachments ?? [];
  const previousCount = new Map<string, number>();

  for (const attachment of previous) {
    const key = getAttachmentIdentity(attachment);
    previousCount.set(key, (previousCount.get(key) ?? 0) + 1);
  }

  const appended: UploadedAttachmentInput[] = [];
  for (const attachment of next) {
    const key = getAttachmentIdentity(attachment);
    const count = previousCount.get(key) ?? 0;
    if (count > 0) {
      previousCount.set(key, count - 1);
      continue;
    }
    appended.push(attachment);
  }

  return appended;
}

export function resolveSenderState(input: ResolveSenderStateInput): ResolveSenderStateResult {
  const inputAttachments = input.inputAttachments ?? [];
  const displayFiles = inputAttachments;
  const inputDisabled = !input.value.trim() && inputAttachments.length === 0;

  return {
    displayFiles,
    attachmentsToSend: inputAttachments,
    inputDisabled,
  };
}
