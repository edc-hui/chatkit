import type { ChatAttachmentInput, ChatKitState } from '@kweaver-ai/chatkit-core';

export interface UploadTemporaryFileInput {
  file: File;
  conversationId?: string;
  createConversation: () => Promise<ChatKitState>;
  uploadTemporaryFiles: (input: {
    conversationId?: string;
    attachments: ChatAttachmentInput[];
    mode?: 'replace' | 'append';
  }) => Promise<ChatKitState>;
}

export async function uploadTemporaryFile(input: UploadTemporaryFileInput): Promise<ChatKitState> {
  let nextConversationId = input.conversationId;
  if (!nextConversationId) {
    const nextState = await input.createConversation();
    nextConversationId = nextState.currentConversationId;
  }

  if (!nextConversationId) {
    throw new Error('创建会话失败');
  }

  const attachment: ChatAttachmentInput = {
    source: 'local',
    fileName: input.file.name,
    content: input.file,
    contentType: input.file.type,
    metadata: {
      size: input.file.size,
      lastModified: input.file.lastModified,
    },
  };

  return input.uploadTemporaryFiles({
    conversationId: nextConversationId,
    attachments: [attachment],
    mode: 'append',
  });
}
