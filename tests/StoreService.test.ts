/**
 * StoreService Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock electron-store
vi.mock('electron-store', () => {
  return {
    default: class MockStore {
      private store: Record<string, any>;

      constructor() {
        this.store = {
          sessions: {},
          currentSessionId: null,
          config: {
            theme: 'dark',
            autoStart: true,
            port: 8765
          }
        };
      }

      get(key: string) {
        return this.store[key];
      }
      set(key: string, value: any) {
        if (typeof key === 'string') {
          this.store[key] = value;
        }
      }
    }
  };
});

import { StoreService } from '../electron/services/StoreService';

describe('StoreService', () => {
  let service: StoreService;

  beforeEach(() => {
    service = new StoreService();
  });

  it('should create a session', () => {
    const session = service.createSession('agent-1', 'Test Agent');
    expect(session).toBeDefined();
    expect(session.agentId).toBe('agent-1');
    expect(session.agentName).toBe('Test Agent');
    expect(session.status).toBe('running');
  });

  it('should get all sessions', () => {
    service.createSession('agent-1', 'Agent 1');
    service.createSession('agent-2', 'Agent 2');
    
    const sessions = service.getAllSessions();
    expect(sessions.length).toBe(2);
  });

  it('should add thought to session', () => {
    service.createSession('agent-1', 'Test Agent');
    service.addThought({
      agentId: 'agent-1',
      content: 'Test thought',
      type: 'reasoning'
    });
    
    const session = service.getCurrentSession();
    expect(session?.thoughts.length).toBe(1);
  });

  it('should add tool call to session', () => {
    service.createSession('agent-1', 'Test Agent');
    service.addToolCall({
      agentId: 'agent-1',
      toolName: 'test_tool',
      params: { query: 'test' }
    });
    
    const session = service.getCurrentSession();
    expect(session?.toolCalls.length).toBe(1);
  });

  it('should add token usage to session', () => {
    service.createSession('agent-1', 'Test Agent');
    service.addTokenUsage({
      agentId: 'agent-1',
      inputTokens: 100,
      outputTokens: 50,
      model: 'gpt-4'
    });
    
    const session = service.getCurrentSession();
    expect(session?.tokenUsages.length).toBe(1);
  });

  it('should end session properly', () => {
    const session = service.createSession('agent-1', 'Test Agent');
    service.endSession(session.id);
    
    const endedSession = service.getSession(session.id);
    expect(endedSession?.status).toBe('completed');
    expect(endedSession?.endTime).toBeDefined();
  });

  it('should get config', () => {
    const config = service.getConfig();
    expect(config.theme).toBe('dark');
    expect(config.autoStart).toBe(true);
  });
});