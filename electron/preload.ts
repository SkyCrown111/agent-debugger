import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Agent 管理
  getAgents: () => ipcRenderer.invoke('agent:list'),
  getAllAgents: () => ipcRenderer.invoke('agent:all'),

  // Agent 发现
  discoverAgents: () => ipcRenderer.invoke('agent:discover'),
  getDiscoveredAgents: () => ipcRenderer.invoke('agent:discovered'),
  getAllAgentsInfo: () => ipcRenderer.invoke('agent:all-info'),

  // 会话管理
  getSession: (sessionId: string) => ipcRenderer.invoke('session:get', sessionId),
  getSessions: () => ipcRenderer.invoke('session:list'),
  clearSession: (sessionId: string) => ipcRenderer.invoke('session:clear', sessionId),

  // 数据导出
  exportData: (sessionId: string) => ipcRenderer.invoke('data:export', sessionId),

  // 配置管理
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config: any) => ipcRenderer.invoke('config:set', config),

  // 事件监听
  onAgentConnected: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('agent:connected', handler);
    return () => ipcRenderer.removeListener('agent:connected', handler);
  },
  onAgentDisconnected: (callback: (agentId: string) => void) => {
    const handler = (_: any, agentId: string) => callback(agentId);
    ipcRenderer.on('agent:disconnected', handler);
    return () => ipcRenderer.removeListener('agent:disconnected', handler);
  },
  onThought: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('thought', handler);
    return () => ipcRenderer.removeListener('thought', handler);
  },
  onToolCall: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('tool_call', handler);
    return () => ipcRenderer.removeListener('tool_call', handler);
  },
  onToolResult: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('tool_result', handler);
    return () => ipcRenderer.removeListener('tool_result', handler);
  },
  onTokenUsage: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('token_usage', handler);
    return () => ipcRenderer.removeListener('token_usage', handler);
  },
  onError: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('error', handler);
    return () => ipcRenderer.removeListener('error', handler);
  },
  onSessionStart: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('session:start', handler);
    return () => ipcRenderer.removeListener('session:start', handler);
  },
  onSessionEnd: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('session:end', handler);
    return () => ipcRenderer.removeListener('session:end', handler);
  },
  onAgentDiscovered: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('agent:discovered', handler);
    return () => ipcRenderer.removeListener('agent:discovered', handler);
  },
  onAgentDiscoveredRemoved: (callback: (agentId: string) => void) => {
    const handler = (_: any, agentId: string) => callback(agentId);
    ipcRenderer.on('agent:discovered:removed', handler);
    return () => ipcRenderer.removeListener('agent:discovered:removed', handler);
  },

  // 移除所有监听
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
