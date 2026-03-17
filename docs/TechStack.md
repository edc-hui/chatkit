# ChatKit v2 技术选型

## 1. 结论

ChatKit v2 先在 `E:/aishu/code/dip-chatkit-sdk-v2` 这个新目录中开发。

当前我选择：

- 构建工具：`Vite`
- 语言：`TypeScript`
- 仓库形态：多包结构（`packages/*`）
- 第一阶段输出：纯 JavaScript core、React adapter、Vue adapter、DIP provider、Coze provider

## 2. 为什么选 Vite，不选 Rsbuild

### 2.1 我选择 Vite 的原因

1. 这个项目是 **library-first**，不是大型业务应用 first。
2. ChatKit v2 需要同时承载：
   - core
   - provider
   - React adapter
   - Vue adapter
   - 示例 playground
3. `Vite + Vitest` 这一套对库开发、示例调试、单测联动更轻，心智成本更低。
4. React 和 Vue 的插件生态成熟，做多 adapter 和 demo 更顺手。
5. 当前阶段我们更需要“快速稳定地把架构跑起来”，不是优先追求更重的打包能力。

### 2.2 我暂时不选 Rsbuild 的原因

1. Rsbuild 更偏向应用工程和重型构建场景，它当然也能做库，但对当前 v2 的核心诉求不是最优先。
2. v2 的关键难点在：
   - framework-agnostic core
   - stream normalizer
   - provider abstraction
   - React/Vue binding
   而不在打包性能瓶颈。
3. 现在就引入 Rsbuild，会把讨论重心过早带到构建层，而不是核心能力层。
4. 等 v2 的多包结构稳定后，如果 playground 或文档站变重，后续再单独评估 Rsbuild 也来得及。

一句话：

**ChatKit v2 第一阶段是 SDK 重构问题，不是构建性能问题，所以我优先选 Vite。**

## 3. 计划使用的依赖

下面是我当前准备采用的依赖清单。这里按“确定会用”和“第一阶段尽量不引入”来区分。

### 3.1 根级开发依赖

确定会用：

- `typescript`
- `vite`
- `vitest`
- `jsdom`
- `@vitejs/plugin-react`
- `@vitejs/plugin-vue`

用途：

- `typescript`：核心语言与类型系统
- `vite`：库开发与 playground 构建
- `vitest` + `jsdom`：单元测试与组件 smoke test
- React / Vue plugin：两套 adapter 和 demo 使用

### 3.2 core / shared 层运行时依赖

确定会用：

- `@microsoft/fetch-event-source`
- `eventemitter3`
- `zod`

用途：

- `@microsoft/fetch-event-source`：SSE / 流式输出基础能力
- `eventemitter3`：事件总线，支撑 `subscribe()` / `on()` 两类订阅模型
- `zod`：对 provider 输入输出、流式事件、配置对象做运行时校验

说明：

- 这里我不会引入大型状态管理库
- 也不打算在第一阶段引入完整 lodash 作为基础依赖
- core 会优先保持“轻依赖 + 强类型”

### 3.3 provider 层依赖

DIP / Coze provider 预计直接复用上面的基础依赖，不额外上大型框架。

在 provider 层重点会自己实现：

- stream parser
- incremental assembler
- provider event normalize
- error mapping

也就是说，provider 层我会尽量避免引入“黑盒 SDK”式的额外依赖。

### 3.4 React adapter 依赖

确定会用：

- `react`（peer dependency）
- `react-dom`（peer dependency）
- `echarts`

说明：

- `react` / `react-dom` 只作为 peer dependency，不绑死宿主版本
- `echarts` 用于图表类 block 的展示
- React adapter 本身不再依赖 Tailwind
- 也不打算引入 Ant Design、MUI 这类重型 UI 组件库

### 3.5 Vue adapter 依赖

确定会用：

- `vue`（peer dependency）
- `echarts`

说明：

- Vue 侧保持 Vue 3 + Composition API
- 图表展示和 React 侧共用 `echarts`
- 第一阶段先做 `ChatKitProvider + useChatKit`
- `Assistant / Copilot` 内置 Vue UI 组件放到下一阶段

### 3.6 Markdown / 代码 / 数学公式渲染依赖

当前准备采用：

- `markdown-it`
- `highlight.js`
- `katex`
- `dompurify`

用途：

- `markdown-it`：统一 Markdown 转换管线，方便 React / Vue 共用一套输出策略
- `highlight.js`：代码高亮
- `katex`：数学公式渲染
- `dompurify`：对最终 HTML 做安全清洗

为什么这次不继续沿用 `react-markdown`：

- 新 v2 不是 React-only SDK
- Markdown 能力需要尽量跨 React / Vue 复用
- 所以这里更适合选框架无关的渲染链路

## 4. 第一阶段明确不引入的东西

为了让 v2 保持边界清晰，第一阶段我会明确不引入这些：

- `tailwindcss`
- `antd`
- `@arco-design/web-react`
- `element-plus`
- `react-markdown`
- `zustand`
- `redux`
- `mobx`
- `lodash` 全量包
- `web-components` 相关运行时方案

原因很简单：

- 它们会让 SDK 过早背上框架、样式或状态管理包袱
- 当前阶段我们要先把 core / provider / adapter 边界做对

## 5. 目录落点

我接下来真正写代码，会优先落在这些目录：

- `packages/core`
- `packages/provider-dip`
- `packages/provider-coze`
- `packages/react`
- `packages/vue`
- `packages/shared`

示例工程会放在：

- `playgrounds/react-demo`
- `playgrounds/vue-demo`

## 6. 这份选型的含义

这不是“永远不能调整”的最终清单，而是我准备开始动手写 v2 时采用的 **第一版稳定技术基线**。

如果后面出现明确证据证明某个依赖不合适，我会调整；但在真正开始编码之前，先把这条基线定住是必要的。
