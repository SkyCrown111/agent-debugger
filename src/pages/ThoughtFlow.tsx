import React from 'react';
import { Card, Empty } from 'antd';
import { useSessionStore } from '../../stores/sessionStore';
import { ThoughtTimeline } from '../../components/ThoughtTimeline/ThoughtTimeline';
import './ThoughtFlow.css';

export const ThoughtFlow: React.FC = () => {
  const { thoughts } = useSessionStore();

  if (thoughts.length === 0) {
    return (
      <div className="thought-flow-page">
        <Empty description="暂无思考记录" />
      </div>
    );
  }

  return (
    <div className="thought-flow-page">
      <Card title={`思考记录 (${thoughts.length})`} className="thought-card">
        <ThoughtTimeline />
      </Card>
    </div>
  );
};