import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Agent 管理
  getAgents: () => ipcRenderer.invoke('agent:list'),

  // 会话管理
  getSession: (sessionId: string) => ipcRenderer.invoke('session:get', sessionId),
  getSessions: () => ipcRenderer.invoke('session:list'),
  clearSession: (sessionId: string) => ipcRenderer.invoke('session:clear', sessionId),

  // 数据导出
  exportData: (sessionId: string) => ipcRenderer.invoke('data:export', sessionId),

  // 事件监听
  onAgentConnected: (callback: (data: any) => void) => {
    ipcRenderer.on('agent:connected', (_, data) => callback(data));
  },
  onAgentDisconnected: (callback: (agentId: string) => void) => {
    ipcRenderer.on('agent:disconnected', (_, agentId) => callback(agentId));
  },
  onThought: (callback: (data: any) => void) => {
    ipcRenderer.on('thought', (_, data) => callback(data));
  },
  onToolCall: (callback: (data: any) => void) => {
    ipcRenderer.on('tool_call', (_, data) => callback(data));
  },
  onToolResult: (callback: (data: any) => void) => {
    ipcRenderer.on('tool_result', (_, data) => callback(data));
  },
  onTokenUsage: (callback: (data: any) => void) => {
    ipcRenderer.on('token_usage', (_, data) => callback(data));
  },
  onError: (callback: (data: any) => void) => {
    ipcRenderer.on('error', (_, data) => callback(data));
  },

  // 移除监听
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
