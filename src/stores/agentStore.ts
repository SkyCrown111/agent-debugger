import { create } from 'zustand';

export interface Agent {
  id: string;
  name: string;
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
  selectAgent: (agentId: string | null) => void;
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
  
  selectAgent: (agentId) => set({ selectedAgentId: agentId })
}));
