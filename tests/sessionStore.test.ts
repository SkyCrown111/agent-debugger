/**
 * Session Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../src/stores/sessionStore';

describe('SessionStore', () => {
  beforeEach(() => {
    // Reset store
    useSessionStore.setState({
      sessions: [],
      thoughts: [],
      toolCalls: [],
      tokenUsages: [],
      errors: [],
    });
  });

  it('should add thought', () => {
    const { addThought } = useSessionStore.getState();
    addThought({
      id: 'thought-1',
      agentId: 'agent-1',
      timestamp: new Date().toISOString(),
      content: 'Test thought',
      type: 'reasoning',
    });

    const { thoughts } = useSessionStore.getState();
    expect(thoughts.length).toBe(1);
    expect(thoughts[0].content).toBe('Test thought');
  });

  it('should add tool call', () => {
    const { addToolCall } = useSessionStore.getState();
    addToolCall({
      id: 'tool-1',
      agentId: 'agent-1',
      timestamp: new Date().toISOString(),
      toolName: 'test_tool',
      params: { query: 'test' },
      status: 'pending',
    });

    const { toolCalls } = useSessionStore.getState();
    expect(toolCalls.length).toBe(1);
    expect(toolCalls[0].toolName).toBe('test_tool');
  });

  it('should update tool call result', () => {
    const { addToolCall, updateToolCall } = useSessionStore.getState();
    addToolCall({
      id: 'tool-1',
      agentId: 'agent-1',
      timestamp: new Date().toISOString(),
      toolName: 'test_tool',
      params: { query: 'test' },
      status: 'pending',
    });

    updateToolCall('tool-1', {
      result: { data: 'success' },
      status: 'success',
      duration: 100,
    });

    const { toolCalls } = useSessionStore.getState();
    expect(toolCalls[0].status).toBe('success');
    expect(toolCalls[0].result).toEqual({ data: 'success' });
  });

  it('should add token usage', () => {
    const { addTokenUsage } = useSessionStore.getState();
    addTokenUsage({
      id: 'token-1',
      agentId: 'agent-1',
      timestamp: new Date().toISOString(),
      inputTokens: 100,
      outputTokens: 50,
      model: 'gpt-4',
    });

    const { tokenUsages } = useSessionStore.getState();
    expect(tokenUsages.length).toBe(1);
    expect(tokenUsages[0].inputTokens).toBe(100);
  });

  it('should add error', () => {
    const { addError } = useSessionStore.getState();
    addError({
      id: 'error-1',
      agentId: 'agent-1',
      timestamp: new Date().toISOString(),
      message: 'Test error',
      errorType: 'RuntimeError',
    });

    const { errors } = useSessionStore.getState();
    expect(errors.length).toBe(1);
    expect(errors[0].message).toBe('Test error');
  });

  it('should clear session', () => {
    const { addThought, clearSession } = useSessionStore.getState();
    addThought({
      id: 'thought-1',
      agentId: 'agent-1',
      timestamp: new Date().toISOString(),
      content: 'Test thought',
      type: 'reasoning',
    });

    clearSession();

    const { thoughts } = useSessionStore.getState();
    expect(thoughts.length).toBe(0);
  });

  it('should calculate total tokens', () => {
    const { addTokenUsage, getTotalTokens } = useSessionStore.getState();
    addTokenUsage({
      id: 'token-1',
      agentId: 'agent-1',
      timestamp: new Date().toISOString(),
      inputTokens: 100,
      outputTokens: 50,
      model: 'gpt-4',
    });
    addTokenUsage({
      id: 'token-2',
      agentId: 'agent-1',
      timestamp: new Date().toISOString(),
      inputTokens: 200,
      outputTokens: 100,
      model: 'gpt-4',
    });

    const total = getTotalTokens();
    expect(total.input).toBe(300); // 100+200
    expect(total.output).toBe(150); // 50+100
  });
});