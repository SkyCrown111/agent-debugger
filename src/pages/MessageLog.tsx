import React from 'react';
import { Card, Empty } from 'antd';
import { useSessionStore } from '../../stores/sessionStore';
import './MessageLog.css';

export const MessageLog: React.FC = () => {
  const { thoughts, toolCalls, tokenUsages, errors } = useSessionStore();

  // 合并所有消息
  const allMessages = [
    ...thoughts.map(t => ({ ...t, category: 'thought' })),
    ...toolCalls.map(t => ({ ...t, category: 'tool' })),
    ...tokenUsages.map(t => ({ ...t, category: 'token' })),
    ...errors.map(e => ({ ...e, category: 'error' }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (allMessages.length === 0) {
    return (
      <div className="message-log-page">
        <Empty description="暂无消息记录" />
      </div>
    );
  }

  return (
    <div className="message-log-page">
      <Card title={`消息日志 (${allMessages.length})`} className="log-card">
        <div className="message-list">
          {allMessages.map((msg, index) => (
            <div key={index} className={`message-item ${msg.category}`}>
              <div className="message-header">
                <span className="category">{msg.category}</span>
                <span className="time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="message-content">
                <pre>{JSON.stringify(msg, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};