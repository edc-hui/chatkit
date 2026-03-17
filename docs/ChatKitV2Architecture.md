# ChatKit v2 架构设计文档

## 1. 背景

当前有两套相关实现：

- `dip-chatkit-sdk`
  - 已具备基础的 SDK 形态、对外 API、DIP/Coze 接入、Assistant/Copilot 基础能力
  - 但当前实现强依赖 React，产品能力也明显少于 `DipChat`
- `DipChat`
  - 已具备更完整的产品能力，如文件工作流、调试能力、完整会话工作台、thinking/ttft 展示、更多工具覆盖
  - 但当前实现直接依赖宿主工程，不适合作为公共 SDK 原样输出

本次重构目标不是继续维护两条平行线，而是：

- 以 `DipChat` 现有能力为主要能力来源
- 保留 `dip-chatkit-sdk` 现有对外使用方式
- 重构出一套新的 ChatKit v2
- 让核心层不耦合任何前端框架
- 同时保留 DIP、Coze 和 Copilot 能力

## 2. 目标

### 2.1 核心目标

ChatKit v2 要满足以下目标：

1. 核心层完全无框架依赖
2. 能力覆盖逐步追平 `DipChat`
3. 对 React 用户尽量保持 `dip-chatkit-sdk` 的接入习惯
4. 继续支持 DIP 和 Coze 两类 provider
5. 支持 Assistant / Copilot 两种 UI 形态
6. 第一阶段先支持纯 JavaScript、React、Vue 三种接入方式
7. 为未来扩展 Web Components、Angular 等适配层留出空间

### 2.2 非目标

以下内容不作为 v2 第一阶段目标：

1. 一次性完全重写所有 UI
2. 一次性消灭所有旧实现
3. 强行维持当前内部实现细节兼容
4. 让所有宿主项目零成本迁移所有增强能力
5. 在第一阶段同时交付 Web Components

## 3. 总体判断

ChatKit v2 不应该再是“React 组件库 + 平台适配”这么简单，而应该升级为：

- 无框架对话内核
- 平台 provider 层
- UI 适配层
- 宿主适配层

一句话概括：

**core 负责状态与协议，provider 负责平台接入，adapter 负责渲染与交互，host 负责业务工程集成。**

## 4. 总体架构

建议拆成四层：

```text
Host Application
  └─ Host Adapter
      └─ UI Adapter
          └─ ChatKit Core
              └─ Provider Adapter
```

### 4.1 Core

无框架、纯 TypeScript 的聊天内核，负责：

- 会话状态机
- 消息模型
- 流式事件解析
- 工具结果归一化
- 文件工作流状态
- regenerate / cancel / stop / interrupt
- thinking / ttft / token / elapsedTime
- 错误模型
- 调试数据模型
- 事件订阅与命令分发

### 4.2 Provider Adapter

平台接入层，负责把不同平台的协议归一化为 core 可理解的统一事件和命令。

第一阶段至少提供：

- DIP Provider
- Coze Provider

### 4.3 UI Adapter

UI 渲染层，负责把 core 的状态和命令映射为界面。

第一阶段建议提供：

- React Adapter
- Vue Adapter

其中：

- React Adapter 用于兼容现有 `dip-chatkit-sdk` 用户
- Vue Adapter 用于补齐非 React 场景下的主流框架接入
- 纯 JavaScript 场景直接使用 `core + provider`，不强制依赖任何 UI adapter

### 4.4 Host Adapter

宿主适配层，负责接入具体业务环境：

- 路由同步
- 微前端跳转
- 鉴权与 token 刷新
- 业务 API 客户端
- 文件上传实现
- 调试场景的宿主流程

这部分不应该进入 core。

Host Adapter 不应只停留在概念层，建议在代码层落为可注入的宿主能力接口。

第一阶段建议延续当前 `tokenRefreshCallback` 这类回调注入心智，但统一收敛到结构化的 `hostAdapter` 配置对象中，由 engine / provider 按需消费自己关心的能力。

示例：

```ts
const hostAdapter = {
  auth: {
    refreshToken: async () => fetchNewToken(),
  },
  files: {
    upload: async (file: File) => uploadToOSS(file),
  },
  navigation: {
    open: (target: string) => router.push(target),
  },
};

const provider = createDipProvider({
  baseUrl: 'https://dip.example.com/api/agent-app/v1',
  agentKey: 'agent-key',
  hostAdapter,
});

const engine = createChatKitEngine({
  provider,
  hostAdapter,
});
```

也就是说：

- Host Adapter 是代码中的具体注入接口，不只是抽象概念
- 简单场景可以只实现其中一两个回调
- 复杂宿主可以把鉴权、上传、路由、埋点统一封装在这个对象里

## 5. 包结构建议

建议采用多包结构：

```text
packages/
  core/
  provider-dip/
  provider-coze/
  react/
  vue/
  shared/
```

### 5.1 `core`

无框架核心包，导出：

- 核心类型
- 核心状态机
- provider 接口
- UI adapter 绑定接口
- 命令 API
- 事件 API

### 5.2 `provider-dip`

封装 DIP 协议、SSE 解析、工具映射、会话操作。

### 5.3 `provider-coze`

封装 Coze 协议和事件流适配，复用 core 的统一状态模型。

### 5.4 `react`

对外导出与当前 `dip-chatkit-sdk` 接近的使用方式：

- `Assistant`
- `Copilot`
- `ChatKitCoze`
- `ChatKitProvider`
- `useChatKit`

### 5.5 `vue`

对外导出 Vue 3 适配层，例如：

- `ChatKitProvider`
- `useChatKit`

后续补齐：

- `Assistant`
- `Copilot`

### 5.6 `shared`

`shared` 不是为了方便堆放零散代码，而是明确承担“跨层共用但不属于某一层”的纯工具和协议能力。

建议只放以下内容：

- 纯 TypeScript 类型和常量
- 不依赖 DOM / React / Vue 的纯函数
- 消息、工具结果的归一化工具
- Clipboard / export / formatter 等可被多层复用的能力
- Markdown、JSON、SQL、NGQL 等解析或格式化工具

明确不应放入 `shared` 的内容：

- React 组件
- Vue 组件
- provider 特定协议逻辑
- 宿主业务 API
- “暂时不知道放哪里”的代码

一句话：

**`shared` 是跨层纯工具包，不是垃圾桶。**

### 5.7 包名与发布策略

新 SDK 不要求更换当前 npm 包名。

建议策略是：

- 对外主包继续使用 `@kweaver-ai/chatkit`
- React 兼容入口继续保留在主包根导出，尽量不破坏现有接入方式
- 纯 JavaScript、provider、Vue 通过 subpath exports 暴露

建议的对外导出形态如下：

```text
@kweaver-ai/chatkit
@kweaver-ai/chatkit/core
@kweaver-ai/chatkit/providers/dip
@kweaver-ai/chatkit/providers/coze
@kweaver-ai/chatkit/vue
```

也就是说：

- 内部可以按多包或 workspace 组织
- 但外部不必感知内部拆包细节
- 只有在品牌、归属或发布策略发生变化时，才需要讨论是否更换包名

## 6. Core 层设计

### 6.1 设计原则

Core 层必须满足以下原则：

1. 不依赖 React、Vue、Svelte 等框架
2. 不依赖 JSX
3. 不在类型中出现 `ReactNode`
4. 不包含 DOM 渲染逻辑
5. 不包含路由、Portal、弹窗等实现
6. 只暴露状态、命令和事件

### 6.2 核心对象模型

建议定义以下核心对象：

- `ChatKitEngine`
- `Conversation`
- `Message`
- `MessageStage`
- `ToolInvocation`
- `ApplicationContext`
- `FileAttachment`
- `ConversationSession`
- `InterruptState`
- `ThinkingState`
- `DebugRecord`
- `ChatError`

### 6.3 状态模型建议

当前 `dip-chatkit-sdk` 的 block 模型太轻，当前 `DipChat` 的 progress 模型更接近完整产品能力。

因此 v2 建议使用更丰富的统一模型：

- 外层保留消息
- 消息内保留多个阶段或块
- 既能表示最终渲染内容
- 也能表示过程态

建议采用：

- `message.blocks[]` 负责最终内容渲染
- `message.stages[]` 负责过程态、thinking、工具步骤、调试信息
- `message.meta` 负责统计信息

这样能同时覆盖当前两边的优势。

### 6.4 命令接口建议

Core 层建议暴露统一命令：

- `createConversation()`
- `loadConversation()`
- `deleteConversation()`
- `send()`
- `regenerate()`
- `cancel()`
- `stop()`
- `resumeInterrupt()`
- `injectApplicationContext()`
- `setInputFiles()`
- `clearInputFiles()`

### 6.5 事件接口建议

Core 层建议至少提供这些事件：

- `conversationChanged`
- `messageAppended`
- `messageUpdated`
- `streamStarted`
- `streamCompleted`
- `streamError`
- `interruptRaised`
- `sessionExpired`
- `debugRecordAdded`
- `stateChanged`

同时建议明确提供两类订阅方式：

- `subscribe(listener)`：订阅每次状态提交后的最新快照，适合简单场景和自定义 UI 快速接入
- `on(eventName, handler)`：订阅细粒度领域事件，适合性能敏感场景、埋点、日志和局部联动

两者关系建议定义为：

- `subscribe()` 面向“状态快照”
- `on()` 面向“事件流”
- `stateChanged` 可以视为 `subscribe()` 对应的内部领域事件

也就是说：

- 集成方只想拿到最新状态时，用 `subscribe()`
- 集成方只关心某类变化时，用 `on('messageAppended', ...)`、`on('streamStarted', ...)` 这类细粒度事件

### 6.6 BlockRegistry 无框架化

当前 SDK 的 `BlockRegistry` 是 React 耦合点之一，主要问题是：

- `Icon` 使用 `React.ReactNode`
- `onClick` 的语义也偏向 React UI

这使它不能直接进入无框架 core。

v2 建议把 BlockRegistry 拆成两层：

1. core 层的 `BlockDefinitionRegistry`
2. UI adapter 层的 `BlockRendererRegistry`

#### Core 层定义

core 层只保存 block 的元数据，不包含任何框架对象，例如：

```ts
interface BlockDefinition {
  type: string;
  title?: string;
  icon?: {
    kind: 'token';
    value: string;
  } | {
    kind: 'url';
    value: string;
  };
  capabilities?: string[];
}
```

这里的 `icon` 只是可被 UI 解读的描述，不是具体渲染对象。

#### UI Adapter 层定义

UI adapter 再把 `type` 或 `icon token` 映射到具体渲染物：

- React adapter：`ReactNode`
- Vue adapter：`VNodeChild`
- 未来如果需要，再额外扩展 Web Components adapter

#### 好处

- core 不再依赖任何框架类型
- block 元数据可以被多个 UI adapter 共用
- 同一个 block 可以在 React 和 Vue 中有不同渲染形态

## 7. Provider 层设计

### 7.1 Provider 统一接口

建议定义统一接口：

```ts
interface ChatProvider {
  getOnboardingInfo(): Promise<OnboardingInfo>;
  createConversation(input?: CreateConversationInput): Promise<CreateConversationResult>;
  listConversations(input?: ListConversationsInput): Promise<ListConversationsResult>;
  getConversation(input: GetConversationInput): Promise<GetConversationResult>;
  deleteConversation(input: DeleteConversationInput): Promise<void>;
  send(input: SendMessageInput): AsyncIterable<ProviderEvent>;
  stop(input: StopConversationInput): Promise<void>;
  resumeInterrupt?(input: ResumeInterruptInput): AsyncIterable<ProviderEvent>;
}
```

这里需要明确职责边界：

- provider 只负责产出 `AsyncIterable<ProviderEvent>`
- `ChatKitEngine` 负责消费这个 iterable、归一化事件、更新内部状态
- UI adapter 不直接消费 provider 的 iterable，只订阅 core 的状态和事件

还需要明确另一层职责边界：

- 后端虽然都是流式接口，但可能存在“非增量流式”和“增量流式”两种模式
- 非增量流式下，单帧通常已经是可直接解析的完整 JSON
- 增量流式下，单帧可能只是 `{ key, content, action }` 这类 patch，前端必须先组合后才能得到完整 JSON
- 这类“增量 patch -> 完整 JSON”的组装逻辑不应泄露给 UI adapter，而应放在 provider 的流式归一化层中处理

也就是说：

- core 不应感知上游到底是增量流式还是非增量流式
- UI adapter 更不应直接处理 patch 合并
- provider 对外产出的 `ProviderEvent` 必须已经是可被 core 正常消费的规范化事件

建议的数据流是：

```text
provider.send()
  -> Stream Transport / SSE Parser
  -> Incremental Stream Assembler（如有需要，先合并 patch）
  -> ChatKitEngine 消费 ProviderEvent
  -> reducer / state machine 更新状态
  -> emit stateChanged / messageUpdated / streamCompleted 等事件
  -> React / Vue / 纯 JS 宿主订阅并渲染
```

### 7.2 DIP Provider

以当前 `DipChat` 和 `DIPBase` 的实现为基础，沉淀为统一 DIP provider。

第一阶段应覆盖：

- 会话列表
- 会话详情
- SSE 流式输出
- 增量流式与非增量流式的统一归一化
- regenerate
- interrupt 恢复
- 工具映射
- thinking / ttft / token / elapsedTime
- 文件选择与附件语义

其中流式归一化建议拆成一个独立的内部能力，例如 `StreamNormalizer` / `IncrementalAssembler`：

- 非增量流式：直接把单帧完整 JSON 解析为标准事件
- 增量流式：参考当前 `DipChat/useStreamingOut -> processIncrementalUpdate` 的思路，先把 patch 帧合成为完整 JSON，再转换为标准事件
- 对 core 来说，两种模式最终都只看到统一的 `ProviderEvent`

### 7.3 Coze Provider

保留当前 `ChatKitCoze` 能力，但不要再把 Coze UI 和 Coze 状态绑在 React 组件里。

应改造成：

- Coze 协议归一化
- 与 core 统一消息模型对齐
- 与 React / Vue UI 适配层解耦

## 8. UI Adapter 设计

### 8.1 React Adapter

React Adapter 的目标是兼容现有 `dip-chatkit-sdk` 用户。

应尽量保留以下对外概念：

- `Assistant`
- `Copilot`
- `ChatKitCoze`
- `send()`
- `createConversation()`
- `injectApplicationContext()`

但内部不再自己处理状态，而是只负责：

- 订阅 core 状态
- 调用 core 命令
- 渲染 UI

### 8.2 Vue Adapter

Vue Adapter 的目标是让 Vue 3 项目可以直接复用同一套 core 和 provider 能力。

第一阶段建议提供：

- `ChatKitProvider`
- `useChatKit`

第二步再补齐：

- `Assistant`
- `Copilot`

实现原则：

- 优先基于 Vue 3 Composition API
- 不引入 React 风格的运行时依赖
- 与 React Adapter 共享同一套 core 状态和 provider 能力

### 8.3 Copilot 的定位

Copilot 不应再是单独维护的一套平台逻辑，而应该是：

- 同一个 core
- 同一个 provider
- 不同的 UI shell

也就是说：

- `Assistant` 是完整工作台形态
- `Copilot` 是轻量伴随形态

两者共享一套能力模型。

这里的“共享”指的是共享同一套 core、provider、消息模型和状态机设计，不等于默认共享同一个运行时实例。

建议实例管理规则明确为：

- 同一个 `ChatKitProvider` 下挂载的 `Assistant` / `Copilot`，默认共享同一个 `ChatKitEngine`
- 不同 `ChatKitProvider` 或手动创建的不同 engine，默认彼此隔离
- 如果宿主希望主区域 `Assistant` 和侧边栏 `Copilot` 联动，就放在同一个 provider 作用域下
- 如果宿主希望它们互不影响，就分别创建独立 provider / engine

### 8.4 样式方案

无框架 core 不应携带任何样式方案，样式只存在于 UI adapter 层。

#### React Adapter

React Adapter 建议采用：

- `CSS Modules + CSS Variables`

理由：

- 不依赖 Tailwind 体系
- 不强依赖宿主打包环境先注入某种全局 CSS
- `CSS Variables` 可以承接主题和容器级自定义
- `CSS Modules` 可以避免样式污染

不建议把 Tailwind 作为 v2 的唯一前提，因为它会让“无框架 + 多宿主”的目标变得更难落地。

#### Vue Adapter

Vue Adapter 建议采用：

- `Scoped CSS + CSS Variables`

理由：

- 更符合 Vue 单文件组件的常见组织方式
- 不强依赖 CSS-in-JS 或 Tailwind
- `CSS Variables` 可以与 React Adapter 共用主题 token 语义
- `Scoped CSS` 可以降低宿主工程的样式污染风险

#### 统一主题策略

建议定义一套共享主题 token 语义，例如：

- `--chatkit-color-primary`
- `--chatkit-color-text`
- `--chatkit-color-border`
- `--chatkit-radius-md`
- `--chatkit-spacing-sm`
- `--chatkit-font-family`

React 和 Vue 共享 token 语义，但不共享具体框架实现。

### 8.5 集成方式示例

架构文档除了讲分层，也需要让集成方理解“最终怎么用”。

以下示例是 ChatKit v2 的目标接入姿势。

#### A. 纯 JavaScript 使用

```js
import { createChatKitEngine } from '@kweaver-ai/chatkit/core';
import { createDipProvider } from '@kweaver-ai/chatkit/providers/dip';

const provider = createDipProvider({
  baseUrl: 'https://dip.example.com/api/agent-app/v1',
  agentKey: 'agent-key',
  token: 'Bearer xxx',
});

const engine = createChatKitEngine({ provider });

engine.subscribe((state) => {
  console.log('messages', state.messages);
  console.log('conversations', state.conversations);
});

engine.on('messageAppended', (event) => {
  console.log('new message id', event.message.id);
});

engine.on('streamStarted', (event) => {
  console.log('stream started', event.conversationId);
});

await engine.createConversation();

await engine.send({
  text: '帮我分析这个节点故障',
  applicationContext: {
    title: '中心节点',
    data: { node_id: 'node-uuid-1' },
  },
});
```

适用场景：

- 宿主自己用 DOM / Canvas / 其他技术渲染 UI
- 只想复用 ChatKit 的内核和 provider 能力

补充说明：

- `subscribe()` 适合拿整份状态快照快速驱动 UI
- `on(...)` 适合只监听局部变化，避免每次都处理完整状态

#### B. React Provider + 内置 UI

```tsx
import {
  ChatKitProvider,
  Assistant,
  createDipProvider,
} from '@kweaver-ai/chatkit';

const provider = createDipProvider({
  baseUrl: 'https://dip.example.com/api/agent-app/v1',
  agentKey: 'agent-key',
  token: 'Bearer xxx',
});

export default function App() {
  return (
    <ChatKitProvider provider={provider}>
      <Assistant visible />
    </ChatKitProvider>
  );
}
```

适用场景：

- 想保持类似 `dip-chatkit-sdk` 的接入习惯
- 又希望使用新的内核和更完整的能力

#### C. React Provider + 自定义 UI

```tsx
import {
  ChatKitProvider,
  useChatKit,
  createDipProvider,
} from '@kweaver-ai/chatkit';

const provider = createDipProvider({
  baseUrl: 'https://dip.example.com/api/agent-app/v1',
  agentKey: 'agent-key',
  token: 'Bearer xxx',
});

function CustomChat() {
  const { state, commands } = useChatKit();

  return (
    <div>
      <button onClick={() => commands.createConversation()}>新建会话</button>
      <button
        onClick={() =>
          commands.send({
            text: '查询本月告警趋势',
          })
        }
      >
        发送
      </button>

      <pre>{JSON.stringify(state.messages, null, 2)}</pre>
    </div>
  );
}

export default function App() {
  return (
    <ChatKitProvider provider={provider}>
      <CustomChat />
    </ChatKitProvider>
  );
}
```

适用场景：

- 需要自定义 UI
- 但不想重写对话逻辑和 provider 接入

#### D. Vue Provider + 自定义 UI

```vue
<!-- App.vue -->
<script setup lang="ts">
import {
  ChatKitProvider,
  createDipProvider,
} from '@kweaver-ai/chatkit/vue';
import CustomChat from './CustomChat.vue';

const provider = createDipProvider({
  baseUrl: 'https://dip.example.com/api/agent-app/v1',
  agentKey: 'agent-key',
  token: 'Bearer xxx',
});
</script>

<template>
  <ChatKitProvider :provider="provider">
    <CustomChat />
  </ChatKitProvider>
</template>
```

```vue
<!-- CustomChat.vue -->
<script setup lang="ts">
import { useChatKit } from '@kweaver-ai/chatkit/vue';

const { state, commands } = useChatKit();
</script>

<template>
  <div>
    <button @click="commands.createConversation()">新建会话</button>
    <button @click="commands.send({ text: '查询本月告警趋势' })">发送</button>
    <pre>{{ JSON.stringify(state.messages, null, 2) }}</pre>
  </div>
</template>
```

适用场景：

- Vue 3 项目
- 第一阶段先验证 Vue binding 层是否顺畅
- 既想复用 ChatKit 内核能力，也想保留 Vue 生态的开发体验

### 8.6 国际化设计

新的 ChatKit v2 必须把国际化作为基础能力，而不是后补功能。

设计原则：

1. core 不写死任何面向用户的文案
2. provider 不直接返回本地化字符串，而是返回结构化状态码、类型和原始数据
3. UI adapter 负责把文案 key 映射为最终语言文本
4. 宿主可以注入 locale、messages 和兜底翻译函数

建议提供统一接口：

```ts
interface ChatKitI18nConfig {
  locale: string;
  fallbackLocale?: string;
  messages?: Record<string, string>;
  t?: (key: string, params?: Record<string, unknown>) => string;
}
```

建议覆盖的国际化范围：

- 输入框占位文案
- 发送、停止、重新生成、复制等操作文案
- 工具卡片标题和状态文案
- 错误提示
- 空态、加载态、会话列表文案
- 文件上传和附件状态文案

实现上建议：

- core 内只保存 `labelKey`、`statusKey`、`errorCode`
- React / Vue adapter 内再通过 `t()` 渲染为最终文案
- 默认至少提供 `zh-CN`、`zh-TW`、`en-US` 三套内置语言包
- 允许宿主覆盖默认文案，避免 SDK 写死业务术语

## 9. 能力归属划分

### 9.1 应沉到 Core 的能力

以下能力应进入 v2 core：

1. 流式状态机
2. 会话产品逻辑
3. regenerate 全语义
4. cancel / stop / interrupt
5. thinking / ttft
6. 错误模型
7. 文件工作流状态
8. 调试数据模型
9. 工具步骤模型
10. 统计信息模型

### 9.2 应沉到 Provider 的能力

1. 平台协议差异
2. SSE / EventStream 解析
3. 工具结果映射
4. 平台特定错误映射
5. 平台特定会话控制

### 9.3 应留在 UI Adapter 的能力

1. 页面布局
2. Drawer / Modal / Sidebar
3. Markdown 渲染
4. 图表、表格、代码展示
5. 输入框、文件选择器
6. 消息分组与视觉样式

### 9.4 应留在 Host Adapter 的能力

1. 路由同步
2. 微前端导航
3. 业务 token 流程
4. 宿主文件上传接口
5. 业务埋点
6. 特定调试流程

## 10. 与当前 `DipChat` / `dip-chatkit-sdk` 的关系

### 10.1 `DipChat` 的定位

`DipChat` 不应作为最终 SDK 直接输出，但非常适合作为：

- 能力来源
- 产品参考实现
- UI 和交互基准

换句话说：

**应从 `DipChat` 抽取能力，而不是复制工程。**

### 10.2 当前 `dip-chatkit-sdk` 的定位

当前项目适合作为：

- v2 的包名和对外入口延续者
- 兼容层承载者
- React Adapter 的第一落点

不适合继续作为唯一内核直接演进。

## 11. 向后兼容策略

### 11.1 兼容原则

对外兼容的是：

- 导出入口
- 主要 props
- 主要实例方法
- 基本使用心智

不强求兼容的是：

- 内部实现方式
- 当前轻量 block-only 数据结构
- 当前私有状态组织

### 11.2 兼容方式

建议采用：

- v2 内核重写
- React 包保留旧组件名
- 通过 adapter 适配旧 props
- 对新增能力采用增量 props，不破坏旧调用

例如：

- 文件工作流默认关闭
- 调试能力默认关闭
- thinking 展示默认在 provider 返回时启用

### 11.3 包名结论

当前包名 `@kweaver-ai/chatkit` 不必须更换。

更稳妥的做法是：

- 继续保留 `@kweaver-ai/chatkit` 作为主包名
- React 兼容入口继续从主包导出
- 新增纯 JavaScript、provider、Vue 的 subpath exports

这样可以在不打断现有接入方的前提下，逐步完成内核重构和能力扩展。

## 12. 推荐迁移顺序

当前需要正视一个现实：`dip-chatkit-sdk` 和 `DipChat` 目前都没有成体系的 UT。

这不是 v2 重构不能开始的理由，但它意味着：

- 不能用“先全部重写完再补测试”的方式推进
- 必须从第一阶段开始为 core 和 provider 建测试骨架
- React / Vue adapter 至少要补关键交互和 smoke test，避免回归不可控

### 阶段一：抽模型

先确定：

- 消息模型
- 阶段模型
- 会话模型
- 工具模型
- 文件模型
- 错误模型
- interrupt 模型
- i18n 模型（`locale`、`message bundle`、`labelKey`、`errorCode`）
- 单元测试基线和 fixture 目录结构

### 阶段二：抽 Core

从当前两边实现里抽离：

- 状态机
- 事件流
- 通用命令
- 先为状态机、消息归一化、工具归一化补第一批 UT

### 阶段三：落 DIP Provider

以 `DipChat` 为蓝本，先把 DIP provider 做完整。

这一阶段需要优先补齐：

- SSE parser 的 UT
- incremental assembler / stream normalizer 的 UT
- 增量流式与非增量流式统一输出的回归用例

### 阶段四：重建 React Adapter 与 Vue Binding 层

优先重建：

1. `Assistant`
2. `Copilot`
3. `ChatKitCoze`
4. Vue 适配层的 `ChatKitProvider / useChatKit`

### 阶段五：补全高级能力

逐步补齐：

1. 文件工作流
2. 调试能力
3. thinking / ttft
4. interrupt 恢复
5. 会话工作台能力
6. 更多工具覆盖
7. Vue 内置 UI 组件（`Assistant` / `Copilot`）

### 阶段六：补齐测试与国际化落地

- 完成 core / provider 的关键路径 UT
- 完成 React / Vue adapter 的关键交互测试
- 补齐 `zh-CN` / `zh-TW` / `en-US` 默认语言包
- 验证宿主自定义国际化覆盖能力

## 13. 风险与规避

### 风险 1：直接搬 `DipChat` 工程代码进 SDK

问题：

- 会把宿主耦合一起带进来

规避：

- 只抽能力和模型
- 不复制宿主工程依赖

### 风险 2：继续沿用当前过轻的 SDK 内部模型

问题：

- thinking、interrupt、文件工作流、调试能力会很难接

规避：

- 使用 richer model
- 内部支持 stages + blocks + meta

### 风险 3：一次性大爆炸重写

问题：

- 风险高
- 回归范围大

规避：

- 分阶段替换
- React 先兼容
- Vue 同步进入第一阶段
- 测试骨架先落地，再逐步扩覆盖

### 风险 4：把 UI 适配和 provider 再次写死

问题：

- 最终还是回到“React SDK”

规避：

- 明确四层边界
- 所有平台协议只进 provider
- 所有渲染逻辑只进 adapter

### 风险 5：国际化和测试在后期补，会导致返工成本高

问题：

- UI 文案和错误提示一旦在 core 或 provider 中写死，后续拆 i18n 成本很高
- 没有 UT 保护时，流式消息、增量 patch 组装和工具映射的回归风险会持续放大

规避：

- 第一阶段就定义 i18n 配置接口和语言包边界
- 第一阶段就为 core / provider 建 UT 骨架
- React / Vue adapter 只承担少量关键路径测试，不追求一开始全量覆盖

## 14. 建议最终目标

建议对 ChatKit v2 的正式目标定义为：

**重构一套以 `DipChat` 能力为基础的 ChatKit v2：核心层无框架，平台层支持 DIP/Coze，第一阶段支持纯 JavaScript、React、Vue 三种接入方式，同时对 React 保持现有 `dip-chatkit-sdk` 的主要使用习惯，并内建国际化能力。**

## 15. 最终结论

这不是“继续写一个 React SDK”，也不是“把 `DipChat` 换个目录名”。

正确的方向应是：

- 以 `DipChat` 为能力母本
- 以 `dip-chatkit-sdk` 为对外兼容入口
- 以无框架 core 为真正内核
- 通过纯 JavaScript、React、Vue 三种方式优先对外输出
- 保留 `@kweaver-ai/chatkit` 包名，降低迁移成本
- 从第一阶段开始补测试和国际化基础设施

这条路线既保住了现有投入，也为未来多框架、多宿主、多平台接入留出了空间。
