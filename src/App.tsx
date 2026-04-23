import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ThoughtFlow } from './pages/ThoughtFlow';
import { ToolTrace } from './pages/ToolTrace';
import { TokenAnalysis } from './pages/TokenAnalysis';
import { MessageLog } from './pages/MessageLog';
import { Settings } from './pages/Settings';
import { useAgentStore } from './stores/agentStore';
import { useSessionStore } from './stores/sessionStore';

declare global {
  interface Window {
    electronAPI: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      getAgents: () => Promise<any[]>;
      getSession: (sessionId: string) => Promise<any>;
      getSessions: () => Promise<any[]>;
      clearSession: (sessionId: string) => Promise<void>;
      exportData: (sessionId: string) => Promise<any>;
      onAgentConnected: (callback: (data: any) => void) => void;
      onAgentDisconnected: (callback: (agentId: string) => void) => void;
      onThought: (callback: (data: any) => void) => void;
      onToolCall: (callback: (data: any) => void) => void;
      onToolResult: (callback: (data: any) => void) => void;
      onTokenUsage: (callback: (data: any) => void) => void;
      onError: (callback: (data: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

const App: React.FC = () => {
  const { addAgent, removeAgent } = useAgentStore();
  const { addThought, addToolCall, updateToolCall, addTokenUsage, addError } = useSessionStore();

  useEffect(() => {
    // 监听 Agent 连接
    window.electronAPI.onAgentConnected((data) => {
      console.log('Agent connected:', data);
      addAgent(data);
    });

    window.electronAPI.onAgentDisconnected((agentId) => {
      console.log('Agent disconnected:', agentId);
      removeAgent(agentId);
    });

    // 监听思考
    window.electronAPI.onThought((data) => {
      addThought(data);
    });

    // 监听工具调用
    window.electronAPI.onToolCall((data) => {
      addToolCall(data);
    });

    window.electronAPI.onToolResult((data) => {
      updateToolCall(data.id, data);
    });

    // 监听 Token 使用
    window.electronAPI.onTokenUsage((data) => {
      addTokenUsage(data);
    });

    // 监听错误
    window.electronAPI.onError((data) => {
      addError(data);
    });

    return () => {
      window.electronAPI.removeAllListeners('agent:connected');
      window.electronAPI.removeAllListeners('agent:disconnected');
      window.electronAPI.removeAllListeners('thought');
      window.electronAPI.removeAllListeners('tool_call');
      window.electronAPI.removeAllListeners('tool_result');
      window.electronAPI.removeAllListeners('token_usage');
      window.electronAPI.removeAllListeners('error');
    };
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/thoughts" element={<ThoughtFlow />} />
          <Route path="/tools" element={<ToolTrace />} />
          <Route path="/tokens" element={<TokenAnalysis />} />
          <Route path="/logs" element={<MessageLog />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
