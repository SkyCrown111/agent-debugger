/**
 * Agent Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentStore } from '../src/stores/agentStore';

describe('AgentStore', () => {
  beforeEach(() => {
    // Reset store
    useAgentStore.setState({
      agents: [],
      selectedAgentId: null,
    });
  });

  it('should add agent', () => {
    const { addAgent } = useAgentStore.getState();
    addAgent({
      id: 'agent-1',
      name: 'Test Agent',
      status: 'connected',
      connectedAt: new Date().toISOString(),
    });

    const { agents } = useAgentStore.getState();
    expect(agents.length).toBe(1);
    expect(agents[0].name).toBe('Test Agent');
  });

  it('should remove agent', () => {
    const { addAgent, removeAgent } = useAgentStore.getState();
    addAgent({
      id: 'agent-1',
      name: 'Test Agent',
      status: 'connected',
      connectedAt: new Date().toISOString(),
    });

    removeAgent('agent-1');

    const { agents } = useAgentStore.getState();
    expect(agents.length).toBe(0);
  });

  it('should update agent status', () => {
    const { addAgent, updateAgentStatus } = useAgentStore.getState();
    addAgent({
      id: 'agent-1',
      name: 'Test Agent',
      status: 'connected',
      connectedAt: new Date().toISOString(),
    });

    updateAgentStatus('agent-1', 'disconnected');

    const { agents } = useAgentStore.getState();
    expect(agents[0].status).toBe('disconnected');
  });

  it('should select agent', () => {
    const { selectAgent } = useAgentStore.getState();
    selectAgent('agent-1');

    const { selectedAgentId } = useAgentStore.getState();
    expect(selectedAgentId).toBe('agent-1');
  });
});