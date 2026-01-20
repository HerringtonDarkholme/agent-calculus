import type {
  AgentConfig,
  ChatResult,
  Context,
  Entity,
  Harness,
  Tool,
  World,
} from "./types.js";
import { BuiltInEntityTypes } from "./types.js";
import { createContext } from "./context.js";
import { createHarness } from "./harness.js";
import { createWorld } from "./world.js";
import { createSystemPrompt, createEntity } from "./entity.js";
import { type LLMConfig } from "../llm/provider.js";
import { runAgentLoop } from "./agent-loop.js";

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
        type: BuiltInEntityTypes.TOOL_DESCRIPTION,
        loading: "preloaded",
        summary: `${tool.name}: ${tool.description.slice(0, 50)}...`,
      })
    );

    // Store available entities
    this.availableEntities = [systemPromptEntity, ...toolEntities];

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
   * Initialize the agent by loading preloaded entities.
   * Must be called before chat().
   */
  async initialize(): Promise<void> {
    this.ctx = await this.harness.load(this.ctx, null, this.availableEntities);
    this.log("Agent context initialized");
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

    // Run the agent loop
    const result = await runAgentLoop({
      context: this.ctx,
      world: this.world,
      harness: this.harness,
      tools: this.tools,
      availableEntities: this.availableEntities,
      llmConfig: this.llmConfig,
      userInput,
      debug: this.debug,
    });

    // Update agent state with results
    this.ctx = result.context;
    this.world = result.world;

    return {
      response: result.response,
      toolCalls: result.toolCalls,
    };
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
  async reset(): Promise<void> {
    this.ctx = createContext(this.ctx.maxTokens);
    this.ctx = await this.harness.load(this.ctx, null, this.availableEntities);
    this.log("Agent context reset");
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new agent with the given configuration.
 */
export async function createAgent(config: AgentConfig & { debug?: boolean }): Promise<Agent> {
  const agent = new Agent(config);
  await agent.initialize();
  return agent;
}
