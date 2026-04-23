import React from 'react';
import { Row, Col, Card, Statistic, Progress } from 'antd';
import { 
  BulbOutlined, 
  ToolOutlined, 
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useSessionStore } from '../../stores/sessionStore';
import { useAgentStore } from '../../stores/agentStore';
import { ThoughtTimeline } from '../../components/ThoughtTimeline/ThoughtTimeline';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { thoughts, toolCalls, tokenUsages, getTotalTokens, getToolCallStats } = useSessionStore();
  const { agents } = useAgentStore();

  const tokens = getTotalTokens();
  const toolStats = getToolCallStats();
  
  // 计算成本（简化版）
  const estimatedCost = (tokens.input * 0.01 + tokens.output * 0.03) / 1000;

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card className="stat-card">
              <Statistic
                title="连接的 Agent"
                value={agents.length}
                prefix={<BulbOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <Statistic
                title="思考次数"
                value={thoughts.length}
                prefix={<BulbOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <Statistic
                title="工具调用"
                value={toolStats.total}
                prefix={<ToolOutlined />}
                suffix={
                  <span className="stat-detail">
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> {toolStats.success}
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> {toolStats.error}
                  </span>
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <Statistic
                title="预估成本"
                value={estimatedCost}
                precision={4}
                prefix={<DollarOutlined />}
                suffix="USD"
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card className="stat-card">
              <Statistic
                title="Token 使用"
                value={tokens.input + tokens.output}
                suffix={
                  <span className="token-detail">
                    输入: {tokens.input} | 输出: {tokens.output}
                  </span>
                }
              />
              <Progress 
                percent={Math.round((tokens.output / (tokens.input + tokens.output || 1)) * 100)}
                strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                format={() => `输出占比`}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card className="stat-card">
              <Statistic
                title="成功率"
                value={toolStats.total > 0 ? Math.round((toolStats.success / toolStats.total) * 100) : 0}
                suffix="%"
                valueStyle={{ color: toolStats.total > 0 && toolStats.success / toolStats.total > 0.9 ? '#52c41a' : '#faad14' }}
              />
              <Progress 
                percent={toolStats.total > 0 ? Math.round((toolStats.success / toolStats.total) * 100) : 0}
                strokeColor="#52c41a"
                trailColor="#ff4d4f"
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card className="timeline-card" title="实时思考流">
        <ThoughtTimeline />
      </Card>
    </div>
  );
};