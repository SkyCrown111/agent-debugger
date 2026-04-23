<div align="center">
  <img src="docs/logo.png" alt="Agent Debugger Logo" width="200">
  
  <h1>Agent Debugger</h1>
  
  <p><strong>AI Agent 的 Chrome DevTools</strong></p>
  
  <p>
    <a href="#features">功能特性</a> •
    <a href="#installation">安装</a> •
    <a href="#quick-start">快速开始</a> •
    <a href="#usage">使用指南</a> •
    <a href="#contributing">贡献</a>
  </p>
  
  <p>
    <img src="https://img.shields.io/badge/version-0.1.0-blue.svg" alt="Version">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg" alt="Platform">
  </p>
</div>

---

## 🎯 什么是 Agent Debugger？

Agent Debugger 是一款专为 AI Agent 开发者设计的**可视化调试工具**。就像 Chrome DevTools 让 Web 开发变得透明一样，Agent Debugger 让你能实时看到 Agent 的"思考过程"。

### 为什么需要它？

开发 AI Agent 时，你是否遇到过这些问题：

- 🤔 **Agent 在想什么？** 黑盒决策过程难以理解
- 🔧 **工具调用失败？** 不知道哪个工具出了问题
- 💰 **Token 消耗太快？** 找不到优化方向
- 🐛 **调试困难？** 只能靠日志排查问题

Agent Debugger 解决了这些痛点！

---

## ✨ 功能特性

### 🔍 实时思考可视化
实时展示 Agent 的推理、规划、反思过程，让黑盒变透明。

### 🛠️ 工具调用追踪
完整的工具调用链路：参数、结果、耗时、错误信息一目了然。

### 📊 Token 消耗分析
按模型、按时间段统计 Token 使用，帮你找到优化空间。

### 🤝 多 Agent 协作
支持同时监控多个 Agent，清晰展示协作关系。

### 📝 消息日志
完整记录所有交互消息，支持搜索、过滤、导出。

### 🎨 现代化 UI
深色主题、流畅动画、响应式设计，开发者友好的界面。

---

## 📦 安装

### 方式一：下载安装包（推荐）

前往 [Releases](https://github.com/your-username/agent-debugger/releases) 页面下载对应平台的安装包。

### 方式二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/your-username/agent-debugger.git
cd agent-debugger

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

---

## 🚀 快速开始

### 1. 启动 Agent Debugger

打开应用后，WebSocket 服务器会自动启动在 `ws://localhost:8765`。

### 2. 在你的 Agent 中集成 SDK

```bash
npm install agent-debugger-sdk
```

```typescript
import { createDebuggerClient } from 'agent-debugger-sdk';

// 创建客户端
const debugger = createDebuggerClient('MyAgent', {
  framework: 'LangChain',
  model: 'gpt-4',
});

// 连接到 Agent Debugger
await debugger.connect();

// 发送思考过程
debugger.sendThought({
  content: '用户想要查询天气，我需要调用天气 API',
  type: 'reasoning',
});

// 发送工具调用
debugger.sendToolCall({
  id: 'call-123',
  name: 'get_weather',
  params: { city: 'Beijing' },
});

// 发送工具结果
debugger.sendToolResult({
  id: 'call-123',
  result: { temp: 25, condition: 'Sunny' },
  duration: 120,
});

// 发送 Token 使用
debugger.sendTokenUsage({
  input: 150,
  output: 80,
  model: 'gpt-4',
});
```

### 3. 查看可视化界面

打开 Agent Debugger，你将看到：
- Agent 连接状态
- 实时思考过程
- 工具调用链路
- Token 消耗统计

---

## 📖 使用指南

### 支持的 Agent 框架

Agent Debugger 支持主流 Agent 框架：

| 框架 | 集成方式 | 文档 |
|------|---------|------|
| LangChain | SDK 集成 | [docs/langchain.md](docs/langchain.md) |
| AutoGPT | SDK 集成 | [docs/autogpt.md](docs/autogpt.md) |
| BabyAGI | SDK 集成 | [docs/babyagi.md](docs/babyagi.md) |
| Custom Agent | SDK 集成 | [docs/custom.md](docs/custom.md) |

### 界面说明

#### 🏠 Dashboard（仪表盘）
- Agent 总览
- 活跃会话数
- Token 消耗统计
- 最近活动时间线

#### 💭 Thought Flow（思考流）
- 实时思考过程
- 推理链路可视化
- 时间线展示

#### 🔧 Tool Trace（工具追踪）
- 工具调用列表
- 参数/结果详情
- 执行时间统计

#### 📊 Token Analysis（Token 分析）
- 总消耗统计
- 按模型分类
- 输入/输出占比

#### 📝 Message Log（消息日志）
- 完整消息记录
- 搜索/过滤
- 导出功能

---

## 🎨 截图

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Thought Flow
![Thought Flow](docs/screenshots/thought-flow.png)

### Tool Trace
![Tool Trace](docs/screenshots/tool-trace.png)

---

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Debugger                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Electron Main Process               │   │
│  │  ┌──────────────┐      ┌──────────────────┐    │   │
│  │  │ WebSocket    │      │ IPC Handlers     │    │   │
│  │  │ Server       │◄────►│ (Window, Config) │    │   │
│  │  └──────┬───────┘      └──────────────────┘    │   │
│  │         │                                       │   │
│  │  ┌──────▼───────┐                              │   │
│  │  │ Store Service│                              │   │
│  │  │ (Persistence)│                              │   │
│  │  └──────────────┘                              │   │
│  └─────────────────────────────────────────────────┘   │
│                          ▲                              │
│                          │ IPC                          │
│  ┌───────────────────────▼─────────────────────────┐   │
│  │              React Renderer Process              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │   │
│  │  │Dashboard │  │Thought   │  │Tool      │     │   │
│  │  │          │  │Flow      │  │Trace     │     │   │
│  │  └──────────┘  └──────────┘  └──────────┘     │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │   │
│  │  │Token     │  │Message   │  │Settings  │     │   │
│  │  │Analysis  │  │Log       │  │          │     │   │
│  │  └──────────┘  └──────────┘  └──────────┘     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ WebSocket
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │  Agent 1  │   │  Agent 2  │   │  Agent N  │
    │ (SDK)     │   │ (SDK)     │   │ (SDK)     │
    └───────────┘   └───────────┘   └───────────┘
```

---

## 🤝 贡献

欢迎贡献代码、报告 Bug、提出建议！

### 开发指南

```bash
# Fork 并克隆仓库
git clone https://github.com/your-username/agent-debugger.git

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 构建生产版本
npm run build
```

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 编写单元测试
- 更新文档

---

## 📄 License

[MIT License](LICENSE)

---

## 🙏 致谢

感谢以下开源项目：

- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Ant Design](https://ant.design/)
- [Vite](https://vitejs.dev/)

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/your-username">Erpan</a></p>
  <p>如果这个项目对你有帮助，请给一个 ⭐️ Star！</p>
</div>
