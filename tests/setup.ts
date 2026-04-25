/**
 * Vitest Setup
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Electron API
const mockElectronAPI = {
  // Window controls
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
  
  // Agent operations
  getAgents: vi.fn(() => Promise.resolve([])),
  
  // Session operations
  getSession: vi.fn(() => Promise.resolve(null)),
  getAllSessions: vi.fn(() => Promise.resolve([])),
  clearSession: vi.fn(() => Promise.resolve()),
  
  // Data operations
  exportData: vi.fn(() => Promise.resolve(null)),
  
  // Config operations
  getConfig: vi.fn(() => Promise.resolve({
    theme: 'dark',
    autoStart: true,
    port: 8765,
  })),
  setConfig: vi.fn(() => Promise.resolve()),
  
  // Event listeners
  onAgentConnected: vi.fn(),
  onAgentDisconnected: vi.fn(),
  onThought: vi.fn(),
  onToolCall: vi.fn(),
  onToolResult: vi.fn(),
  onTokenUsage: vi.fn(),
  onError: vi.fn(),
};

// Expose to global
(global as any).electronAPI = mockElectronAPI;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});