import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import App from './App';
import './styles/global.css';
import './i18n';
import { useThemeStore } from './stores/themeStore';

// Claude Design Theme Tokens
const getThemeConfig = (isDark: boolean) => ({
  algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: '#d97706',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#22d3ee',
    borderRadius: 10,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    Button: {
      primaryShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
    },
    Card: {
      borderRadiusLG: 14,
    },
    Input: {
      borderRadius: 10,
    },
    Select: {
      borderRadius: 10,
    },
    Modal: {
      borderRadiusLG: 20,
    },
  },
});

// Theme Provider Component
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getEffectiveTheme } = useThemeStore();
  const effectiveTheme = getEffectiveTheme();
  const isDark = effectiveTheme === 'dark';

  return (
    <ConfigProvider theme={getThemeConfig(isDark)}>
      {children}
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
