import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from './services/WebSocketServer';
import { StoreService } from './services/StoreService';

let mainWindow: BrowserWindow | null = null;
let wsServer: WebSocketServer | null = null;
let store: StoreService | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  console.log('=== App Starting ===');
  console.log('isDev:', isDev);
  console.log('app.isPackaged:', app.isPackaged);
  console.log('__dirname:', __dirname);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false, // 无边框窗口
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载页面
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // 开发环境下可以手动按 F12 打开 DevTools
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading file from:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));

    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load file:', err);
    });
  }

  // 监听控制台消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[Renderer]', message);
  });

  // 监听加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
  });

  // 监听渲染进程崩溃
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
  });

  // 初始化服务
  store = new StoreService();
  wsServer = new WebSocketServer(8765);
  
  // 设置 WebSocket 事件监听
  setupWebSocketListeners();
  
  // 设置 IPC 处理器
  setupIpcHandlers();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupWebSocketListeners() {
  if (!wsServer) return;
  
  wsServer.on('agent:connected', (data) => {
    mainWindow?.webContents.send('agent:connected', data);
  });

  wsServer.on('agent:disconnected', (agentId) => {
    mainWindow?.webContents.send('agent:disconnected', agentId);
  });

  wsServer.on('thought', (data) => {
    store?.addThought(data);
    mainWindow?.webContents.send('thought', data);
  });

  wsServer.on('tool_call', (data) => {
    store?.addToolCall(data);
    mainWindow?.webContents.send('tool_call', data);
  });

  wsServer.on('tool_result', (data) => {
    store?.updateToolCall(data);
    mainWindow?.webContents.send('tool_result', data);
  });

  wsServer.on('token_usage', (data) => {
    store?.addTokenUsage(data);
    mainWindow?.webContents.send('token_usage', data);
  });

  wsServer.on('error', (data) => {
    store?.addError(data);
    mainWindow?.webContents.send('error', data);
  });

  wsServer.on('session_start', (data) => {
    if (store) {
      const session = store.createSession(data.agentId, data.agentName || 'Unknown');
      mainWindow?.webContents.send('session:start', session);
    }
  });

  wsServer.on('session_end', (data) => {
    store?.endSession(data.sessionId);
    mainWindow?.webContents.send('session:end', data);
  });
}

function setupIpcHandlers() {
  // 窗口控制
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // 获取连接的 Agent 列表
  ipcMain.handle('agent:list', () => {
    return wsServer?.getConnectedAgents() || [];
  });

  // 获取会话数据
  ipcMain.handle('session:get', (_, sessionId: string) => {
    return store?.getSession(sessionId);
  });

  // 获取所有会话
  ipcMain.handle('session:list', () => {
    return store?.getAllSessions() || [];
  });

  // 清除会话数据
  ipcMain.handle('session:clear', (_, sessionId: string) => {
    return store?.clearSession(sessionId);
  });

  // 导出数据
  ipcMain.handle('data:export', (_, sessionId: string) => {
    return store?.exportSession(sessionId);
  });

  // 获取配置
  ipcMain.handle('config:get', () => {
    return store?.getConfig();
  });

  // 设置配置
  ipcMain.handle('config:set', (_, config: any) => {
    return store?.setConfig(config);
  });

  // 获取所有 Agent
  ipcMain.handle('agent:all', () => {
    return store?.getAgents() || [];
  });

  // Agent 发现相关
  ipcMain.handle('agent:discover', async () => {
    return wsServer?.triggerDiscovery() || [];
  });

  ipcMain.handle('agent:discovered', () => {
    return wsServer?.getDiscoveredAgents() || [];
  });

  ipcMain.handle('agent:all-info', () => {
    return wsServer?.getAllAgents() || { connected: [], discovered: [] };
  });

  // 监听发现的 Agent 事件
  wsServer?.on('agent:discovered', (agent) => {
    mainWindow?.webContents.send('agent:discovered', agent);
  });

  wsServer?.on('agent:discovered:removed', (agentId) => {
    mainWindow?.webContents.send('agent:discovered:removed', agentId);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    wsServer?.close();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
