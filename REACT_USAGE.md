# React Usage

## 1. Install

```bash
npm i @kweaver-ai/chatkit react react-dom
```

常用子入口：

- `@kweaver-ai/chatkit/react`
- `@kweaver-ai/chatkit/provider-dip`
- `@kweaver-ai/chatkit/provider-coze`

## 2. Minimal Integration (DIP)

```tsx
import React from 'react';
import { ChatKitProvider, Assistant } from '@kweaver-ai/chatkit/react';
import { createDipProvider } from '@kweaver-ai/chatkit/provider-dip';

const provider = createDipProvider({
  baseUrl: 'https://your-api.example.com/api/agent-factory/v1',
  agentKey: 'your-agent-key',
  getAccessToken: async () => 'your-token',
});

// SDK 内部会自动拼接为:
// {baseUrl}/app/{agentKey}/chat/completion

export default function App() {
  return (
    <ChatKitProvider provider={provider} providerName="dip" locale="zh-CN">
      <Assistant
        title="Assistant"
        allowAttachments
        allowDeepThink
        showConversations
        showOnboarding
        showContextPanel
        showFilesPanel
        showWorkbench
        allowFeedback
      />
    </ChatKitProvider>
  );
}
```

## 3. Copilot Integration

```tsx
import React from 'react';
import { ChatKitProvider, Copilot } from '@kweaver-ai/chatkit/react';

export default function App({ provider }: { provider: any }) {
  return (
    <ChatKitProvider provider={provider} locale="zh-CN">
      <Copilot
        visible
        title="Copilot"
        width={420}
        allowAttachments
        showConversations
        allowFeedback
      />
    </ChatKitProvider>
  );
}
```

## 4. Imperative Ref API

```tsx
import React, { useRef } from 'react';
import { ChatKitProvider, Assistant, type ChatKitRef } from '@kweaver-ai/chatkit/react';

export default function App({ provider }: { provider: any }) {
  const chatRef = useRef<ChatKitRef>(null);

  return (
    <ChatKitProvider provider={provider} locale="zh-CN">
      <button
        onClick={() => {
          void chatRef.current?.send('你好，帮我分析一下');
        }}
      >
        一键发送
      </button>
      <button
        onClick={() => {
          chatRef.current?.injectApplicationContext({
            title: '故障节点',
            data: { node_id: 'node-uuid-1' },
          });
        }}
      >
        注入上下文
      </button>
      <Assistant ref={chatRef} showConversations />
    </ChatKitProvider>
  );
}
```

可用的常见 ref 方法：

- `send`
- `createConversation`
- `getConversations`
- `loadConversation`
- `recoverConversation`
- `markConversationRead`
- `renameConversation`
- `deleteConversation`
- `injectApplicationContext`
- `removeApplicationContext`
- `setInputFiles`
- `setTemporaryFiles`
- `uploadTemporaryFiles`
- `stop` / `cancel` / `terminate`

## 5. Coze Quick Start

`ChatKitCoze` 是 React 一体化入口（内部已封装 provider + providerName + Copilot）。

```tsx
import React from 'react';
import { ChatKitCoze } from '@kweaver-ai/chatkit/react';

export default function App() {
  return (
    <ChatKitCoze
      botId="your-bot-id"
      apiToken="your-api-token"
      userId="your-user-id"
      locale="zh-CN"
      visible
      title="Coze Copilot"
      showConversations
      allowFeedback
    />
  );
}
```

## 6. Optional i18n

```tsx
<ChatKitProvider
  provider={provider}
  locale="zh-TW"
  fallbackLocale="en-US"
  messages={{
    'assistant.title': '自定义标题',
  }}
>
  <Assistant />
</ChatKitProvider>
```

默认内置：

- `zh-CN`
- `zh-TW`
- `en-US`
