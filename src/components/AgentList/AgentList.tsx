import React from 'react';
import { List, Badge, Tag } from 'antd';
import { useAgentStore } from '../../stores/agentStore';
import './AgentList.css';

export const AgentList: React.FC = () => {
  const { agents, selectedAgentId, selectAgent } = useAgentStore();

  if (agents.length === 0) {
    return (
      <div className="agent-list-empty">
        <span>等待 Agent 连接...</span>
        <span className="hint">ws://localhost:8765</span>
      </div>
    );
  }

  return (
    <List
      className="agent-list"
      dataSource={agents}
      renderItem={(agent) => (
        <List.Item
          className={`agent-item ${selectedAgentId === agent.id ? 'selected' : ''}`}
          onClick={() => selectAgent(agent.id)}
        >
          <div className="agent-info">
            <Badge status="success" />
            <span className="agent-name">{agent.name}</span>
          </div>
          {agent.metadata?.framework && (
            <Tag color="orange">{agent.metadata.framework}</Tag>
          )}
        </List.Item>
      )}
    />
  );
};