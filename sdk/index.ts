/**
 * Agent Debugger SDK
 * 用于将 Agent 连接到 Agent Debugger 的客户端 SDK
 */

import WebSocket from 'ws';

interface AgentDebuggerConfig {
  serverUrl?: string;
  agentId?: string;
  agentName: string;
  metadata?: Record<string, any>;
}

interface ThoughtPayload {
  content: string;
  type?: 'reasoning' | 'planning' | 'reflection';
  duration?: number;
  tokens?: number;
}

interface ToolCallPayload {
  id: string;
  name: string;
  params: any;
}

interface ToolResultPayload {
  id: string;
  result?: any;
  error?: string;
  duration?: number;
}

interface TokenUsagePayload {
  input: number;
  output: number;
  model: string;
}

export class AgentDebuggerClient {
  private ws: WebSocket | null = null;
  private config: AgentDebuggerConfig;
  private messageQueue: any[] = [];
  private isConnected = false;

  constructor(config: AgentDebuggerConfig) {
    this.config = {
      serverUrl: 'ws://localhost:8765',
      ...config,
    };
  }

  /**
   * 连接到 Agent Debugger 服务器
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.serverUrl!);

      this.ws.on('open', () => {
        this.isConnected = true;
        this.send({
          type: 'agent_connect',
          payload: {
            id: this.config.agentId || this.generateId(),
            name: this.config.agentName,
            metadata: this.config.metadata,
          },
          timestamp: new Date().toISOString(),
        });

        // 发送队列中的消息
        this.flushQueue();
        resolve();
      });

      this.ws.on('error', (error) => {
        reject(error);
      });

      this.ws.on('close', () => {
        this.isConnected = false;
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.send({
        type: 'agent_disconnect',
        payload: { id: this.config.agentId },
        timestamp: new Date().toISOString(),
      });
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * 发送思考过程
   */
  sendThought(payload: ThoughtPayload): void {
    this.send({
      type: 'thought',
      payload: {
        id: this.generateId(),
        agentId: this.config.agentId,
        ...payload,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 发送工具调用
   */
  sendToolCall(payload: ToolCallPayload): void {
    this.send({
      type: 'tool_call',
      payload: {
        agentId: this.config.agentId,
        ...payload,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 发送工具结果
   */
  sendToolResult(payload: ToolResultPayload): void {
    this.send({
      type: 'tool_result',
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 发送 Token 使用情况
   */
  sendTokenUsage(payload: TokenUsagePayload): void {
    this.send({
      type: 'token_usage',
      payload: {
        agentId: this.config.agentId,
        ...payload,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 发送错误
   */
  sendError(content: string): void {
    this.send({
      type: 'error',
      payload: {
        id: this.generateId(),
        content,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private send(message: any): void {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出便捷方法
export function createDebuggerClient(agentName: string, metadata?: Record<string, any>) {
  return new AgentDebuggerClient({ agentName, metadata });
}
