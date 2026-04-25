import { WebSocketServer as WSS, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as http from 'http';
import * as net from 'net';

interface AgentConnection {
  id: string;
  name: string;
  ws: WebSocket;
  metadata: Record<string, any>;
  connectedAt: Date;
}

interface DiscoveredAgent {
  id: string;
  name: string;
  address: string;
  port: number;
  lastSeen: Date;
  metadata?: Record<string, any>;
}

interface Message {
  type: string;
  payload: any;
}

export class WebSocketServer extends EventEmitter {
  private wss: WSS | null = null;
  private connections: Map<string, AgentConnection> = new Map();
  private port: number;
  private discoveredAgents: Map<string, DiscoveredAgent> = new Map();
  private discoveryInterval: NodeJS.Timeout | null = null;
  private readonly COMMON_PORTS = [8765, 8766, 8767, 8080, 3000, 5000];

  constructor(port: number = 8765) {
    super();
    this.port = port;
    this.start();
    this.startDiscovery();
  }

  start(): void {
    this.wss = new WSS({ port: this.port });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const agentId = uuidv4();
      console.log(`[WS] New connection: ${agentId}`);

      ws.on('message', (data: Buffer) => {
        try {
          const message: Message = JSON.parse(data.toString());
          this.handleMessage(agentId, message, ws);
        } catch (error) {
          console.error('[WS] Parse error:', error);
        }
      });

      ws.on('close', () => {
        const conn = this.connections.get(agentId);
        if (conn) {
          this.connections.delete(agentId);
          console.log(`[WS] Agent disconnected: ${conn.name} (${agentId})`);
          this.emit('agent:disconnected', agentId);
        }
      });

      ws.on('error', (error) => {
        console.error(`[WS] Error for ${agentId}:`, error);
      });
    });

    this.wss.on('error', (error) => {
      console.error('[WS] Server error:', error);
    });

    console.log(`[WS] WebSocket server started on port ${this.port}`);
  }

  private handleMessage(agentId: string, message: Message, ws: WebSocket): void {
    const { type, payload } = message;

    switch (type) {
      case 'register':
        this.registerAgent(agentId, payload, ws);
        break;

      case 'thought':
        this.emit('thought', { agentId, ...payload });
        break;

      case 'tool_call':
        this.emit('tool_call', { agentId, ...payload });
        break;

      case 'tool_result':
        this.emit('tool_result', { agentId, ...payload });
        break;

      case 'token_usage':
        this.emit('token_usage', { agentId, ...payload });
        break;

      case 'error':
        this.emit('error', { agentId, ...payload });
        break;

      case 'session_start':
        this.emit('session_start', { agentId, ...payload });
        break;

      case 'session_end':
        this.emit('session_end', { agentId, ...payload });
        break;

      case 'heartbeat':
        // 心跳响应
        ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
        break;

      default:
        console.warn(`[WS] Unknown message type: ${type}`);
    }
  }

  private registerAgent(agentId: string, payload: any, ws: WebSocket): void {
    const connection: AgentConnection = {
      id: agentId,
      name: payload.name || 'Unknown Agent',
      ws,
      metadata: payload.metadata || {},
      connectedAt: new Date()
    };

    this.connections.set(agentId, connection);
    console.log(`[WS] Agent registered: ${connection.name} (${agentId})`);

    this.emit('agent:connected', {
      id: agentId,
      name: connection.name,
      metadata: connection.metadata,
      connectedAt: connection.connectedAt
    });

    // 发送确认
    ws.send(JSON.stringify({
      type: 'register_ack',
      payload: { agentId, status: 'success' }
    }));
  }

  getConnectedAgents(): any[] {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      name: conn.name,
      metadata: conn.metadata,
      connectedAt: conn.connectedAt
    }));
  }

  // 向指定 Agent 发送消息
  sendToAgent(agentId: string, message: any): boolean {
    const conn = this.connections.get(agentId);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // 广播消息给所有 Agent
  broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.connections.forEach(conn => {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(data);
      }
    });
  }

  stop(): void {
    this.close();
  }

  close(): void {
    if (this.wss) {
      // 关闭所有连接
      this.connections.forEach(conn => {
        conn.ws.close();
      });
      this.connections.clear();
      this.wss.close();
      this.wss = null;
      console.log('[WS] WebSocket server closed');
    }
  }

  getPort(): number {
    return this.port;
  }

  isRunning(): boolean {
    return this.wss !== null;
  }

  // ========== Agent Auto-Discovery ==========

  /**
   * 启动 Agent 自动发现
   */
  private startDiscovery(): void {
    // 每 30 秒扫描一次
    this.discoveryInterval = setInterval(() => {
      this.scanForAgents();
    }, 30000);

    // 启动时立即扫描一次
    setTimeout(() => this.scanForAgents(), 5000);
  }

  /**
   * 扫描本地 Agent
   */
  private async scanForAgents(): Promise<void> {
    const hostname = 'localhost';

    // 扫描常见端口
    for (const port of this.COMMON_PORTS) {
      if (port === this.port) continue; // 跳过自己的端口

      try {
        const isAlive = await this.checkPort(hostname, port, 1000);
        if (isAlive) {
          await this.probeAgent(hostname, port);
        }
      } catch (error) {
        // 端口不可达，忽略
      }
    }

    // 清理过期的发现记录（超过 2 分钟未更新）
    const now = new Date();
    for (const [id, agent] of this.discoveredAgents) {
      if (now.getTime() - agent.lastSeen.getTime() > 120000) {
        this.discoveredAgents.delete(id);
        this.emit('agent:discovered:removed', id);
      }
    }
  }

  /**
   * 检查端口是否开放
   */
  private checkPort(host: string, port: number, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  /**
   * 探测 Agent 服务
   */
  private async probeAgent(host: string, port: number): Promise<void> {
    return new Promise((resolve) => {
      const requestOptions = {
        hostname: host,
        port: port,
        path: '/_hermes_info',
        method: 'GET',
        timeout: 2000,
      };

      const req = http.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const info = JSON.parse(data);
            if (info.type === 'hermes-agent' || info.agentName) {
              const agentId = info.id || `${host}:${port}`;
              const discovered: DiscoveredAgent = {
                id: agentId,
                name: info.agentName || info.name || `Agent at ${port}`,
                address: host,
                port: port,
                lastSeen: new Date(),
                metadata: info.metadata || {},
              };

              const isNew = !this.discoveredAgents.has(agentId);
              this.discoveredAgents.set(agentId, discovered);

              if (isNew) {
                this.emit('agent:discovered', discovered);
              }
            }
          } catch (error) {
            // 不是 Hermes Agent，忽略
          }
          resolve();
        });
      });

      req.on('error', () => resolve());
      req.on('timeout', () => {
        req.destroy();
        resolve();
      });

      req.end();
    });
  }

  /**
   * 获取发现的 Agent 列表
   */
  getDiscoveredAgents(): DiscoveredAgent[] {
    return Array.from(this.discoveredAgents.values());
  }

  /**
   * 连接到发现的 Agent
   */
  async connectToDiscoveredAgent(agentId: string): Promise<boolean> {
    const agent = this.discoveredAgents.get(agentId);
    if (!agent) {
      return false;
    }

    // 返回连接信息，由前端处理连接
    this.emit('agent:connect:request', {
      id: agent.id,
      name: agent.name,
      address: agent.address,
      port: agent.port,
    });

    return true;
  }

  /**
   * 手动触发扫描
   */
  async triggerDiscovery(): Promise<DiscoveredAgent[]> {
    await this.scanForAgents();
    return this.getDiscoveredAgents();
  }

  /**
   * 获取所有 Agent（连接的 + 发现的）
   */
  getAllAgents(): { connected: any[]; discovered: DiscoveredAgent[] } {
    return {
      connected: this.getConnectedAgents(),
      discovered: this.getDiscoveredAgents(),
    };
  }
}
