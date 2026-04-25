import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Table,
  Empty,
  Spin,
  Modal,
  Descriptions,
  Collapse,
  Timeline,
  Divider,
  Input,
  Select,
  DatePicker,
  message,
  Tooltip,
  Badge,
  Statistic,
  Row,
  Col,
  Alert,
} from 'antd';
import {
  BugOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  ApiOutlined,
  CodeOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useSessionStore, ErrorLog } from '../stores/sessionStore';
import { useAgentStore } from '../stores/agentStore';

const { Title, Text, Paragraph } = Typography;

interface ErrorRecord {
  id: string;
  agentId: string;
  agentName: string;
  sessionId: string;
  timestamp: string;
  type: 'runtime' | 'api' | 'tool' | 'network' | 'validation' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface ErrorDetail extends ErrorRecord {
  timeline: {
    timestamp: string;
    event: string;
    data?: any;
  }[];
  relatedThoughts: any[];
  relatedToolCalls: any[];
}

const ErrorDebug: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [selectedError, setSelectedError] = useState<ErrorDetail | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  // Get errors from store
  const { errors: storeErrors, clearErrors, thoughts, toolCalls } = useSessionStore();
  const { agents } = useAgentStore();

  // Convert store errors to ErrorRecord format
  const convertedErrors: ErrorRecord[] = useMemo(() => {
    return storeErrors.map((error: ErrorLog) => {
      let errorType: ErrorRecord['type'] = 'unknown';
      let severity: ErrorRecord['severity'] = 'medium';

      if (error.context?.toolName) {
        errorType = 'tool';
      } else if (error.message.toLowerCase().includes('api')) {
        errorType = 'api';
      } else if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('timeout')) {
        errorType = 'network';
      } else if (error.message.toLowerCase().includes('validation') || error.message.toLowerCase().includes('invalid')) {
        errorType = 'validation';
      } else if (error.stack) {
        errorType = 'runtime';
      }

      if (error.message.toLowerCase().includes('critical') || error.message.toLowerCase().includes('fatal')) {
        severity = 'critical';
      } else if (error.message.toLowerCase().includes('uncaught') || error.message.toLowerCase().includes('exception')) {
        severity = 'critical';
      } else if (errorType === 'runtime') {
        severity = 'high';
      } else if (errorType === 'api' || errorType === 'network') {
        severity = 'high';
      } else if (errorType === 'tool') {
        severity = 'medium';
      } else if (errorType === 'validation') {
        severity = 'low';
      }

      const agent = agents.find(a => a.id === error.agentId);

      return {
        id: error.id,
        agentId: error.agentId,
        agentName: agent?.name || 'Unknown Agent',
        sessionId: 'current-session',
        timestamp: error.timestamp,
        type: errorType,
        severity,
        message: error.message,
        stack: error.stack,
        context: error.context,
        resolved: false,
      };
    });
  }, [storeErrors, agents]);

  useEffect(() => {
    loadErrors();
  }, [convertedErrors]);

  const loadErrors = async () => {
    setLoading(true);
    try {
      setErrors(convertedErrors);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (error: ErrorRecord) => {
    const relatedThoughts = thoughts.filter(t => t.agentId === error.agentId);
    const relatedToolCalls = toolCalls.filter(t =>
      t.agentId === error.agentId &&
      t.status === 'error' &&
      t.timestamp <= error.timestamp
    );

    const detail: ErrorDetail = {
      ...error,
      timeline: [
        { timestamp: error.timestamp, event: isZh ? '发生错误' : 'Error occurred', data: error.context },
      ],
      relatedThoughts,
      relatedToolCalls,
    };
    setSelectedError(detail);
    setDetailVisible(true);
  };

  const handleExport = () => {
    const data = JSON.stringify(errors, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors-${dayjs().format('YYYY-MM-DD-HHmmss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(isZh ? '导出成功' : 'Export successful');
  };

  const handleClearErrors = () => {
    Modal.confirm({
      title: isZh ? '确认清除' : 'Confirm Clear',
      content: isZh ? '确定要清除所有错误记录吗？' : 'Are you sure to clear all error records?',
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: () => {
        clearErrors();
        message.success(isZh ? '已清除错误记录' : 'Error records cleared');
      }
    });
  };

  const getTypeTag = (type: ErrorRecord['type']) => {
    const config = {
      runtime: { color: 'magenta', text: t('errorDebug.runtime') },
      api: { color: 'orange', text: t('errorDebug.api') },
      tool: { color: 'purple', text: t('errorDebug.tool') },
      network: { color: 'cyan', text: t('errorDebug.network') },
      validation: { color: 'gold', text: t('errorDebug.validation') },
      unknown: { color: 'default', text: t('errorDebug.unknown') },
    };
    return <Tag color={config[type].color}>{config[type].text}</Tag>;
  };

  const getSeverityTag = (severity: ErrorRecord['severity']) => {
    const config = {
      low: { color: 'default', text: t('errorDebug.low') },
      medium: { color: 'warning', text: t('errorDebug.medium') },
      high: { color: 'error', text: t('errorDebug.high') },
      critical: { color: 'magenta', text: t('errorDebug.criticalSeverity') },
    };
    return <Tag color={config[severity].color}>{config[severity].text}</Tag>;
  };

  const filteredErrors = errors.filter(error => {
    if (searchText && !error.message.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    if (typeFilter && error.type !== typeFilter) {
      return false;
    }
    if (severityFilter && error.severity !== severityFilter) {
      return false;
    }
    return true;
  });

  const columns: ColumnsType<ErrorRecord> = [
    {
      title: t('errorDebug.time'),
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (time: string) => (
        <Space>
          <ClockCircleOutlined />
          {dayjs(time).format('HH:mm:ss')}
        </Space>
      ),
    },
    {
      title: t('errorDebug.agent'),
      dataIndex: 'agentName',
      key: 'agentName',
      width: 150,
    },
    {
      title: t('errorDebug.errorType'),
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: getTypeTag,
    },
    {
      title: t('errorDebug.severity'),
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: getSeverityTag,
    },
    {
      title: t('errorDebug.errorMessage'),
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (msg: string) => (
        <Tooltip title={msg}>
          <Text type="danger">{msg}</Text>
        </Tooltip>
      ),
    },
    {
      title: t('errorDebug.status'),
      dataIndex: 'resolved',
      key: 'resolved',
      width: 80,
      render: (resolved: boolean) => resolved ? (
        <Tag color="success">{t('errorDebug.resolved')}</Tag>
      ) : (
        <Tag color="error">{t('errorDebug.unresolvedStatus')}</Tag>
      ),
    },
    {
      title: isZh ? '操作' : 'Action',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Tooltip title={t('common.view')}>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          />
        </Tooltip>
      ),
    },
  ];

  // 统计
  const stats = {
    total: errors.length,
    unresolved: errors.filter(e => !e.resolved).length,
    critical: errors.filter(e => e.severity === 'critical' && !e.resolved).length,
    high: errors.filter(e => e.severity === 'high' && !e.resolved).length,
  };

  return (
    <div className="error-debug-page">
      <div className="page-header">
        <Title level={4}>
          <BugOutlined /> {t('errorDebug.title')}
        </Title>
      </div>

      {/* 警告提示 */}
      {stats.critical > 0 && (
        <Alert
          message={t('errorDebug.foundCritical', { count: stats.critical })}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={t('errorDebug.totalErrors')}
              value={stats.total}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={t('errorDebug.unresolved')}
              value={stats.unresolved}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={t('errorDebug.critical')}
              value={stats.critical}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={t('errorDebug.highPriority')}
              value={stats.high}
              valueStyle={{ color: '#fa541c' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 过滤器 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder={t('errorDebug.searchErrors')}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder={t('errorDebug.errorType')}
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 120 }}
            allowClear
            options={[
              { value: 'runtime', label: t('errorDebug.runtime') },
              { value: 'api', label: t('errorDebug.api') },
              { value: 'tool', label: t('errorDebug.tool') },
              { value: 'network', label: t('errorDebug.network') },
              { value: 'validation', label: t('errorDebug.validation') },
            ]}
          />
          <Select
            placeholder={t('errorDebug.severity')}
            value={severityFilter}
            onChange={setSeverityFilter}
            style={{ width: 100 }}
            allowClear
            options={[
              { value: 'critical', label: t('errorDebug.criticalSeverity') },
              { value: 'high', label: t('errorDebug.high') },
              { value: 'medium', label: t('errorDebug.medium') },
              { value: 'low', label: t('errorDebug.low') },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={loadErrors}>{t('common.refresh')}</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>{t('common.export')}</Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleClearErrors}>
            {t('errorDebug.clearErrors')}
          </Button>
        </Space>
      </Card>

      {/* 错误列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredErrors}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <Empty
                description={isZh ? '暂无错误记录' : 'No error records'}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={
          <Space>
            <BugOutlined />
            {t('errorDebug.errorDetail')}
            {selectedError && getSeverityTag(selectedError.severity)}
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={800}
        footer={null}
      >
        {selectedError && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Agent">{selectedError.agentName}</Descriptions.Item>
              <Descriptions.Item label={t('errorDebug.errorType')}>{getTypeTag(selectedError.type)}</Descriptions.Item>
              <Descriptions.Item label={t('errorDebug.time')}>
                {dayjs(selectedError.timestamp).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label={t('errorDebug.status')}>
                {selectedError.resolved ? (
                  <Tag color="success">{t('errorDebug.resolved')}</Tag>
                ) : (
                  <Tag color="error">{t('errorDebug.unresolvedStatus')}</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Title level={5}>
              <ExclamationCircleOutlined /> {t('errorDebug.errorMessage')}
            </Title>
            <Paragraph>
              <Text type="danger">{selectedError.message}</Text>
            </Paragraph>

            {selectedError.stack && (
              <>
                <Title level={5}>
                  <CodeOutlined /> {t('errorDebug.stackTrace')}
                </Title>
                <pre style={{
                  background: 'var(--bg-tertiary)',
                  padding: 16,
                  borderRadius: 8,
                  overflow: 'auto',
                  maxHeight: 300,
                  fontSize: 12,
                  color: '#ff4d4f',
                }}>
                  {selectedError.stack}
                </pre>
              </>
            )}

            {selectedError.context && Object.keys(selectedError.context).length > 0 && (
              <>
                <Divider />
                <Title level={5}>{t('errorDebug.context')}</Title>
                <pre style={{
                  background: 'var(--bg-tertiary)',
                  padding: 16,
                  borderRadius: 8,
                  overflow: 'auto',
                  maxHeight: 200,
                  fontSize: 12,
                }}>
                  {JSON.stringify(selectedError.context, null, 2)}
                </pre>
              </>
            )}

            {selectedError.relatedToolCalls.length > 0 && (
              <>
                <Divider />
                <Title level={5}>{t('errorDebug.relatedToolCalls')}</Title>
                {selectedError.relatedToolCalls.map((tc, index) => (
                  <Card key={index} size="small" style={{ marginBottom: 8 }}>
                    <Space>
                      <Tag color="orange">{tc.toolName}</Tag>
                      <Tag color="error">{tc.status}</Tag>
                      {tc.error && <Text type="danger">{tc.error}</Text>}
                    </Space>
                  </Card>
                ))}
              </>
            )}

            <Divider />

            <Title level={5}>{t('errorDebug.timeline')}</Title>
            <Timeline
              items={selectedError.timeline.map(item => ({
                color: item.event.includes('Error') ? 'red' : 'green',
                children: (
                  <div>
                    <Text strong>{item.event}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(item.timestamp).format('HH:mm:ss')}
                    </Text>
                  </div>
                ),
              }))}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ErrorDebug;