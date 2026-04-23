# Agent Debugger - 技术架构文档

## 🏗️ 项目结构

```
agent-debugger/
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 主进程入口
│   ├── preload.ts               # 预加载脚本
│   ├── ipc/                     # IPC 通信
│   │   ├── handlers.ts          # IPC 处理器
│   │   └── channels.ts          # 通道定义
│   └── services/                # 主进程服务
│       ├── WebSocketServer.ts   # WebSocket 服务器
│       ├── StoreService.ts      # 数据存储
│       └── FileService.ts       # 文件服务
│
├── src/                         # React 渲染进程
│   ├── main.tsx                 # React 入口
│   ├── App.tsx                  # 根组件
│   ├── components/              # UI 组件
│   │   ├── Layout/              # 布局组件
│   │   ├── Sidebar/             # 侧边栏
│   │   ├── Header/              # 顶部栏
│   │   ├── AgentList/           # Agent 列表
│   │   ├── ThoughtFlow/         # 思考流可视化
│   │   ├── ToolTrace/           # 工具调用追踪
│   │   ├── TokenAnalysis/       # Token 分析
│   │   ├── MessageLog/          # 消息日志
│   │   ├── Performance/         # 性能监控
│   │   └── common/              # 通用组件
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useWebSocket.ts      # WebSocket 连接
│   │   ├── useAgent.ts          # Agent 状态
│   │   └── useTheme.ts          # 主题管理
│   ├── stores/                  # Zustand 状态管理
│   │   ├── agentStore.ts        # Agent 状态
│   │   ├── sessionStore.ts      # 会话状态
│   │   └── settingsStore.ts     # 设置状态
│   ├── types/                   # TypeScript 类型
│   │   ├── agent.ts             # Agent 类型
│   │   ├── session.ts           # 会话类型
│   │   └── message.ts           # 消息类型
│   ├── utils/                   # 工具函数
│   └── styles/                  # 样式文件
│       ├── theme.ts             # 主题配置
│       └── global.css           # 全局样式
│
├── sdk/                         # SDK
│   ├── python/                  # Python SDK
│   │   ├── agent_debugger/
│   │   │   ├── __init__.py
│   │   │   ├── client.py        # WebSocket 客户端
│   │   │   ├── tracer.py        # 追踪装饰器
│   │   │   └── integrations/    # 框架集成
│   │   │       ├── langchain.py
│   │   │       ├── openai.py
│   │   │       └── anthropic.py
│   │   └── setup.py
│   │
│   └── javascript/              # JavaScript SDK
│       ├── src/
│       │   ├── index.ts
│       │   ├── client.ts
│       │   └── integrations/
│       └── package.json
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.json        # 打包配置
```

---

## 🔌 核心模块设计

### 1. WebSocket 服务器（主进程）

```typescript
// electron/services/WebSocketServer.ts
import { WebSocketServer as WSS, WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface AgentConnection {
  id: string;
  name: string;
  ws: WebSocket;
  metadata: Record<string, any>;
}

export class WebSocketServer extends EventEmitter {
  private wss: WSS;
  private connections: Map<string, AgentConnection> = new Map();
  
  constructor(port: number = 8765) {
    super();
    this.wss = new WSS({ port });
    this.setupHandlers();
  }
  
  private setupHandlers() {
    this.wss.on('connection', (ws, req) => {
      const agentId = this.generateId();
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.handleMessage(agentId, message);
      });
      
      ws.on('close', () => {
        this.connections.delete(agentId);
        this.emit('agent:disconnected', agentId);
      });
    });
  }
  
  private handleMessage(agentId: string, message: any) {
    switch (message.type) {
      case 'register':
        this.registerAgent(agentId, message.payload);
        break;
      case 'thought':
        this.emit('thought', { agentId, ...message.payload });
        break;
      case 'tool_call':
        this.emit('tool_call', { agentId, ...message.payload });
        break;
      case 'tool_result':
        this.emit('tool_result', { agentId, ...message.payload });
        break;
      case 'error':
        this.emit('error', { agentId, ...message.payload });
        break;
      case 'token_usage':
        this.emit('token_usage', { agentId, ...message.payload });
        break;
    }
  }
  
  private registerAgent(id: string, payload: any) {
    this.connections.set(id, {
      id,
      name: payload.name,
      ws: this.getConnection(id),
      metadata: payload.metadata || {}
    });
    this.emit('agent:connected', { id, ...payload });
  }
}
```

### 2. React 状态管理（Zustand）

```typescript
// src/stores/sessionStore.ts
import { create } from 'zustand';
import { Thought, ToolCall, Session } from '../types';

interface SessionState {
  currentSession: Session | null;
  thoughts: Thought[];
  toolCalls: ToolCall[];
  
  // Actions
  setCurrentSession: (session: Session) => void;
  addThought: (thought: Thought) => void;
  addToolCall: (toolCall: ToolCall) => void;
  updateToolCall: (id: string, result: any) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  thoughts: [],
  toolCalls: [],
  
  setCurrentSession: (session) => set({ currentSession: session }),
  
  addThought: (thought) => set((state) => ({
    thoughts: [...state.thoughts, thought]
  })),
  
  addToolCall: (toolCall) => set((state) => ({
    toolCalls: [...state.toolCalls, toolCall]
  })),
  
  updateToolCall: (id, result) => set((state) => ({
    toolCalls: state.toolCalls.map((tc) =>
      tc.id === id ? { ...tc, result, status: 'success' } : tc
    )
  })),
  
  clearSession: () => set({
    currentSession: null,
    thoughts: [],
    toolCalls: []
  })
}));
```

### 3. Python SDK

```python
# sdk/python/agent_debugger/client.py
import json
import threading
from websocket import WebSocketApp
from typing import Optional, Callable, Any
from datetime import datetime
import uuid

class DebuggerClient:
    def __init__(
        self,
        endpoint: str = "ws://localhost:8765",
        agent_name: str = "agent"
    ):
        self.endpoint = endpoint
        self.agent_name = agent_name
        self.agent_id = str(uuid.uuid4())
        self.ws: Optional[WebSocketApp] = None
        self.connected = False
        self._lock = threading.Lock()
        
    def connect(self):
        """连接到 Debugger 服务器"""
        self.ws = WebSocketApp(
            self.endpoint,
            on_open=self._on_open,
            on_message=self._on_message,
            on_error=self._on_error,
            on_close=self._on_close
        )
        
        # 在后台线程运行
        thread = threading.Thread(target=self.ws.run_forever)
        thread.daemon = True
        thread.start()
        
    def _on_open(self, ws):
        self.connected = True
        self._send("register", {
            "name": self.agent_name,
            "metadata": {
                "python_version": sys.version,
                "platform": platform.platform()
            }
        })
        
    def log_thought(
        self,
        content: str,
        thought_type: str = "reasoning"
    ):
        """记录思考过程"""
        self._send("thought", {
            "id": str(uuid.uuid4()),
            "content": content,
            "type": thought_type,
            "timestamp": datetime.now().isoformat()
        })
        
    def log_tool_call(
        self,
        tool_name: str,
        params: dict,
        call_id: Optional[str] = None
    ) -> str:
        """记录工具调用"""
        call_id = call_id or str(uuid.uuid4())
        self._send("tool_call", {
            "id": call_id,
            "toolName": tool_name,
            "params": params,
            "timestamp": datetime.now().isoformat()
        })
        return call_id
        
    def log_tool_result(
        self,
        call_id: str,
        result: Any,
        error: Optional[str] = None
    ):
        """记录工具返回结果"""
        self._send("tool_result", {
            "id": call_id,
            "result": result,
            "error": error,
            "timestamp": datetime.now().isoformat()
        })
        
    def log_token_usage(
        self,
        input_tokens: int,
        output_tokens: int,
        model: str
    ):
        """记录 Token 使用"""
        self._send("token_usage", {
            "inputTokens": input_tokens,
            "outputTokens": output_tokens,
            "model": model,
            "timestamp": datetime.now().isoformat()
        })
        
    def _send(self, message_type: str, payload: dict):
        if not self.connected:
            return
        with self._lock:
            message = json.dumps({
                "type": message_type,
                "payload": payload
            })
            self.ws.send(message)
```

### 4. LangChain 集成

```python
# sdk/python/agent_debugger/integrations/langchain.py
from typing import Any, Dict, List
from langchain.callbacks.base import BaseCallbackHandler
from ..client import DebuggerClient

class LangChainDebuggerHandler(BaseCallbackHandler):
    """LangChain 回调处理器，自动追踪所有调用"""
    
    def __init__(self, client: DebuggerClient):
        self.client = client
        self._current_tool_call_id = None
        
    def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        **kwargs: Any
    ):
        """LLM 开始时记录"""
        self.client.log_thought(
            content=f"LLM 调用: {kwargs.get('invocation_params', {}).get('model', 'unknown')}",
            thought_type="planning"
        )
        
    def on_llm_end(self, response: Any, **kwargs: Any):
        """LLM 结束时记录 Token"""
        if hasattr(response, 'llm_output'):
            token_usage = response.llm_output.get('token_usage', {})
            self.client.log_token_usage(
                input_tokens=token_usage.get('prompt_tokens', 0),
                output_tokens=token_usage.get('completion_tokens', 0),
                model=kwargs.get('invocation_params', {}).get('model', 'unknown')
            )
            
    def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        **kwargs: Any
    ):
        """工具调用开始"""
        tool_name = serialized.get('name', 'unknown')
        self._current_tool_call_id = self.client.log_tool_call(
            tool_name=tool_name,
            params={"input": input_str}
        )
        
    def on_tool_end(self, output: str, **kwargs: Any):
        """工具调用结束"""
        if self._current_tool_call_id:
            self.client.log_tool_result(
                call_id=self._current_tool_call_id,
                result=output
            )
            self._current_tool_call_id = None
            
    def on_tool_error(self, error: Exception, **kwargs: Any):
        """工具调用错误"""
        if self._current_tool_call_id:
            self.client.log_tool_result(
                call_id=self._current_tool_call_id,
                result=None,
                error=str(error)
            )
            self._current_tool_call_id = None
```

---

## 🎨 UI 组件设计

### 思考流可视化组件

```tsx
// src/components/ThoughtFlow/ThoughtFlow.tsx
import React from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { ThoughtNode } from './ThoughtNode';
import { ToolNode } from './ToolNode';
import './ThoughtFlow.css';

export const ThoughtFlow: React.FC = () => {
  const { thoughts, toolCalls } = useSessionStore();
  
  // 合并并按时间排序
  const timeline = [...thoughts, ...toolCalls]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  return (
    <div className="thought-flow">
      <div className="timeline">
        {timeline.map((item, index) => {
          if ('toolName' in item) {
            return <ToolNode key={item.id} toolCall={item} />;
          }
          return <ThoughtNode key={item.id} thought={item} />;
        })}
      </div>
    </div>
  );
};
```

### 工具调用追踪组件

```tsx
// src/components/ToolTrace/ToolTrace.tsx
import React from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { Timeline, Card, Tag, Progress } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

export const ToolTrace: React.FC = () => {
  const { toolCalls } = useSessionStore();
  
  const stats = React.useMemo(() => {
    const total = toolCalls.length;
    const success = toolCalls.filter(tc => tc.status === 'success').length;
    const failed = toolCalls.filter(tc => tc.status === 'error').length;
    const avgDuration = toolCalls.reduce((sum, tc) => sum + (tc.duration || 0), 0) / total || 0;
    
    return { total, success, failed, avgDuration };
  }, [toolCalls]);
  
  return (
    <div className="tool-trace">
      <div className="stats-bar">
        <Card size="small">
          <div className="stat">
            <span className="label">总调用</span>
            <span className="value">{stats.total}</span>
          </div>
          <div className="stat">
            <span className="label">成功率</span>
            <Progress 
              percent={Math.round(stats.success / stats.total * 100) || 0} 
              size="small"
              status={stats.failed > 0 ? 'exception' : 'success'}
            />
          </div>
          <div className="stat">
            <span className="label">平均耗时</span>
            <span className="value">{stats.avgDuration.toFixed(0)}ms</span>
          </div>
        </Card>
      </div>
      
      <Timeline>
        {toolCalls.map(tc => (
          <Timeline.Item
            key={tc.id}
            dot={
              tc.status === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
              tc.status === 'error' ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> :
              <ClockCircleOutlined style={{ color: '#1890ff' }} />
            }
          >
            <div className="tool-call-item">
              <div className="header">
                <Tag color="blue">{tc.toolName}</Tag>
                <span className="duration">{tc.duration}ms</span>
              </div>
              <div className="params">
                <pre>{JSON.stringify(tc.params, null, 2)}</pre>
              </div>
              {tc.result && (
                <div className="result">
                  <pre>{JSON.stringify(tc.result, null, 2)}</pre>
                </div>
              )}
              {tc.error && (
                <div className="error">
                  <pre>{tc.error}</pre>
                </div>
              )}
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  );
};
```

---

## 📦 依赖清单

### Electron 主进程
```json
{
  "electron": "^28.0.0",
  "ws": "^8.14.0",
  "electron-store": "^8.1.0"
}
```

### React 渲染进程
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "antd": "^5.12.0",
  "zustand": "^4.4.0",
  "recharts": "^2.10.0",
  "react-flow-renderer": "^2.4.0",
  "framer-motion": "^10.16.0",
  "dayjs": "^1.11.0"
}
```

### 构建工具
```json
{
  "vite": "^5.0.0",
  "typescript": "^5.3.0",
  "electron-builder": "^24.9.0"
}
```

### Python SDK
```txt
websocket-client>=1.6.0
langchain>=0.1.0  # 可选
openai>=1.0.0     # 可选
anthropic>=0.8.0  # 可选
```

---

## 🔐 安全考虑

1. **本地通信** - WebSocket 仅监听 localhost
2. **数据隔离** - 不同 Agent 数据隔离
3. **敏感信息过滤** - 可配置过滤敏感字段
4. **数据加密** - 可选的端到端加密

---

## 📊 性能优化

1. **虚拟滚动** - 大量日志时使用虚拟列表
2. **增量更新** - 只更新变化的数据
3. **数据压缩** - WebSocket 消息压缩
4. **懒加载** - 组件按需加载
5. **缓存** - 历史数据缓存
