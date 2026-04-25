import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';

interface Thought {
  id: string;
  sessionId: string;
  agentId: string;
  timestamp: string;
  content: string;
  type: 'reasoning' | 'planning' | 'reflection';
  duration?: number;
  tokens?: number;
}

interface ToolCall {
  id: string;
  sessionId: string;
  agentId: string;
  timestamp: string;
  toolName: string;
  params: any;
  result?: any;
  status: 'pending' | 'success' | 'error';
  duration?: number;
  error?: string;
}

interface TokenUsage {
  id: string;
  sessionId: string;
  agentId: string;
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

interface Error {
  id: string;
  sessionId: string;
  agentId: string;
  timestamp: string;
  message: string;
  stack?: string;
  context?: any;
}

interface Session {
  id: string;
  agentId: string;
  agentName: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'error';
  thoughts: Thought[];
  toolCalls: ToolCall[];
  tokenUsages: TokenUsage[];
  errors: Error[];
}

interface StoreSchema {
  sessions: Record<string, Session>;
  currentSessionId: string | null;
}

export class StoreService {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      defaults: {
        sessions: {},
        currentSessionId: null
      }
    });
  }

  // 创建新会话
  createSession(agentId: string, agentName: string): Session {
    const session: Session = {
      id: uuidv4(),
      agentId,
      agentName,
      startTime: new Date().toISOString(),
      status: 'running',
      thoughts: [],
      toolCalls: [],
      tokenUsages: [],
      errors: []
    };

    const sessions = this.store.get('sessions');
    sessions[session.id] = session;
    this.store.set('sessions', sessions);
    this.store.set('currentSessionId', session.id);

    return session;
  }

  // 获取会话
  getSession(sessionId: string): Session | undefined {
    return this.store.get('sessions')[sessionId];
  }

  // 获取当前会话
  getCurrentSession(): Session | undefined {
    const sessionId = this.store.get('currentSessionId');
    return sessionId ? this.getSession(sessionId) : undefined;
  }

  // 获取所有会话
  getAllSessions(): Session[] {
    const sessions = this.store.get('sessions') as Record<string, Session>;
    return Object.values(sessions).sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  // 添加思考
  addThought(data: any): void {
    const session = this.getCurrentSession();
    if (!session) return;

    const thought: Thought = {
      id: uuidv4(),
      sessionId: session.id,
      agentId: data.agentId,
      timestamp: data.timestamp || new Date().toISOString(),
      content: data.content,
      type: data.type || 'reasoning',
      duration: data.duration,
      tokens: data.tokens
    };

    session.thoughts.push(thought);
    this.updateSession(session);
  }

  // 添加工具调用
  addToolCall(data: any): void {
    const session = this.getCurrentSession();
    if (!session) return;

    const toolCall: ToolCall = {
      id: data.id || uuidv4(),
      sessionId: session.id,
      agentId: data.agentId,
      timestamp: data.timestamp || new Date().toISOString(),
      toolName: data.toolName,
      params: data.params,
      status: 'pending'
    };

    session.toolCalls.push(toolCall);
    this.updateSession(session);
  }

  // 更新工具调用结果
  updateToolCall(data: any): void {
    const session = this.getCurrentSession();
    if (!session) return;

    const toolCall = session.toolCalls.find(tc => tc.id === data.id);
    if (toolCall) {
      toolCall.result = data.result;
      toolCall.status = data.error ? 'error' : 'success';
      toolCall.duration = data.duration;
      toolCall.error = data.error;
      this.updateSession(session);
    }
  }

  // 添加 Token 使用记录
  addTokenUsage(data: any): void {
    const session = this.getCurrentSession();
    if (!session) return;

    const tokenUsage: TokenUsage = {
      id: uuidv4(),
      sessionId: session.id,
      agentId: data.agentId,
      timestamp: data.timestamp || new Date().toISOString(),
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      model: data.model
    };

    session.tokenUsages.push(tokenUsage);
    this.updateSession(session);
  }

  // 添加错误
  addError(data: any): void {
    const session = this.getCurrentSession();
    if (!session) return;

    const error: Error = {
      id: uuidv4(),
      sessionId: session.id,
      agentId: data.agentId,
      timestamp: data.timestamp || new Date().toISOString(),
      message: data.message,
      stack: data.stack,
      context: data.context
    };

    session.errors.push(error);
    session.status = 'error';
    this.updateSession(session);
  }

  // 结束会话
  endSession(sessionId?: string): void {
    const session = sessionId 
      ? this.getSession(sessionId) 
      : this.getCurrentSession();
    
    if (session) {
      session.endTime = new Date().toISOString();
      session.status = session.errors.length > 0 ? 'error' : 'completed';
      this.updateSession(session);
    }

    this.store.set('currentSessionId', null);
  }

  // 清除会话
  clearSession(sessionId: string): void {
    const sessions = this.store.get('sessions');
    delete sessions[sessionId];
    this.store.set('sessions', sessions);
  }

  // 导出会话数据
  exportSession(sessionId: string): any {
    const session = this.getSession(sessionId);
    if (!session) return null;

    // 计算统计信息
    const totalTokens = session.tokenUsages.reduce(
      (sum, t) => sum + t.inputTokens + t.outputTokens, 0
    );
    const totalCost = this.calculateCost(session.tokenUsages);
    const avgToolDuration = session.toolCalls.reduce(
      (sum, tc) => sum + (tc.duration || 0), 0
    ) / session.toolCalls.length || 0;

    return {
      session,
      statistics: {
        totalTokens,
        totalCost,
        totalThoughts: session.thoughts.length,
        totalToolCalls: session.toolCalls.length,
        successRate: session.toolCalls.filter(tc => tc.status === 'success').length / session.toolCalls.length || 0,
        avgToolDuration,
        totalErrors: session.errors.length,
        duration: session.endTime 
          ? new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
          : Date.now() - new Date(session.startTime).getTime()
      }
    };
  }

  // 计算成本
  private calculateCost(tokenUsages: TokenUsage[]): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    };

    return tokenUsages.reduce((total, usage) => {
      const model = usage.model.toLowerCase();
      const price = pricing[model] || { input: 0.01, output: 0.03 };
      return total + 
        (usage.inputTokens / 1000 * price.input) + 
        (usage.outputTokens / 1000 * price.output);
    }, 0);
  }

  // 更新会话
  private updateSession(session: Session): void {
    const sessions = this.store.get('sessions');
    sessions[session.id] = session;
    this.store.set('sessions', sessions);
  }

  // 获取所有 Agent 列表
  getAgents(): { id: string; name: string; connectedAt: string }[] {
    const sessions = this.getAllSessions();
    const agentMap = new Map<string, { id: string; name: string; connectedAt: string }>();
    
    sessions.forEach(session => {
      if (!agentMap.has(session.agentId)) {
        agentMap.set(session.agentId, {
          id: session.agentId,
          name: session.agentName,
          connectedAt: session.startTime
        });
      }
    });
    
    return Array.from(agentMap.values());
  }

  // 获取配置
  getConfig(): { theme: string; autoStart: boolean; port: number } {
    return this.store.get('config') as any || {
      theme: 'dark',
      autoStart: true,
      port: 8765
    };
  }

  // 设置配置
  setConfig(config: any): void {
    this.store.set('config', config);
  }
}
