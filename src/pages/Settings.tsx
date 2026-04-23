import React from 'react';
import { Card, Form, Input, Switch, Button, Select, Divider } from 'antd';
import './Settings.css';

export const Settings: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('Settings saved:', values);
  };

  return (
    <div className="settings-page">
      <Card title="连接设置" className="settings-card">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="WebSocket 端口" name="wsPort" initialValue={8765}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label="自动连接" name="autoConnect" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Card>

      <Card title="显示设置" className="settings-card">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="主题" name="theme" initialValue="dark">
            <Select options={[
              { value: 'dark', label: '深色主题' },
              { value: 'light', label: '浅色主题' }
            ]} />
          </Form.Item>
          <Form.Item label="显示时间戳" name="showTimestamp" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item label="自动滚动" name="autoScroll" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Card>

      <Card title="数据设置" className="settings-card">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="最大记录数" name="maxRecords" initialValue={1000}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label="自动清理" name="autoClear" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
        </Form>
        <Divider />
        <Button type="primary" htmlType="submit">
          保存设置
        </Button>
        <Button danger style={{ marginLeft: 8 }}>
          清除所有数据
        </Button>
      </Card>
    </div>
  );
};