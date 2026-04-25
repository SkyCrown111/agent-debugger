/**
 * Hermes Agent SDK
 *
 * A lightweight SDK for integrating AI Agents with Hermes Debugger.
 *
 * @example
 * ```typescript
 * import { Hermes } from '@hermes/agent-sdk';
 *
 * const hermes = new Hermes({
 *   agentName: 'My Agent',
 *   serverUrl: 'ws://localhost:8765'
 * });
 *
 * await hermes.connect();
 *
 * // Send a thought
 * hermes.sendThought({
 *   content: 'Analyzing user request...',
 *   type: 'reasoning'
 * });
 *
 * // Track tool calls
 * const toolId = hermes.startToolCall({
 *   toolName: 'web_search',
 *   params: { query: 'AI news' }
 * });
 *
 * // ... execute tool ...
 *
 * hermes.endToolCall(toolId, {
 *   result: searchResults,
 *   status: 'success',
 *   duration: 150
 * });
 * ```
 */

// Environment-agnostic WebSocket
let WebSocketClass: any;
if (typeof window !== 'undefined' && window.WebSocket) {
  // Browser environment
  WebSocketClass = window.WebSocket;
} else {
  // Node.js environment
  try {
    WebSocketClass = require('ws');
  } catch {
    console.warn('WebSocket not available. Install "ws" package for Node.js support.');
  }
}

import { v4 as uuidv4 } from 'uuid';
import type {
  HermesConfig,
  ThoughtPayload,
  ToolCallPayload,
  ToolResultPayload,
  TokenUsagePayload,
  SessionStartPayload,
  ConnectionStatus,
} from './types';

export type {
  HermesConfig,
  ThoughtPayload,
  ToolCallPayload,
  ToolResultPayload,
  TokenUsagePayload,
  SessionStartPayload,
  ConnectionStatus,
  HermesClient,
  TracedResponse,
} from './types';

// Browser-compatible UUID
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export class Hermes {
  private ws: any = null;
  private config: Required<HermesConfig>;
  private pendingToolCalls: Map<string, { toolName: string; startTime: number }> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: Array<{ type: string; payload: any }> = [];

  public status: ConnectionStatus = 'disconnected';

  constructor(config: HermesConfig) {
    this.config = {
      serverUrl: config.serverUrl || 'ws://localhost:8765',
      agentName: config.agentName,
      agentId: config.agentId || generateId(),
      metadata: config.metadata || {},
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval || 3000,
      debug: config.debug || false,
    };
  }

  /**
   * Connect to Hermes Debugger
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.status === 'connected') {
        resolve();
        return;
      }

      if (!WebSocketClass) {
        reject(new Error('WebSocket not available'));
        return;
      }

      this.status = 'connecting';
      this.log('Connecting to', this.config.serverUrl);

      try {
        this.ws = new WebSocketClass(this.config.serverUrl);

        this.ws.onopen = () => {
          this.status = 'connected';
          this.log('Connected to Hermes Debugger');

          // Register agent
          this.send('register', {
            name: this.config.agentName,
            id: this.config.agentId,
            metadata: this.config.metadata,
          });

          // Flush queued messages
          this.flushQueue();

          resolve();
        };

        this.ws.onmessage = (event: any) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            this.log('Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          this.status = 'disconnected';
          this.log('Disconnected from Hermes Debugger');
          this.scheduleReconnect();
        };

        this.ws.onerror = (error: any) => {
          const wasConnecting = this.status === 'connecting';
          this.status = 'error';
          this.log('WebSocket error:', error);
          if (wasConnecting) {
            reject(new Error('WebSocket connection failed'));
          }
        };
      } catch (error) {
        this.status = 'error';
        reject(error);
      }
    });
  }

  /**
   * Disconnect from Hermes Debugger
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.status = 'disconnected';
    this.log('Disconnected');
  }

  /**
   * Send a thought
   */
  sendThought(payload: ThoughtPayload): void {
    this.send('thought', {
      id: generateId(),
      agentId: this.config.agentId,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }

  /**
   * Start a tool call
   * @returns Tool call ID for tracking
   */
  startToolCall(payload: ToolCallPayload): string {
    const toolCallId = payload.toolCallId || generateId();

    this.pendingToolCalls.set(toolCallId, {
      toolName: payload.toolName,
      startTime: Date.now(),
    });

    this.send('tool_call', {
      id: toolCallId,
      agentId: this.config.agentId,
      timestamp: new Date().toISOString(),
      toolName: payload.toolName,
      params: payload.params,
      status: 'pending',
    });

    return toolCallId;
  }

  /**
   * End a tool call with result
   */
  endToolCall(toolCallId: string, payload: Omit<ToolResultPayload, 'toolCallId' | 'toolName'>): void {
    const pending = this.pendingToolCalls.get(toolCallId);
    if (!pending) {
      this.log('Warning: Unknown tool call ID:', toolCallId);
      return;
    }

    const duration = payload.duration ?? (Date.now() - pending.startTime);

    this.send('tool_result', {
      id: toolCallId,
      agentId: this.config.agentId,
      timestamp: new Date().toISOString(),
      toolName: pending.toolName,
      result: payload.result,
      error: payload.error,
      status: payload.status,
      duration,
    });

    this.pendingToolCalls.delete(toolCallId);
  }

  /**
   * Send token usage
   */
  sendTokenUsage(payload: TokenUsagePayload): void {
    this.send('token_usage', {
      id: generateId(),
      agentId: this.config.agentId,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }

  /**
   * Start a debug session
   */
  startSession(payload?: SessionStartPayload): void {
    this.send('session_start', {
      sessionId: payload?.sessionId || generateId(),
      agentId: this.config.agentId,
      agentName: this.config.agentName,
    });
  }

  /**
   * End the debug session
   */
  endSession(): void {
    this.send('session_end', {
      agentId: this.config.agentId,
    });
  }

  /**
   * Log a message
   */
  log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[Hermes] ${message}`, data || '');
    }
  }

  // ===== Private Methods =====

  private send(type: string, payload: any): void {
    const message = JSON.stringify({ type, payload });

    // Check if WebSocket is open (readyState 1 = OPEN)
    if (this.status === 'connected' && this.ws && this.ws.readyState === 1) {
      this.ws.send(message);
    } else {
      // Queue message for later
      this.messageQueue.push({ type, payload });
    }
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const { type, payload } = this.messageQueue.shift()!;
      this.send(type, payload);
    }
  }

  private handleMessage(message: { type: string; payload: any }): void {
    switch (message.type) {
      case 'register_ack':
        this.log('Agent registered:', message.payload);
        break;
      case 'heartbeat_ack':
        // Heartbeat acknowledged
        break;
      default:
        this.log('Unknown message type:', message.type);
    }
  }

  private scheduleReconnect(): void {
    if (!this.config.autoReconnect) return;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.log('Attempting to reconnect...');
      this.connect().catch((error) => {
        this.log('Reconnect failed:', error.message);
      });
    }, this.config.reconnectInterval);
  }
}

export default Hermes;
