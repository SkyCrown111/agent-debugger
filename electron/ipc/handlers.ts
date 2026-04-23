import { ipcMain } from 'electron';
import { WebSocketServer } from '../services/WebSocketServer';
import { StoreService } from '../services/StoreService';

let wsServer: WebSocketServer | null = null;
const store = new StoreService();

export function setupIPC() {
  // 窗口控制
  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  // WebSocket 控制
  ipcMain.handle('ws:start', async (_, port: number = 8765) => {
    if (wsServer) {
      return { success: false, error: 'Server already running' };
    }
    wsServer = new WebSocketServer(port);
    return { success: true, port };
  });

  ipcMain.handle('ws:stop', async () => {
    if (wsServer) {
      wsServer.stop();
      wsServer = null;
      return { success: true };
    }
    return { success: false, error: 'Server not running' };
  });

  // Agent 管理
  ipcMain.handle('agent:list', async () => {
    return store.getAgents();
  });

  // 会话数据
  ipcMain.handle('session:get', async (_, sessionId: string) => {
    return store.getSession(sessionId);
  });

  ipcMain.handle('session:clear', async (_, sessionId: string) => {
    store.clearSession(sessionId);
    return { success: true };
  });

  // 配置
  ipcMain.handle('config:get', async () => {
    return store.getConfig();
  });

  ipcMain.handle('config:set', async (_, config: any) => {
    store.setConfig(config);
    return { success: true };
  });
}
