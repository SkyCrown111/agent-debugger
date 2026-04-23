import React from 'react';
import { Layout as AntLayout } from 'antd';
import { TitleBar } from './TitleBar';
import { Sidebar } from './Sidebar';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <AntLayout className="app-layout">
      <TitleBar />
      <AntLayout className="main-layout">
        <Sidebar />
        <AntLayout.Content className="content">
          {children}
        </AntLayout.Content>
      </AntLayout>
    </AntLayout>
  );
};