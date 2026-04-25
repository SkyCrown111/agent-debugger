import React, { useState } from 'react';
import { Card, Tabs, Empty, Row, Col, Statistic, Tag, Table, Space, Button, Modal } from 'antd';
import {
  BulbOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  FilterOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../stores/sessionStore';
import { ThoughtFlowGraph } from '../components/ThoughtFlowGraph/ThoughtFlowGraph';
import { ThoughtTimeline } from '../components/ThoughtTimeline/ThoughtTimeline';
import type { TabsProps } from 'antd';
import './ThoughtFlow.css';

export const ThoughtFlow: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { thoughts, getToolCallStats } = useSessionStore();
  const [activeTab, setActiveTab] = useState('graph');

  // 思考统计
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

  // 类型分布表格数据
  const typeDistribution = [
    { type: 'reasoning', count: thoughtStats.byType.reasoning, color: 'warning', label: isZh ? '推理' : 'Reasoning' },
    { type: 'planning', count: thoughtStats.byType.planning, color: 'cyan', label: isZh ? '规划' : 'Planning' },
    { type: 'reflection', count: thoughtStats.byType.reflection, color: 'purple', label: isZh ? '反思' : 'Reflection' },
  ];

  const tabItems: TabsProps['items'] = [
    {
      key: 'graph',
      label: (
        <span>
          <ThunderboltOutlined />
          {t('thoughtFlow.graph')}
        </span>
      ),
      children: <ThoughtFlowGraph />,
    },
    {
      key: 'timeline',
      label: (
        <span>
          <ClockCircleOutlined />
          {t('thoughtFlow.timeline')}
        </span>
      ),
      children: (
        <Card className="timeline-card">
          <ThoughtTimeline />
        </Card>
      ),
    },
    {
      key: 'stats',
      label: (
        <span>
          <FilterOutlined />
          {isZh ? '统计' : 'Statistics'}
        </span>
      ),
      children: (
        <div className="stats-container">
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Card className="stat-card">
                <Statistic
                  title={t('thoughtFlow.totalThoughts')}
                  value={thoughtStats.total}
                  prefix={<BulbOutlined />}
                  valueStyle={{ color: '#d97706' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card">
                <Statistic
                  title={t('thoughtFlow.avgDuration')}
                  value={thoughtStats.avgDuration}
                  suffix="ms"
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card">
                <Statistic
                  title={t('thoughtFlow.tokens')}
                  value={thoughtStats.totalTokens}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card">
                <Statistic
                  title={t('dashboard.toolCalls')}
                  value={getToolCallStats().total}
                  suffix={isZh ? `成功 ${getToolCallStats().success}` : `Success ${getToolCallStats().success}`}
                  valueStyle={{ color: '#d97706' }}
                />
              </Card>
            </Col>
          </Row>

          <Card title={isZh ? '思考类型分布' : 'Thought Type Distribution'} className="distribution-card">
            <Table
              dataSource={typeDistribution}
              rowKey="type"
              pagination={false}
              size="small"
              columns={[
                {
                  title: isZh ? '类型' : 'Type',
                  dataIndex: 'label',
                  render: (text, record) => <Tag color={record.color}>{text}</Tag>
                },
                {
                  title: isZh ? '数量' : 'Count',
                  dataIndex: 'count',
                },
                {
                  title: isZh ? '占比' : 'Percentage',
                  render: (_, record) => {
                    const percent = thoughtStats.total > 0
                      ? ((record.count / thoughtStats.total) * 100).toFixed(1)
                      : '0';
                    return `${percent}%`;
                  }
                }
              ]}
            />
          </Card>

          <Card title={isZh ? '耗时分布' : 'Duration Distribution'} className="duration-card">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title={isZh ? '快速 (<500ms)' : 'Fast (<500ms)'}
                  value={thoughts.filter(t => (t.duration || 0) < 500).length}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={isZh ? '正常 (500-2000ms)' : 'Normal (500-2000ms)'}
                  value={thoughts.filter(t => {
                    const d = t.duration || 0;
                    return d >= 500 && d < 2000;
                  }).length}
                  valueStyle={{ color: '#d97706' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={isZh ? '慢速 (>2000ms)' : 'Slow (>2000ms)'}
                  value={thoughts.filter(t => (t.duration || 0) >= 2000).length}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
            </Row>
          </Card>
        </div>
      ),
    },
  ];

  if (thoughts.length === 0) {
    return (
      <div className="thought-flow-page">
        <Empty description={isZh ? '暂无思考记录' : 'No thought records'} />
      </div>
    );
  }

  return (
    <div className="thought-flow-page">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        tabBarExtraContent={
          <Space>
            <Tag color="orange">{t('thoughtFlow.thoughts')}: {thoughtStats.total}</Tag>
            <Tag color="green">{t('thoughtFlow.tools')}: {getToolCallStats().total}</Tag>
          </Space>
        }
      />
    </div>
  );
};
