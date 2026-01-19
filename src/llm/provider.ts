import { generateText, tool as createTool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { CoreMessage, CoreTool } from "ai";
import type { Context, LLMResponse, Tool } from "../core/types.js";
import { contextToMessages } from "../core/context.js";

// =============================================================================
// LLM Provider Configuration
// =============================================================================

export interface LLMConfig {
  /** Model identifier (default: claude-3-5-sonnet-20241022) */
  model?: string;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Temperature for sampling */
  temperature?: number;
}

const DEFAULT_CONFIG: Required<LLMConfig> = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
  temperature: 0,
};

// =============================================================================
// LLM Invocation
// =============================================================================

/**
 * Invoke the LLM with context and tools.
 *
 * This is the core LLM function: Context → (Reasoning, Actions)
 *
 * @param ctx - Current context containing all entities
 * @param tools - Available tools the LLM can call
 * @param config - LLM configuration options
 * @returns LLM response with text and any tool calls
 */
export async function invokeLLM(
  ctx: Context,
  tools: Tool[],
  config?: LLMConfig
): Promise<LLMResponse> {
  const { model, maxTokens, temperature } = { ...DEFAULT_CONFIG, ...config };

  // Convert context to messages
  const messages = contextToMessages(ctx);

  // Convert tools to Vercel AI SDK format
  const aiTools = toolsToAITools(tools);

  // Call the LLM
  const result = await generateText({
    model: anthropic(model),
    messages,
    tools: aiTools,
    maxTokens,
    temperature,
  });

  // Extract tool calls
  const toolCalls = result.toolCalls.map((tc) => ({
    toolCallId: tc.toolCallId,
    toolName: tc.toolName,
    args: tc.args as Record<string, unknown>,
  }));

  return {
    text: result.text,
    toolCalls,
  };
}

/**
 * Convert our Tool definitions to Vercel AI SDK format.
 */
function toolsToAITools(tools: Tool[]): Record<string, CoreTool> {
  const aiTools: Record<string, CoreTool> = {};

  for (const tool of tools) {
    aiTools[tool.name] = createTool({
      description: tool.description,
      parameters: tool.parameters,
    });
  }

  return aiTools;
}

// =============================================================================
// Streaming Support (for future use)
// =============================================================================

/**
 * Stream LLM response (for future streaming support).
 */
export async function* streamLLM(
  ctx: Context,
  tools: Tool[],
  config?: LLMConfig
): AsyncGenerator<{ type: "text" | "tool_call"; content: string }, void, unknown> {
  // For now, just wrap the non-streaming version
  const response = await invokeLLM(ctx, tools, config);

  if (response.text) {
    yield { type: "text", content: response.text };
  }

  for (const toolCall of response.toolCalls) {
    yield {
      type: "tool_call",
      content: JSON.stringify(toolCall),
    };
  }
}

// =============================================================================
// Message Helpers
// =============================================================================

/**
 * Create a simple user message for testing.
 */
export function createUserMessage(content: string): CoreMessage {
  return {
    role: "user",
    content,
  };
}

/**
 * Create a simple assistant message for testing.
 */
export function createAssistantMessage(content: string): CoreMessage {
  return {
    role: "assistant",
    content,
  };
}
