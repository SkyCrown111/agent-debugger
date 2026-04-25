import React, { useMemo, useCallback, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  Handle,
  NodeProps,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Tag,
  Tooltip,
  Badge,
  Input,
  Select,
  Drawer,
  Descriptions,
  Button,
  Space,
  Statistic,
  Divider,
  Empty
} from 'antd';
import {
  BulbOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  FullscreenOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSessionStore, Thought, ToolCall } from '../../stores/sessionStore';
import './ThoughtFlowGraph.css';

const { Search } = Input;

// 自定义思考节点
const ThoughtNode: React.FC<NodeProps<{ data: Thought }>> = ({ data, selected }) => {
  const thought = data.data;
  const typeColors: Record<string, string> = {
    reasoning: '#faad14',
    planning: '#13c2c2',
    reflection: '#722ed1',
  };

  return (
    <div className={`thought-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header" style={{ borderColor: typeColors[thought.type] }}>
        <BulbOutlined style={{ color: typeColors[thought.type] }} />
        <Tag color={typeColors[thought.type]}>{thought.type}</Tag>
        {thought.duration && (
          <Tooltip title="Duration">
            <span className={`node-duration ${thought.duration > 2000 ? 'slow' : ''}`}>
              <ClockCircleOutlined /> {thought.duration}ms
            </span>
          </Tooltip>
        )}
      </div>
      <div className="node-content">
        {thought.content.length > 100
          ? `${thought.content.slice(0, 100)}...`
          : thought.content}
      </div>
      {thought.tokens && (
        <div className="node-footer">
          <Badge count={thought.tokens} style={{ backgroundColor: '#d97706' }} showZero />
          <span className="token-label">tokens</span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// 自定义工具调用节点
const ToolNode: React.FC<NodeProps<{ data: ToolCall }>> = ({ data, selected }) => {
  const toolCall = data.data;

  const statusIcon = toolCall.status === 'success'
    ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
    : toolCall.status === 'error'
      ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      : <LoadingOutlined style={{ color: '#d97706' }} />;

  const statusColor = toolCall.status === 'success'
    ? '#52c41a'
    : toolCall.status === 'error'
      ? '#ff4d4f'
      : '#d97706';

  return (
    <div className={`tool-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header" style={{ borderColor: statusColor }}>
        <ToolOutlined style={{ color: statusColor }} />
        <Tag color="orange">{toolCall.toolName}</Tag>
        {statusIcon}
      </div>
      <div className="node-params">
        <pre>{JSON.stringify(toolCall.params, null, 2).slice(0, 80)}...</pre>
      </div>
      {toolCall.duration && (
        <div className="node-footer">
          <Tooltip title={toolCall.duration > 1000 ? 'Slow call warning' : 'Execution duration'}>
            <span className={`node-duration ${toolCall.duration > 1000 ? 'slow' : ''}`}>
              <ClockCircleOutlined /> {toolCall.duration}ms
            </span>
          </Tooltip>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// 自定义开始节点
const StartNode: React.FC<NodeProps> = () => (
  <div className="start-node">
    <Handle type="source" position={Position.Bottom} />
    <div className="start-content">
      <span>🚀 Start</span>
    </div>
  </div>
);

// 节点类型映射
const nodeTypes = {
  thought: ThoughtNode,
  tool: ToolNode,
  start: StartNode,
};

interface ThoughtFlowGraphProps {
  onNodeSelect?: (node: Node) => void;
}

export const ThoughtFlowGraph: React.FC<ThoughtFlowGraphProps> = ({ onNodeSelect }) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { thoughts, toolCalls } = useSessionStore();
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'thought' | 'tool'>('all');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // 构建节点和边
  const { nodes, edges, stats } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // 添加开始节点
    nodes.push({
      id: 'start',
      type: 'start',
      position: { x: 250, y: 0 },
      data: {},
    });

    // 合并并按时间排序所有事件
    let allEvents = [
      ...thoughts.map(t => ({ ...t, eventType: 'thought' as const })),
      ...toolCalls.map(t => ({ ...t, eventType: 'tool' as const })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 应用过滤
    if (filterType !== 'all') {
      allEvents = allEvents.filter(e => e.eventType === filterType);
    }

    // 应用搜索
    if (searchText) {
      allEvents = allEvents.filter(e => {
        if (e.eventType === 'thought') {
          return e.content.toLowerCase().includes(searchText.toLowerCase());
        } else {
          return e.toolName.toLowerCase().includes(searchText.toLowerCase()) ||
            JSON.stringify(e.params).toLowerCase().includes(searchText.toLowerCase());
        }
      });
    }

    // 创建节点
    let prevId = 'start';
    allEvents.forEach((event, index) => {
      const nodeId = event.eventType === 'thought' ? `thought-${event.id}` : `tool-${event.id}`;
      const nodeType = event.eventType === 'thought' ? 'thought' : 'tool';

      const baseY = 100;
      const nodeSpacing = 200;

      nodes.push({
        id: nodeId,
        type: nodeType,
        position: { x: 250, y: baseY + index * nodeSpacing },
        data: { data: event },
      });

      // 创建边
      edges.push({
        id: `edge-${prevId}-${nodeId}`,
        source: prevId,
        target: nodeId,
        type: 'smoothstep',
        animated: event.eventType === 'tool' && event.status === 'pending',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: event.eventType === 'tool'
            ? (event.status === 'error' ? '#ff4d4f' : '#52c41a')
            : '#d97706',
        },
        style: {
          stroke: event.eventType === 'tool'
            ? (event.status === 'error' ? '#ff4d4f' : '#52c41a')
            : '#d97706',
        },
      });

      prevId = nodeId;
    });

    // 统计数据
    const thoughtStats = {
      total: thoughts.length,
      avgDuration: thoughts.length > 0
        ? Math.round(thoughts.reduce((sum, t) => sum + (t.duration || 0), 0) / thoughts.length)
        : 0,
      totalTokens: thoughts.reduce((sum, t) => sum + (t.tokens || 0), 0),
      byType: {
        reasoning: thoughts.filter(t => t.type === 'reasoning').length,
        planning: thoughts.filter(t => t.type === 'planning').length,
        reflection: thoughts.filter(t => t.type === 'reflection').length,
      }
    };

    const toolStats = {
      total: toolCalls.length,
      success: toolCalls.filter(t => t.status === 'success').length,
      error: toolCalls.filter(t => t.status === 'error').length,
      avgDuration: toolCalls.length > 0
        ? Math.round(toolCalls.reduce((sum, t) => sum + (t.duration || 0), 0) / toolCalls.length)
        : 0,
      slowCalls: toolCalls.filter(t => (t.duration || 0) > 1000).length,
    };

    return { nodes, edges, stats: { thoughtStats, toolStats } };
  }, [thoughts, toolCalls, searchText, filterType]);

  // 节点点击处理
  const onNodeClickHandler = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  if (nodes.length <= 1) {
    return (
      <div className="thought-flow-empty">
        <div className="empty-icon">🧠</div>
        <p>{t('thoughtFlow.waitingForActivity')}</p>
        <p className="empty-hint">{t('thoughtFlow.connectHint')}</p>
      </div>
    );
  }

  return (
    <div className="thought-flow-container">
      {/* 工具栏 */}
      <div className="flow-toolbar">
        <Space>
          <Search
            placeholder={t('thoughtFlow.searchPlaceholder')}
            allowClear
            style={{ width: 250 }}
            onSearch={setSearchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 120 }}
            options={[
              { label: t('thoughtFlow.all'), value: 'all' },
              { label: t('thoughtFlow.thoughts'), value: 'thought' },
              { label: t('thoughtFlow.tools'), value: 'tool' },
            ]}
          />
        </Space>

        {/* 统计信息 */}
        <div className="flow-stats">
          <Statistic
            title={t('thoughtFlow.thoughts')}
            value={stats.thoughtStats.total}
            suffix={`(${stats.thoughtStats.avgDuration}ms)`}
            valueStyle={{ fontSize: 14 }}
          />
          <Statistic
            title={t('thoughtFlow.tools')}
            value={stats.toolStats.total}
            suffix={`✓${stats.toolStats.success} ✗${stats.toolStats.error}`}
            valueStyle={{ fontSize: 14 }}
          />
          {stats.toolStats.slowCalls > 0 && (
            <Tag color="warning">{isZh ? '慢调用' : 'Slow Calls'}: {stats.toolStats.slowCalls}</Tag>
          )}
        </div>
      </div>

      {/* 流程图 */}
      <div className="thought-flow-graph">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClickHandler}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'thought') return '#d97706';
              if (node.type === 'tool') return '#52c41a';
              return '#faad14';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      {/* 节点详情抽屉 */}
      <Drawer
        title={selectedNode?.type === 'thought' ? t('thoughtFlow.thoughtDetail') : t('thoughtFlow.toolDetail')}
        placement="right"
        width={500}
        open={!!selectedNode}
        onClose={() => setSelectedNode(null)}
      >
        {selectedNode && selectedNode.type !== 'start' && (
          <NodeDetailDrawer node={selectedNode} />
        )}
      </Drawer>
    </div>
  );
};

// 节点详情组件
const NodeDetailDrawer: React.FC<{ node: Node }> = ({ node }) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  if (node.type === 'thought') {
    const thought = node.data.data as Thought;
    return (
      <div className="node-detail">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="ID">{thought.id}</Descriptions.Item>
          <Descriptions.Item label={isZh ? '类型' : 'Type'}>
            <Tag color={
              thought.type === 'reasoning' ? 'warning' :
              thought.type === 'planning' ? 'cyan' : 'purple'
            }>
              {thought.type}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={isZh ? '时间' : 'Time'}>{thought.timestamp}</Descriptions.Item>
          {thought.duration && (
            <Descriptions.Item label={isZh ? '耗时' : 'Duration'}>
              <span className={thought.duration > 2000 ? 'text-warning' : ''}>
                {thought.duration}ms
              </span>
            </Descriptions.Item>
          )}
          {thought.tokens && (
            <Descriptions.Item label="Token">{thought.tokens}</Descriptions.Item>
          )}
        </Descriptions>

        <Divider>{t('thoughtFlow.thinkingContent')}</Divider>
        <div className="detail-content">
          {thought.content}
        </div>
      </div>
    );
  } else if (node.type === 'tool') {
    const toolCall = node.data.data as ToolCall;
    return (
      <div className="node-detail">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('toolTrace.toolName')}>
            <Tag color="orange">{toolCall.toolName}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('toolTrace.status')}>
            {toolCall.status === 'success' ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>{t('toolTrace.success')}</Tag>
            ) : toolCall.status === 'error' ? (
              <Tag color="error" icon={<CloseCircleOutlined />}>{t('toolTrace.failed')}</Tag>
            ) : (
              <Tag color="processing" icon={<LoadingOutlined />}>{t('toolTrace.running')}</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={isZh ? '时间' : 'Time'}>{toolCall.timestamp}</Descriptions.Item>
          {toolCall.duration && (
            <Descriptions.Item label={isZh ? '耗时' : 'Duration'}>
              <span className={toolCall.duration > 1000 ? 'text-warning' : ''}>
                {toolCall.duration}ms
                {toolCall.duration > 1000 && <Tag color="warning" style={{ marginLeft: 8 }}>{isZh ? '慢调用' : 'Slow'}</Tag>}
              </span>
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider>{t('thoughtFlow.params')}</Divider>
        <pre className="detail-json">{JSON.stringify(toolCall.params, null, 2)}</pre>

        {toolCall.result && (
          <>
            <Divider>{t('thoughtFlow.result')}</Divider>
            <pre className="detail-json">{typeof toolCall.result === 'string'
              ? toolCall.result
              : JSON.stringify(toolCall.result, null, 2)}
            </pre>
          </>
        )}

        {toolCall.error && (
          <>
            <Divider>{t('thoughtFlow.errorInfo')}</Divider>
            <div className="detail-error">{toolCall.error}</div>
          </>
        )}
      </div>
    );
  }

  return <Empty description={isZh ? '无详情' : 'No details'} />;
};

export default ThoughtFlowGraph;
