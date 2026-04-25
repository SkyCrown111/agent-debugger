import React from 'react';
import { Timeline, Tag } from 'antd';
import { BulbOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../stores/sessionStore';
import './ThoughtTimeline.css';

export const ThoughtTimeline: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { thoughts, toolCalls } = useSessionStore();

  // 合并并按时间排序
  const timeline = [...thoughts, ...toolCalls]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-20); // 只显示最近20条

  if (timeline.length === 0) {
    return (
      <div className="timeline-empty">
        <span>{isZh ? '等待 Agent 活动...' : 'Waiting for agent activity...'}</span>
      </div>
    );
  }

  return (
    <Timeline className="thought-timeline">
      {timeline.map((item) => {
        if ('toolName' in item) {
          // 工具调用
          const icon = item.status === 'success' 
            ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
            : item.status === 'error'
              ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              : <LoadingOutlined style={{ color: '#d97706' }} />;
          
          return (
            <Timeline.Item key={item.id} dot={icon} color={item.status === 'error' ? 'red' : 'green'}>
              <div className="timeline-item tool-call">
                <div className="header">
                  <Tag color="orange">{item.toolName}</Tag>
                  {item.duration && <span className="duration">{item.duration}ms</span>}
                </div>
                <div className="params">
                  <pre>{JSON.stringify(item.params, null, 2)}</pre>
                </div>
                {item.result && (
                  <div className="result">
                    <pre>{typeof item.result === 'string' ? item.result : JSON.stringify(item.result, null, 2)}</pre>
                  </div>
                )}
                {item.error && (
                  <div className="error">
                    <pre>{item.error}</pre>
                  </div>
                )}
              </div>
            </Timeline.Item>
          );
        } else {
          // 思考
          const typeColor = item.type === 'reasoning' ? 'gold' : item.type === 'planning' ? 'cyan' : 'purple';
          
          return (
            <Timeline.Item key={item.id} dot={<BulbOutlined />} color="orange">
              <div className="timeline-item thought">
                <div className="header">
                  <Tag color={typeColor}>{item.type}</Tag>
                  {item.tokens && <span className="tokens">{item.tokens} tokens</span>}
                </div>
                <div className="content">{item.content}</div>
              </div>
            </Timeline.Item>
          );
        }
      })}
    </Timeline>
  );
};
