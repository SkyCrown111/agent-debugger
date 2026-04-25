import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Divider,
  message,
  Modal,
  Space,
  Alert,
  Descriptions,
  Tag,
  Popconfirm,
  Select,
  InputNumber,
  Tabs,
  List,
  Badge
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ApiOutlined,
  DatabaseOutlined,
  BellOutlined,
  SafetyOutlined,
  ExportOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../stores/sessionStore';
import { useAgentStore } from '../stores/agentStore';
import { useThemeStore, ThemeMode } from '../stores/themeStore';
import './Settings.css';

interface AppSettings {
  server: {
    port: number;
    host: string;
    autoStart: boolean;
  };
  display: {
    theme: 'dark' | 'light';
    language: 'zh-CN' | 'en-US';
    showTimestamp: boolean;
    compactMode: boolean;
  };
  notifications: {
    enabled: boolean;
    sound: boolean;
    errorAlert: boolean;
    toolCallAlert: boolean;
  };
  storage: {
    maxSessions: number;
    autoClear: boolean;
    clearAfterDays: number;
  };
  advanced: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableAnalytics: boolean;
    devMode: boolean;
  };
}

const defaultSettings: AppSettings = {
  server: {
    port: 8765,
    host: 'localhost',
    autoStart: true,
  },
  display: {
    theme: 'dark',
    language: 'zh-CN',
    showTimestamp: true,
    compactMode: false,
  },
  notifications: {
    enabled: true,
    sound: false,
    errorAlert: true,
    toolCallAlert: false,
  },
  storage: {
    maxSessions: 100,
    autoClear: true,
    clearAfterDays: 7,
  },
  advanced: {
    logLevel: 'info',
    enableAnalytics: false,
    devMode: false,
  },
};

export const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('server');

  const { t, i18n } = useTranslation();
  const { clearAll, sessions, thoughts, toolCalls, tokenUsages, errors } = useSessionStore();
  const { agents, clearAgents } = useAgentStore();
  const { mode: themeMode, setMode: setThemeMode, language, setLanguage } = useThemeStore();

  // 加载设置
  useEffect(() => {
    const saved = localStorage.getItem('agent-debugger-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
        form.setFieldsValue({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    } else {
      form.setFieldsValue(defaultSettings);
    }
  }, [form]);

  // 保存设置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // 保存到 localStorage
      localStorage.setItem('agent-debugger-settings', JSON.stringify(values));
      
      // 通过 IPC 保存到 Electron Store
      if (window.electronAPI?.setConfig) {
        await window.electronAPI.setConfig(values);
      }
      
      setSettings(values);
      message.success('设置已保存');
    } catch (error) {
      message.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 重置设置
  const handleReset = () => {
    Modal.confirm({
      title: '确认重置',
      content: '确定要恢复默认设置吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        form.setFieldsValue(defaultSettings);
        setSettings(defaultSettings);
        localStorage.setItem('agent-debugger-settings', JSON.stringify(defaultSettings));
        message.success('已恢复默认设置');
      }
    });
  };

  // 清除所有数据
  const handleClearAllData = () => {
    Modal.confirm({
      title: '⚠️ 危险操作',
      content: '确定要清除所有数据吗？包括所有会话、思考记录、工具调用记录等。此操作不可恢复！',
      okText: '确认清除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        clearAll();
        clearAgents();
        localStorage.removeItem('agent-debugger-sessions');
        localStorage.removeItem('agent-debugger-thoughts');
        localStorage.removeItem('agent-debugger-toolcalls');
        localStorage.removeItem('agent-debugger-tokens');
        localStorage.removeItem('agent-debugger-errors');
        message.success('所有数据已清除');
      }
    });
  };

  // 导出数据
  const handleExportData = () => {
    const data = {
      settings,
      sessions,
      thoughts,
      toolCalls,
      tokenUsages,
      errors,
      agents,
      exportTime: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-debugger-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('数据已导出');
  };

  // 存储统计
  const storageStats = {
    sessions: sessions.length,
    thoughts: thoughts.length,
    toolCalls: toolCalls.length,
    tokenUsages: tokenUsages.length,
    errors: errors.length,
    agents: agents.length,
  };

  const totalRecords = Object.values(storageStats).reduce((a, b) => a + b, 0);

  return (
    <div className="settings-page">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabPosition="left"
        className="settings-tabs"
        items={[
          {
            key: 'server',
            label: (
              <span>
                <ApiOutlined /> {t('settings.server') || '服务器配置'}
              </span>
            ),
            children: (
              <Card title={t('settings.server') || '服务器配置'} className="settings-card">
                <Form form={form} layout="vertical" name="server-settings">
                  <Form.Item name={['server', 'host']} label={t('settings.host') || '服务器地址'}>
                    <Input placeholder="localhost" />
                  </Form.Item>
                  <Form.Item name={['server', 'port']} label={t('settings.port') || '端口'}>
                    <InputNumber min={1024} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name={['server', 'autoStart']}
                    label={t('settings.autoStart') || '自动启动服务器'}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Form>
                <Alert
                  message="服务器地址用于接收 Agent SDK 发送的调试数据"
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              </Card>
            ),
          },
          {
            key: 'display',
            label: (
              <span>
                <SettingOutlined /> {t('settings.appearance')}
              </span>
            ),
            children: (
              <Card title={t('settings.appearance')} className="settings-card">
                <Form form={form} layout="vertical" name="display-settings">
                  <Form.Item label={t('settings.theme')}>
                    <Select
                      value={themeMode}
                      onChange={(value: ThemeMode) => setThemeMode(value)}
                      options={[
                        { label: t('settings.darkTheme'), value: 'dark' },
                        { label: t('settings.lightTheme'), value: 'light' },
                        { label: t('settings.systemTheme'), value: 'system' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item label={t('settings.language')}>
                    <Select
                      value={language}
                      onChange={(value: 'en' | 'zh') => {
                        setLanguage(value);
                        i18n.changeLanguage(value);
                      }}
                      options={[
                        { label: '简体中文', value: 'zh' },
                        { label: 'English', value: 'en' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    name={['display', 'showTimestamp']}
                    label={t('common.showTimestamp') || '显示时间戳'}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name={['display', 'compactMode']}
                    label="紧凑模式"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'notifications',
            label: (
              <span>
                <BellOutlined /> {t('settings.notifications')}
              </span>
            ),
            children: (
              <Card title={t('settings.notifications')} className="settings-card">
                <Form form={form} layout="vertical" name="notification-settings">
                  <Form.Item
                    name={['notifications', 'enabled']}
                    label={t('settings.enableNotifications')}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name={['notifications', 'sound']}
                    label={t('settings.notificationSound')}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name={['notifications', 'errorAlert']}
                    label={t('settings.errorAlert')}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name={['notifications', 'toolCallAlert']}
                    label={t('settings.toolCallAlert')}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'storage',
            label: (
              <span>
                <DatabaseOutlined /> {t('settings.storageManagement')}
              </span>
            ),
            children: (
              <Card title={t('settings.storageManagement')} className="settings-card">
                <div className="storage-stats">
                  <h4>{t('settings.dataStats')}</h4>
                  <List
                    grid={{ column: 3 }}
                    dataSource={[
                      { title: t('sessionHistory.title'), count: storageStats.sessions },
                      { title: t('thoughtFlow.thoughts'), count: storageStats.thoughts },
                      { title: t('toolTrace.toolName'), count: storageStats.toolCalls },
                      { title: 'Token', count: storageStats.tokenUsages },
                      { title: t('errorDebug.title'), count: storageStats.errors },
                      { title: 'Agent', count: storageStats.agents },
                    ]}
                    renderItem={(item) => (
                      <List.Item>
                        <div className="stat-item">
                          <span className="stat-title">{item.title}</span>
                          <Badge count={item.count} showZero color="#d97706" />
                        </div>
                      </List.Item>
                    )}
                  />
                  <Divider />
                  <p>{t('common.total')}: <strong>{totalRecords}</strong></p>
                </div>

                <Divider>{t('settings.storage')}</Divider>

                <Form form={form} layout="vertical" name="storage-settings">
                  <Form.Item name={['storage', 'maxSessions']} label={t('settings.maxSessions')}>
                    <InputNumber min={10} max={1000} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name={['storage', 'autoClear']}
                    label={t('settings.autoClear')}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item name={['storage', 'clearAfterDays']} label={t('settings.clearAfterDays')}>
                    <InputNumber min={1} max={30} addonAfter={language === 'zh' ? '天前' : ' days'} style={{ width: '100%' }} />
                  </Form.Item>
                </Form>

                <Divider>{t('settings.data')}</Divider>

                <Space>
                  <Button icon={<ExportOutlined />} onClick={handleExportData}>
                    {t('settings.exportData')}
                  </Button>
                  <Popconfirm
                    title={language === 'zh' ? '确定要清除所有数据吗？' : 'Are you sure to clear all data?'}
                    onConfirm={handleClearAllData}
                    okText={t('common.confirm')}
                    cancelText={t('common.cancel')}
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      {t('settings.clearCache')}
                    </Button>
                  </Popconfirm>
                </Space>
              </Card>
            ),
          },
          {
            key: 'advanced',
            label: (
              <span>
                <SafetyOutlined /> {t('settings.advanced')}
              </span>
            ),
            children: (
              <Card title={t('settings.advanced')} className="settings-card">
                <Form form={form} layout="vertical" name="advanced-settings">
                  <Form.Item name={['advanced', 'logLevel']} label={t('settings.logLevel')}>
                    <Select
                      options={[
                        { label: 'Debug', value: 'debug' },
                        { label: 'Info', value: 'info' },
                        { label: 'Warning', value: 'warn' },
                        { label: 'Error', value: 'error' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    name={['advanced', 'enableAnalytics']}
                    label={t('settings.enableAnalytics')}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name={['advanced', 'devMode']}
                    label={t('settings.devMode')}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Form>

                <Alert
                  message={language === 'zh' ? '开发者模式将显示更多调试信息和原始数据' : 'Developer mode will show more debug info and raw data'}
                  type="warning"
                  showIcon
                />
              </Card>
            ),
          },
        ]}
      />

      {/* 底部操作栏 */}
      <div className="settings-footer">
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            {t('settings.resetDefault')}
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSave}>
            {t('settings.saveSettings')}
          </Button>
        </Space>
      </div>
    </div>
  );
};
