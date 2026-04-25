import React, { useState, useEffect, useCallback } from 'react';
import { Card, Statistic, Progress, Button, Space, Tag, Empty, Switch, message, List, Badge, Tooltip, Spin } from 'antd';
import {
  BulbOutlined,
  ToolOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  SearchOutlined,
  DesktopOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../stores/sessionStore';
import { useAgentStore } from '../stores/agentStore';
import { ThoughtTimeline } from '../components/ThoughtTimeline/ThoughtTimeline';
import { ExportButton } from '../components/Export/ExportModal';
import { generateDemoData, DemoDataStreamer } from '../utils/demoData';
import './Dashboard.css';

interface DiscoveredAgent {
  id: string;
  name: string;
  address: string;
  port: number;
  lastSeen: string;
  metadata?: Record<string, any>;
}

// 演示数据流实例
let demoStreamer: DemoDataStreamer | null = null;

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { thoughts, toolCalls, tokenUsages, getTotalTokens, getToolCallStats, addThought, addToolCall, addTokenUsage, clearSession } = useSessionStore();
  const { agents } = useAgentStore();
  const [demoMode, setDemoMode] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [discoveredAgents, setDiscoveredAgents] = useState<DiscoveredAgent[]>([]);
  const [discovering, setDiscovering] = useState(false);

  const tokens = getTotalTokens();
  const toolStats = getToolCallStats();

  // Agent 发现
  const discoverAgents = useCallback(async () => {
    setDiscovering(true);
    try {
      const discovered = await window.electronAPI?.discoverAgents?.();
      if (discovered) {
        setDiscoveredAgents(discovered);
        if (discovered.length > 0) {
          message.success(t('dashboard.foundAgents', { count: discovered.length }));
        } else {
          message.info(t('dashboard.noAgentsFound'));
        }
      }
    } catch (error) {
      console.error('Discovery error:', error);
    } finally {
      setDiscovering(false);
    }
  }, [t]);

  // 监听发现的 Agent
  useEffect(() => {
    const unsub1 = window.electronAPI?.onAgentDiscovered?.((agent: DiscoveredAgent) => {
      setDiscoveredAgents(prev => {
        if (prev.find(a => a.id === agent.id)) {
          return prev.map(a => a.id === agent.id ? agent : a);
        }
        return [...prev, agent];
      });
    });

    const unsub2 = window.electronAPI?.onAgentDiscoveredRemoved?.((agentId: string) => {
      setDiscoveredAgents(prev => prev.filter(a => a.id !== agentId));
    });

    // 初始加载已发现的 Agent
    window.electronAPI?.getDiscoveredAgents?.()?.then((agents: DiscoveredAgent[]) => {
      if (agents) setDiscoveredAgents(agents);
    });

    return () => {
      unsub1?.();
      unsub2?.();
    };
  }, []);

  // 计算成本（简化版）
  const estimatedCost = (tokens.input * 0.01 + tokens.output * 0.03) / 1000;

  // 启动演示模式
  const startDemoMode = () => {
    clearSession();

    const demoData = generateDemoData({
      thoughtCount: 10,
      toolCallCount: 8,
      tokenUsageCount: 6,
    });

    demoData.thoughts.forEach(t => addThought(t));
    demoData.toolCalls.forEach(t => addToolCall(t));
    demoData.tokenUsages.forEach(t => addTokenUsage(t));

    setDemoMode(true);
    message.success(t('dashboard.demoStarted'));
  };

  // 停止演示模式
  const stopDemoMode = () => {
    if (demoStreamer) {
      demoStreamer.stop();
      demoStreamer = null;
    }
    setIsStreaming(false);
    setDemoMode(false);
    clearSession();
    message.info(t('dashboard.demoStopped'));
  };

  // 启动实时数据流
  const startStreaming = () => {
    if (demoStreamer) {
      demoStreamer.stop();
    }

    demoStreamer = new DemoDataStreamer();

    demoStreamer.on('thought', (thought) => {
      addThought(thought);
    });

    demoStreamer.on('toolCall', (toolCall) => {
      addToolCall(toolCall);
    });

    demoStreamer.on('tokenUsage', (usage) => {
      addTokenUsage(usage);
    });

    demoStreamer.start(1500);
    setIsStreaming(true);
    message.success(t('dashboard.streamStarted'));
  };

  // 停止实时数据流
  const stopStreaming = () => {
    if (demoStreamer) {
      demoStreamer.stop();
      demoStreamer = null;
    }
    setIsStreaming(false);
    message.info(t('dashboard.streamStopped'));
  };

  // 清理
  useEffect(() => {
    return () => {
      if (demoStreamer) {
        demoStreamer.stop();
      }
    };
  }, []);

  // 计算平均耗时
  const avgThoughtDuration = thoughts.length > 0
    ? Math.round(thoughts.reduce((sum, t) => sum + (t.duration || 0), 0) / thoughts.length)
    : 0;

  const avgToolDuration = toolCalls.length > 0
    ? Math.round(toolCalls.reduce((sum, t) => sum + (t.duration || 0), 0) / toolCalls.length)
    : 0;

  // 慢调用统计
  const slowCalls = toolCalls.filter(t => (t.duration || 0) > 1000).length;

  return (
    <div className="dashboard">
      {/* 演示模式控制栏 */}
      <Card className="demo-control-card">
        <div className="demo-control">
          <Space>
            <Tag color={demoMode ? 'success' : 'default'} icon={<PlayCircleOutlined />}>
              {demoMode ? t('dashboard.demoMode') : t('dashboard.liveMode')}
            </Tag>
            {demoMode && (
              <Tag color={isStreaming ? 'processing' : 'default'} icon={<ThunderboltOutlined />}>
                {isStreaming ? t('dashboard.liveStream') : t('dashboard.staticData')}
              </Tag>
            )}
          </Space>

          <Space>
            <ExportButton />
            {!demoMode ? (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={startDemoMode}
              >
                {t('common.startDemo')}
              </Button>
            ) : (
              <>
                {!isStreaming ? (
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={startStreaming}
                  >
                    {t('dashboard.startStream')}
                  </Button>
                ) : (
                  <Button
                    icon={<PauseCircleOutlined />}
                    onClick={stopStreaming}
                  >
                    {t('dashboard.stopStream')}
                  </Button>
                )}
                <Button
                  danger
                  onClick={stopDemoMode}
                >
                  {t('common.stopDemo')}
                </Button>
              </>
            )}
          </Space>
        </div>
      </Card>

      {/* Agent 发现 */}
      <Card
        className="discovery-card"
        title={
          <Space>
            <SearchOutlined />
            <span>{t('dashboard.agentDiscovery')}</span>
            {discovering && <Spin size="small" />}
          </Space>
        }
        extra={
          <Button
            icon={<SearchOutlined />}
            onClick={discoverAgents}
            loading={discovering}
          >
            {t('dashboard.scanAgents')}
          </Button>
        }
      >
        <div className="agent-status">
          <Space size="large">
            <div className="status-item">
              <Badge status={agents.length > 0 ? 'success' : 'default'} />
              <span>{t('dashboard.connected')}: {agents.length}</span>
            </div>
            <div className="status-item">
              <Badge status={discoveredAgents.length > 0 ? 'processing' : 'default'} />
              <span>{t('dashboard.discovered')}: {discoveredAgents.length}</span>
            </div>
          </Space>
        </div>

        {discoveredAgents.length > 0 && (
          <List
            size="small"
            dataSource={discoveredAgents}
            renderItem={(agent) => (
              <List.Item>
                <Space>
                  <DesktopOutlined />
                  <span>{agent.name}</span>
                  <Tag color="orange">{agent.address}:{agent.port}</Tag>
                  <Tag color="default">{agent.metadata?.language || 'Unknown'}</Tag>
                </Space>
              </List.Item>
            )}
          />
        )}

        {discoveredAgents.length === 0 && agents.length === 0 && (
          <Empty
            description={t('dashboard.noAgentsHint')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/* 统计卡片 */}
      <div className="stats-grid">
        <div className="stats-row">
          <Card className="stat-card">
            <Statistic
              title={t('dashboard.connectedAgents')}
              value={agents.length || (demoMode ? 1 : 0)}
              prefix={<ApiOutlined />}
              valueStyle={{ color: agents.length > 0 || demoMode ? '#52c41a' : '#999' }}
            />
          </Card>
          <Card className="stat-card">
            <Statistic
              title={t('dashboard.totalThoughts')}
              value={thoughts.length}
              prefix={<BulbOutlined />}
              valueStyle={{ color: thoughts.length > 0 ? '#d97706' : '#999' }}
            />
            {thoughts.length > 0 && (
              <div className="stat-sub">{t('thoughtFlow.avgDuration')} {avgThoughtDuration}ms</div>
            )}
          </Card>
          <Card className="stat-card">
            <Statistic
              title={t('dashboard.toolCalls')}
              value={toolStats.total}
              prefix={<ToolOutlined />}
              valueStyle={{ color: toolStats.total > 0 ? '#d97706' : '#999' }}
              suffix={
                toolStats.total > 0 && (
                  <span className="stat-detail">
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> {toolStats.success}
                    <CloseCircleOutlined style={{ color: '#ff4d4f', marginLeft: 8 }} /> {toolStats.error}
                  </span>
                )
              }
            />
            {toolStats.total > 0 && (
              <div className="stat-sub">{t('thoughtFlow.avgDuration')} {avgToolDuration}ms</div>
            )}
          </Card>
          <Card className="stat-card">
            <Statistic
              title={t('dashboard.estimatedCost')}
              value={estimatedCost}
              precision={4}
              prefix={<DollarOutlined />}
              suffix="USD"
              valueStyle={{ color: estimatedCost > 0 ? '#faad14' : '#999' }}
            />
          </Card>
        </div>

        <div className="stats-row">
          <Card className="stat-card wide">
            <Statistic
              title={t('dashboard.totalTokens')}
              value={tokens.input + tokens.output}
              valueStyle={{ color: tokens.input + tokens.output > 0 ? '#d97706' : '#999' }}
              suffix={
                tokens.input + tokens.output > 0 && (
                  <span className="token-detail">
                    {t('tokenAnalysis.input')}: {tokens.input.toLocaleString()} | {t('tokenAnalysis.output')}: {tokens.output.toLocaleString()}
                  </span>
                )
              }
            />
            {tokens.input + tokens.output > 0 && (
              <Progress
                percent={Math.round((tokens.output / (tokens.input + tokens.output || 1)) * 100)}
                strokeColor={{ '0%': '#d97706', '100%': '#22c55e' }}
                format={() => t('dashboard.outputRatio')}
              />
            )}
          </Card>
          <Card className="stat-card wide">
            <Statistic
              title={t('dashboard.successRate')}
              value={toolStats.total > 0 ? Math.round((toolStats.success / toolStats.total) * 100) : 0}
              suffix="%"
              valueStyle={{
                color: toolStats.total > 0
                  ? (toolStats.success / toolStats.total > 0.9 ? '#52c41a' : '#faad14')
                  : '#999'
              }}
            />
            {toolStats.total > 0 && (
              <>
                <Progress
                  percent={Math.round((toolStats.success / toolStats.total) * 100)}
                  strokeColor="#52c41a"
                  trailColor="#ff4d4f"
                />
                {slowCalls > 0 && (
                  <Tag color="warning" style={{ marginTop: 8 }}>
                    {t('dashboard.slowCalls')}: {slowCalls}
                  </Tag>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      {/* 实时思考流 */}
      <Card
        className="timeline-card"
        title={
          <Space>
            <span>{t('dashboard.recentActivity')}</span>
            {isStreaming && (
              <Tag color="processing" icon={<ThunderboltOutlined />}>
                {t('dashboard.updating')}
              </Tag>
            )}
          </Space>
        }
      >
        {thoughts.length === 0 && toolCalls.length === 0 ? (
          <Empty
            description={
              demoMode
                ? t('dashboard.clickToStartStream')
                : t('dashboard.waitingForAgents')
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <ThoughtTimeline />
        )}
      </Card>
    </div>
  );
};
