import { WebSocketServer as WSS, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

interface AgentConnection {
  id: string;
  name: string;
  ws: WebSocket;
  metadata: Record<string, any>;
  connectedAt: Date;
}

interface Message {
  type: string;
  payload: any;
}

class DebuggerWebSocketServer extends EventEmitter {
  private wss: WSS | null = null;
  private connections: Map<string, AgentConnection> = new Map();
  private port: number;

  constructor(port: number = 8765) {
    super();
    this.port = port;
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
}

// 单例模式
let instance: DebuggerWebSocketServer | null = null;

export class WebSocketServer {
  static on(event: string, listener: (...args: any[]) => void): void {
    if (instance) {
      instance.on(event, listener);
    }
  }

  static off(event: string, listener: (...args: any[]) => void): void {
    if (instance) {
      instance.off(event, listener);
    }
  }

  constructor(port: number = 8765) {
    if (!instance) {
      instance = new DebuggerWebSocketServer(port);
      instance.start();
    }
    return instance as any;
  }

  getConnectedAgents(): any[] {
    return instance?.getConnectedAgents() || [];
  }

  close(): void {
    instance?.close();
    instance = null;
  }
}
