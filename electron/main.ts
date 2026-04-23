import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { WebSocketServer } from './services/WebSocketServer';
import { StoreService } from './services/StoreService';

let mainWindow: BrowserWindow | null = null;
let wsServer: WebSocketServer | null = null;
let store: StoreService | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
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
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 初始化 WebSocket 服务器
  wsServer = new WebSocketServer(8765);
  store = new StoreService();

  // 设置 IPC 处理器
  setupIpcHandlers();

  mainWindow.on('closed', () => {
    mainWindow = null;
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
}

// WebSocket 事件转发到渲染进程
WebSocketServer.on('agent:connected', (data) => {
  mainWindow?.webContents.send('agent:connected', data);
});

WebSocketServer.on('agent:disconnected', (agentId) => {
  mainWindow?.webContents.send('agent:disconnected', agentId);
});

WebSocketServer.on('thought', (data) => {
  store?.addThought(data);
  mainWindow?.webContents.send('thought', data);
});

WebSocketServer.on('tool_call', (data) => {
  store?.addToolCall(data);
  mainWindow?.webContents.send('tool_call', data);
});

WebSocketServer.on('tool_result', (data) => {
  store?.updateToolCall(data);
  mainWindow?.webContents.send('tool_result', data);
});

WebSocketServer.on('token_usage', (data) => {
  store?.addTokenUsage(data);
  mainWindow?.webContents.send('token_usage', data);
});

WebSocketServer.on('error', (data) => {
  store?.addError(data);
  mainWindow?.webContents.send('error', data);
});

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
