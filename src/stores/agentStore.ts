import { create } from 'zustand';

export interface Agent {
  id: string;
  name: string;
  status?: 'active' | 'idle' | 'error';
  metadata: Record<string, any>;
  connectedAt: string;
}

interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;

  // Actions
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;
  updateAgentStatus: (agentId: string, status: string) => void;
  selectAgent: (agentId: string | null) => void;
  clearAgents: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  selectedAgentId: null,
  
  setAgents: (agents) => set({ agents }),
  
  addAgent: (agent) => set((state) => ({
    agents: [...state.agents, agent]
  })),
  
  removeAgent: (agentId) => set((state) => ({
    agents: state.agents.filter((a) => a.id !== agentId),
    selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId
  })),

  updateAgentStatus: (agentId, status) => set((state) => ({
    agents: state.agents.map((a) =>
      a.id === agentId ? { ...a, status: status as Agent['status'] } : a
    )
  })),

  selectAgent: (agentId) => set({ selectedAgentId: agentId }),
  
  clearAgents: () => set({ agents: [], selectedAgentId: null })
}));
