import React, { useState, useMemo } from 'react';
import {
  Card,
  Statistic,
  Table,
  Empty,
  Row,
  Col,
  Select,
  Slider,
  InputNumber,
  Divider,
  Tag,
  Space,
  Tabs,
  Alert
} from 'antd';
import {
  LineChartOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../stores/sessionStore';
import './TokenAnalysis.css';

// 模型定价配置（每 1K tokens）
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
};

const COLORS = ['#d97706', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#13c2c2'];

export const TokenAnalysis: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { tokenUsages, getTotalTokens } = useSessionStore();
  const tokens = getTotalTokens();
  const [selectedModel, setSelectedModel] = useState<string | 'all'>('all');
  const [customInputPrice, setCustomInputPrice] = useState(0.01);
  const [customOutputPrice, setCustomOutputPrice] = useState(0.03);

  // 按模型分组统计
  const modelStats = useMemo(() => {
    const stats: Record<string, { input: number; output: number; count: number; cost: number }> = {};
    
    tokenUsages.forEach(usage => {
      if (!stats[usage.model]) {
        stats[usage.model] = { input: 0, output: 0, count: 0, cost: 0 };
      }
      stats[usage.model].input += usage.inputTokens;
      stats[usage.model].output += usage.outputTokens;
      stats[usage.model].count++;
      
      // 计算成本
      const pricing = MODEL_PRICING[usage.model] || { input: customInputPrice, output: customOutputPrice };
      stats[usage.model].cost += 
        (usage.inputTokens / 1000) * pricing.input + 
        (usage.outputTokens / 1000) * pricing.output;
    });
    
    return stats;
  }, [tokenUsages, customInputPrice, customOutputPrice]);

  // 趋势数据（按时间分组）
  const trendData = useMemo(() => {
    const timeGroups: Record<string, { time: string; input: number; output: number; total: number }> = {};
    
    tokenUsages.forEach(usage => {
      const time = new Date(usage.timestamp).toLocaleTimeString().slice(0, 5);
      if (!timeGroups[time]) {
        timeGroups[time] = { time, input: 0, output: 0, total: 0 };
      }
      timeGroups[time].input += usage.inputTokens;
      timeGroups[time].output += usage.outputTokens;
      timeGroups[time].total += usage.inputTokens + usage.outputTokens;
    });
    
    return Object.values(timeGroups).slice(-20);
  }, [tokenUsages]);

  // 模型分布饼图数据
  const pieData = useMemo(() => {
    return Object.entries(modelStats).map(([model, stats], index) => ({
      name: model,
      value: stats.input + stats.output,
      color: COLORS[index % COLORS.length],
    }));
  }, [modelStats]);

  // 模型柱状图数据
  const barData = useMemo(() => {
    return Object.entries(modelStats).map(([model, stats]) => ({
      model,
      input: stats.input,
      output: stats.output,
      total: stats.input + stats.output,
    }));
  }, [modelStats]);

  // 总成本
  const totalCost = useMemo(() => {
    return Object.values(modelStats).reduce((sum, stats) => sum + stats.cost, 0);
  }, [modelStats]);

  const modelColumns = [
    {
      title: t('tokenAnalysis.model'),
      dataIndex: 'model',
      key: 'model',
      render: (model: string) => <Tag color="blue">{model}</Tag>
    },
    { title: isZh ? '调用次数' : 'Calls', dataIndex: 'count', key: 'count' },
    {
      title: t('tokenAnalysis.inputTokens'),
      dataIndex: 'input',
      key: 'input',
      render: (v: number) => v.toLocaleString()
    },
    {
      title: t('tokenAnalysis.outputTokens'),
      dataIndex: 'output',
      key: 'output',
      render: (v: number) => v.toLocaleString()
    },
    {
      title: t('tokenAnalysis.totalTokens'),
      dataIndex: 'total',
      key: 'total',
      render: (v: number) => <strong>{v.toLocaleString()}</strong>
    },
    {
      title: t('tokenAnalysis.totalCost'),
      dataIndex: 'cost',
      key: 'cost',
      render: (cost: number) => (
        <span style={{ color: '#faad14' }}>
          ${cost.toFixed(4)}
        </span>
      )
    },
  ];

  const modelData = Object.entries(modelStats).map(([model, stats]) => ({
    model,
    ...stats,
    total: stats.input + stats.output,
  }));

  if (tokenUsages.length === 0) {
    return (
      <div className="token-analysis-page">
        <Empty description={isZh ? '暂无 Token 使用记录' : 'No token usage records'} />
      </div>
    );
  }

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <LineChartOutlined />
          {t('tokenAnalysis.overview')}
        </span>
      ),
      children: (
        <div className="overview-content">
          {/* 统计卡片 */}
          <Row gutter={16} className="stats-row">
            <Col span={6}>
              <Card className="token-card">
                <Statistic
                  title={t('tokenAnalysis.inputTokens')}
                  value={tokens.input}
                  valueStyle={{ color: '#d97706' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="token-card">
                <Statistic
                  title={t('tokenAnalysis.outputTokens')}
                  value={tokens.output}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="token-card">
                <Statistic
                  title={t('tokenAnalysis.totalTokens')}
                  value={tokens.input + tokens.output}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="token-card">
                <Statistic
                  title={t('tokenAnalysis.totalCost')}
                  value={totalCost}
                  precision={4}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#eb2f96' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 趋势图 */}
          <Card title={isZh ? 'Token 使用趋势' : 'Token Usage Trend'} className="chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
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
                <Legend />
                <Area
                  type="monotone"
                  dataKey="input"
                  stackId="1"
                  stroke="#d97706"
                  fill="rgba(24, 144, 255, 0.3)"
                  name={t('messageLog.input')}
                />
                <Area
                  type="monotone"
                  dataKey="output"
                  stackId="1"
                  stroke="#52c41a"
                  fill="rgba(82, 196, 26, 0.3)"
                  name={t('messageLog.output')}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* 模型分布 */}
          <Row gutter={16}>
            <Col span={12}>
              <Card title={isZh ? '模型使用分布' : 'Model Distribution'} className="chart-card">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card title={isZh ? '模型 Token 对比' : 'Token Comparison by Model'} className="chart-card">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="model" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(30, 30, 50, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8
                      }}
                    />
                    <Legend />
                    <Bar dataKey="input" fill="#d97706" name={t('messageLog.input')} />
                    <Bar dataKey="output" fill="#52c41a" name={t('messageLog.output')} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* 模型统计表 */}
          <Card title={isZh ? '模型使用统计' : 'Model Statistics'} className="model-stats-card">
            <Table
              dataSource={modelData}
              columns={modelColumns}
              rowKey="model"
              pagination={false}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><strong>{isZh ? '合计' : 'Total'}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <strong>{tokenUsages.length}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <strong>{tokens.input.toLocaleString()}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <strong>{tokens.output.toLocaleString()}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <strong>{(tokens.input + tokens.output).toLocaleString()}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    <strong style={{ color: '#faad14' }}>${totalCost.toFixed(4)}</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'cost',
      label: (
        <span>
          <DollarOutlined />
          {isZh ? '成本计算器' : 'Cost Calculator'}
        </span>
      ),
      children: (
        <div className="cost-calculator">
          <Alert
            message={isZh ? '成本计算基于各模型官方定价，实际费用以账单为准' : 'Cost calculation is based on official model pricing. Actual charges may vary.'}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Row gutter={24}>
            <Col span={12}>
              <Card title={isZh ? '当前使用成本' : 'Current Usage Cost'} className="cost-card">
                <div className="cost-breakdown">
                  {Object.entries(modelStats).map(([model, stats]) => (
                    <div key={model} className="cost-item">
                      <div className="cost-model">
                        <Tag color="blue">{model}</Tag>
                        <span className="cost-calls">{stats.count} {isZh ? '次调用' : 'calls'}</span>
                      </div>
                      <div className="cost-details">
                        <span>{t('messageLog.input')}: {stats.input.toLocaleString()} tokens</span>
                        <span>{t('messageLog.output')}: {stats.output.toLocaleString()} tokens</span>
                      </div>
                      <div className="cost-value">
                        ${stats.cost.toFixed(4)}
                      </div>
                    </div>
                  ))}
                  <Divider />
                  <div className="cost-total">
                    <span>{t('tokenAnalysis.totalCost')}</span>
                    <span className="cost-total-value">${totalCost.toFixed(4)}</span>
                  </div>
                </div>
              </Card>
            </Col>

            <Col span={12}>
              <Card title={isZh ? '自定义定价计算' : 'Custom Pricing'} className="cost-card">
                <div className="custom-pricing">
                  <div className="pricing-input">
                    <label>{isZh ? '输入价格 ($/1K tokens)' : 'Input Price ($/1K tokens)'}</label>
                    <InputNumber
                      value={customInputPrice}
                      onChange={(v) => setCustomInputPrice(v || 0)}
                      step={0.001}
                      min={0}
                      precision={5}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="pricing-input">
                    <label>{isZh ? '输出价格 ($/1K tokens)' : 'Output Price ($/1K tokens)'}</label>
                    <InputNumber
                      value={customOutputPrice}
                      onChange={(v) => setCustomOutputPrice(v || 0)}
                      step={0.001}
                      min={0}
                      precision={5}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <Divider />
                  <div className="custom-result">
                    <Statistic
                      title={isZh ? '按自定义价格计算' : 'Custom Price Calculation'}
                      value={
                        (tokens.input / 1000) * customInputPrice +
                        (tokens.output / 1000) * customOutputPrice
                      }
                      precision={4}
                      prefix="$"
                      valueStyle={{ color: '#faad14' }}
                    />
                  </div>
                </div>
              </Card>

              <Card title={isZh ? '模型定价参考' : 'Model Pricing Reference'} className="pricing-reference" style={{ marginTop: 16 }}>
                <Table
                  dataSource={Object.entries(MODEL_PRICING).map(([model, pricing]) => ({
                    model,
                    input: `$${pricing.input}/1K`,
                    output: `$${pricing.output}/1K`,
                  }))}
                  columns={[
                    { title: t('tokenAnalysis.model'), dataIndex: 'model', key: 'model' },
                    { title: t('messageLog.input'), dataIndex: 'input', key: 'input' },
                    { title: t('messageLog.output'), dataIndex: 'output', key: 'output' },
                  ]}
                  rowKey="model"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
  ];

  return (
    <div className="token-analysis-page">
      <Tabs items={tabItems} />
    </div>
  );
};
