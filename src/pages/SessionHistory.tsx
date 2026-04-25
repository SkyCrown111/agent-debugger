import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Descriptions,
  Empty,
  Tooltip,
  message,
  Popconfirm,
  Input,
  DatePicker,
  Select,
  Typography,
  Divider,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  HistoryOutlined,
  DeleteOutlined,
  ExportOutlined,
  EyeOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useSessionStore, Thought, ToolCall, TokenUsage, ErrorLog } from '../stores/sessionStore';
import { useAgentStore } from '../stores/agentStore';
import './SessionHistory.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface Session {
  id: string;
  agentId: string;
  agentName: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'error';
  thoughtCount: number;
  toolCallCount: number;
  totalTokens: number;
  errorCount: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface SessionDetail {
  session: Session;
  thoughts: Thought[];
  toolCalls: ToolCall[];
  tokenUsage: TokenUsage[];
  errors: ErrorLog[];
}

const SessionHistory: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Get data from stores
  const { thoughts, toolCalls, tokenUsages, errors, clearSession } = useSessionStore();
  const { agents } = useAgentStore();

  // Generate sessions from current data
  const currentSession: Session = useMemo(() => {
    const tokens = tokenUsages.reduce(
      (acc, t) => ({
        input: acc.input + t.inputTokens,
        output: acc.output + t.outputTokens
      }),
      { input: 0, output: 0 }
    );

    return {
      id: 'current-session',
      agentId: agents.length > 0 ? agents[0].id : 'unknown',
      agentName: agents.length > 0 ? agents[0].name : 'Unknown Agent',
      startTime: thoughts.length > 0 ? thoughts[0].timestamp : new Date().toISOString(),
      status: errors.length > 0 ? 'error' : 'active',
      thoughtCount: thoughts.length,
      toolCallCount: toolCalls.length,
      totalTokens: tokens.input + tokens.output,
      errorCount: errors.length,
    };
  }, [thoughts, toolCalls, tokenUsages, errors, agents]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      // Try to get sessions from electron store
      const storedSessions = await window.electronAPI?.getSessions?.();

      // Transform stored sessions to match our interface
      const transformedSessions: Session[] = (storedSessions || []).map((s: any) => ({
        id: s.id,
        agentId: s.agentId,
        agentName: s.agentName,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        thoughtCount: s.thoughts?.length || 0,
        toolCallCount: s.toolCalls?.length || 0,
        totalTokens: s.tokenUsages?.reduce((sum: number, t: any) => sum + t.inputTokens + t.outputTokens, 0) || 0,
        errorCount: s.errors?.length || 0,
        duration: s.endTime
          ? new Date(s.endTime).getTime() - new Date(s.startTime).getTime()
          : undefined,
      }));

      // Add current session if there's data
      if (thoughts.length > 0 || toolCalls.length > 0) {
        transformedSessions.unshift(currentSession);
      }

      setSessions(transformedSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      // Use current session data
      if (thoughts.length > 0 || toolCalls.length > 0) {
        setSessions([currentSession]);
      } else {
        setSessions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (session: Session) => {
    try {
      if (session.id === 'current-session') {
        // Use current store data
        setSelectedSession({
          session,
          thoughts,
          toolCalls,
          tokenUsage: tokenUsages,
          errors,
        });
      } else {
        // Try to get from electron store
        const detail = await window.electronAPI?.getSession?.(session.id);
        if (detail) {
          setSelectedSession({
            session,
            thoughts: detail.thoughts || [],
            toolCalls: detail.toolCalls || [],
            tokenUsage: detail.tokenUsages || [],
            errors: detail.errors || [],
          });
        } else {
          setSelectedSession({
            session,
            thoughts: [],
            toolCalls: [],
            tokenUsage: [],
            errors: [],
          });
        }
      }
    } catch (error) {
      console.error('Failed to load session detail:', error);
      setSelectedSession({
        session,
        thoughts: [],
        toolCalls: [],
        tokenUsage: [],
        errors: [],
      });
    }
    setDetailVisible(true);
  };

  const handleDelete = async (sessionId: string) => {
    try {
      if (sessionId === 'current-session') {
        clearSession();
        message.success(isZh ? '当前会话已清除' : 'Session cleared');
      } else {
        await window.electronAPI?.clearSession?.(sessionId);
        message.success(isZh ? '会话已删除' : 'Session deleted');
      }
      loadSessions();
    } catch (error) {
      message.error(isZh ? '删除失败' : 'Delete failed');
    }
  };

  const handleExport = async (session: Session) => {
    try {
      let data;
      if (session.id === 'current-session') {
        data = {
          session,
          thoughts,
          toolCalls,
          tokenUsages,
          errors,
          exportTime: new Date().toISOString(),
        };
      } else {
        data = await window.electronAPI?.exportData?.(session.id);
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${session.id}-${dayjs(session.startTime).format('YYYY-MM-DD-HHmmss')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(t('settings.dataExported'));
    } catch (error) {
      message.error(isZh ? '导出失败' : 'Export failed');
    }
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusTag = (status: Session['status']) => {
    const statusConfig = {
      active: { color: 'processing', text: t('sessionHistory.active') },
      completed: { color: 'success', text: t('sessionHistory.completed') },
      error: { color: 'error', text: isZh ? '出错' : 'Error' },
    };
    const config = statusConfig[status];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const filteredSessions = sessions.filter((session) => {
    // 搜索过滤
    if (searchText && !session.agentName.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }

    // 状态过滤
    if (statusFilter && session.status !== statusFilter) {
      return false;
    }

    // 日期过滤
    if (dateRange && dateRange[0] && dateRange[1]) {
      const sessionDate = dayjs(session.startTime);
      if (sessionDate.isBefore(dateRange[0]) || sessionDate.isAfter(dateRange[1])) {
        return false;
      }
    }

    return true;
  });

  const columns: ColumnsType<Session> = [
    {
      title: 'Agent',
      dataIndex: 'agentName',
      key: 'agentName',
      render: (name: string, record) => (
        <Space>
          <ApiOutlined />
          <span>{name}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({record.agentId.slice(0, 8)})
          </Text>
        </Space>
      ),
    },
    {
      title: t('sessionHistory.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: Session['status']) => getStatusTag(status),
    },
    {
      title: t('sessionHistory.startTime'),
      dataIndex: 'startTime',
      key: 'startTime',
      width: 180,
      render: (time: string) => (
        <Space>
          <ClockCircleOutlined />
          {dayjs(time).format('YYYY-MM-DD HH:mm:ss')}
        </Space>
      ),
    },
    {
      title: t('sessionHistory.duration'),
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration?: number) => duration ? formatDuration(duration) : '-',
    },
    {
      title: t('sessionHistory.thoughtCount'),
      dataIndex: 'thoughtCount',
      key: 'thoughtCount',
      width: 90,
      align: 'center',
      render: (count: number) => (
        <Tag color="orange">{count}</Tag>
      ),
    },
    {
      title: t('sessionHistory.toolCount'),
      dataIndex: 'toolCallCount',
      key: 'toolCallCount',
      width: 90,
      align: 'center',
      render: (count: number) => (
        <Tag color="purple">{count}</Tag>
      ),
    },
    {
      title: 'Token',
      dataIndex: 'totalTokens',
      key: 'totalTokens',
      width: 100,
      align: 'right',
      render: (tokens: number) => tokens.toLocaleString(),
    },
    {
      title: t('messageLog.errors'),
      dataIndex: 'errorCount',
      key: 'errorCount',
      width: 70,
      align: 'center',
      render: (count: number) => count > 0 ? (
        <Tag color="error">{count}</Tag>
      ) : (
        <Tag color="default">0</Tag>
      ),
    },
    {
      title: isZh ? '操作' : 'Action',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title={t('sessionHistory.viewDetails')}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title={t('common.export')}>
            <Button
              type="text"
              icon={<ExportOutlined />}
              onClick={() => handleExport(record)}
            />
          </Tooltip>
          <Popconfirm
            title={t('sessionHistory.confirmDelete')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
          >
            <Tooltip title={t('common.delete')}>
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 统计数据
  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.status === 'active').length,
    completed: sessions.filter(s => s.status === 'completed').length,
    error: sessions.filter(s => s.status === 'error').length,
    totalTokens: sessions.reduce((sum, s) => sum + s.totalTokens, 0),
  };

  return (
    <div className="session-history-page">
      <div className="page-header">
        <Title level={4}>
          <HistoryOutlined /> {t('sessionHistory.title')}
        </Title>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title={isZh ? '总会话' : 'Total Sessions'} value={stats.total} prefix={<HistoryOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title={t('sessionHistory.active')} value={stats.active} valueStyle={{ color: '#d97706' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title={t('sessionHistory.completed')} value={stats.completed} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title={isZh ? '出错' : 'Errors'} value={stats.error} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title={isZh ? '总 Token 消耗' : 'Total Tokens'}
              value={stats.totalTokens.toLocaleString()}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 过滤器 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder={t('sessionHistory.searchPlaceholder')}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder={isZh ? '状态筛选' : 'Filter by status'}
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            allowClear
            options={[
              { value: 'active', label: t('sessionHistory.active') },
              { value: 'completed', label: t('sessionHistory.completed') },
              { value: 'error', label: isZh ? '出错' : 'Error' },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            showTime
          />
          <Button onClick={loadSessions}>{t('common.refresh')}</Button>
        </Space>
      </Card>

      {/* 会话列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredSessions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => isZh ? `共 ${total} 条记录` : `${total} records`,
          }}
          locale={{
            emptyText: (
              <Empty
                description={t('sessionHistory.noSessions')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={isZh ? '会话详情' : 'Session Details'}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={800}
        footer={null}
      >
        {selectedSession && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Agent">{selectedSession.session.agentName}</Descriptions.Item>
              <Descriptions.Item label={t('sessionHistory.status')}>
                {getStatusTag(selectedSession.session.status)}
              </Descriptions.Item>
              <Descriptions.Item label={t('sessionHistory.startTime')}>
                {dayjs(selectedSession.session.startTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label={isZh ? '结束时间' : 'End Time'}>
                {selectedSession.session.endTime
                  ? dayjs(selectedSession.session.endTime).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('sessionHistory.duration')}>
                {selectedSession.session.duration
                  ? formatDuration(selectedSession.session.duration)
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={isZh ? 'Token 消耗' : 'Token Usage'}>
                {selectedSession.session.totalTokens.toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title={t('sessionHistory.thoughtCount')}
                  value={selectedSession.session.thoughtCount}
                  prefix={<ExclamationCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={t('sessionHistory.toolCount')}
                  value={selectedSession.session.toolCallCount}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={isZh ? 'Token 输入' : 'Token Input'}
                  value={selectedSession.tokenUsage.reduce((sum, t) => sum + (t.inputTokens || 0), 0).toLocaleString()}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={isZh ? 'Token 输出' : 'Token Output'}
                  value={selectedSession.tokenUsage.reduce((sum, t) => sum + (t.outputTokens || 0), 0).toLocaleString()}
                />
              </Col>
            </Row>

            {selectedSession.errors.length > 0 && (
              <>
                <Divider />
                <Title level={5} type="danger">{isZh ? '错误记录' : 'Error Logs'}</Title>
                {selectedSession.errors.map((error, index) => (
                  <Card key={index} size="small" style={{ marginBottom: 8 }}>
                    <Text type="danger">{error.message}</Text>
                    {error.stack && (
                      <pre style={{ fontSize: 12, marginTop: 8, background: '#1a1a1a', padding: 8, borderRadius: 4 }}>
                        {error.stack}
                      </pre>
                    )}
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SessionHistory;