# dip-chatkit-sdk-v2

ChatKit v2 的新实现仓库，当前在这个目录中持续重构：

- 主包入口 `@kweaver-ai/chatkit`
- 无框架 `core`
- `provider-dip`
- `provider-coze`
- `shared` 流式 Markdown 内核
- `react` adapter
- `vue` binding

## 当前已完成

### Main Package

- `@kweaver-ai/chatkit`
- 根入口聚合 React 主能力导出
- subpath exports:
  - `@kweaver-ai/chatkit/core`
  - `@kweaver-ai/chatkit/provider-dip`
  - `@kweaver-ai/chatkit/provider-coze`
  - `@kweaver-ai/chatkit/react`
  - `@kweaver-ai/chatkit/vue`
  - `@kweaver-ai/chatkit/shared`

### Core

- `createChatKitEngine()`
- `subscribe()` / `on(...)`
- `getOnboardingInfo()`
- `getContextInfo()`
- `injectApplicationContext()` / `removeApplicationContext()`
- provider async iterable 消费
- conversation / message / stream 的统一状态归约
- `stop()` / `cancel()` / `terminate()`
- `HostAdapter` helpers: access token / upload / navigation
- `submitMessageFeedback()`
- 会话列表 / 历史加载 / 重命名 / 删除 / 搜索 / 分页加载更多

### DIP Provider

- `applyIncrementalPatch()`
- `IncrementalAssembler`
- `normalizeDipStream()`
- `createDipProvider()`
- `getOnboardingInfo()` passthrough
- `getContextInfo()` passthrough
- Host Adapter token 透传
- `deepThink / regenerate` 请求体映射
- `terminateConversation` provider hook
- `submitMessageFeedback` passthrough
- SSE transport 抽象

### Coze Provider

- `createCozeProvider()`
- Coze SSE normalize
- `getOnboardingInfo()` passthrough
- `getContextInfo()` passthrough
- Host Adapter token 透传
- `applicationContext` 会序列化进 Coze 用户消息内容，保持旧 `ChatKitCoze` 的上下文语义
- `terminateConversation` provider hook
- `submitMessageFeedback` passthrough

### React Coze Entry

- `ChatKitCoze`
- 基于 `provider-coze + ChatKitProvider + Copilot` 的开箱即用封装
- 对齐旧 SDK 的 Coze 接入入口，同时保留 v2 的 engine / provider 分层

### Shared Markdown

- `renderMarkdown()`
- DOMPurify sanitize
- KaTeX math render
- `repairMarkdown()`
- `createStreamingMarkdownEngine()`

### React

- `ChatKitProvider`
- `useChatKit`
- `useChatKitI18n`
- `useChatKitEventLog`
- `useChatKitCommandLog`
- `Assistant`
- `Copilot`
- `DebuggerPanel`
- onboarding / starter prompts
- 上下文面板：知识网络 / 指标 / 数据源等 provider context
- 支持 `defaultApplicationContext`，并可通过 commands / 内置发送区注入和移除当前 `applicationContext`
- `initialQuestion` 自动首问
- 会话侧栏：加载 / 搜索 / 刷新 / 加载更多 / 重命名 / 删除
- 文件面板：聚合当前会话附件并展示来源 / 使用次数 / 复用已上传文件，支持撤销复用，切换会话时自动清理复用态
- 内置消息操作：`copy / regenerate / feedback`
- `stop()` 能力已接到内置 UI
- `Copilot` 已具备独立壳层、关闭入口，并可与 `Assistant` 共享同一个 engine 状态
- 调试面板：事件流、命令日志、最近命令输入输出、最近事件、事件汇总、`stop/cancel/terminate` 控制、最新错误、状态快照
- React smoke test

### Vue

- `ChatKitProvider`
- `useChatKit`
- `useChatKitI18n`
- `getOnboardingInfo()` command
- `getContextInfo()` command
- `injectApplicationContext()` / `removeApplicationContext()` command
- `submitMessageFeedback()` command
- Vue custom UI demo 已覆盖 onboarding / error / feedback / 会话管理 / 上下文面板 / 文件面板 / 复用已上传文件 / application context 注入移除
- Vue smoke test

### Pure JavaScript

- `createChatKitEngine()` + DOM 自定义 UI demo
- 共享同一套 provider / markdown / i18n 能力
- JS demo 已覆盖 onboarding / error / feedback / 会话管理 / 上下文面板 / 文件面板 / 复用已上传文件 / application context 注入移除

## 开发命令

在仓库根目录执行：

- `npm run test`
- `npm run typecheck`
- `npm run dev:js-demo`
- `npm run dev:react-demo`
- `npm run dev:vue-demo`
- `npm run build:js-demo`
- `npm run build:react-demo`
- `npm run build:vue-demo`

## 当前验证结果

- 单元测试通过（105 tests）
- TypeScript typecheck 通过
- JS demo build 通过
- React demo build 通过
- Vue demo build 通过

## 下一步建议

- 继续补更完整的文件工作流，向 `DipChat` 的文件体验靠拢
- 继续扩调试工作台能力，补更多 provider / stream 诊断信息
- 整理 package exports、示例文档和接入说明
- 最后再做 bundle 体积优化和按需拆分
