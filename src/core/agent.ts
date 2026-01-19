import type {
  AgentConfig,
  ChatResult,
  Context,
  Entity,
  Harness,
  Tool,
  ToolCallAction,
  World,
} from "./types.js";
import { createContext, appendEntity, contextToMessages } from "./context.js";
import { createHarness } from "./harness.js";
import { createWorld } from "./world.js";
import {
  createSystemPrompt,
  createUserInput,
  createAssistantMessage,
  createEntity,
} from "./entity.js";
import { invokeLLM, type LLMConfig } from "../llm/provider.js";

// =============================================================================
// Agent Implementation
// =============================================================================

/**
 * Agent = LLM + Harness
 *
 * The Agent class implements the agent loop:
 * 1. Load entities into context
 * 2. Invoke LLM for reasoning and actions
 * 3. Execute actions in the world
 * 4. Repeat until response (no tool call)
 */
export class Agent {
  private ctx: Context;
  private world: World;
  private harness: Harness;
  private tools: Tool[];
  private availableEntities: Entity[];
  private llmConfig: LLMConfig;
  private debug: boolean;

  constructor(config: AgentConfig & { debug?: boolean }) {
    this.debug = config.debug ?? false;
    this.tools = config.tools;
    this.llmConfig = config.model ? { model: config.model } : {};

    // Initialize context
    this.ctx = createContext(config.maxTokens);

    // Initialize world with file system access
    this.world = createWorld(config.workingDirectory);

    // Initialize harness
    this.harness = createHarness({ debug: this.debug });

    // Create system prompt entity
    const systemPromptEntity = createSystemPrompt(config.systemPrompt);

    // Create tool description entities
    const toolEntities = this.tools.map((tool) =>
      createEntity({
        content: `Tool: ${tool.name}\nDescription: ${tool.description}`,
        type: "tool_description",
        loading: "preloaded",
        summary: `${tool.name}: ${tool.description.slice(0, 50)}...`,
      })
    );

    // Store available entities
    this.availableEntities = [systemPromptEntity, ...toolEntities];

    // Load preloaded entities into context
    this.ctx = this.harness.load(this.ctx, null, this.availableEntities);

    this.log("Agent initialized");
    this.log(`  Working directory: ${config.workingDirectory}`);
    this.log(`  Tools: ${this.tools.map((t) => t.name).join(", ")}`);
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log("[Agent]", ...args);
    }
  }

  /**
   * Process a single user turn.
   *
   * This implements the core agent loop:
   * while (true):
   *   1. LOAD: Pack entities into context
   *   2. REASON: LLM processes and generates actions
   *   3. EXECUTE: Run tools in world
   *   4. If no tool call, return response
   */
  async chat(userInput: string): Promise<ChatResult> {
    this.log(`\n--- New turn ---`);
    this.log(`User: ${userInput}`);

    const toolCallsMade: ChatResult["toolCalls"] = [];

    // Add user message to context
    this.ctx = {
      ...this.ctx,
      messages: [
        ...this.ctx.messages,
        { role: "user", content: userInput },
      ],
    };

    // Create user input entity (for tracking/memory)
    const userEntity = createUserInput(userInput);
    this.ctx = this.harness.load(this.ctx, userEntity, this.availableEntities);

    // Agent loop: process until we get a response (no tool call)
    while (true) {
      // REASONING PHASE
      this.log("Invoking LLM...");
      const llmResponse = await invokeLLM(this.ctx, this.tools, this.llmConfig);

      this.log(`LLM text: ${llmResponse.text.slice(0, 100)}...`);
      this.log(`Tool calls: ${llmResponse.toolCalls.length}`);

      // If no tool calls, just a text response - we're done
      if (llmResponse.toolCalls.length === 0) {
        this.log("No tool calls, returning response");

        // Add assistant message to context
        this.ctx = {
          ...this.ctx,
          messages: [
            ...this.ctx.messages,
            { role: "assistant", content: llmResponse.text },
          ],
        };

        return {
          response: llmResponse.text,
          toolCalls: toolCallsMade,
        };
      }

      // LLM made tool calls - add assistant message with tool calls
      this.ctx = {
        ...this.ctx,
        messages: [
          ...this.ctx.messages,
          {
            role: "assistant",
            content: [
              { type: "text", text: llmResponse.text },
              ...llmResponse.toolCalls.map((tc) => ({
                type: "tool-call" as const,
                toolCallId: tc.toolCallId,
                toolName: tc.toolName,
                args: tc.args,
              })),
            ],
          },
        ],
      };

      // EXECUTION PHASE - execute all tool calls
      const toolResultParts = [];
      for (const toolCall of llmResponse.toolCalls) {
        this.log(`Executing tool: ${toolCall.toolName}`);

        const action: ToolCallAction = {
          type: "tool_call",
          name: toolCall.toolName,
          args: toolCall.args,
          toolCallId: toolCall.toolCallId,
        };

        // Execute the tool
        const result = await this.harness.execute(action, this.world, this.tools);

        // Update world
        this.world = result.world;

        // Collect tool result
        toolResultParts.push({
          type: "tool-result" as const,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          result: result.entity.content.full,
        });

        // Track the tool call
        toolCallsMade.push({
          tool: toolCall.toolName,
          args: toolCall.args,
          result: result.entity.content.full,
        });

        // Store result as entity (for memory/compression/context management)
        // This is separate from messages - entities are inputs, messages are API format
        this.ctx = appendEntity(this.ctx, result.entity);

        this.log(`Tool result: ${result.entity.content.full.slice(0, 100)}...`);
      }

      // Add tool results message
      this.ctx = {
        ...this.ctx,
        messages: [
          ...this.ctx.messages,
          {
            role: "tool",
            content: toolResultParts,
          },
        ],
      };

      // Continue loop to process tool results
    }
  }

  /**
   * Get current context for inspection.
   */
  getContext(): Context {
    return this.ctx;
  }

  /**
   * Get current world state.
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Reset the agent's context (keeping system prompt).
   */
  reset(): void {
    this.ctx = createContext(this.ctx.maxTokens);
    this.ctx = this.harness.load(this.ctx, null, this.availableEntities);
    this.log("Agent context reset");
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new agent with the given configuration.
 */
export function createAgent(config: AgentConfig & { debug?: boolean }): Agent {
  return new Agent(config);
}
