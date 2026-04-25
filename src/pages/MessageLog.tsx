import React, { useState, useMemo } from 'react';
import {
  Card,
  Empty,
  Tag,
  Space,
  Input,
  Select,
  Button,
  Timeline,
  Typography,
  Divider,
  Tooltip,
  Badge,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  BulbOutlined,
  ToolOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSessionStore, Thought, ToolCall, TokenUsage, ErrorLog } from '../stores/sessionStore';
import './MessageLog.css';

const { Text, Paragraph } = Typography;
const { Search } = Input;

type MessageCategory = 'thought' | 'tool' | 'token' | 'error';

interface MessageItem {
  id: string;
  category: MessageCategory;
  timestamp: string;
  agentId: string;
  data: Thought | ToolCall | TokenUsage | ErrorLog;
}

export const MessageLog: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { thoughts, toolCalls, tokenUsages, errors, clearSession } = useSessionStore();
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MessageCategory | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  // 合并所有消息
  const allMessages: MessageItem[] = useMemo(() => {
    const messages: MessageItem[] = [
      ...thoughts.map((t) => ({ id: t.id, category: 'thought' as const, timestamp: t.timestamp, agentId: t.agentId, data: t })),
      ...toolCalls.map((t) => ({ id: t.id, category: 'tool' as const, timestamp: t.timestamp, agentId: t.agentId, data: t })),
      ...tokenUsages.map((t) => ({ id: t.id, category: 'token' as const, timestamp: t.timestamp, agentId: t.agentId, data: t })),
      ...errors.map((e) => ({ id: e.id, category: 'error' as const, timestamp: e.timestamp, agentId: e.agentId, data: e })),
    ];

    return messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [thoughts, toolCalls, tokenUsages, errors]);

  // 过滤消息
  const filteredMessages = useMemo(() => {
    let result = allMessages;

    if (categoryFilter !== 'all') {
      result = result.filter(m => m.category === categoryFilter);
    }

    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(m => {
        if (m.category === 'thought') {
          return (m.data as Thought).content?.toLowerCase().includes(lower);
        } else if (m.category === 'tool') {
          const tool = m.data as ToolCall;
          return tool.toolName?.toLowerCase().includes(lower) ||
            JSON.stringify(tool.params)?.toLowerCase().includes(lower);
        } else if (m.category === 'error') {
          return (m.data as ErrorLog).message?.toLowerCase().includes(lower);
        }
        return false;
      });
    }

    return result;
  }, [allMessages, categoryFilter, searchText]);

  // 导出日志
  const handleExport = () => {
    const data = JSON.stringify(filteredMessages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 渲染消息内容
  const renderMessageContent = (msg: MessageItem) => {
    const { category, data } = msg;

    if (category === 'thought') {
      const thought = data as Thought;
      const typeColors: Record<string, string> = {
        reasoning: 'warning',
        planning: 'cyan',
        reflection: 'purple',
      };
      return (
        <div className="message-body">
          <Space>
            <BulbOutlined style={{ color: '#faad14' }} />
            <Tag color={typeColors[thought.type] || 'default'}>{thought.type}</Tag>
            {thought.tokens && <Badge count={thought.tokens} style={{ backgroundColor: '#d97706' }} showZero />}
          </Space>
          <Paragraph style={{ marginTop: 8, marginBottom: 0, color: '#c9d1d9' }}>
            {thought.content}
          </Paragraph>
          {thought.duration && (
            <Text type="secondary" style={{ fontSize: 12 }}>{isZh ? '耗时' : 'Duration'}: {thought.duration}ms</Text>
          )}
        </div>
      );
    }

    if (category === 'tool') {
      const tool = data as ToolCall;
      const statusColor = tool.status === 'success' ? '#52c41a' : tool.status === 'error' ? '#ff4d4f' : '#d97706';
      return (
        <div className="message-body">
          <Space>
            <ToolOutlined style={{ color: '#722ed1' }} />
            <Tag color="orange">{tool.toolName}</Tag>
            <Tag color={tool.status === 'success' ? 'success' : tool.status === 'error' ? 'error' : 'processing'}>
              {tool.status}
            </Tag>
            {tool.duration && (
              <Text type="secondary" style={{ fontSize: 12 }}>{tool.duration}ms</Text>
            )}
          </Space>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', color: '#8b949e' }}>{isZh ? '参数' : 'Params'}</summary>
            <pre style={{ fontSize: 12, marginTop: 8, maxHeight: 150, overflow: 'auto' }}>
              {JSON.stringify(tool.params, null, 2)}
            </pre>
          </details>
          {tool.error && (
            <Text type="danger" style={{ fontSize: 12 }}>{tool.error}</Text>
          )}
        </div>
      );
    }

    if (category === 'token') {
      const token = data as TokenUsage;
      return (
        <div className="message-body">
          <Space>
            <ThunderboltOutlined style={{ color: '#faad14' }} />
            <Tag color="gold">{token.model}</Tag>
          </Space>
          <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
            <Text type="secondary">{t('messageLog.input')}: <Text strong style={{ color: '#d97706' }}>{token.inputTokens}</Text></Text>
            <Text type="secondary">{t('messageLog.output')}: <Text strong style={{ color: '#52c41a' }}>{token.outputTokens}</Text></Text>
          </div>
        </div>
      );
    }

    if (category === 'error') {
      const error = data as ErrorLog;
      return (
        <div className="message-body">
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            <Tag color="error">{error.errorType || 'Error'}</Tag>
          </Space>
          <Paragraph type="danger" style={{ marginTop: 8, marginBottom: 0 }}>
            {error.message}
          </Paragraph>
          {error.stack && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', color: '#8b949e' }}>{isZh ? '堆栈' : 'Stack'}</summary>
              <pre style={{ fontSize: 11, marginTop: 8, maxHeight: 150, overflow: 'auto', color: '#ff4d4f' }}>
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return null;
  };

  // 统计
  const stats = {
    total: allMessages.length,
    thoughts: thoughts.length,
    tools: toolCalls.length,
    tokens: tokenUsages.length,
    errors: errors.length,
  };

  const getCategoryIcon = (category: MessageCategory) => {
    switch (category) {
      case 'thought': return <BulbOutlined style={{ color: '#faad14' }} />;
      case 'tool': return <ToolOutlined style={{ color: '#722ed1' }} />;
      case 'token': return <ThunderboltOutlined style={{ color: '#faad14' }} />;
      case 'error': return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
  };

  const getCategoryColor = (category: MessageCategory) => {
    switch (category) {
      case 'thought': return 'blue';
      case 'tool': return 'purple';
      case 'token': return 'gold';
      case 'error': return 'red';
    }
  };

  if (allMessages.length === 0) {
    return (
      <div className="message-log-page">
        <Empty description={t('messageLog.noMessages')} />
      </div>
    );
  }

  return (
    <div className="message-log-page">
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title={isZh ? '总消息' : 'Total'} value={stats.total} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title={t('messageLog.thoughts')} value={stats.thoughts} prefix={<BulbOutlined style={{ color: '#faad14' }} />} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title={t('messageLog.tools')} value={stats.tools} prefix={<ToolOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title={t('messageLog.tokens')} value={stats.tokens} prefix={<ThunderboltOutlined style={{ color: '#faad14' }} />} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic title={t('messageLog.errors')} value={stats.errors} prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />} />
          </Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder={isZh ? '搜索消息内容...' : 'Search messages...'}
            allowClear
            style={{ width: 250 }}
            onSearch={setSearchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: 120 }}
            options={[
              { label: t('messageLog.all'), value: 'all' },
              { label: t('messageLog.thoughts'), value: 'thought' },
              { label: t('messageLog.tools'), value: 'tool' },
              { label: t('messageLog.tokens'), value: 'token' },
              { label: t('messageLog.errors'), value: 'error' },
            ]}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>{t('common.export')}</Button>
          <Button
            icon={<ClearOutlined />}
            onClick={() => {
              clearSession();
            }}
          >
            {isZh ? '清除当前会话' : 'Clear Session'}
          </Button>
        </Space>
      </Card>

      {/* 消息列表 */}
      <Card title={`${isZh ? '消息日志' : 'Message Log'} (${filteredMessages.length}/${allMessages.length})`} className="log-card">
        <div className="message-list">
          {filteredMessages.length === 0 ? (
            <Empty description={isZh ? '没有匹配的消息' : 'No matching messages'} />
          ) : (
            <Timeline
              items={filteredMessages.slice(0, 100).map((msg) => ({
                color: getCategoryColor(msg.category),
                dot: getCategoryIcon(msg.category),
                children: (
                  <div className={`message-item ${msg.category}`}>
                    <div className="message-header">
                      <Space>
                        <Tag>{msg.category}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </Text>
                      </Space>
                    </div>
                    {renderMessageContent(msg)}
                  </div>
                ),
              }))}
            />
          )}
        </div>
      </Card>
    </div>
  );
};
