// Electron API 类型声明

interface ElectronAPI {
  // 窗口控制
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // Agent 管理
  getAgents: () => Promise<any[]>;
  getAllAgents: () => Promise<any[]>;

  // 会话管理
  getSession: (sessionId: string) => Promise<any>;
  getSessions: () => Promise<any[]>;
  clearSession: (sessionId: string) => Promise<void>;

  // 数据导出
  exportData: (sessionId: string) => Promise<any>;

  // 配置管理
  getConfig: () => Promise<any>;
  setConfig: (config: any) => Promise<void>;

  // 事件监听
  onAgentConnected: (callback: (data: any) => void) => () => void;
  onAgentDisconnected: (callback: (agentId: string) => void) => () => void;
  onThought: (callback: (data: any) => void) => () => void;
  onToolCall: (callback: (data: any) => void) => () => void;
  onToolResult: (callback: (data: any) => void) => () => void;
  onTokenUsage: (callback: (data: any) => void) => () => void;
  onError: (callback: (data: any) => void) => () => void;
  onSessionStart: (callback: (data: any) => void) => () => void;
  onSessionEnd: (callback: (data: any) => void) => () => void;

  // 移除所有监听
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
