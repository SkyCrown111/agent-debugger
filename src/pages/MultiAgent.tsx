import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Select,
  Empty,
  Spin,
  Tooltip,
  Badge,
  Statistic,
  Row,
  Col,
  Drawer,
  Descriptions,
  Timeline,
  Divider,
} from 'antd';
import {
  TeamOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTranslation } from 'react-i18next';
import { useAgentStore } from '../stores/agentStore';
import { useSessionStore, Thought, ToolCall } from '../stores/sessionStore';

const { Title, Text } = Typography;

interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'thinking' | 'working' | 'waiting' | 'error';
  role: string;
  color: string;
  messageCount: number;
  toolCallCount: number;
  lastActivity?: string;
}

interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  type: 'request' | 'response' | 'broadcast' | 'error';
  content: string;
  timestamp: string;
}

interface AgentCollaboration {
  id: string;
  name: string;
  agents: Agent[];
  messages: AgentMessage[];
  startTime: string;
  status: 'running' | 'completed' | 'error';
}

// Agent 节点组件
const AgentNode: React.FC<{ data: Agent }> = ({ data }) => {
  const statusConfig = {
    idle: { color: '#8c8c8c', icon: <ClockCircleOutlined /> },
    thinking: { color: '#d97706', icon: <SyncOutlined spin /> },
    working: { color: '#52c41a', icon: <ThunderboltOutlined /> },
    waiting: { color: '#faad14', icon: <ClockCircleOutlined /> },
    error: { color: '#ff4d4f', icon: <ExclamationCircleOutlined /> },
  };

  const config = statusConfig[data.status];

  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: 8,
        background: '#1a1a2e',
        border: `2px solid ${data.color}`,
        minWidth: 150,
        boxShadow: `0 0 20px ${data.color}33`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Badge color={config.color} />
        <Text strong style={{ color: '#fff' }}>{data.name}</Text>
      </div>
      <div style={{ fontSize: 12, color: '#8c8c8c' }}>{data.role}</div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span>
          <ApiOutlined /> {data.messageCount}
        </span>
        <span>
          <ThunderboltOutlined /> {data.toolCallCount}
        </span>
      </div>
    </div>
  );
};

const nodeTypes = {
  agent: AgentNode,
};

const MultiAgent: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // 使用真实数据
  const { agents } = useAgentStore();
  const { thoughts, toolCalls, errors } = useSessionStore();

  // 从真实数据构建 Agent 列表
  const realAgents: Agent[] = useMemo(() => {
    return agents.map((agent, index) => {
      const agentThoughts = thoughts.filter(t => t.agentId === agent.id);
      const agentToolCalls = toolCalls.filter(t => t.agentId === agent.id);
      const agentErrors = errors.filter(e => e.agentId === agent.id);

      // 确定状态
      let status: Agent['status'] = 'idle';
      if (agentErrors.length > 0) {
        status = 'error';
      } else if (agentToolCalls.some(t => t.status === 'pending')) {
        status = 'working';
      } else if (agentThoughts.length > 0) {
        status = 'thinking';
      }

      const colors = ['#d97706', '#52c41a', '#722ed1', '#faad14', '#13c2c2', '#eb2f96', '#fa541c'];

      return {
        id: agent.id,
        name: agent.name,
        status,
        role: agent.metadata?.role || 'Agent',
        color: colors[index % colors.length],
        messageCount: agentThoughts.length,
        toolCallCount: agentToolCalls.length,
        lastActivity: agent.connectedAt,
      };
    });
  }, [agents, thoughts, toolCalls, errors]);

  // 构建消息流（基于思考链）
  const agentMessages: AgentMessage[] = useMemo(() => {
    // 将工具调用作为消息
    return toolCalls.map((tc, index) => ({
      id: `msg-${index}`,
      fromAgent: tc.agentId,
      toAgent: 'system',
      type: tc.status === 'error' ? 'error' : 'request' as const,
      content: `调用工具: ${tc.toolName}`,
      timestamp: tc.timestamp,
    }));
  }, [toolCalls]);

  // 当前协作数据
  const currentCollab: AgentCollaboration | null = useMemo(() => {
    if (realAgents.length === 0) return null;

    return {
      id: 'current-session',
      name: '当前会话',
      agents: realAgents,
      messages: agentMessages,
      startTime: realAgents[0]?.lastActivity || new Date().toISOString(),
      status: errors.length > 0 ? 'error' : 'running',
    };
  }, [realAgents, agentMessages, errors]);

  useEffect(() => {
    if (currentCollab) {
      updateFlowGraph(currentCollab);
    }
  }, [currentCollab]);

  const updateFlowGraph = (collab: AgentCollaboration) => {
    // 生成节点
    const agentNodes: Node[] = collab.agents.map((agent, index) => {
      const angle = (index / collab.agents.length) * 2 * Math.PI;
      const radius = 200;
      return {
        id: agent.id,
        type: 'agent',
        position: {
          x: 400 + radius * Math.cos(angle),
          y: 300 + radius * Math.sin(angle),
        },
        data: agent,
      };
    });

    // 生成边（基于消息）
    const messageEdges: Edge[] = collab.messages.slice(0, 50).map((msg, index) => ({
      id: `edge-${index}`,
      source: msg.fromAgent,
      target: msg.toAgent,
      animated: msg.type === 'request',
      style: { stroke: msg.type === 'error' ? '#ff4d4f' : '#d97706' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: msg.type === 'error' ? '#ff4d4f' : '#d97706',
      },
      label: msg.type,
    }));

    setNodes(agentNodes);
    setEdges(messageEdges);
  };

  const selectCollaboration = (collab: AgentCollaboration) => {
    updateFlowGraph(collab);
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    const agent = currentCollab?.agents.find(a => a.id === node.id);
    if (agent) {
      setSelectedAgent(agent);
      setDrawerVisible(true);
    }
  };

  const getStatusTag = (status: Agent['status']) => {
    const config = {
      idle: { color: 'default', text: isZh ? '空闲' : 'Idle' },
      thinking: { color: 'processing', text: isZh ? '思考中' : 'Thinking' },
      working: { color: 'success', text: isZh ? '工作中' : 'Working' },
      waiting: { color: 'warning', text: isZh ? '等待中' : 'Waiting' },
      error: { color: 'error', text: isZh ? '出错' : 'Error' },
    };
    return <Tag color={config[status].color}>{config[status].text}</Tag>;
  };

  // 统计信息
  const stats = currentCollab ? {
    totalAgents: currentCollab.agents.length,
    activeAgents: currentCollab.agents.filter(a => a.status !== 'idle').length,
    totalMessages: currentCollab.messages.length,
    totalToolCalls: currentCollab.agents.reduce((sum, a) => sum + a.toolCallCount, 0),
  } : null;

  return (
    <div className="multi-agent-page">
      <div className="page-header">
        <Title level={4}>
          <TeamOutlined /> {t('multiAgent.title')}
        </Title>
      </div>

      {/* 协作信息 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Text>{isZh ? '当前会话' : 'Current Session'}:</Text>
          <Tag color={currentCollab?.status === 'running' ? 'processing' : currentCollab?.status === 'completed' ? 'success' : 'error'}>
            {currentCollab?.name || (isZh ? '无活动会话' : 'No active session')}
          </Tag>
          <Tag color="orange">{agents.length} {isZh ? '个 Agent 连接' : 'Agents connected'}</Tag>
          <Button icon={<SyncOutlined />} onClick={() => currentCollab && updateFlowGraph(currentCollab)}>{t('common.refresh')}</Button>
        </Space>
      </Card>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Spin size="large" tip={isZh ? '加载协作数据...' : 'Loading...'} />
        </div>
      ) : !currentCollab || currentCollab.agents.length === 0 ? (
        <Empty description={t('multiAgent.noAgents')} />
      ) : (
        <>
          {/* 统计卡片 */}
          {stats && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic title={isZh ? 'Agent 数量' : 'Agent Count'} value={stats.totalAgents} prefix={<TeamOutlined />} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title={isZh ? '活跃 Agent' : 'Active Agents'} value={stats.activeAgents} valueStyle={{ color: '#52c41a' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title={isZh ? '消息数量' : 'Messages'} value={stats.totalMessages} prefix={<ApiOutlined />} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title={t('dashboard.toolCalls')} value={stats.totalToolCalls} prefix={<ThunderboltOutlined />} />
                </Card>
              </Col>
            </Row>
          )}

          {/* 协作图 */}
          <Card>
            <div style={{ height: 500 }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
              >
                <Background color="#333" gap={20} />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>
          </Card>

          {/* 消息时间线 */}
          <Card title={t('multiAgent.messages')} style={{ marginTop: 16 }}>
            {currentCollab.messages.length === 0 ? (
              <Empty description={isZh ? '暂无消息记录' : 'No messages'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Timeline
                items={currentCollab.messages.slice(0, 50).map(msg => {
                  const fromAgent = currentCollab.agents.find(a => a.id === msg.fromAgent);
                  return {
                    color: msg.type === 'error' ? 'red' : msg.type === 'request' ? 'blue' : 'green',
                    children: (
                      <div>
                        <Space>
                          <Tag color={fromAgent?.color}>{fromAgent?.name || 'Unknown'}</Tag>
                          <Tag>{msg.type}</Tag>
                        </Space>
                        <div style={{ marginTop: 4 }}>
                          <Text>{msg.content}</Text>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </Text>
                        </div>
                      </div>
                    ),
                  };
                })}
              />
            )}
          </Card>
        </>
      )}

      {/* Agent 详情抽屉 */}
      <Drawer
        title={selectedAgent?.name}
        placement="right"
        width={400}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedAgent && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={isZh ? '状态' : 'Status'}>{getStatusTag(selectedAgent.status)}</Descriptions.Item>
              <Descriptions.Item label={isZh ? '角色' : 'Role'}>{selectedAgent.role}</Descriptions.Item>
              <Descriptions.Item label={isZh ? '消息数' : 'Messages'}>{selectedAgent.messageCount}</Descriptions.Item>
              <Descriptions.Item label={isZh ? '工具调用' : 'Tool Calls'}>{selectedAgent.toolCallCount}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Title level={5}>{isZh ? '最近活动' : 'Recent Activity'}</Title>
            {currentCollab?.messages
              .filter(m => m.fromAgent === selectedAgent.id)
              .slice(0, 5)
              .map(msg => (
                <Card key={msg.id} size="small" style={{ marginBottom: 8 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <Tag color={msg.type === 'request' ? 'blue' : 'green'}>{msg.type}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </Text>
                    </Space>
                    <Text>{msg.content}</Text>
                  </Space>
                </Card>
              ))}
            {currentCollab?.messages.filter(m => m.fromAgent === selectedAgent.id).length === 0 && (
              <Text type="secondary">{isZh ? '暂无活动记录' : 'No recent activity'}</Text>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default MultiAgent;