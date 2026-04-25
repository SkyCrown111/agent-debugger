/**
 * Agent Debugger TypeScript SDK 示例
 * 
 * 这个示例展示如何使用 TypeScript SDK 来追踪 Agent 的思考过程和工具调用
 */

import { AgentDebugger } from 'agent-debugger-sdk';

// 创建 debugger 实例
const debugger = new AgentDebugger({
  agentId: 'typescript-agent',
  serverUrl: 'ws://localhost:8765',
});

// ==================== 模拟工具函数 ====================

async function webSearch(query: string): Promise<any[]> {
  await sleep(random(100, 300));
  return [
    { title: `Result 1 for ${query}`, url: 'https://example.com/1' },
    { title: `Result 2 for ${query}`, url: 'https://example.com/2' },
    { title: `Result 3 for ${query}`, url: 'https://example.com/3' },
  ];
}

async function summarize(text: string): Promise<string> {
  await sleep(random(200, 500));
  return `Summary: ${text.slice(0, 50)}...`;
}

async function analyzeSentiment(text: string): Promise<{ sentiment: string; confidence: number }> {
  await sleep(random(100, 200));
  const sentiments = ['positive', 'negative', 'neutral'];
  return {
    sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
    confidence: random(70, 99) / 100,
  };
}

// ==================== Agent 主逻辑 ====================

async function runAgent(userQuery: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`用户查询: ${userQuery}`);
  console.log('='.repeat(60) + '\n');

  // Step 1: 分析用户意图
  await debugger.think({
    content: '分析用户查询，识别核心意图',
    type: 'reasoning',
  });
  console.log('✓ 识别意图: search_and_summarize');

  // Step 2: 规划执行步骤
  await debugger.think({
    content: '规划执行步骤',
    type: 'planning',
  });
  console.log('✓ 执行计划已制定');

  // Step 3: 执行搜索
  const results = await debugger.tool({
    toolName: 'web_search',
    params: { query: userQuery },
    execute: async () => await webSearch(userQuery),
  });
  console.log(`✓ 搜索完成，找到 ${results.length} 条结果`);

  // Step 4: 分析搜索结果
  await debugger.think({
    content: '分析搜索结果质量',
    type: 'reasoning',
  });
  console.log('✓ 分析完成');

  // Step 5: 对每个结果进行情感分析
  for (let i = 0; i < results.length; i++) {
    const sentiment = await debugger.tool({
      toolName: 'analyze_sentiment',
      params: { text: results[i].title },
      execute: async () => await analyzeSentiment(results[i].title),
    });
    console.log(`✓ 情感分析 ${i + 1}: ${sentiment.sentiment} (${sentiment.confidence.toFixed(2)})`);
  }

  // Step 6: 生成摘要
  const combinedText = results.map((r: any) => r.title).join(' ');
  const summary = await debugger.tool({
    toolName: 'summarize',
    params: { text: combinedText },
    execute: async () => await summarize(combinedText),
  });
  console.log('✓ 摘要生成完成');

  // Step 7: 反思执行过程
  await debugger.think({
    content: '反思执行过程，评估结果质量',
    type: 'reflection',
  });
  console.log('✓ 反思完成');

  // Step 8: 记录 Token 使用
  const totalInput = random(300, 500);
  const totalOutput = random(150, 300);
  debugger.tokens({
    inputTokens: totalInput,
    outputTokens: totalOutput,
    model: 'gpt-4',
  });
  console.log(`\n📊 Token 使用: 输入 ${totalInput}, 输出 ${totalOutput}`);

  return {
    query: userQuery,
    results,
    summary,
  };
}

// ==================== 辅助函数 ====================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==================== 主程序 ====================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  Agent Debugger 示例 - TypeScript Agent');
  console.log('='.repeat(60));
  console.log('\n请确保 Agent Debugger 桌面应用正在运行 (ws://localhost:8765)');
  console.log('按 Ctrl+C 退出\n');

  try {
    // 连接到 Agent Debugger
    await debugger.connect();
    console.log('✅ 已连接到 Agent Debugger\n');

    // 测试查询列表
    const queries = [
      'What are the latest AI breakthroughs?',
      'How does quantum computing work?',
      'Best practices for machine learning',
    ];

    for (const query of queries) {
      const result = await runAgent(query);
      console.log('\n' + '='.repeat(60));
      console.log(`最终答案: ${result.summary}`);
      console.log('='.repeat(60) + '\n');

      await sleep(2000); // 等待一段时间再处理下一个查询
    }

    console.log('\n✅ 所有查询处理完成！');
    console.log('请在 Agent Debugger 中查看完整的思考流和工具调用记录');
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    debugger.disconnect();
    console.log('✅ 已断开与 Agent Debugger 的连接');
  }
}

// 运行主程序
main().catch(console.error);
