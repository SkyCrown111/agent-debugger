import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ThoughtFlow } from './pages/ThoughtFlow';
import { ToolTrace } from './pages/ToolTrace';
import { TokenAnalysis } from './pages/TokenAnalysis';
import { MessageLog } from './pages/MessageLog';
import { Settings } from './pages/Settings';
import MultiAgent from './pages/MultiAgent';
import ErrorDebug from './pages/ErrorDebug';
import SessionHistory from './pages/SessionHistory';
import { Performance } from './pages/Performance';
import { useAgentStore } from './stores/agentStore';
import { useSessionStore } from './stores/sessionStore';

const App: React.FC = () => {
  const { addAgent, removeAgent } = useAgentStore();
  const { addThought, addToolCall, updateToolCall, addTokenUsage, addError } = useSessionStore();

  // Store cleanup functions
  const cleanupFns = useRef<(() => void)[]>([]);

  useEffect(() => {
    // 监听 Agent 连接
    const unsub1 = window.electronAPI?.onAgentConnected((data) => {
      console.log('Agent connected:', data);
      addAgent(data);
    });
    if (unsub1) cleanupFns.current.push(unsub1);

    const unsub2 = window.electronAPI?.onAgentDisconnected((agentId) => {
      console.log('Agent disconnected:', agentId);
      removeAgent(agentId);
    });
    if (unsub2) cleanupFns.current.push(unsub2);

    // 监听思考
    const unsub3 = window.electronAPI?.onThought((data) => {
      addThought(data);
    });
    if (unsub3) cleanupFns.current.push(unsub3);

    // 监听工具调用
    const unsub4 = window.electronAPI?.onToolCall((data) => {
      addToolCall(data);
    });
    if (unsub4) cleanupFns.current.push(unsub4);

    const unsub5 = window.electronAPI?.onToolResult((data) => {
      updateToolCall(data.id, data);
    });
    if (unsub5) cleanupFns.current.push(unsub5);

    // 监听 Token 使用
    const unsub6 = window.electronAPI?.onTokenUsage((data) => {
      addTokenUsage(data);
    });
    if (unsub6) cleanupFns.current.push(unsub6);

    // 监听错误
    const unsub7 = window.electronAPI?.onError((data) => {
      addError(data);
    });
    if (unsub7) cleanupFns.current.push(unsub7);

    // 监听会话开始
    const unsub8 = window.electronAPI?.onSessionStart?.((data) => {
      console.log('Session started:', data);
    });
    if (unsub8) cleanupFns.current.push(unsub8);

    // 监听会话结束
    const unsub9 = window.electronAPI?.onSessionEnd?.((data) => {
      console.log('Session ended:', data);
    });
    if (unsub9) cleanupFns.current.push(unsub9);

    // Cleanup function
    return () => {
      cleanupFns.current.forEach(fn => fn());
      cleanupFns.current = [];
    };
  }, [addAgent, removeAgent, addThought, addToolCall, updateToolCall, addTokenUsage, addError]);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/thoughts" element={<ThoughtFlow />} />
          <Route path="/tools" element={<ToolTrace />} />
          <Route path="/tokens" element={<TokenAnalysis />} />
          <Route path="/sessions" element={<SessionHistory />} />
          <Route path="/multi-agent" element={<MultiAgent />} />
          <Route path="/errors" element={<ErrorDebug />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/logs" element={<MessageLog />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
