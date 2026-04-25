# Agent Debugger 用户指南

## 简介

Agent Debugger 是一个可视化的 AI Agent 调试和监控工具，帮助开发者：

- 实时监控 Agent 的思考过程
- 追踪工具调用和执行结果
- 分析 Token 使用情况
- 调试错误和异常
- 查看多 Agent 协作流程

## 安装

### 桌面应用

1. 下载最新版本的安装包
2. 运行安装程序
3. 启动 Agent Debugger

### Python SDK

```bash
pip install agent-debugger

# 可选依赖
pip install agent-debugger[langchain]  # LangChain 集成
pip install agent-debugger[openai]      # OpenAI 集成
pip install agent-debugger[all]         # 所有集成
```

### TypeScript SDK

```bash
npm install agent-debugger-sdk
```

## 快速开始

### 1. 启动桌面应用

启动 Agent Debugger 后，WebSocket 服务器会自动在 `ws://localhost:8765` 运行。

### 2. 连接你的 Agent

#### Python 示例

```python
from agent_debugger import create_client, ThoughtType

# 创建客户端
client = create_client("My Agent")

# 连接到调试器
await client.connect()

# 发送思考过程
client.send_thought(
    content="正在分析用户请求...",
    thought_type=ThoughtType.REASONING
)

# 追踪工具调用
tool_id = client.start_tool_call("search", {"query": "AI"})
# ... 执行工具 ...
client.end_tool_call(tool_id, result={"data": "..."})

# 断开连接
await client.disconnect()
```

#### TypeScript 示例

```typescript
import { createDebuggerClient } from 'agent-debugger-sdk';

const client = createDebuggerClient('My Agent');
await client.connect();

client.sendThought({
  content: '正在分析用户请求...',
  type: 'reasoning'
});

client.disconnect();
```

## 功能模块

### 1. Dashboard（仪表盘）

- 实时显示所有 Agent 状态
- Token 使用统计
- 工具调用成功率
- 错误日志概览

### 2. Thought Flow（思考流程）

- 可视化 Agent 的思考过程
- 支持多种思考类型：
  - Reasoning（推理）
  - Planning（规划）
  - Reflection（反思）
  - Observation（观察）
  - Action（行动）

### 3. Tool Trace（工具追踪）

- 工具调用时间线
- 参数和结果详情
- 执行时间分析
- 成功/失败状态

### 4. Token Analysis（Token 分析）

- 输入/输出 Token 统计
- 按模型分类
- 成本估算
- 使用趋势图表

### 5. Error Debug（错误调试）

- 错误日志列表
- 堆栈追踪
- 错误上下文
- 解决建议

### 6. Multi-Agent（多 Agent）

- Agent 协作可视化
- 消息流向图
- 依赖关系展示

### 7. Performance（性能分析）

- 响应时间统计
- 工具执行效率
- 瓶颈识别
- 性能优化建议

## 高级用法

### 使用装饰器

```python
from agent_debugger import create_client, trace_tool, trace_thought, ThoughtType

client = create_client("Decorated Agent")
await client.connect()

@trace_tool(client, "search")
async def search_web(query: str):
    # 自动追踪工具调用
    return {"results": [...]}

@trace_thought(client, ThoughtType.PLANNING)
async def plan_task(task: str):
    # 自动追踪思考过程
    return "执行计划..."
```

### 使用上下文管理器

```python
async with client.thought_context(ThoughtType.REASONING) as thought:
    thought.write("分析中...\n")
    thought.write("得出结论...")
    # 退出时自动发送

async with client.tool_context("calculator", {"expr": "1+1"}):
    result = 1 + 1
    # 退出时自动发送结果
```

### LangChain 集成

```python
from langchain.agents import AgentExecutor
from agent_debugger.langchain import LangChainTracer

tracer = LangChainTracer.create("LangChain Agent")

agent = AgentExecutor.from_agent_and_tools(
    agent=agent,
    tools=tools,
    callbacks=[tracer]
)
```

### OpenAI 集成

```python
from openai import OpenAI
from agent_debugger.openai import OpenAITracer

client = create_client("OpenAI Agent")
await client.connect()

tracer = OpenAITracer(client)

with tracer.trace_chat_completion(model="gpt-4", messages=[...]) as call:
    response = openai.chat.completions.create(...)
    call.set_response(response)
```

## 配置

### 应用设置

在 Settings 页面可以配置：

- WebSocket 端口
- 数据保留时间
- 主题设置
- 导出格式

### SDK 配置

```python
client = create_client(
    agent_name="My Agent",
    server_url="ws://localhost:8765",
    metadata={
        "version": "1.0",
        "environment": "production"
    }
)
```

## 故障排除

### 无法连接到服务器

1. 确认 Agent Debugger 应用正在运行
2. 检查 WebSocket 端口是否正确
3. 检查防火墙设置

### 数据未显示

1. 确认 Agent 已成功连接
2. 检查消息格式是否正确
3. 查看 Console 日志

### 性能问题

1. 减少消息发送频率
2. 调整数据保留时间
3. 清理历史数据

## 更多资源

- [API 文档](./api.md)
- [示例代码](../sdk/python/examples/)
- [GitHub 仓库](https://github.com/erpan/agent-debugger)
