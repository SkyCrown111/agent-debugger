/**
 * IPC 频道定义
 */

// Electron 窗口控制 IPC
export const WINDOW_CHANNELS = {
  MINIMIZE: 'window:minimize',
  MAXIMIZE: 'window:maximize',
  CLOSE: 'window:close',
} as const;

// WebSocket 服务
export const WS_CHANNELS = {
  START: 'ws:start',
  STOP: 'ws:stop',
  STATUS: 'ws:status',
} as const;

// Agent 管理
export const AGENT_CHANNELS = {
  CONNECT: 'agent:connect',
  DISCONNECT: 'agent:disconnect',
  LIST: 'agent:list',
} as const;

// 会话数据
export const SESSION_CHANNELS = {
  GET: 'session:get',
  CLEAR: 'session:clear',
} as const;

// 配置管理
export const CONFIG_CHANNELS = {
  GET: 'config:get',
  SET: 'config:set',
} as const;

// 数据导出
export const EXPORT_CHANNELS = {
  JSON: 'export:json',
  CSV: 'export:csv',
} as const;
