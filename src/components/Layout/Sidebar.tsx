import React from 'react';
import { Menu } from 'antd';
import {
  DashboardOutlined,
  BulbOutlined,
  ToolOutlined,
  BarChartOutlined,
  FileTextOutlined,
  TeamOutlined,
  BugOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AgentList } from '../AgentList/AgentList';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: t('common.dashboard') },
    { key: '/thoughts', icon: <BulbOutlined />, label: t('common.thoughtFlow') },
    { key: '/tools', icon: <ToolOutlined />, label: t('common.toolTrace') },
    { key: '/tokens', icon: <BarChartOutlined />, label: t('common.tokenAnalysis') },
    { key: '/sessions', icon: <HistoryOutlined />, label: t('common.sessionHistory') },
    { key: '/multi-agent', icon: <TeamOutlined />, label: t('common.multiAgent') },
    { key: '/errors', icon: <BugOutlined />, label: t('common.errorDebug') },
    { key: '/performance', icon: <ThunderboltOutlined />, label: t('common.performance') },
    { key: '/logs', icon: <FileTextOutlined />, label: t('common.messageLog') },
    { key: '/settings', icon: <SettingOutlined />, label: t('common.settings') },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-menu">
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }: { key: string }) => navigate(key)}
        />
      </div>
      <div className="sidebar-agents">
        <div className="agents-header">
          <span>{t('sidebar.connection')}</span>
        </div>
        <AgentList />
      </div>
    </div>
  );
};
