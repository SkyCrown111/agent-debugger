# Agent Debugger

<div align="center">

![Agent Debugger Logo](./docs/logo.png)

**AI Agent 的 Chrome DevTools**

可视化调试、监控、分析你的 AI Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)
[![Electron](https://img.shields.io/badge/Electron-28-blue)](https://www.electronjs.org/)

[English](./README.md) | [中文文档](./README_CN.md)

</div>

---

## ✨ 特性

### 🔍 思考流可视化
- **流程图视图**: 树形结构展示 Agent 思考过程
- **时间线视图**: 按时间顺序查看所有活动
- **搜索过滤**: 快速定位特定思考或工具调用
- **详情面板**: 查看完整内容、参数、结果

### 🛠️ 工具调用追踪
- **实时监控**: 追踪所有工具调用状态
- **性能分析**: 识别慢调用和性能瓶颈
- **参数详情**: 查看完整调用参数和返回值
- **错误追踪**: 快速定位失败原因

### 📊 Token 分析
- **使用统计**: 按模型分类统计 Token 使用
- **趋势图表**: 可视化 Token 使用趋势
- **成本计算**: 预估 API 调用成本
- **自定义定价**: 支持自定义模型定价

### 🔌 多语言 SDK
- **TypeScript SDK**: 原生支持 JavaScript/TypeScript 项目
- **Python SDK**: 支持 Python Agent 项目
- **LangChain 集成**: 一键集成 LangChain Callback

---

## 📸 截图

### Dashboard 总览
![Dashboard](./docs/screenshots/dashboard.png)

### 思考流可视化
![Thought Flow](./docs/screenshots/thought-flow.png)

### 工具调用追踪
![Tool Trace](./docs/screenshots/tool-trace.png)

### Token 分析
![Token Analysis](./docs/screenshots/token-analysis.png)

---

## 🚀 快速开始

### 安装

#### 下载桌面应用
```bash
# macOS
brew install --cask agent-debugger

# Windows
winget install agent-debugger

# Linux
snap install agent-debugger
```

#### 或从源码构建
```bash
git clone https://github.com/SkyCrown111/agent-debugger.git
cd agent-debugger
npm install
npm run electron:dev
```

### Python SDK

```bash
pip install agent-debugger
```

### TypeScript/JavaScript SDK

```bash
npm install @hermes/agent-sdk
```

---

## 💡 使用示例

### OpenAI 集成 (推荐)

```typescript
import { HermesOpenAI } from '@hermes/agent-sdk/openai';

// 只需替换 OpenAI 为 HermesOpenAI
const openai = new HermesOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  hermes: { agentName: 'My Agent' }
});

// 正常使用 - 自动追踪所有调用
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});
// Token 使用、思考过程、工具调用自动发送到调试器
```

### Anthropic (Claude) 集成

```typescript
import { HermesAnthropic } from '@hermes/agent-sdk/anthropic';

const anthropic = new HermesAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  hermes: { agentName: 'Claude Agent' }
});

const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }]
});
// 自动追踪思考过程、工具调用、Token 使用
```

### LangChain 集成

```typescript
import { HermesCallbackHandler } from '@hermes/agent-sdk/langchain';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor } from 'langchain/agents';

// 创建回调处理器
const hermesHandler = new HermesCallbackHandler({
  agentName: 'LangChain Agent'
});

// 添加到任何 LangChain 组件
const model = new ChatOpenAI({
  callbacks: [hermesHandler]
});

// 所有执行自动追踪
const executor = AgentExecutor.fromAgentAndTools({
  agent, tools,
  callbacks: [hermesHandler]
});
```

### 手动集成

```typescript
import { Hermes } from '@hermes/agent-sdk';

const hermes = new Hermes({
  agentName: 'Custom Agent',
  serverUrl: 'ws://localhost:8765'
});

await hermes.connect();

// 发送思考
hermes.sendThought({
  content: 'Analyzing user request...',
  type: 'reasoning'
});

// 追踪工具调用
const toolId = hermes.startToolCall({
  toolName: 'web_search',
  params: { query: 'AI news' }
});

const result = await searchWeb('AI news');
hermes.endToolCall(toolId, {
  result,
  status: 'success'
});

// 发送 Token 使用
hermes.sendTokenUsage({
  inputTokens: 100,
  outputTokens: 50,
  model: 'gpt-4'
});
```

---

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────┐
│                   Agent Debugger                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Electron Desktop App                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │  │
│  │  │  Dashboard  │  │ ThoughtFlow │  │ ToolTrace │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────┘  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │  │
│  │  │TokenAnalysis│  │ MessageLog  │  │  Settings │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                               │
│                    WebSocket                             │
│                          │                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │                    SDKs                            │  │
│  │  ┌──────────────┐          ┌──────────────┐       │  │
│  │  │  Python SDK  │          │ TypeScript   │       │  │
│  │  │              │          │     SDK      │       │  │
│  │  └──────────────┘          └──────────────┘       │  │
│  │       │                           │                │  │
│  │  ┌────▼────┐                ┌────▼────┐          │  │
│  │  │LangChain│                │OpenAI   │          │  │
│  │  │Callback │                │SDK      │          │  │
│  │  └─────────┘                └─────────┘          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 项目结构

```
agent-debugger/
├── electron/                 # Electron 主进程
│   ├── main.ts              # 主进程入口
│   ├── preload.ts           # 预加载脚本
│   └── services/            # 后端服务
│       ├── WebSocketServer.ts
│       └── StoreService.ts
├── src/                     # React 前端
│   ├── components/          # UI 组件
│   ├── pages/               # 页面
│   ├── stores/              # Zustand 状态管理
│   ├── hooks/               # 自定义 Hooks
│   └── utils/               # 工具函数
├── sdk/                     # SDK
│   ├── python/              # Python SDK
│   └── typescript/          # TypeScript SDK
├── docs/                    # 文档
│   ├── screenshots/         # 截图
│   └── examples/            # 示例项目
└── examples/                # 完整示例
    ├── python-agent/
    ├── langchain-agent/
    └── typescript-agent/
```

---

## 🛠️ 开发

### 环境要求
- Node.js 18+
- Python 3.8+ (用于 Python SDK)
- npm 或 yarn

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run electron:dev
```

### 构建

```bash
# 构建前端
npm run build

# 构建桌面应用
npm run electron:build
```

### 测试

```bash
# 运行前端测试
npm test

# 运行 Python SDK 测试
cd sdk/python
pytest
```

---

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

### 贡献者

<a href="https://github.com/SkyCrown111/agent-debugger/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=SkyCrown111/agent-debugger" />
</a>

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](./LICENSE) 文件了解详情。

---

## 🙏 致谢

- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Ant Design](https://ant.design/)
- [ReactFlow](https://reactflow.dev/)
- [Recharts](https://recharts.org/)
- [LangChain](https://langchain.com/)

---

## 📮 联系方式

- 作者: SkyCrown111
- GitHub: [@SkyCrown111](https://github.com/SkyCrown111)
- Email: akangx@foxmail.com

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️ Star！**

</div>
