import React, { useState } from 'react';
import {
  Modal,
  Button,
  Select,
  Checkbox,
  Space,
  message,
  Divider,
  Typography,
  Card,
  Row,
  Col,
  Progress,
} from 'antd';
import {
  DownloadOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  FileMarkdownOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useSessionStore } from '../../stores/sessionStore';
import { useAgentStore } from '../../stores/agentStore';

const { Text } = Typography;

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ open, onClose }) => {
  const { thoughts, toolCalls, tokenUsages, errors } = useSessionStore();
  const { agents } = useAgentStore();
  
  const [format, setFormat] = useState<string>('json');
  const [selectedData, setSelectedData] = useState<string[]>([
    'thoughts',
    'toolCalls',
    'tokenUsages',
    'errors',
  ]);
  const [exporting, setExporting] = useState(false);

  // 导出数据统计
  const dataStats = {
    thoughts: thoughts.length,
    toolCalls: toolCalls.length,
    tokenUsages: tokenUsages.length,
    errors: errors.length,
    agents: agents.length,
  };

  // 导出选项
  const exportOptions = [
    { label: '思考记录', value: 'thoughts', count: dataStats.thoughts },
    { label: '工具调用', value: 'toolCalls', count: dataStats.toolCalls },
    { label: 'Token 使用', value: 'tokenUsages', count: dataStats.tokenUsages },
    { label: '错误日志', value: 'errors', count: dataStats.errors },
  ];

  // 格式化导出数据
  const formatExportData = () => {
    const data: any = {
      exportTime: new Date().toISOString(),
      agents: agents,
    };

    if (selectedData.includes('thoughts')) {
      data.thoughts = thoughts;
    }
    if (selectedData.includes('toolCalls')) {
      data.toolCalls = toolCalls;
    }
    if (selectedData.includes('tokenUsages')) {
      data.tokenUsages = tokenUsages;
    }
    if (selectedData.includes('errors')) {
      data.errors = errors;
    }

    return data;
  };

  // 导出为 JSON
  const exportAsJSON = () => {
    const data = formatExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    downloadFile(blob, `agent-debug-${Date.now()}.json`);
  };

  // 导出为 CSV
  const exportAsCSV = () => {
    const data = formatExportData();
    let csv = '';
    
    // 导出思考记录
    if (data.thoughts && data.thoughts.length > 0) {
      csv += '### Thoughts\n';
      csv += 'ID,Agent ID,Timestamp,Type,Content\n';
      data.thoughts.forEach((t: any) => {
        csv += `"${t.id}","${t.agentId}","${t.timestamp}","${t.type}","${t.content?.replace(/"/g, '""')}"\n`;
      });
      csv += '\n';
    }
    
    // 导出工具调用
    if (data.toolCalls && data.toolCalls.length > 0) {
      csv += '### Tool Calls\n';
      csv += 'ID,Agent ID,Timestamp,Tool Name,Status,Duration\n';
      data.toolCalls.forEach((t: any) => {
        csv += `"${t.id}","${t.agentId}","${t.timestamp}","${t.toolName}","${t.status}","${t.duration || 0}"\n`;
      });
      csv += '\n';
    }
    
    // 导出 Token 使用
    if (data.tokenUsages && data.tokenUsages.length > 0) {
      csv += '### Token Usage\n';
      csv += 'ID,Agent ID,Timestamp,Input Tokens,Output Tokens,Model\n';
      data.tokenUsages.forEach((t: any) => {
        csv += `"${t.id}","${t.agentId}","${t.timestamp}","${t.inputTokens}","${t.outputTokens}","${t.model}"\n`;
      });
      csv += '\n';
    }
    
    // 导出错误
    if (data.errors && data.errors.length > 0) {
      csv += '### Errors\n';
      csv += 'ID,Agent ID,Timestamp,Error Type,Message\n';
      data.errors.forEach((e: any) => {
        csv += `"${e.id}","${e.agentId}","${e.timestamp}","${e.errorType}","${e.message?.replace(/"/g, '""')}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadFile(blob, `agent-debug-${Date.now()}.csv`);
  };

  // 导出为 Markdown
  const exportAsMarkdown = () => {
    const data = formatExportData();
    let md = `# Agent Debugger 导出报告\n\n`;
    md += `导出时间: ${new Date().toLocaleString()}\n\n`;
    
    // Agent 信息
    md += `## 连接的 Agent\n\n`;
    if (data.agents && data.agents.length > 0) {
      md += `| ID | 名称 | 状态 |\n`;
      md += `|---|---|---|\n`;
      data.agents.forEach((a: any) => {
        md += `| ${a.id} | ${a.name} | ${a.status || 'connected'} |\n`;
      });
      md += '\n';
    } else {
      md += `暂无连接的 Agent\n\n`;
    }
    
    // 思考记录
    if (data.thoughts && data.thoughts.length > 0) {
      md += `## 思考记录\n\n`;
      data.thoughts.forEach((t: any) => {
        md += `### ${t.type || 'thought'} - ${new Date(t.timestamp).toLocaleString()}\n\n`;
        md += `${t.content}\n\n`;
        if (t.tokens) {
          md += `> Tokens: ${t.tokens}\n\n`;
        }
      });
    }
    
    // 工具调用
    if (data.toolCalls && data.toolCalls.length > 0) {
      md += `## 工具调用\n\n`;
      md += `| 工具名称 | 状态 | 耗时 |\n`;
      md += `|---|---|---|\n`;
      data.toolCalls.forEach((t: any) => {
        md += `| ${t.toolName} | ${t.status} | ${t.duration || 0}ms |\n`;
      });
      md += '\n';
    }
    
    // Token 使用统计
    if (data.tokenUsages && data.tokenUsages.length > 0) {
      const totalInput = data.tokenUsages.reduce((sum: number, t: any) => sum + t.inputTokens, 0);
      const totalOutput = data.tokenUsages.reduce((sum: number, t: any) => sum + t.outputTokens, 0);
      
      md += `## Token 使用统计\n\n`;
      md += `- **输入 Token**: ${totalInput.toLocaleString()}\n`;
      md += `- **输出 Token**: ${totalOutput.toLocaleString()}\n`;
      md += `- **总计**: ${(totalInput + totalOutput).toLocaleString()}\n\n`;
    }
    
    // 错误日志
    if (data.errors && data.errors.length > 0) {
      md += `## 错误日志\n\n`;
      data.errors.forEach((e: any) => {
        md += `### ${e.errorType}\n\n`;
        md += `**时间**: ${new Date(e.timestamp).toLocaleString()}\n\n`;
        md += `**消息**: ${e.message}\n\n`;
        if (e.stackTrace) {
          md += `\`\`\`\n${e.stackTrace}\n\`\`\`\n\n`;
        }
      });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    downloadFile(blob, `agent-debug-${Date.now()}.md`);
  };

  // 下载文件
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success(`已导出: ${filename}`);
  };

  // 复制到剪贴板
  const copyToClipboard = async () => {
    const data = formatExportData();
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    message.success('已复制到剪贴板');
  };

  // 执行导出
  const handleExport = async () => {
    if (selectedData.length === 0) {
      message.warning('请至少选择一项数据');
      return;
    }

    setExporting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟处理
      
      switch (format) {
        case 'json':
          exportAsJSON();
          break;
        case 'csv':
          exportAsCSV();
          break;
        case 'markdown':
          exportAsMarkdown();
          break;
      }
      
      onClose();
    } catch (error) {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      title="导出数据"
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="copy" icon={<CopyOutlined />} onClick={copyToClipboard}>
          复制到剪贴板
        </Button>,
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<DownloadOutlined />}
          loading={exporting}
          onClick={handleExport}
        >
          导出
        </Button>,
      ]}
    >
      {/* 数据统计 */}
      <Card size="small" className="export-stats-card">
        <Row gutter={16}>
          {exportOptions.map(opt => (
            <Col span={6} key={opt.value}>
              <div className="stat-item">
                <Text type="secondary">{opt.label}</Text>
                <Text strong style={{ fontSize: 18 }}>{opt.count}</Text>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      <Divider />

      {/* 导出格式 */}
      <div className="export-section">
        <Text strong>导出格式</Text>
        <Select
          value={format}
          onChange={setFormat}
          style={{ width: '100%', marginTop: 8 }}
          options={[
            { value: 'json', label: 'JSON - 完整数据结构' },
            { value: 'csv', label: 'CSV - 表格格式' },
            { value: 'markdown', label: 'Markdown - 文档格式' },
          ]}
        />
      </div>

      <Divider />

      {/* 选择数据 */}
      <div className="export-section">
        <Text strong>选择导出内容</Text>
        <div style={{ marginTop: 8 }}>
          <Checkbox.Group
            value={selectedData}
            onChange={(values) => setSelectedData(values as string[])}
            style={{ width: '100%' }}
          >
            <Row gutter={[16, 8]}>
              {exportOptions.map(opt => (
                <Col span={12} key={opt.value}>
                  <Checkbox value={opt.value}>
                    {opt.label} ({opt.count})
                  </Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </div>
      </div>

      <Divider />

      {/* 格式预览 */}
      <div className="export-section">
        <Text strong>格式说明</Text>
        <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.65)' }}>
          {format === 'json' && (
            <Text type="secondary">
              JSON 格式包含完整的数据结构，适合程序处理和数据迁移。
            </Text>
          )}
          {format === 'csv' && (
            <Text type="secondary">
              CSV 格式适合在 Excel 或其他表格软件中查看和分析。
            </Text>
          )}
          {format === 'markdown' && (
            <Text type="secondary">
              Markdown 格式生成可读性强的报告文档，适合分享和存档。
            </Text>
          )}
        </div>
      </div>
    </Modal>
  );
};

// 导出按钮组件
export const ExportButton: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { thoughts, toolCalls, tokenUsages, errors } = useSessionStore();
  
  const hasData = thoughts.length > 0 || toolCalls.length > 0 || 
                  tokenUsages.length > 0 || errors.length > 0;

  return (
    <>
      <Button
        icon={<DownloadOutlined />}
        onClick={() => setModalOpen(true)}
        disabled={!hasData}
      >
        导出数据
      </Button>
      <ExportModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};