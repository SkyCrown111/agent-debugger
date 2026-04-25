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
    <div className="app-container">
      <TitleBar />
      <div className="main-container">
        <Sidebar />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};