/**
 * Anthropic Integration for Hermes SDK
 *
 * Provides a simple wrapper to trace Anthropic/Claude API calls.
 *
 * @example
 * ```typescript
 * import { traceAnthropic } from '@hermes/agent-sdk/anthropic';
 * import Anthropic from '@anthropic-ai/sdk';
 *
 * const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 * const hermes = new Hermes({ agentName: 'My Claude Agent' });
 *
 * const response = await traceAnthropicMessage(hermes, anthropic, {
 *   model: 'claude-3-5-sonnet-20241022',
 *   max_tokens: 1024,
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 */

import type { Hermes } from './index';
import type Anthropic from '@anthropic-ai/sdk';

export interface TraceAnthropicOptions {
  /** Model name for token tracking */
  model?: string;
}

/**
 * Trace an Anthropic message creation
 */
export async function traceAnthropicMessage(
  hermes: Hermes,
  anthropic: Anthropic,
  params: Anthropic.Messages.MessageCreateParams,
  options: TraceAnthropicOptions = {}
): Promise<Anthropic.Messages.Message> {
  const startTime = Date.now();
  const model = params.model || options.model || 'claude-3-5-sonnet-20241022';

  // Send reasoning thought before API call
  const userContent = params.messages
    .filter((m) => m.role === 'user')
    .map((m) => {
      const content = m.content;
      if (typeof content === 'string') return content;
      return content
        .filter((c): c is Anthropic.TextBlockParam => c.type === 'text')
        .map((c) => c.text)
        .join('\n');
    })
    .join('\n');

  hermes.sendThought({
    content: `Processing request: ${userContent.slice(0, 100)}...`,
    type: 'reasoning',
  });

  // Track tools if provided
  if (params.tools && params.tools.length > 0) {
    hermes.sendThought({
      content: `Available tools: ${params.tools.map((t) => t.name).join(', ')}`,
      type: 'planning',
    });
  }

  try {
    const response = await anthropic.messages.create(params);
    const duration = Date.now() - startTime;

    // Handle non-streaming response only
    if ('content' in response) {
      // Process response content
      for (const block of response.content) {
        if (block.type === 'thinking') {
          hermes.sendThought({
            content: block.thinking,
            type: 'reflection',
            duration,
          });
        } else if (block.type === 'text') {
          hermes.sendThought({
            content: block.text.slice(0, 500),
            type: 'reasoning',
            duration,
          });
        } else if (block.type === 'tool_use') {
          hermes.startToolCall({
            toolName: block.name,
            params: block.input as Record<string, any>,
          });
        }
      }

      // Send token usage
      if (response.usage) {
        hermes.sendTokenUsage({
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          model,
        });
      }
    }

    return response as Anthropic.Messages.Message;
  } catch (error: any) {
    hermes.sendThought({
      content: `Error: ${error.message}`,
      type: 'reflection',
    });
    throw error;
  }
}

/**
 * Create a tool result for Anthropic
 */
export function createToolResult(
  toolUseId: string,
  result: any,
  error?: string
): Anthropic.Messages.ToolResultBlockParam {
  return {
    type: 'tool_result',
    tool_use_id: toolUseId,
    content: error || JSON.stringify(result),
    is_error: !!error,
  };
}

/**
 * End a tool call with result
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
 * Create an Anthropic tracer bound to a Hermes instance
 */
export function createAnthropicTracer(hermes: Hermes, anthropic: Anthropic) {
  return {
    messages: {
      create: (params: Anthropic.Messages.MessageCreateParams, options?: TraceAnthropicOptions) =>
        traceAnthropicMessage(hermes, anthropic, params, options),
    },
  };
}

export default { traceAnthropicMessage, createToolResult, traceToolResult, createAnthropicTracer };
