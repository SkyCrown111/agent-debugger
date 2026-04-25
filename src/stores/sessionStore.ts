import { create } from 'zustand';

export interface Thought {
  id: string;
  agentId: string;
  timestamp: string;
  content: string;
  type: 'reasoning' | 'planning' | 'reflection';
  duration?: number;
  tokens?: number;
}

export interface ToolCall {
  id: string;
  agentId: string;
  timestamp: string;
  toolName: string;
  params: any;
  result?: any;
  status: 'pending' | 'success' | 'error';
  duration?: number;
  error?: string;
}

export interface TokenUsage {
  id: string;
  agentId: string;
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface ErrorLog {
  id: string;
  agentId: string;
  timestamp: string;
  errorType: string;
  message: string;
  stackTrace?: string;
  stack?: string;
  level?: 'error' | 'warning' | 'info';
  context?: {
    toolName?: string;
    params?: any;
    state?: any;
  };
}

export interface Session {
  id: string;
  agentId: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'error';
  messageCount: number;
  toolCallCount: number;
  tokenUsage: { input: number; output: number };
}

interface SessionState {
  sessions: Session[];
  thoughts: Thought[];
  toolCalls: ToolCall[];
  tokenUsages: TokenUsage[];
  errors: ErrorLog[];
  
  // Actions
  addSession: (session: Session) => void;
  updateSession: (id: string, data: Partial<Session>) => void;
  addThought: (thought: Thought) => void;
  addToolCall: (toolCall: ToolCall) => void;
  updateToolCall: (id: string, data: Partial<ToolCall>) => void;
  addTokenUsage: (usage: TokenUsage) => void;
  addError: (error: ErrorLog) => void;
  clearErrors: () => void;
  clearSession: () => void;
  clearAll: () => void;
  
  // Computed
  getTotalTokens: () => { input: number; output: number };
  getToolCallStats: () => { total: number; success: number; error: number };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  thoughts: [],
  toolCalls: [],
  tokenUsages: [],
  errors: [],
  
  addSession: (session) => set((state) => ({
    sessions: [...state.sessions, session]
  })),
  
  updateSession: (id, data) => set((state) => ({
    sessions: state.sessions.map((s) =>
      s.id === id ? { ...s, ...data } : s
    )
  })),
  
  addThought: (thought) => set((state) => ({
    thoughts: [...state.thoughts, thought]
  })),
  
  addToolCall: (toolCall) => set((state) => ({
    toolCalls: [...state.toolCalls, toolCall]
  })),
  
  updateToolCall: (id, data) => set((state) => ({
    toolCalls: state.toolCalls.map((tc) =>
      tc.id === id ? { ...tc, ...data } : tc
    )
  })),
  
  addTokenUsage: (usage) => set((state) => ({
    tokenUsages: [...state.tokenUsages, usage]
  })),
  
  addError: (error) => set((state) => ({
    errors: [...state.errors, error]
  })),
  
  clearErrors: () => set({
    errors: []
  }),
  
  clearSession: () => set({
    thoughts: [],
    toolCalls: [],
    tokenUsages: [],
    errors: []
  }),
  
  clearAll: () => set({
    sessions: [],
    thoughts: [],
    toolCalls: [],
    tokenUsages: [],
    errors: []
  }),
  
  getTotalTokens: () => {
    const { tokenUsages } = get();
    return tokenUsages.reduce(
      (acc, usage) => ({
        input: acc.input + usage.inputTokens,
        output: acc.output + usage.outputTokens
      }),
      { input: 0, output: 0 }
    );
  },
  
  getToolCallStats: () => {
    const { toolCalls } = get();
    return {
      total: toolCalls.length,
      success: toolCalls.filter((tc) => tc.status === 'success').length,
      error: toolCalls.filter((tc) => tc.status === 'error').length
    };
  }
}));
