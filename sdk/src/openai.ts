/**
 * OpenAI Integration for Hermes SDK
 *
 * Provides a simple wrapper to trace OpenAI API calls.
 *
 * @example
 * ```typescript
 * import { traceOpenAI } from '@hermes/agent-sdk/openai';
 * import OpenAI from 'openai';
 *
 * const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 * const hermes = new Hermes({ agentName: 'My GPT Agent' });
 *
 * // Trace a completion
 * const response = await traceOpenAI(hermes, openai, {
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 */

import type { Hermes } from './index';
import type OpenAI from 'openai';

export interface TraceOpenAIOptions {
  /** Model name for token tracking */
  model?: string;
  /** Extract reasoning from response */
  extractReasoning?: boolean;
}

/**
 * Trace an OpenAI chat completion
 */
export async function traceChatCompletion(
  hermes: Hermes,
  openai: OpenAI,
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
  options: TraceOpenAIOptions = {}
): Promise<OpenAI.Chat.ChatCompletion> {
  const startTime = Date.now();
  const model = params.model || options.model || 'gpt-4';

  // Send reasoning thought before API call
  const userMessage = params.messages
    .filter((m) => m.role === 'user')
    .map((m) => (typeof m.content === 'string' ? m.content : '[multimodal]'))
    .join('\n');

  hermes.sendThought({
    content: `Processing request: ${userMessage.slice(0, 100)}...`,
    type: 'reasoning',
  });

  try {
    const response = await openai.chat.completions.create(params);
    const duration = Date.now() - startTime;

    const choice = response.choices[0];

    // Extract and send the assistant's response
    if (choice.message?.content && options.extractReasoning !== false) {
      hermes.sendThought({
        content: choice.message.content.slice(0, 500),
        type: 'reasoning',
        duration,
      });
    }

    // Track tool calls in response
    if (choice.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        if (tc.type === 'function') {
          hermes.startToolCall({
            toolName: tc.function.name,
            params: JSON.parse(tc.function.arguments),
          });
        }
      }
    }

    // Send token usage
    if (response.usage) {
      hermes.sendTokenUsage({
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        model,
      });
    }

    return response;
  } catch (error: any) {
    hermes.sendThought({
      content: `Error: ${error.message}`,
      type: 'reflection',
    });
    throw error;
  }
}

/**
 * Trace a tool call result
 */
export function traceToolResult(
  hermes: Hermes,
  toolName: string,
  toolCallId: string,
  result: any,
  error?: string,
  duration?: number
): void {
  hermes.endToolCall(toolCallId, {
    result,
    error,
    status: error ? 'error' : 'success',
    duration,
  });
}

/**
 * Create an OpenAI tracer bound to a Hermes instance
 */
export function createOpenAITracer(hermes: Hermes, openai: OpenAI) {
  return {
    chat: {
      completions: {
        create: (
          params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
          options?: TraceOpenAIOptions
        ) => traceChatCompletion(hermes, openai, params, options),
      },
    },
  };
}

export default { traceChatCompletion, traceToolResult, createOpenAITracer };
