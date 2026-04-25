import React, { useState, useMemo } from 'react';
import {
  Card,
  Statistic,
  Row,
  Col,
  Empty,
  Table,
  Tag,
  Progress,
  Select,
  Space,
  Divider,
  Alert
} from 'antd';
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DashboardOutlined,
  ApiOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../stores/sessionStore';
import { useAgentStore } from '../stores/agentStore';
import './Performance.css';

export const Performance: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { toolCalls, thoughts, tokenUsages, errors } = useSessionStore();
  const { agents } = useAgentStore();
  const [timeRange, setTimeRange] = useState<'1m' | '5m' | '15m' | '1h' | 'all'>('all');

  // 时间范围过滤
  const filterByTimeRange = <T extends { timestamp: string }>(data: T[]): T[] => {
    if (timeRange === 'all') return data;
    
    const now = new Date().getTime();
    const ranges: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    };
    
    const cutoff = now - ranges[timeRange];
    return data.filter(item => new Date(item.timestamp).getTime() > cutoff);
  };

  // 性能指标计算
  const metrics = useMemo(() => {
    const filteredTools = filterByTimeRange(toolCalls);
    const filteredThoughts = filterByTimeRange(thoughts);
    const filteredTokens = filterByTimeRange(tokenUsages);
    const filteredErrors = filterByTimeRange(errors);

    // 工具调用统计
    const toolTotal = filteredTools.length;
    const toolSuccess = filteredTools.filter(t => t.status === 'success').length;
    const toolError = filteredTools.filter(t => t.status === 'error').length;
    const toolSuccessRate = toolTotal > 0 ? (toolSuccess / toolTotal) * 100 : 0;
    
    // 响应时间统计
    const durations = filteredTools
      .filter(t => t.duration !== undefined)
      .map(t => t.duration!);
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    const p95Duration = durations.length > 0
      ? durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)] || 0
      : 0;

    // Token 统计
    const totalInputTokens = filteredTokens.reduce((sum, t) => sum + t.inputTokens, 0);
    const totalOutputTokens = filteredTokens.reduce((sum, t) => sum + t.outputTokens, 0);
    const totalTokens = totalInputTokens + totalOutputTokens;

    // 思考统计
    const thoughtCount = filteredThoughts.length;

    // 错误率
    const errorRate = (filteredTools.length + filteredThoughts.length) > 0
      ? (filteredErrors.length / (filteredTools.length + filteredThoughts.length)) * 100
      : 0;

    // 吞吐量（每秒操作数）
    const timeSpan = filteredTools.length > 1
      ? (new Date(filteredTools[filteredTools.length - 1].timestamp).getTime() -
         new Date(filteredTools[0].timestamp).getTime()) / 1000
      : 1;
    const throughput = timeSpan > 0 ? filteredTools.length / timeSpan : 0;

    return {
      toolTotal,
      toolSuccess,
      toolError,
      toolSuccessRate,
      avgDuration,
      maxDuration,
      minDuration,
      p95Duration,
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      thoughtCount,
      errorRate,
      throughput,
      durations,
    };
  }, [toolCalls, thoughts, tokenUsages, errors, timeRange]);

  // 响应时间分布
  const durationDistribution = useMemo(() => {
    const bins = [
      { range: '0-100ms', count: 0, color: '#52c41a' },
      { range: '100-500ms', count: 0, color: '#73d13d' },
      { range: '500-1000ms', count: 0, color: '#faad14' },
      { range: '1-2s', count: 0, color: '#fa8c16' },
      { range: '2-5s', count: 0, color: '#ff4d4f' },
      { range: '>5s', count: 0, color: '#f5222d' },
    ];

    metrics.durations.forEach(d => {
      if (d < 100) bins[0].count++;
      else if (d < 500) bins[1].count++;
      else if (d < 1000) bins[2].count++;
      else if (d < 2000) bins[3].count++;
      else if (d < 5000) bins[4].count++;
      else bins[5].count++;
    });

    return bins;
  }, [metrics.durations]);

  // 时间序列数据
  const timeSeriesData = useMemo(() => {
    const filteredTools = filterByTimeRange(toolCalls);
    const groups: Record<string, { time: string; count: number; avgDuration: number; errors: number }> = {};

    filteredTools.forEach(tool => {
      const time = new Date(tool.timestamp).toLocaleTimeString().slice(0, 5);
      if (!groups[time]) {
        groups[time] = { time, count: 0, avgDuration: 0, errors: 0 };
      }
      groups[time].count++;
      groups[time].avgDuration += tool.duration || 0;
      if (tool.status === 'error') groups[time].errors++;
    });

    return Object.values(groups)
      .map(g => ({ ...g, avgDuration: Math.round(g.avgDuration / g.count) }))
      .slice(-30);
  }, [toolCalls, timeRange]);

  // 按工具性能排名
  const toolPerformance = useMemo(() => {
    const filteredTools = filterByTimeRange(toolCalls);
    const byTool: Record<string, { name: string; calls: number; avgDuration: number; errors: number; totalDuration: number }> = {};

    filteredTools.forEach(tool => {
      if (!byTool[tool.toolName]) {
        byTool[tool.toolName] = { name: tool.toolName, calls: 0, avgDuration: 0, errors: 0, totalDuration: 0 };
      }
      byTool[tool.toolName].calls++;
      byTool[tool.toolName].totalDuration += tool.duration || 0;
      if (tool.status === 'error') byTool[tool.toolName].errors++;
    });

    return Object.values(byTool)
      .map(t => ({ ...t, avgDuration: Math.round(t.totalDuration / t.calls) }))
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, 10);
  }, [toolCalls, timeRange]);

  // 性能评分
  const performanceScore = useMemo(() => {
    let score = 100;
    
    // 成功率影响
    score -= (100 - metrics.toolSuccessRate) * 0.5;
    
    // 响应时间影响
    if (metrics.avgDuration > 1000) score -= 10;
    if (metrics.avgDuration > 2000) score -= 10;
    if (metrics.p95Duration > 5000) score -= 15;
    
    // 错误率影响
    score -= metrics.errorRate * 2;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [metrics]);

  if (toolCalls.length === 0 && thoughts.length === 0) {
    return (
      <div className="performance-page">
        <Empty description={t('performance.noData')} />
      </div>
    );
  }

  return (
    <div className="performance-page">
      {/* 时间范围选择 */}
      <Card className="time-range-card">
        <Space>
          <span>{t('performance.timeRange')}:</span>
          <Select
            value={timeRange}
            onChange={setTimeRange}
            options={[
              { label: t('performance.lastHour'), value: '1h' },
              { label: isZh ? '全部' : 'All', value: 'all' },
            ]}
            style={{ width: 120 }}
          />
        </Space>
      </Card>

      {/* 性能评分 */}
      <Card className="score-card">
        <Row gutter={24}>
          <Col span={6}>
            <div className="performance-score">
              <Progress
                type="circle"
                percent={performanceScore}
                strokeColor={
                  performanceScore >= 80 ? '#52c41a' :
                  performanceScore >= 60 ? '#faad14' : '#ff4d4f'
                }
                size={120}
              />
              <div className="score-label">{isZh ? '性能评分' : 'Performance Score'}</div>
            </div>
          </Col>
          <Col span={18}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title={t('dashboard.successRate')}
                  value={metrics.toolSuccessRate.toFixed(1)}
                  suffix="%"
                  valueStyle={{ color: metrics.toolSuccessRate >= 90 ? '#52c41a' : '#faad14' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={t('performance.avgResponseTime')}
                  value={metrics.avgDuration.toFixed(0)}
                  suffix="ms"
                  valueStyle={{ color: metrics.avgDuration < 1000 ? '#52c41a' : '#faad14' }}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={t('performance.throughput')}
                  value={metrics.throughput.toFixed(2)}
                  suffix="ops/s"
                  prefix={<ThunderboltOutlined />}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 核心指标 */}
      <Row gutter={16} className="metrics-row">
        <Col span={4}>
          <Card className="metric-card">
            <Statistic
              title={isZh ? '工具调用总数' : 'Total Calls'}
              value={metrics.toolTotal}
              prefix={<ApiOutlined />}
              valueStyle={{ color: '#d97706' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="metric-card">
            <Statistic
              title={isZh ? '成功调用' : 'Success'}
              value={metrics.toolSuccess}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="metric-card">
            <Statistic
              title={isZh ? '失败调用' : 'Failed'}
              value={metrics.toolError}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="metric-card">
            <Statistic
              title={isZh ? 'P95 响应时间' : 'P95 Response'}
              value={metrics.p95Duration}
              suffix="ms"
              valueStyle={{ color: metrics.p95Duration < 2000 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="metric-card">
            <Statistic
              title={isZh ? '总 Token' : 'Total Tokens'}
              value={metrics.totalTokens}
              valueStyle={{ color: '#faad14' }}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="metric-card">
            <Statistic
              title={t('performance.errorRate')}
              value={metrics.errorRate.toFixed(2)}
              suffix="%"
              valueStyle={{ color: metrics.errorRate < 5 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 性能告警 */}
      {metrics.errorRate > 10 && (
        <Alert
          message={isZh ? `错误率过高 (${metrics.errorRate.toFixed(1)}%)，建议检查 Agent 配置` : `High error rate (${metrics.errorRate.toFixed(1)}%), check Agent config`}
          type="error"
          showIcon
          className="performance-alert"
        />
      )}
      {metrics.avgDuration > 2000 && (
        <Alert
          message={isZh ? `平均响应时间过长 (${metrics.avgDuration.toFixed(0)}ms)，可能存在性能瓶颈` : `Slow response time (${metrics.avgDuration.toFixed(0)}ms), possible bottleneck`}
          type="warning"
          showIcon
          className="performance-alert"
        />
      )}

      {/* 图表区域 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title={isZh ? '响应时间趋势' : 'Response Time Trend'} className="chart-card">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30, 30, 50, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avgDuration"
                  stroke="#d97706"
                  fill="rgba(217, 119, 6, 0.3)"
                  name={isZh ? '平均响应时间(ms)' : 'Avg Response(ms)'}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={isZh ? '调用频率分布' : 'Call Frequency'} className="chart-card">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30, 30, 50, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8
                  }}
                />
                <Bar dataKey="count" fill="#52c41a" name={isZh ? '调用次数' : 'Calls'} />
                <Bar dataKey="errors" fill="#ff4d4f" name={isZh ? '错误数' : 'Errors'} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title={isZh ? '响应时间分布' : 'Response Distribution'} className="chart-card">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={durationDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="range" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30, 30, 50, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8
                  }}
                />
                <Bar dataKey="count" name={isZh ? '调用数' : 'Calls'}>
                  {durationDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={isZh ? '工具性能排名（按总耗时）' : 'Tool Performance (by Total Time)'} className="chart-card">
            <Table
              dataSource={toolPerformance}
              rowKey="name"
              size="small"
              pagination={false}
              columns={[
                {
                  title: isZh ? '工具' : 'Tool',
                  dataIndex: 'name',
                  render: (name) => <Tag color="orange">{name}</Tag>
                },
                { title: isZh ? '调用次数' : 'Calls', dataIndex: 'calls' },
                {
                  title: isZh ? '平均耗时' : 'Avg Time',
                  dataIndex: 'avgDuration',
                  render: (d: number) => `${d}ms`
                },
                {
                  title: isZh ? '错误数' : 'Errors',
                  dataIndex: 'errors',
                  render: (e: number) => (
                    <span style={{ color: e > 0 ? '#ff4d4f' : '#52c41a' }}>{e}</span>
                  )
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};