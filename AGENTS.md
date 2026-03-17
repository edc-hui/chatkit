# 背景

当前dip-chatkit-sdk-v2是在对dip-chatkit-sdk和DipChat的重构

- dip-chatkit-sdk的路径：/e/aishu/code/dip-chatkit-sdk
- DipChat的路径：/e/aishu/code/decision-agent/agent-web/src/components/DipChat

# 架构

架构设计看设计文档，文档的路径是在当前项目的docs文件夹下,名字是ChatKitV2Architecture.md

# 固定要求

- 全部使用中文回复
- 每次回复前用固定称呼开头：“爱数哥，你好”
- 不能写兼容性代码，除非我主动要求
- 写代码前先描述方案，等我批准再动手
- 需求模糊时，先向我提问澄清，澄清你理解之后再开始写代码
- 写完代码后，列出边缘情况并建议测试用例
- 出bug时，先写能复现的测试再修复
- 每次被纠正后，反思并制定不再犯的错误计划
- 读写文件的时候，优先使用UTF-8
- 在实现react 组件的时候，每个组件都要放在单独一个文件夹下
- 要基于事实，不确定的事情不要胡编乱造

# 项目要求

## 样式方案

使用CSS Module 样式方案

## demo 实现

优先实现react-demo, js-demo和vue-demo暂停实现

## 核心代码实现

优先实现react，js和vue 暂停实现

# skill的位置

你要适当使用skill，位置在当前项目下的 .codex/skills目录

# 当前项目额外要求

- DipChat用的antd版本是v5.x，antdX版本是v1.X, 当前项目用的antd版本是v6.x，antdX版本是v2.X, 在重构的时候，你要注意两个版本的差异
- DipChat与dip-chatkit-sdk共有的功能，以DipChat的实现为准
- 在实现DipChat或dip-chatkit-sdk的功能，你要先深度思路并理解已有代码，列出你重构计划，计划中要包含你准备实现哪些功能点，不要急于动手，等我批准再动手
- 更改核心包的代码之后，要重新build, 避免demo里面使用的是旧版本
