/**
 * Simple test script for Hermes SDK
 *
 * Run: npx ts-node sdk/test.ts
 */

import { Hermes } from './src/index';

async function main() {
  console.log('🧪 Testing Hermes SDK...\n');

  const hermes = new Hermes({
    agentName: 'Test Agent',
    serverUrl: 'ws://localhost:8765',
    debug: true,
  });

  try {
    console.log('1. Connecting to Hermes Debugger...');
    await hermes.connect();
    console.log('   ✓ Connected\n');

    console.log('2. Starting session...');
    hermes.startSession();
    console.log('   ✓ Session started\n');

    console.log('3. Sending thoughts...');
    hermes.sendThought({
      content: 'Analyzing user request: What is the weather in Tokyo?',
      type: 'reasoning',
    });

    await delay(500);

    hermes.sendThought({
      content: 'Planning: Need to call weather API for Tokyo',
      type: 'planning',
    });

    await delay(500);

    hermes.sendThought({
      content: 'Executing tool call to get weather data',
      type: 'reasoning',
    });

    console.log('   ✓ Thoughts sent\n');

    console.log('4. Tracking tool call...');
    const toolId = hermes.startToolCall({
      toolName: 'get_weather',
      params: { location: 'Tokyo, Japan' },
    });

    await delay(1000); // Simulate API call

    hermes.endToolCall(toolId, {
      result: {
        location: 'Tokyo, Japan',
        temperature: 22,
        condition: 'sunny',
        humidity: 65,
      },
      status: 'success',
      duration: 1000,
    });

    console.log('   ✓ Tool call tracked\n');

    console.log('5. Sending token usage...');
    hermes.sendTokenUsage({
      inputTokens: 150,
      outputTokens: 80,
      model: 'gpt-4',
    });
    console.log('   ✓ Token usage sent\n');

    console.log('6. Sending final thought...');
    hermes.sendThought({
      content: 'Task completed successfully. Weather in Tokyo is sunny, 22°C.',
      type: 'reflection',
    });
    console.log('   ✓ Final thought sent\n');

    console.log('7. Ending session...');
    hermes.endSession();
    console.log('   ✓ Session ended\n');

    console.log('✅ All tests passed! Check Hermes Debugger to see the trace.');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.log('\nMake sure Hermes Debugger is running (npm run electron:dev)');
  } finally {
    hermes.disconnect();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
