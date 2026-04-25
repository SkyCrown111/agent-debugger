# @hermes/agent-sdk

A lightweight SDK for integrating AI Agents with [Hermes Debugger](https://github.com/hermes/agent-debugger).

## Why Hermes SDK?

When building AI Agents, debugging is hard. You can't see:
- What the agent is thinking
- Which tools it's calling and with what parameters
- How many tokens are being consumed
- Where errors occur

Hermes SDK automatically captures all this information and sends it to Hermes Debugger for visualization.

## Installation

```bash
npm install @hermes/agent-sdk
# or
yarn add @hermes/agent-sdk
# or
pnpm add @hermes/agent-sdk
```

## Quick Start

### 1. Start Hermes Debugger

```bash
# Clone and run Hermes Debugger
git clone https://github.com/hermes/agent-debugger
cd agent-debugger
npm install
npm run electron:dev
```

### 2. Integrate SDK

#### With OpenAI

```typescript
import { Hermes } from '@hermes/agent-sdk';
import { traceChatCompletion } from '@hermes/agent-sdk/openai';
import OpenAI from 'openai';

// Initialize
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const hermes = new Hermes({ agentName: 'My GPT Agent' });

await hermes.connect();

// Trace a completion
const response = await traceChatCompletion(hermes, openai, {
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Token usage, thoughts, and tool calls are automatically sent to debugger
```

#### With Anthropic (Claude)

```typescript
import { Hermes } from '@hermes/agent-sdk';
import { traceAnthropicMessage, createToolResult } from '@hermes/agent-sdk/anthropic';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const hermes = new Hermes({ agentName: 'My Claude Agent' });

await hermes.connect();

const response = await traceAnthropicMessage(hermes, anthropic, {
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Handle tool calls
for (const block of response.content) {
  if (block.type === 'tool_use') {
    const result = await executeTool(block.name, block.input);
    const toolResult = createToolResult(block.id, result);
    // Continue conversation with tool result...
  }
}
```

#### With LangChain

```typescript
import { HermesCallbackHandler } from '@hermes/agent-sdk/langchain';
import { ChatOpenAI } from '@langchain/openai';

const hermesHandler = new HermesCallbackHandler({
  agentName: 'My LangChain Agent'
});

const model = new ChatOpenAI({
  callbacks: [hermesHandler]
});

// All execution is automatically traced
await model.invoke('Hello!');
```

#### Manual Integration

For custom agents or other frameworks:

```typescript
import { Hermes } from '@hermes/agent-sdk';

const hermes = new Hermes({
  agentName: 'Custom Agent',
  serverUrl: 'ws://localhost:8765'
});

await hermes.connect();

// Send thoughts
hermes.sendThought({
  content: 'Analyzing user request...',
  type: 'reasoning'
});

// Track tool calls
const toolId = hermes.startToolCall({
  toolName: 'web_search',
  params: { query: 'AI news' }
});

try {
  const result = await searchWeb('AI news');
  hermes.endToolCall(toolId, {
    result,
    status: 'success'
  });
} catch (error) {
  hermes.endToolCall(toolId, {
    error: error.message,
    status: 'error'
  });
}

// Send token usage
hermes.sendTokenUsage({
  inputTokens: 100,
  outputTokens: 50,
  model: 'gpt-4'
});

// Cleanup
hermes.disconnect();
```

## API Reference

### Hermes Class

```typescript
const hermes = new Hermes({
  agentName: string,      // Required: Name displayed in debugger
  serverUrl?: string,     // Default: 'ws://localhost:8765'
  agentId?: string,       // Auto-generated if not provided
  metadata?: object,      // Additional agent metadata
  autoReconnect?: boolean,// Default: true
  debug?: boolean         // Enable console logging
});
```

#### Methods

| Method | Description |
|--------|-------------|
| `connect()` | Connect to Hermes Debugger |
| `disconnect()` | Disconnect from debugger |
| `sendThought(payload)` | Send a thought/reasoning step |
| `startToolCall(payload)` | Start tracking a tool call, returns ID |
| `endToolCall(id, payload)` | End tool call with result |
| `sendTokenUsage(payload)` | Report token consumption |
| `startSession(payload?)` | Start a debug session |
| `endSession()` | End the current session |

### Thought Types

- `reasoning` - Agent's reasoning process
- `planning` - Planning/decision making
- `reflection` - Self-reflection/evaluation

### OpenAI Integration

```typescript
import { traceChatCompletion, createOpenAITracer } from '@hermes/agent-sdk/openai';

// Function-based
const response = await traceChatCompletion(hermes, openai, params);

// Or create a tracer
const tracer = createOpenAITracer(hermes, openai);
await tracer.chat.completions.create(params);
```

### Anthropic Integration

```typescript
import {
  traceAnthropicMessage,
  createToolResult,
  createAnthropicTracer
} from '@hermes/agent-sdk/anthropic';

// Function-based
const response = await traceAnthropicMessage(hermes, anthropic, params);

// Create tool result for continuing conversation
const toolResult = createToolResult(toolUseId, result, error?);
```

### LangChain Integration

```typescript
import { HermesCallbackHandler } from '@hermes/agent-sdk/langchain';

const handler = new HermesCallbackHandler({
  agentName: 'LangChain Agent'
});

// Use with any LangChain component
const model = new ChatOpenAI({ callbacks: [handler] });
```

## Data Flow

```
┌─────────────┐     WebSocket      ┌──────────────────┐
│   Your      │ ──────────────────>│   Hermes         │
│   Agent     │   Messages         │   Debugger       │
│  (SDK)      │                    │   (Desktop)      │
└─────────────┘                    └──────────────────┘
      │
      ├─ sendThought()
      ├─ startToolCall()
      ├─ endToolCall()
      └─ sendTokenUsage()
```

## Message Protocol

The SDK sends messages in this format:

```typescript
{
  type: 'thought' | 'tool_call' | 'tool_result' | 'token_usage',
  payload: {
    id: string,
    agentId: string,
    timestamp: string,
    // ... type-specific fields
  }
}
```

## License

MIT
