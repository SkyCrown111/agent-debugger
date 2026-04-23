import React from 'react';
import { Card, Row, Col, Statistic, Table, Empty } from 'antd';
import { useSessionStore } from '../../stores/sessionStore';
import './TokenAnalysis.css';

export const TokenAnalysis: React.FC = () => {
  const { tokenUsages, getTotalTokens } = useSessionStore();
  const tokens = getTotalTokens();

  // 按模型分组统计
  const modelStats = tokenUsages.reduce((acc, usage) => {
    if (!acc[usage.model]) {
      acc[usage.model] = { input: 0, output: 0, count: 0 };
    }
    acc[usage.model].input += usage.inputTokens;
    acc[usage.model].output += usage.outputTokens;
    acc[usage.model].count++;
    return acc;
  }, {} as Record<string, { input: number; output: number; count: number }>);

  const modelData = Object.entries(modelStats).map(([model, stats]) => ({
    model,
    ...stats,
    total: stats.input + stats.output
  }));

  const columns = [
    { title: '模型', dataIndex: 'model', key: 'model' },
    { title: '调用次数', dataIndex: 'count', key: 'count' },
    { title: '输入 Token', dataIndex: 'input', key: 'input' },
    { title: '输出 Token', dataIndex: 'output', key: 'output' },
    { title: '总 Token', dataIndex: 'total', key: 'total' }
  ];

  if (tokenUsages.length === 0) {
    return (
      <div className="token-analysis-page">
        <Empty description="暂无 Token 使用记录" />
      </div>
    );
  }

  return (
    <div className="token-analysis-page">
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card className="token-card">
            <Statistic
              title="总输入 Token"
              value={tokens.input}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="token-card">
            <Statistic
              title="总输出 Token"
              value={tokens.output}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="token-card">
            <Statistic
              title="总 Token"
              value={tokens.input + tokens.output}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="模型使用统计" className="model-stats-card">
        <Table 
          dataSource={modelData} 
          columns={columns}
          rowKey="model"
          pagination={false}
        />
      </Card>
    </div>
  );
};