import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Empty,
  Space,
  Button,
  Drawer,
  Descriptions,
  Divider,
  Input,
  Select,
  Timeline,
  Badge,
  Tooltip,
  Statistic,
  Row,
  Col,
  Alert,
  Progress
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  DownloadOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSessionStore, ToolCall } from '../stores/sessionStore';
import './ToolTrace.css';

const { Search } = Input;

export const ToolTrace: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toolCalls } = useSessionStore();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error' | 'pending'>('all');
  const [selectedTool, setSelectedTool] = useState<ToolCall | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  const isZh = i18n.language === 'zh';

  // 统计数据
  const stats = useMemo(() => {
    const total = toolCalls.length;
    const success = toolCalls.filter(t => t.status === 'success').length;
    const error = toolCalls.filter(t => t.status === 'error').length;
    const pending = toolCalls.filter(t => t.status === 'pending').length;
    const avgDuration = total > 0
      ? Math.round(toolCalls.reduce((sum, t) => sum + (t.duration || 0), 0) / total)
      : 0;
    const slowCalls = toolCalls.filter(t => (t.duration || 0) > 1000);
    const slowCallCount = slowCalls.length;
    const totalDuration = toolCalls.reduce((sum, t) => sum + (t.duration || 0), 0);

    // 按工具名称分组
    const byTool: Record<string, { count: number; avgDuration: number; errors: number }> = {};
    toolCalls.forEach(t => {
      if (!byTool[t.toolName]) {
        byTool[t.toolName] = { count: 0, avgDuration: 0, errors: 0 };
      }
      byTool[t.toolName].count++;
      byTool[t.toolName].avgDuration += t.duration || 0;
      if (t.status === 'error') byTool[t.toolName].errors++;
    });

    Object.keys(byTool).forEach(key => {
      byTool[key].avgDuration = Math.round(byTool[key].avgDuration / byTool[key].count);
    });

    return { total, success, error, pending, avgDuration, slowCallCount, slowCalls, totalDuration, byTool };
  }, [toolCalls]);

  // 过滤数据
  const filteredCalls = useMemo(() => {
    let result = [...toolCalls];

    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(t =>
        t.toolName.toLowerCase().includes(lower) ||
        JSON.stringify(t.params).toLowerCase().includes(lower) ||
        (t.error && t.error.toLowerCase().includes(lower))
      );
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [toolCalls, statusFilter, searchText]);

  const columns = [
    {
      title: t('toolTrace.status'),
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const config: Record<string, { icon: React.ReactNode; color: string }> = {
          success: { icon: <CheckCircleOutlined />, color: '#52c41a' },
          error: { icon: <CloseCircleOutlined />, color: '#ff4d4f' },
          pending: { icon: <LoadingOutlined />, color: '#d97706' },
        };
        const { icon, color } = config[status] || config.pending;
        return <span style={{ color }}>{icon}</span>;
      }
    },
    {
      title: t('toolTrace.toolName'),
      dataIndex: 'toolName',
      key: 'toolName',
      render: (name: string) => <Tag color="orange">{name}</Tag>
    },
    {
      title: isZh ? '参数预览' : 'Params Preview',
      dataIndex: 'params',
      key: 'params',
      ellipsis: true,
      render: (params: any) => (
        <Tooltip title={JSON.stringify(params, null, 2)}>
          <code className="params-preview">
            {JSON.stringify(params).slice(0, 50)}...
          </code>
        </Tooltip>
      )
    },
    {
      title: t('toolTrace.duration'),
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      sorter: (a: ToolCall, b: ToolCall) => (a.duration || 0) - (b.duration || 0),
      render: (duration: number) => {
        if (!duration) return '-';
        const isSlow = duration > 1000;
        return (
          <span className={isSlow ? 'duration-slow' : ''}>
            {duration}ms
            {isSlow && <WarningOutlined style={{ color: '#faad14', marginLeft: 4 }} />}
          </span>
        );
      }
    },
    {
      title: t('toolTrace.timestamp'),
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 100,
      render: (time: string) => new Date(time).toLocaleTimeString()
    },
    {
      title: isZh ? '操作' : 'Action',
      key: 'action',
      width: 80,
      render: (_: any, record: ToolCall) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setSelectedTool(record)}
        >
          {t('common.view')}
        </Button>
      )
    }
  ];

  if (toolCalls.length === 0) {
    return (
      <div className="tool-trace-page">
        <Empty description={t('toolTrace.noToolCalls')} />
      </div>
    );
  }

  return (
    <div className="tool-trace-page">
      {/* 统计卡片 */}
      <Row gutter={16} className="stats-row">
        <Col span={4}>
          <Card className="stat-card">
            <Statistic title={t('toolTrace.totalCalls')} value={stats.total} valueStyle={{ color: '#d97706' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title={t('toolTrace.success')}
              value={stats.success}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title={t('toolTrace.failed')}
              value={stats.error}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title={t('toolTrace.avgDuration')}
              value={stats.avgDuration}
              suffix="ms"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title={isZh ? '慢调用' : 'Slow Calls'}
              value={stats.slowCallCount}
              valueStyle={{ color: stats.slowCallCount > 0 ? '#faad14' : '#52c41a' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title={t('toolTrace.successRate')}
              value={stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0}
              suffix="%"
              valueStyle={{ color: stats.success / stats.total > 0.9 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 慢调用告警 */}
      {stats.slowCallCount > 0 && (
        <Alert
          message={isZh ? `发现 ${stats.slowCallCount} 个慢调用（>1000ms），可能影响性能` : `Found ${stats.slowCallCount} slow calls (>1000ms), may affect performance`}
          type="warning"
          showIcon
          className="slow-call-alert"
          action={
            <Button size="small" type="primary" ghost onClick={() => setStatusFilter('all')}>
              {t('common.view')}
            </Button>
          }
        />
      )}

      {/* 工具栏 */}
      <Card className="toolbar-card">
        <div className="toolbar">
          <Space>
            <Search
              placeholder={t('toolTrace.searchPlaceholder')}
              allowClear
              style={{ width: 250 }}
              onSearch={setSearchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              options={[
                { label: isZh ? '全部状态' : 'All Status', value: 'all' },
                { label: t('toolTrace.success'), value: 'success' },
                { label: t('toolTrace.failed'), value: 'error' },
                { label: t('toolTrace.running'), value: 'pending' },
              ]}
            />
          </Space>

          <Space>
            <Button
              type={viewMode === 'table' ? 'primary' : 'default'}
              onClick={() => setViewMode('table')}
            >
              {isZh ? '表格视图' : 'Table View'}
            </Button>
            <Button
              type={viewMode === 'timeline' ? 'primary' : 'default'}
              onClick={() => setViewMode('timeline')}
            >
              {isZh ? '时间线视图' : 'Timeline View'}
            </Button>
          </Space>
        </div>
      </Card>

      {/* 内容区域 */}
      {viewMode === 'table' ? (
        <Card className="table-card">
          <Table
            dataSource={filteredCalls}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => isZh ? `共 ${total} 条` : `${total} total` }}
            expandable={{
              expandedRowRender: (record) => (
                <div className="expanded-content">
                  <Row gutter={16}>
                    <Col span={12}>
                      <div className="params-full">
                        <h4>{t('thoughtFlow.params')}</h4>
                        <pre>{JSON.stringify(record.params, null, 2)}</pre>
                      </div>
                    </Col>
                    <Col span={12}>
                      {record.result && (
                        <div className="result">
                          <h4>{t('thoughtFlow.result')}</h4>
                          <pre>{typeof record.result === 'string' ? record.result : JSON.stringify(record.result, null, 2)}</pre>
                        </div>
                      )}
                      {record.error && (
                        <div className="error">
                          <h4>{t('thoughtFlow.errorInfo')}</h4>
                          <pre>{record.error}</pre>
                        </div>
                      )}
                    </Col>
                  </Row>
                </div>
              )
            }}
          />
        </Card>
      ) : (
        <Card className="timeline-view-card" title={isZh ? '调用时间线' : 'Call Timeline'}>
          <Timeline
            items={filteredCalls.slice(0, 50).map((call) => ({
              color: call.status === 'success' ? 'green' : call.status === 'error' ? 'red' : 'blue',
              dot: call.status === 'success' ? <CheckCircleOutlined /> :
                   call.status === 'error' ? <CloseCircleOutlined /> :
                   <LoadingOutlined />,
              children: (
                <div className="timeline-item-content" onClick={() => setSelectedTool(call)}>
                  <div className="timeline-header">
                    <Tag color="orange">{call.toolName}</Tag>
                    <span className="timeline-time">{new Date(call.timestamp).toLocaleTimeString()}</span>
                    {call.duration && (
                      <Tag color={call.duration > 1000 ? 'warning' : 'default'}>
                        {call.duration}ms
                      </Tag>
                    )}
                  </div>
                  <div className="timeline-params">
                    {JSON.stringify(call.params).slice(0, 100)}...
                  </div>
                </div>
              ),
            }))}
          />
        </Card>
      )}

      {/* 详情抽屉 */}
      <Drawer
        title={`${isZh ? '工具调用详情' : 'Tool Call Details'} - ${selectedTool?.toolName}`}
        placement="right"
        width={600}
        open={!!selectedTool}
        onClose={() => setSelectedTool(null)}
      >
        {selectedTool && (
          <div className="tool-detail">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label={t('toolTrace.toolName')} span={2}>
                <Tag color="orange">{selectedTool.toolName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('toolTrace.status')}>
                {selectedTool.status === 'success' ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>{t('toolTrace.success')}</Tag>
                ) : selectedTool.status === 'error' ? (
                  <Tag color="error" icon={<CloseCircleOutlined />}>{t('toolTrace.failed')}</Tag>
                ) : (
                  <Tag color="processing" icon={<LoadingOutlined />}>{t('toolTrace.running')}</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('toolTrace.duration')}>
                <span className={selectedTool.duration && selectedTool.duration > 1000 ? 'text-warning' : ''}>
                  {selectedTool.duration || '-'}ms
                  {selectedTool.duration && selectedTool.duration > 1000 && (
                    <Tag color="warning" style={{ marginLeft: 8 }}>{isZh ? '慢调用' : 'Slow'}</Tag>
                  )}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={isZh ? '调用时间' : 'Call Time'} span={2}>
                {new Date(selectedTool.timestamp).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="ID" span={2}>
                <code>{selectedTool.id}</code>
              </Descriptions.Item>
            </Descriptions>

            <Divider>{t('thoughtFlow.params')}</Divider>
            <pre className="detail-json">{JSON.stringify(selectedTool.params, null, 2)}</pre>

            {selectedTool.result && (
              <>
                <Divider>{t('thoughtFlow.result')}</Divider>
                <pre className="detail-json">
                  {typeof selectedTool.result === 'string'
                    ? selectedTool.result
                    : JSON.stringify(selectedTool.result, null, 2)}
                </pre>
              </>
            )}

            {selectedTool.error && (
              <>
                <Divider>{t('thoughtFlow.errorInfo')}</Divider>
                <div className="detail-error">{selectedTool.error}</div>
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
