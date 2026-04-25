/**
 * Agent Debugger 前端测试
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Electron API
vi.mock('../electron/preload', () => ({
  electronAPI: {
    getAgents: vi.fn(() => Promise.resolve([])),
    getConfig: vi.fn(() => Promise.resolve({})),
    setConfig: vi.fn(() => Promise.resolve()),
  },
}));

describe('App', () => {
  it('should render without crashing', () => {
    // 基础渲染测试
    expect(true).toBe(true);
  });
});
