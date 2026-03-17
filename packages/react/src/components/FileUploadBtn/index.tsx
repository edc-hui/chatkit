import React, { type ReactNode } from 'react';
import { Button, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useChatKit } from '../../ChatKitProvider.js';
import { type UploadedAttachmentInput } from '@kweaver-ai/chatkit-core';
import IconFont from '../IconFont/index.js';
import { uploadTemporaryFile } from './uploadTemporaryFile.js';

export interface FileUploadBtnProps {
  disabled?: boolean;
  customBtn?: ReactNode;
  onSuccess?: (payload: {
    temporaryAttachments: UploadedAttachmentInput[];
    previousTemporaryAttachments: UploadedAttachmentInput[];
  }) => void;
}

const FileUploadBtn: React.FC<FileUploadBtnProps> = (props) => {
  const { state, commands } = useChatKit();
  const [messageApi, contextHolder] = message.useMessage();
  const { disabled = false, customBtn, onSuccess } = props;

  const handleUpload = async (file: File) => {
    try {
      const previousTemporaryAttachments = state.temporaryAttachments;
      const nextState = await uploadTemporaryFile({
        file,
        conversationId: state.currentConversationId,
        createConversation: commands.createConversation,
        uploadTemporaryFiles: commands.uploadTemporaryFiles,
      });

      onSuccess?.({
        temporaryAttachments: nextState.temporaryAttachments,
        previousTemporaryAttachments,
      });
    } catch (error: any) {
      void messageApi.error(error.message || '上传失败');
      throw error;
    }
  };

  const uploadProps: UploadProps = {
    customRequest: async (options) => {
      const { file, onSuccess: onAntDSuccess, onError } = options;
      try {
        await handleUpload(file as File);
        onAntDSuccess?.(null);
      } catch (err) {
        onError?.(err as any);
      }
    },
    showUploadList: false,
    disabled: disabled,
  };

  return (
    <>
      {contextHolder}
      <Upload {...uploadProps}>
        {customBtn || (
          <Button 
            icon={<IconFont type="icon-dip-attachment" />} 
            disabled={disabled}
          />
        )}
      </Upload>
    </>
  );
};

export default FileUploadBtn;
