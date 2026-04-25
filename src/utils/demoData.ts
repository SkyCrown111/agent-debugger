/**
 * 演示数据生成器
 * 用于在没有实际 Agent 连接时展示功能
 */

import { v4 as uuidv4 } from 'uuid';

// 思考类型
type ThoughtType = 'reasoning' | 'planning' | 'reflection';

// 工具调用状态
type ToolStatus = 'pending' | 'success' | 'error';

// 思考数据接口
export interface DemoThought {
  id: string;
  agentId: string;
  timestamp: string;
  content: string;
  type: ThoughtType;
  duration?: number;
  tokens?: number;
}

// 工具调用数据接口
export interface DemoToolCall {
  id: string;
  agentId: string;
  timestamp: string;
  toolName: string;
  params: Record<string, any>;
  result?: any;
  status: ToolStatus;
  duration?: number;
  error?: string;
}

// Token 使用数据接口
export interface DemoTokenUsage {
  id: string;
  agentId: string;
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

// 示例思考内容
const THOUGHT_TEMPLATES = {
  reasoning: [
    '分析用户请求，识别核心意图...',
    '正在评估可能的解决方案...',
    '检查数据完整性和一致性...',
    '分析上下文信息，提取关键实体...',
    '推理用户真实需求，考虑隐含意图...',
    '评估多个候选答案的准确性...',
    '分析历史对话，理解用户偏好...',
    '检查约束条件，筛选可行方案...',
  ],
  planning: [
    '制定执行计划：1. 搜索相关信息 2. 分析数据 3. 生成回答',
    '规划工具调用顺序，优化执行效率...',
    '设计多步骤解决方案，考虑边界情况...',
    '安排并行任务，提高处理速度...',
    '制定错误恢复策略，确保任务完成...',
    '规划数据流向，确定处理节点...',
    '设计递归搜索策略，覆盖所有可能性...',
    '安排验证步骤，确保结果准确性...',
  ],
  reflection: [
    '反思执行过程，发现可以优化的地方...',
    '评估结果质量，符合预期标准',
    '总结本次任务的经验教训...',
    '检查是否有遗漏的信息或步骤...',
    '评估资源使用效率，寻找改进空间...',
    '反思决策过程，验证逻辑正确性...',
    '总结工具调用效果，优化未来策略...',
    '评估用户满意度，改进服务方式...',
  ],
};

// 示例工具名称
const TOOL_NAMES = [
  'web_search',
  'database_query',
  'file_read',
  'api_call',
  'code_execute',
  'image_analyze',
  'text_embed',
  'llm_generate',
  'data_transform',
  'cache_lookup',
];

// 示例模型名称
const MODELS = [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku',
  'claude-3.5-sonnet',
];

// 生成随机时间戳（最近 N 分钟内）
function generateTimestamp(minutesAgo: number = 10): string {
  const now = new Date();
  const randomMs = Math.random() * minutesAgo * 60 * 1000;
  return new Date(now.getTime() - randomMs).toISOString();
}

// 生成随机持续时间
function generateDuration(min: number = 50, max: number = 3000): number {
  // 80% 的调用在正常范围内，20% 可能是慢调用
  if (Math.random() < 0.8) {
    return Math.floor(Math.random() * (max - min) / 2 + min);
  }
  return Math.floor(Math.random() * (max - min) + min);
}

// 生成随机 Token 数量
function generateTokens(min: number = 50, max: number = 2000): number {
  return Math.floor(Math.random() * (max - min) + min);
}

// 生成思考数据
export function generateThought(index: number): DemoThought {
  const types: ThoughtType[] = ['reasoning', 'planning', 'reflection'];
  const type = types[index % 3];
  const templates = THOUGHT_TEMPLATES[type];
  const content = templates[Math.floor(Math.random() * templates.length)];
  
  return {
    id: uuidv4(),
    agentId: 'demo-agent',
    timestamp: generateTimestamp(5),
    content,
    type,
    duration: generateDuration(100, 500),
    tokens: generateTokens(50, 500),
  };
}

// 生成工具调用数据
export function generateToolCall(index: number): DemoToolCall {
  const toolName = TOOL_NAMES[index % TOOL_NAMES.length];
  const isSuccess = Math.random() > 0.1; // 90% 成功率
  const isSlow = Math.random() < 0.15; // 15% 慢调用
  
  const params: Record<string, any> = {};
  switch (toolName) {
    case 'web_search':
      params.query = 'AI news latest updates';
      params.limit = 10;
      break;
    case 'database_query':
      params.sql = 'SELECT * FROM users WHERE active = true';
      params.timeout = 5000;
      break;
    case 'file_read':
      params.path = '/data/config.json';
      params.encoding = 'utf-8';
      break;
    case 'api_call':
      params.endpoint = 'https://api.example.com/data';
      params.method = 'GET';
      break;
    case 'code_execute':
      params.code = 'result = sum(range(100))';
      params.language = 'python';
      break;
    case 'image_analyze':
      params.imageUrl = 'https://example.com/image.jpg';
      params.tasks = ['ocr', 'classification'];
      break;
    case 'text_embed':
      params.text = 'Sample text for embedding';
      params.model = 'text-embedding-ada-002';
      break;
    case 'llm_generate':
      params.prompt = 'Explain quantum computing in simple terms';
      params.maxTokens = 500;
      break;
    case 'data_transform':
      params.input = { data: [1, 2, 3] };
      params.transform = 'map(x => x * 2)';
      break;
    case 'cache_lookup':
      params.key = 'user_session_12345';
      params.ttl = 3600;
      break;
  }
  
  const result = isSuccess ? {
    success: true,
    data: `Result from ${toolName}`,
    timestamp: new Date().toISOString(),
  } : undefined;
  
  const error = !isSuccess ? `${toolName} failed: Connection timeout` : undefined;
  
  return {
    id: uuidv4(),
    agentId: 'demo-agent',
    timestamp: generateTimestamp(5),
    toolName,
    params,
    result,
    status: isSuccess ? 'success' : 'error',
    duration: isSlow ? generateDuration(1500, 3000) : generateDuration(50, 800),
    error,
  };
}

// 生成 Token 使用数据
export function generateTokenUsage(index: number): DemoTokenUsage {
  const model = MODELS[index % MODELS.length];
  
  // 根据模型调整 Token 范围
  let inputRange = [100, 1000];
  let outputRange = [50, 500];
  
  if (model.includes('gpt-4')) {
    inputRange = [200, 2000];
    outputRange = [100, 1000];
  } else if (model.includes('haiku')) {
    inputRange = [50, 500];
    outputRange = [30, 300];
  }
  
  return {
    id: uuidv4(),
    agentId: 'demo-agent',
    timestamp: generateTimestamp(5),
    inputTokens: generateTokens(inputRange[0], inputRange[1]),
    outputTokens: generateTokens(outputRange[0], outputRange[1]),
    model,
  };
}

// 生成完整的演示数据集
export function generateDemoData(options: {
  thoughtCount?: number;
  toolCallCount?: number;
  tokenUsageCount?: number;
} = {}): {
  thoughts: DemoThought[];
  toolCalls: DemoToolCall[];
  tokenUsages: DemoTokenUsage[];
} {
  const {
    thoughtCount = 15,
    toolCallCount = 12,
    tokenUsageCount = 10,
  } = options;
  
  const thoughts: DemoThought[] = [];
  const toolCalls: DemoToolCall[] = [];
  const tokenUsages: DemoTokenUsage[] = [];
  
  // 生成思考数据
  for (let i = 0; i < thoughtCount; i++) {
    thoughts.push(generateThought(i));
  }
  
  // 生成工具调用数据
  for (let i = 0; i < toolCallCount; i++) {
    toolCalls.push(generateToolCall(i));
  }
  
  // 生成 Token 使用数据
  for (let i = 0; i < tokenUsageCount; i++) {
    tokenUsages.push(generateTokenUsage(i));
  }
  
  // 按时间排序
  thoughts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  toolCalls.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  tokenUsages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  return { thoughts, toolCalls, tokenUsages };
}

// 模拟实时数据流
export class DemoDataStreamer {
  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: {
    onThought?: (thought: DemoThought) => void;
    onToolCall?: (toolCall: DemoToolCall) => void;
    onTokenUsage?: (usage: DemoTokenUsage) => void;
  } = {};
  
  private thoughtIndex = 0;
  private toolCallIndex = 0;
  private tokenUsageIndex = 0;
  
  on(event: 'thought' | 'toolCall' | 'tokenUsage', callback: (data: any) => void) {
    if (event === 'thought') this.callbacks.onThought = callback;
    if (event === 'toolCall') this.callbacks.onToolCall = callback;
    if (event === 'tokenUsage') this.callbacks.onTokenUsage = callback;
  }
  
  start(intervalMs: number = 2000) {
    this.stop();
    
    this.intervalId = setInterval(() => {
      // 随机决定发送哪种数据
      const rand = Math.random();
      
      if (rand < 0.4) {
        // 40% 概率发送思考
        const thought = generateThought(this.thoughtIndex++);
        thought.timestamp = new Date().toISOString();
        this.callbacks.onThought?.(thought);
      } else if (rand < 0.8) {
        // 40% 概率发送工具调用
        const toolCall = generateToolCall(this.toolCallIndex++);
        toolCall.timestamp = new Date().toISOString();
        this.callbacks.onToolCall?.(toolCall);
      } else {
        // 20% 概率发送 Token 使用
        const usage = generateTokenUsage(this.tokenUsageIndex++);
        usage.timestamp = new Date().toISOString();
        this.callbacks.onTokenUsage?.(usage);
      }
    }, intervalMs);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  isRunning(): boolean {
    return this.intervalId !== null;
  }
}
