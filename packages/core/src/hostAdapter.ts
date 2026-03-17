export type ChatKitProviderName = 'dip' | 'coze' | (string & {});

export interface ChatKitAccessTokenContext {
  provider: ChatKitProviderName;
  reason?: 'request' | 'refresh';
}

export interface ChatKitFileUploadRequest {
  provider?: ChatKitProviderName;
  conversationId?: string;
  fileName: string;
  content: Blob | ArrayBuffer | Uint8Array | string;
  contentType?: string;
  purpose?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatKitFileUploadResult {
  fileId?: string;
  fileName: string;
  url: string;
  storageKey?: string;
  temporaryAreaId?: string;
  contentType?: string;
  size?: number;
  metadata?: Record<string, unknown>;
}

export interface ChatKitNavigationTarget {
  href?: string;
  routeName?: string;
  params?: Record<string, unknown>;
  external?: boolean;
  replace?: boolean;
}

export interface ChatKitHostAdapter {
  getAccessToken?(context: ChatKitAccessTokenContext): Promise<string | undefined> | string | undefined;
  refreshAccessToken?(context: ChatKitAccessTokenContext): Promise<string | undefined> | string | undefined;
  uploadFile?(input: ChatKitFileUploadRequest): Promise<ChatKitFileUploadResult>;
  navigate?(target: ChatKitNavigationTarget): Promise<void> | void;
}

export async function resolveHostAccessToken(
  hostAdapter: ChatKitHostAdapter | undefined,
  context: ChatKitAccessTokenContext
): Promise<string | undefined> {
  if (!hostAdapter) {
    return undefined;
  }

  const accessToken = await hostAdapter.getAccessToken?.(context);
  if (accessToken) {
    return accessToken;
  }

  return hostAdapter.refreshAccessToken?.({
    ...context,
    reason: 'refresh',
  });
}

export async function uploadWithHostAdapter(
  hostAdapter: ChatKitHostAdapter | undefined,
  input: ChatKitFileUploadRequest
): Promise<ChatKitFileUploadResult> {
  if (!hostAdapter?.uploadFile) {
    throw new Error('ChatKit host adapter does not provide uploadFile().');
  }

  return hostAdapter.uploadFile(input);
}

export async function navigateWithHostAdapter(
  hostAdapter: ChatKitHostAdapter | undefined,
  target: ChatKitNavigationTarget
): Promise<void> {
  if (!hostAdapter?.navigate) {
    throw new Error('ChatKit host adapter does not provide navigate().');
  }

  await hostAdapter.navigate(target);
}
