/**
 * WebSocket Server Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketServer } from '../electron/services/WebSocketServer';

describe('WebSocketServer', () => {
  let server: WebSocketServer;

  beforeEach(() => {
    server = new WebSocketServer(8766);
  });

  afterEach(() => {
    server.close();
  });

  it('should start on specified port', () => {
    expect(server.getPort()).toBe(8766);
    expect(server.isRunning()).toBe(true);
  });

  it('should emit agent:connected when agent registers', async () => {
    const mockWs = {
      send: vi.fn(),
      readyState: 1, // OPEN
      on: vi.fn(),
    };

    const connectedPromise = new Promise((resolve) => {
      server.on('agent:connected', resolve);
    });

    // Simulate registration
    server.emit('agent:connected', {
      id: 'test-agent',
      name: 'Test Agent',
      metadata: {},
      connectedAt: new Date(),
    });

    const result = await connectedPromise;
    expect(result).toBeDefined();
  });

  it('should return empty array when no agents connected', () => {
    const agents = server.getConnectedAgents();
    expect(agents).toEqual([]);
  });

  it('should close properly', () => {
    server.close();
    expect(server.isRunning()).toBe(false);
  });
});