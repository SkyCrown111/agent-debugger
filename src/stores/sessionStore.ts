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
  message: string;
  stack?: string;
  context?: any;
}

interface SessionState {
  thoughts: Thought[];
  toolCalls: ToolCall[];
  tokenUsages: TokenUsage[];
  errors: ErrorLog[];
  
  // Actions
  addThought: (thought: Thought) => void;
  addToolCall: (toolCall: ToolCall) => void;
  updateToolCall: (id: string, data: Partial<ToolCall>) => void;
  addTokenUsage: (usage: TokenUsage) => void;
  addError: (error: ErrorLog) => void;
  clearSession: () => void;
  
  // Computed
  getTotalTokens: () => { input: number; output: number };
  getToolCallStats: () => { total: number; success: number; error: number };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  thoughts: [],
  toolCalls: [],
  tokenUsages: [],
  errors: [],
  
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
  
  clearSession: () => set({
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
