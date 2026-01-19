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
   *   2. REASON: LLM processes and generates action
   *   3. EXECUTE: Run tool in world
   *   4. If no tool call, return response
   */
  async chat(userInput: string): Promise<ChatResult> {
    this.log(`\n--- New turn ---`);
    this.log(`User: ${userInput}`);

    const toolCallsMade: ChatResult["toolCalls"] = [];

    // Create user input entity
    let entity: Entity | null = createUserInput(userInput);

    // Agent loop: process until we get a response (no tool call)
    while (true) {
      // LOAD PHASE
      this.ctx = this.harness.load(this.ctx, entity, this.availableEntities);
      entity = null; // Clear for next iteration

      // REASONING PHASE
      this.log("Invoking LLM...");
      const llmResponse = await invokeLLM(this.ctx, this.tools, this.llmConfig);

      this.log(`LLM text: ${llmResponse.text.slice(0, 100)}...`);
      this.log(`Tool calls: ${llmResponse.toolCalls.length}`);

      // If no tool calls, just a text response - we're done
      if (llmResponse.toolCalls.length === 0) {
        this.log("No tool calls, returning response");
        // Add the text response to context
        if (llmResponse.text) {
          const assistantEntity = createAssistantMessage(llmResponse.text);
          this.ctx = appendEntity(this.ctx, assistantEntity);
        }
        return {
          response: llmResponse.text,
          toolCalls: toolCallsMade,
        };
      }

      // If there are tool calls, create an assistant_with_tools entity
      const assistantWithToolsEntity = createEntity({
        content: llmResponse.text || "Calling tools...",
        type: "assistant_with_tools",
        role: "assistant",
      });
      // Add the tool calls as structured data
      assistantWithToolsEntity.data = {
        toolCalls: llmResponse.toolCalls.map((tc) => ({
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          args: tc.args,
        })),
      };
      this.ctx = appendEntity(this.ctx, assistantWithToolsEntity);

      // EXECUTION PHASE - process all tool calls and collect results
      const toolResults: Entity[] = [];
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

        // Update world and collect result
        this.world = result.world;
        toolResults.push(result.entity);

        // Track the tool call
        toolCallsMade.push({
          tool: toolCall.toolName,
          args: toolCall.args,
          result: result.entity.content.full,
        });

        this.log(`Tool result: ${result.entity.content.full.slice(0, 100)}...`);
      }

      // Add all tool results to context at once
      for (const resultEntity of toolResults) {
        this.ctx = appendEntity(this.ctx, resultEntity);
      }

      // Clear entity so load doesn't try to add it again
      entity = null;

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
