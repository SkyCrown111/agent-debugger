import React from 'react';
import { Card, Table, Tag, Empty } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useSessionStore } from '../../stores/sessionStore';
import './ToolTrace.css';

export const ToolTrace: React.FC = () => {
  const { toolCalls } = useSessionStore();

  const columns = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const icon = status === 'success' 
          ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
          : status === 'error'
            ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            : <LoadingOutlined style={{ color: '#1890ff' }} />;
        return icon;
      }
    },
    {
      title: '工具名称',
      dataIndex: 'toolName',
      key: 'toolName',
      render: (name: string) => <Tag color="blue">{name}</Tag>
    },
    {
      title: '参数',
      dataIndex: 'params',
      key: 'params',
      render: (params: any) => (
        <pre className="params-preview">
          {JSON.stringify(params, null, 2).slice(0, 100)}...
        </pre>
      )
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => duration ? `${duration}ms` : '-'
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (time: string) => new Date(time).toLocaleTimeString()
    }
  ];

  if (toolCalls.length === 0) {
    return (
      <div className="tool-trace-page">
        <Empty description="暂无工具调用记录" />
      </div>
    );
  }

  return (
    <div className="tool-trace-page">
      <Card title={`工具调用记录 (${toolCalls.length})`} className="tool-card">
        <Table 
          dataSource={toolCalls} 
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          expandable={{
            expandedRowRender: (record) => (
              <div className="expanded-content">
                <div className="params-full">
                  <h4>参数</h4>
                  <pre>{JSON.stringify(record.params, null, 2)}</pre>
                </div>
                {record.result && (
                  <div className="result">
                    <h4>返回结果</h4>
                    <pre>{typeof record.result === 'string' ? record.result : JSON.stringify(record.result, null, 2)}</pre>
                  </div>
                )}
                {record.error && (
                  <div className="error">
                    <h4>错误信息</h4>
                    <pre>{record.error}</pre>
                  </div>
                )}
              </div>
            )
          }}
        />
      </Card>
    </div>
  );
};