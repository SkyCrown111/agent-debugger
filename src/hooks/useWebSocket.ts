import { useEffect } from 'react';
import { useAgentStore } from '../stores/agentStore';
import { useSessionStore } from '../stores/sessionStore';

interface WebSocketMessage {
  type: 'agent_connect' | 'agent_disconnect' | 'thought' | 'tool_call' | 'tool_result' | 'token_usage' | 'error';
  payload: any;
  timestamp: string;
}

export function useWebSocket() {
  const { addAgent, removeAgent } = useAgentStore();
  const { addThought, addToolCall, updateToolCall, addTokenUsage } = useSessionStore();

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8765');

    ws.onopen = () => {
      console.log('Connected to Agent Debugger server');
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        handleMessage(msg);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Disconnected from Agent Debugger server');
    };

    return () => {
      ws.close();
    };
  }, []);

  function handleMessage(msg: WebSocketMessage) {
    switch (msg.type) {
      case 'agent_connect':
        addAgent({
          id: msg.payload.id,
          name: msg.payload.name,
          metadata: msg.payload.metadata || {},
          connectedAt: msg.timestamp,
        });
        break;

      case 'agent_disconnect':
        removeAgent(msg.payload.id);
        break;

      case 'thought':
        addThought({
          id: msg.payload.id,
          agentId: msg.payload.agentId,
          timestamp: msg.timestamp,
          content: msg.payload.content,
          type: msg.payload.type || 'reasoning',
          duration: msg.payload.duration,
          tokens: msg.payload.tokens,
        });
        break;

      case 'tool_call':
        addToolCall({
          id: msg.payload.id,
          agentId: msg.payload.agentId,
          timestamp: msg.timestamp,
          toolName: msg.payload.name,
          params: msg.payload.params,
          status: 'pending',
        });
        break;

      case 'tool_result':
        updateToolCall(msg.payload.id, {
          result: msg.payload.result,
          error: msg.payload.error,
          duration: msg.payload.duration,
          status: msg.payload.error ? 'error' : 'success',
        });
        break;

      case 'token_usage':
        addTokenUsage({
          id: msg.payload.id,
          agentId: msg.payload.agentId,
          timestamp: msg.timestamp,
          inputTokens: msg.payload.input,
          outputTokens: msg.payload.output,
          model: msg.payload.model,
        });
        break;
    }
  }

  return { isConnected: true };
}
