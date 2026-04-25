/**
 * Anthropic (Claude) Agent Example with Hermes SDK
 *
 * Run: npx ts-node examples/anthropic-example.ts
 */

import { HermesAnthropic, traceToolResult } from '../sdk/src/anthropic';
import type Anthropic from '@anthropic-ai/sdk';

// Mock tool for demonstration
const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: 'Get the current weather in a location',
    input_schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City and country, e.g. "Tokyo, Japan"',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'search_web',
    description: 'Search the web for information',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
      },
      required: ['query'],
    },
  },
];

// Mock tool implementations
async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));

  switch (name) {
    case 'get_weather':
      return {
        location: args.location,
        temperature: Math.round(15 + Math.random() * 20),
        condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
      };
    case 'search_web':
      return {
        results: [
          { title: `Result for "${args.query}"`, snippet: 'Sample content...' },
        ],
      };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function main() {
  console.log('🚀 Starting Claude Agent with Hermes SDK...\n');

  const anthropic = new HermesAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-demo',
    hermes: {
      agentName: 'Claude Assistant',
      debug: true,
    },
  });

  anthropic.hermesClient.startSession();
  console.log('📡 Connected to Hermes Debugger\n');

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: 'user', content: "What's the weather in Tokyo?" },
  ];

  try {
    // First call
    console.log('🤖 Asking Claude...\n');
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      tools,
      messages,
    });

    // Process tool uses
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        console.log(`💬 Claude says: ${block.text.slice(0, 100)}...`);
      } else if (block.type === 'tool_use') {
        console.log(`🔧 Tool call: ${block.name}(${JSON.stringify(block.input)})`);

        try {
          const result = await executeTool(block.name, block.input as Record<string, any>);
          console.log(`   ✓ Result: ${JSON.stringify(result)}`);

          const toolResult = traceToolResult(anthropic, block, result);
          toolResults.push(toolResult);
        } catch (error: any) {
          console.log(`   ✗ Error: ${error.message}`);
          const toolResult = traceToolResult(anthropic, block, undefined, error.message);
          toolResults.push(toolResult);
        }
      }
    }

    // Continue conversation if there were tool calls
    if (toolResults.length > 0) {
      console.log('\n🤖 Getting final response...\n');

      const finalResponse = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          ...messages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ],
      });

      for (const block of finalResponse.content) {
        if (block.type === 'text') {
          console.log('📝 Final answer:');
          console.log(block.text);
        }
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    anthropic.hermesClient.endSession();
    console.log('\n✅ Session ended. Check Hermes Debugger for the trace.');
  }
}

main().catch(console.error);
