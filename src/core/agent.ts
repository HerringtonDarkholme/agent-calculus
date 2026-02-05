import type {
  AgentConfig,
  ChatResult,
  Context,
  Entity,
  Harness,
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
  private tools: import("./types.js").AnyTool[];
  private availableEntities: Entity[];
  private llmConfig: LLMConfig;
  private debug: boolean;

  constructor(config: AgentConfig & { debug?: boolean; additionalEntities?: Entity[] }) {
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

    // Store available entities (including additional entities like slash commands)
    this.availableEntities = [
      systemPromptEntity,
      ...toolEntities,
      ...(config.additionalEntities ?? []),
    ];

    this.log("Agent initialized");
    this.log(`  Working directory: ${config.workingDirectory}`);
    this.log(`  Tools: ${this.tools.map((t) => t.name).join(", ")}`);
    this.log(`  Available entities: ${this.availableEntities.length}`);
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
    this.ctx = await this.harness.load(this.ctx, [], this.availableEntities);
    this.log("Agent context initialized");
  }

  /**
   * Process entities through the agent loop.
   *
   * This implements the core agent loop:
   * while (true):
   *   1. LOAD: Pack entities into context (harness filters relevant ones)
   *   2. REASON: LLM processes and generates actions
   *   3. EXECUTE: Run tools in world
   *   4. If no tool call, return response
   *
   * @param input - Either a string (converted to user input entity) or entities to process
   */
  async chat(input: string | Entity[]): Promise<ChatResult> {
    // Convert string to user input entity for backwards compatibility
    const entities = typeof input === "string"
      ? [createEntity({
          content: input,
          type: BuiltInEntityTypes.USER_INPUT,
          loading: "dynamic",
          role: "user",
          metadata: {
            contentType: "text" as const,
          },
        })]
      : input;

    this.log(`\n--- New turn ---`);
    this.log(`Processing ${entities.length} entities`);

    const result = await runAgentLoop({
      context: this.ctx,
      world: this.world,
      harness: this.harness,
      tools: this.tools,
      availableEntities: this.availableEntities,
      llmConfig: this.llmConfig,
      newEntities: entities,
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
    this.ctx = await this.harness.load(this.ctx, [], this.availableEntities);
    this.log("Agent context reset");
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new agent with the given configuration.
 */
export async function createAgent(
  config: AgentConfig & { debug?: boolean; additionalEntities?: Entity[] }
): Promise<Agent> {
  const agent = new Agent(config);
  await agent.initialize();
  return agent;
}
