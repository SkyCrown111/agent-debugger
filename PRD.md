# Agent Debugger - 产品设计文档

## 📋 项目概述

**项目名称**: Agent Debugger  
**定位**: AI Agent 的 Chrome DevTools - 可视化调试、监控、分析工具  
**目标用户**: AI Agent 开发者、AI 应用开发者、研究者  
**技术栈**: Electron + React + TypeScript + WebSocket

---

## 🎯 核心价值

### 痛点分析
1. **调试困难** - Agent 思考过程是黑盒，难以追踪
2. **工具调用不透明** - 不知道 Agent 调用了哪些工具、参数是什么
3. **Token 消耗不明** - 无法实时监控成本
4. **多 Agent 混乱** - 多个 Agent 协作时难以理清关系
5. **错误难定位** - Agent 出错时不知道哪一步出了问题

### 解决方案
提供类似 Chrome DevTools 的可视化调试界面，让开发者能够：
- 实时查看 Agent 思考过程
- 追踪每一次工具调用
- 分析 Token 消耗
- 可视化多 Agent 协作
- 回放和调试错误

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Debugger                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Electron 主进程                      │   │
│  │  - 窗口管理                                       │   │
│  │  - 文件系统访问                                   │   │
│  │  - 本地存储                                       │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              WebSocket Server                     │   │
│  │  - 接收 Agent 连接                               │   │
│  │  - 消息拦截与转发                                 │   │
│  │  - 事件广播                                       │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              React 渲染进程                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │ 思考流  │ │工具调用 │ │ Token   │           │   │
│  │  │ 可视化  │ │ 追踪    │ │ 分析    │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │ 消息日志│ │性能监控 │ │ 错误    │           │   │
│  │  │         │ │         │ │ 调试    │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘           │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ WebSocket
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────┴────┐      ┌────┴────┐      ┌────┴────┐
   │ Hermes  │      │ nanobot │      │ OpenClaw│
   │ Agent   │      │ Agent   │      │ Agent   │
   └─────────┘      └─────────┘      └─────────┘
```

---

## 📦 功能模块

### 1. Agent 连接管理
- 支持 WebSocket 连接
- 自动发现本地运行的 Agent
- 支持多 Agent 同时连接
- 连接状态监控

### 2. 思考流可视化
- 实时显示 Agent 思考过程
- 思维链路图（树形结构）
- 思考时间统计
- 思考内容搜索/过滤

### 3. 工具调用追踪
- 工具调用时间线
- 参数/返回值查看
- 调用成功率统计
- 慢调用告警

### 4. Token 消耗分析
- 实时 Token 计数
- 按模型分类统计
- 成本估算
- 历史趋势图

### 5. 消息日志
- 完整消息记录
- 请求/响应对比
- 消息搜索
- 导出功能

### 6. 性能监控
- 响应时间
- 并发请求数
- 错误率
- 资源占用

### 7. 错误调试
- 错误堆栈追踪
- 错误回放
- 断点调试（可选）
- 错误分类统计

### 8. 多 Agent 协作可视化
- Agent 关系图
- 消息流向
- 任务分配
- 协作时间线

---

## 🎨 UI 设计

### 主界面布局
```
┌─────────────────────────────────────────────────────────┐
│  Agent Debugger                    ─ □ ✕               │
├─────────────────────────────────────────────────────────┤
│ [连接] [思考流] [工具] [Token] [日志] [性能] [设置]    │
├───────────────────┬─────────────────────────────────────┤
│                   │                                     │
│   Agent 列表      │         主内容区                     │
│                   │                                     │
│   🟢 Hermes-1     │   ┌─────────────────────────────┐   │
│   🟢 nanobot-2    │   │ 思考过程可视化               │   │
│   ⚪ OpenClaw-3   │   │                             │   │
│                   │   │  User: "帮我写一个函数"      │   │
│                   │   │    ↓                        │   │
│                   │   │  Think: 分析需求...          │   │
│                   │   │    ↓                        │   │
│                   │   │  Tool: read_file()          │   │
│                   │   │    ↓                        │   │
│                   │   │  Think: 查看代码结构...      │   │
│                   │   │    ↓                        │   │
│                   │   │  Tool: write_file()         │   │
│                   │   │                             │   │
│                   │   └─────────────────────────────┘   │
│                   │                                     │
├───────────────────┴─────────────────────────────────────┤
│ Token: 1,234 | 成本: $0.02 | 工具调用: 5 | 耗时: 3.2s  │
└─────────────────────────────────────────────────────────┘
```

### 设计风格
- 深色主题（类似 VS Code）
- 玻璃拟态效果
- 渐变色高亮
- 动画过渡

---

## 🔌 SDK 设计

### Agent 端集成（最小侵入）

```python
# Python SDK
from agent_debugger import Debugger

# 方式1: 装饰器模式
@Debugger.trace()
def my_agent_task():
    # Agent 逻辑
    pass

# 方式2: 上下文管理器
with Debugger.session("my-agent") as session:
    session.log_thought("正在分析用户需求...")
    session.log_tool("read_file", {"path": "app.py"})
    session.log_result({"content": "..."})

# 方式3: 自动集成（推荐）
Debugger.install()  # 自动拦截所有 LLM 调用
```

```javascript
// JavaScript/TypeScript SDK
import { Debugger } from 'agent-debugger-sdk';

// 自动集成
Debugger.install({
  endpoint: 'ws://localhost:8765',
  agentName: 'my-agent'
});

// 手动追踪
Debugger.logThought('分析中...');
Debugger.logTool('read_file', params, result);
```

---

## 📊 数据模型

### Session（会话）
```typescript
interface Session {
  id: string;
  agentName: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'error';
  totalTokens: number;
  totalCost: number;
  toolCalls: number;
}
```

### Thought（思考）
```typescript
interface Thought {
  id: string;
  sessionId: string;
  timestamp: Date;
  content: string;
  type: 'reasoning' | 'planning' | 'reflection';
  duration: number; // ms
  tokens: number;
}
```

### ToolCall（工具调用）
```typescript
interface ToolCall {
  id: string;
  sessionId: string;
  timestamp: Date;
  toolName: string;
  params: any;
  result?: any;
  status: 'pending' | 'success' | 'error';
  duration: number;
  error?: string;
}
```

---

## 🚀 开发计划

### Phase 1: MVP（1-2周）
- [x] 项目框架搭建
- [ ] WebSocket 服务器
- [ ] 基础 UI 框架
- [ ] Agent 连接功能
- [ ] 消息日志展示
- [ ] Python SDK 基础版

### Phase 2: 核心功能（2-3周）
- [ ] 思考流可视化
- [ ] 工具调用追踪
- [ ] Token 统计
- [ ] 性能监控
- [ ] JavaScript SDK

### Phase 3: 高级功能（2-3周）
- [ ] 多 Agent 协作可视化
- [ ] 错误调试
- [ ] 数据导出
- [ ] 历史记录

### Phase 4: 优化与发布（1-2周）
- [ ] 性能优化
- [ ] 文档完善
- [ ] 示例项目
- [ ] GitHub 发布

---

## 📈 增长策略

### 技术社区推广
1. GitHub Trending 优化
   - 完善的 README
   - 清晰的架构图
   - 动图演示
   - 徽章展示

2. 内容营销
   - 写技术博客（掘金、知乎、CSDN）
   - 制作视频教程（B站）
   - 参与开源社区讨论

3. 社区建设
   - Discord 服务器
   - GitHub Discussions
   - 定期更新

### 合作推广
- 与 Hermes/nanobot/OpenClaw 社区合作
- AI 开发者社群推广
- 技术会议分享

---

## 💰 商业化（未来）

### 免费版
- 单 Agent 调试
- 基础功能
- 本地使用

### Pro 版（$19/月）
- 多 Agent 支持
- 高级分析
- 团队协作
- 云端同步

### Enterprise 版（定制）
- 私有部署
- 定制开发
- 技术支持
