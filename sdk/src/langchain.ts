/**
 * LangChain Integration for Hermes SDK
 *
 * Provides a callback handler that automatically sends debug information.
 *
 * @example
 * ```typescript
 * import { HermesCallbackHandler } from '@hermes/agent-sdk/langchain';
 * import { ChatOpenAI } from '@langchain/openai';
 *
 * const hermesHandler = new HermesCallbackHandler({
 *   agentName: 'My LangChain Agent'
 * });
 *
 * const model = new ChatOpenAI({
 *   callbacks: [hermesHandler]
 * });
 *
 * await model.invoke('Hello!');
 * ```
 */

import { Hermes, HermesConfig } from './index';

// Simplified LangChain callback types
interface LLMStartEvent {
  prompts?: string[][];
}

interface LLMEndEvent {
  outputs?: Array<{
    generations?: Array<Array<{ text?: string }>>;
  }>;
  llmOutput?: {
    tokenUsage?: {
      promptTokens?: number;
      completionTokens?: number;
    };
    modelId?: string;
  };
}

interface LLMErrorEvent {
  error?: Error;
}

interface ToolStartEvent {
  serialized?: { name?: string };
  toolInput?: unknown;
}

interface ToolEndEvent {
  output?: unknown;
}

interface ToolErrorEvent {
  error?: Error;
}

interface ChainStartEvent {
  serialized?: { name?: string };
}

interface ChainEndEvent {
  outputs?: unknown;
}

/**
 * Hermes LangChain Callback Handler
 *
 * A simple callback handler that traces LangChain execution.
 */
export class HermesCallbackHandler {
  name = 'hermes_callback_handler';
  private hermes: Hermes;
  private toolStartTimes: Map<string, number> = new Map();

  constructor(config: HermesConfig) {
    this.hermes = new Hermes(config);
    this.hermes.connect().catch(console.error);
  }

  // ===== LLM Callbacks =====

  handleLLMStart(event: LLMStartEvent): void {
    const prompts = event.prompts?.flat().join('\n') || '';
    this.hermes.sendThought({
      content: `LLM Call: ${prompts.slice(0, 100)}...`,
      type: 'reasoning',
    });
  }

  handleLLMEnd(event: LLMEndEvent): void {
    const output = event.outputs?.[0]?.generations?.[0]?.[0]?.text || '';
    this.hermes.sendThought({
      content: output.slice(0, 500),
      type: 'reasoning',
    });

    const tokenUsage = event.llmOutput?.tokenUsage;
    if (tokenUsage) {
      this.hermes.sendTokenUsage({
        inputTokens: tokenUsage.promptTokens || 0,
        outputTokens: tokenUsage.completionTokens || 0,
        model: event.llmOutput?.modelId || 'unknown',
      });
    }
  }

  handleLLMError(event: LLMErrorEvent): void {
    this.hermes.sendThought({
      content: `LLM Error: ${event.error?.message || 'Unknown error'}`,
      type: 'reflection',
    });
  }

  // ===== Chain Callbacks =====

  handleChainStart(event: ChainStartEvent): void {
    const chainName = event.serialized?.name || 'Chain';
    this.hermes.sendThought({
      content: `Starting chain: ${chainName}`,
      type: 'planning',
    });
  }

  handleChainEnd(event: ChainEndEvent): void {
    const output = typeof event.outputs === 'string'
      ? event.outputs
      : JSON.stringify(event.outputs);
    this.hermes.sendThought({
      content: `Chain output: ${output.slice(0, 200)}`,
      type: 'reasoning',
    });
  }

  // ===== Tool Callbacks =====

  handleToolStart(event: ToolStartEvent): string {
    const toolName = event.serialized?.name || 'unknown_tool';
    const toolId = this.hermes.startToolCall({
      toolName,
      params: (event.toolInput as Record<string, any>) || {},
    });
    this.toolStartTimes.set(toolId, Date.now());
    return toolId;
  }

  handleToolEnd(event: ToolEndEvent, toolId: string): void {
    const startTime = this.toolStartTimes.get(toolId);
    const duration = startTime ? Date.now() - startTime : undefined;

    this.hermes.endToolCall(toolId, {
      result: event.output,
      status: 'success',
      duration,
    });
    this.toolStartTimes.delete(toolId);
  }

  handleToolError(event: ToolErrorEvent, toolId: string): void {
    const startTime = this.toolStartTimes.get(toolId);
    const duration = startTime ? Date.now() - startTime : undefined;

    this.hermes.endToolCall(toolId, {
      error: event.error?.message || 'Unknown error',
      status: 'error',
      duration,
    });
    this.toolStartTimes.delete(toolId);
  }

  // ===== Utility =====

  disconnect(): void {
    this.hermes.disconnect();
  }

  getHermes(): Hermes {
    return this.hermes;
  }
}

/**
 * Create a Hermes callback handler for LangChain
 */
export function createHermesHandler(config: HermesConfig): HermesCallbackHandler {
  return new HermesCallbackHandler(config);
}

export default HermesCallbackHandler;
