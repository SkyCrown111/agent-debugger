/**
 * OpenAI Agent Example with Hermes SDK
 *
 * Run: npx ts-node examples/openai-example.ts
 */

import { HermesOpenAI, traceToolResult } from '../sdk/src/openai';

// Mock tools for demonstration
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_weather',
      description: 'Get the current weather in a location',
      parameters: {
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
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_web',
      description: 'Search the web for information',
      parameters: {
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
  },
];

// Mock tool implementations
async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));

  switch (name) {
    case 'get_weather':
      return {
        location: args.location,
        temperature: Math.round(15 + Math.random() * 20),
        condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
        humidity: Math.round(40 + Math.random() * 40),
      };

    case 'search_web':
      return {
        query: args.query,
        results: [
          { title: `Result 1 for "${args.query}"`, url: 'https://example.com/1' },
          { title: `Result 2 for "${args.query}"`, url: 'https://example.com/2' },
          { title: `Result 3 for "${args.query}"`, url: 'https://example.com/3' },
        ],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function main() {
  console.log('🚀 Starting OpenAI Agent with Hermes SDK...\n');

  // Initialize Hermes-wrapped OpenAI client
  const openai = new HermesOpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-demo',
    hermes: {
      agentName: 'Weather Assistant',
      debug: true,
    },
  });

  // Start a debug session
  openai.hermesClient.startSession();
  console.log('📡 Connected to Hermes Debugger\n');

  const messages: Array<{ role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string }> = [
    { role: 'user', content: "What's the weather like in Tokyo and Paris?" },
  ];

  try {
    // First call - agent decides which tools to use
    console.log('🤖 Asking agent...\n');
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages as any,
      tools,
      tool_choice: 'auto',
    });

    const assistantMessage = response.choices[0].message;
    messages.push({
      role: 'assistant',
      content: assistantMessage.content,
      tool_calls: assistantMessage.tool_calls as any,
    });

    // Process tool calls
    if (assistantMessage.tool_calls) {
      console.log(`🔧 Agent wants to call ${assistantMessage.tool_calls.length} tools:\n`);

      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`   - ${toolCall.function.name}(${JSON.stringify(args)})`);

        try {
          const result = await executeTool(toolCall.function.name, args);
          console.log(`     ✓ Result: ${JSON.stringify(result)}`);

          // Trace the tool result
          traceToolResult(openai, toolCall, result);

          // Add tool result to messages
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        } catch (error: any) {
          console.log(`     ✗ Error: ${error.message}`);
          traceToolResult(openai, toolCall, undefined, error.message);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: error.message }),
          });
        }
      }

      // Get final response
      console.log('\n🤖 Getting final response...\n');
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages as any,
      });

      console.log('📝 Final answer:');
      console.log(finalResponse.choices[0].message.content);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    // End session
    openai.hermesClient.endSession();
    console.log('\n✅ Session ended. Check Hermes Debugger for the trace.');
  }
}

main().catch(console.error);
