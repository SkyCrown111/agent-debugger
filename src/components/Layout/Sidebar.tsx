import React from 'react';
import { Menu } from 'antd';
import { 
  DashboardOutlined, 
  BulbOutlined, 
  ToolOutlined, 
  BarChartOutlined,
  FileTextOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { AgentList } from '../AgentList/AgentList';
import './Sidebar.css';

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/thoughts', icon: <BulbOutlined />, label: '思考流' },
  { key: '/tools', icon: <ToolOutlined />, label: '工具调用' },
  { key: '/tokens', icon: <BarChartOutlined />, label: 'Token分析' },
  { key: '/logs', icon: <FileTextOutlined />, label: '消息日志' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="sidebar-menu">
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </div>
      <div className="sidebar-agents">
        <div className="agents-header">
          <span>连接的 Agent</span>
        </div>
        <AgentList />
      </div>
    </div>
  );
};