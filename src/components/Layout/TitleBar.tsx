import React from 'react';
import { Button } from 'antd';
import { MinusOutlined, BorderOutlined, CloseOutlined } from '@ant-design/icons';
import './TitleBar.css';

export const TitleBar: React.FC = () => {
  return (
    <div className="title-bar">
      <div className="title-bar-drag">
        <div className="logo">
          <span className="logo-icon">🔍</span>
          <span className="logo-text">Agent Debugger</span>
        </div>
      </div>
      <div className="title-bar-controls">
        <Button 
          type="text" 
          size="small" 
          icon={<MinusOutlined />}
          onClick={() => window.electronAPI?.minimizeWindow()}
        />
        <Button 
          type="text" 
          size="small" 
          icon={<BorderOutlined />}
          onClick={() => window.electronAPI?.maximizeWindow()}
        />
        <Button 
          type="text" 
          size="small" 
          icon={<CloseOutlined />}
          className="close-btn"
          onClick={() => window.electronAPI?.closeWindow()}
        />
      </div>
    </div>
  );
};