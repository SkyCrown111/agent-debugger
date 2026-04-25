/**
 * Hermes Agent SDK - Type Definitions
 */

export interface HermesConfig {
  /** Debugger server URL (default: ws://localhost:8765) */
  serverUrl?: string;
  /** Agent name displayed in debugger */
  agentName: string;
  /** Agent ID (auto-generated if not provided) */
  agentId?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect interval in ms */
  reconnectInterval?: number;
  /** Enable console logging */
  debug?: boolean;
}

export interface ThoughtPayload {
  /** Thought content */
  content: string;
  /** Thought type */
  type: 'reasoning' | 'planning' | 'reflection';
  /** Processing duration in ms */
  duration?: number;
  /** Token count */
  tokens?: number;
}

export interface ToolCallPayload {
  /** Tool name */
  toolName: string;
  /** Tool parameters */
  params: Record<string, any>;
  /** Tool call ID (auto-generated if not provided) */
  toolCallId?: string;
}

export interface ToolResultPayload {
  /** Tool call ID */
  toolCallId: string;
  /** Tool name */
  toolName: string;
  /** Result data */
  result?: any;
  /** Error message if failed */
  error?: string;
  /** Execution status */
  status: 'success' | 'error';
  /** Execution duration in ms */
  duration?: number;
}

export interface TokenUsagePayload {
  /** Input tokens */
  inputTokens: number;
  /** Output tokens */
  outputTokens: number;
  /** Model name */
  model: string;
}

export interface SessionStartPayload {
  /** Session ID (auto-generated if not provided) */
  sessionId?: string;
}

export interface MessageEvent {
  type: string;
  payload: any;
  timestamp: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface HermesClient {
  /** Connection status */
  status: ConnectionStatus;
  /** Connect to debugger */
  connect(): Promise<void>;
  /** Disconnect from debugger */
  disconnect(): void;
  /** Send thought */
  sendThought(payload: ThoughtPayload): void;
  /** Start tool call */
  startToolCall(payload: ToolCallPayload): string;
  /** End tool call with result */
  endToolCall(toolCallId: string, payload: Omit<ToolResultPayload, 'toolCallId' | 'toolName'>): void;
  /** Send token usage */
  sendTokenUsage(payload: TokenUsagePayload): void;
  /** Start session */
  startSession(payload?: SessionStartPayload): void;
  /** End session */
  endSession(): void;
  /** Log message */
  log(message: string, data?: any): void;
}

export interface TracedResponse {
  /** Original response */
  response: any;
  /** Token usage if available */
  tokenUsage?: TokenUsagePayload;
  /** Thought extracted from response */
  thought?: ThoughtPayload;
}
