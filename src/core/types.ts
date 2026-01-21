import type { z } from "zod";
import type { CoreMessage } from "ai";

// =============================================================================
// Verbosity Levels
// =============================================================================

/**
 * Verbosity levels for entity content loading.
 *
 * - full: Complete content loaded
 * - summary: Condensed version (e.g., skill titles only)
 * - digest: Compressed representation (e.g., large tool results summarized)
 * - reference: Pointer only (content remains in world, accessed via actions)
 */
export type Verbosity = "full" | "summary" | "digest" | "reference";

// =============================================================================
// Entity Types
// =============================================================================

/**
 * Entity type can be any string - this is an open set.
 * Users can define their own entity types.
 */
export type EntityType = string;

/**
 * Built-in entity types provided by the framework.
 * Users can use these or define their own.
 */
export const BuiltInEntityTypes = {
  SYSTEM_PROMPT: "system_prompt",
  TOOL_DESCRIPTION: "tool_description",
  SKILL: "skill",
  MEMORY: "memory",
  USER_INPUT: "user_input",
  TOOL_RESULT: "tool_result",
  ASSISTANT_MESSAGE: "assistant_message",
  REASONING: "reasoning",
} as const;

export type BuiltInEntityType = (typeof BuiltInEntityTypes)[keyof typeof BuiltInEntityTypes];

/**
 * Loading strategy for entities.
 *
 * - preloaded: Always in context (system prompt, current memory)
 * - dynamic: Loaded on-demand (skills when invoked, tool results)
 */
export type LoadingStrategy = "preloaded" | "dynamic";

/**
 * Entity discovery configuration.
 * Specifies how an entity should be discovered for loading.
 */
export interface EntityDiscovery {
  /** Keywords that trigger this entity to be loaded */
  keywords?: string[];
  /** Semantic description for similarity matching */
  semantic?: string;
  /** Other entities that should be loaded together */
  dependencies?: string[];
}

/**
 * Metadata describing how an entity should be managed.
 */
export interface EntityMetadata {
  /** The type of entity */
  type: EntityType;
  /** When this entity should be loaded */
  loading: LoadingStrategy;
  /** Loading priority (higher = loaded first) */
  priority?: number;
  /** Discovery configuration */
  discovery?: EntityDiscovery;
  /** Creation timestamp */
  createdAt?: number;
  /** Role for message conversion (user, assistant, system) */
  role?: "user" | "assistant" | "system";
  /** Additional metadata (extensible for custom types like slash commands) */
  [key: string]: unknown;
}

/**
 * Content at different verbosity levels.
 * All fields are static strings.
 */
export interface EntityContent {
  /** Complete content */
  full: string;
  /** Condensed version */
  summary?: string;
  /** Highly compressed version */
  digest?: string;
}

/**
 * Entity: The fundamental unit of information in Agent Calculus.
 * Everything that can be loaded into an LLM's context is an entity.
 *
 * Content can be:
 * - Static: An EntityContent object (never changes)
 * - Dynamic: A function that computes EntityContent when accessed
 *
 * This naturally embodies the static/dynamic distinction.
 */
export interface Entity {
  /** Unique identifier */
  id: string;
  /** Content - static object or dynamic function */
  content: EntityContent | (() => EntityContent) | (() => Promise<EntityContent>);
  /** Entity metadata */
  metadata: EntityMetadata;
  /**
   * Recommend verbosity for loading this entity.
   * The harness calls this function to decide if and how to load the entity.
   *
   * @param ctx - Current context
   * @returns Recommended verbosity level, or null if entity should not be loaded
   */
  recommendVerbosity?: (ctx: Context) => Verbosity | null | Promise<Verbosity | null>;
}

// =============================================================================
// Context Types
// =============================================================================

/**
 * An entity loaded into context with its verbosity level.
 */
export interface LoadedEntity {
  entity: Entity;
  verbosity: Verbosity;
  /** Token count for this entity at this verbosity */
  tokens?: number;
}

/**
 * Context: The observable, directly accessible information within the LLM's attention window.
 */
export interface Context {
  /** Entities currently in context */
  entities: LoadedEntity[];
  /** Message history (for LLM API) */
  messages: CoreMessage[];
  /** Maximum tokens allowed */
  maxTokens: number;
  /** Current token usage */
  currentTokens: number;
}

// =============================================================================
// Action Types
// =============================================================================

/**
 * A tool call action from the LLM.
 */
export interface ToolCallAction {
  type: "tool_call";
  /** Tool name */
  name: string;
  /** Tool arguments */
  args: Record<string, unknown>;
  /** Tool call ID (from LLM) */
  toolCallId: string;
}

/**
 * A response action (no tool call).
 */
export interface ResponseAction {
  type: "response";
  /** Response content */
  content: string;
}

/**
 * Actions the LLM can request.
 */
export type Action = ToolCallAction | ResponseAction;

// =============================================================================
// Tool Types
// =============================================================================

/**
 * Tool definition: Both an entity (description) and an action (implementation).
 */
export interface Tool<TParams = unknown, TResult = unknown> {
  /** Tool name */
  name: string;
  /** Tool description for LLM */
  description: string;
  /** Zod schema for parameters */
  parameters: z.ZodSchema<TParams>;
  /** Execute the tool */
  execute: (params: TParams, world: World) => Promise<ToolExecutionResult<TResult>>;
}

/**
 * A tool with any parameter and result types.
 * Use this for arrays of mixed tools.
 */
export type AnyTool = Tool<any, unknown>;

/**
 * Result of tool execution.
 */
export interface ToolExecutionResult<TResult = unknown> {
  /** Result data */
  result: TResult;
  /** Updated world state */
  world: World;
  /** Whether execution succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

// =============================================================================
// World Types
// =============================================================================

/**
 * World: Everything outside the context that the agent might need.
 * The harness bridges the LLM to the world.
 */
export interface World {
  /** Working directory for file operations */
  workingDirectory: string;
  /** Read a file */
  readFile(path: string): Promise<string>;
  /** Write a file */
  writeFile(path: string, content: string): Promise<void>;
  /** List files in a directory */
  listFiles(path: string): Promise<string[]>;
  /** Check if a file exists */
  fileExists(path: string): Promise<boolean>;
  /** Resolve a path relative to working directory */
  resolvePath(path: string): string;
}

// =============================================================================
// Harness Types
// =============================================================================

/**
 * LLM response from invoking the model.
 */
export interface LLMResponse {
  /** The LLM's text response */
  text: string;
  /** Tool calls requested by the LLM */
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
  }>;
}

/**
 * Harness: The orchestration layer that manages entity flow.
 */
export interface Harness {
  /**
   * Load entities into context.
   *
   * @param ctx - Current context
   * @param newEntities - New entities to incorporate (e.g., user input, slash command results)
   * @param availableEntities - Pool of available entities (tools, skills, etc.)
   * @returns Updated context
   */
  load(ctx: Context, newEntities: Entity[], availableEntities: Entity[]): Promise<Context>;

  /**
   * Execute an action in the world.
   *
   * @param action - Action to execute
   * @param world - Current world state
   * @param tools - Available tools
   * @returns Result entity and updated world
   */
  execute(
    action: ToolCallAction,
    world: World,
    tools: AnyTool[]
  ): Promise<{ entity: Entity; world: World }>;
}

// =============================================================================
// Agent Types
// =============================================================================

/**
 * Agent configuration.
 */
export interface AgentConfig {
  /** System prompt for the agent */
  systemPrompt: string;
  /** Working directory for file operations */
  workingDirectory: string;
  /** Maximum tokens for context */
  maxTokens: number;
  /** Available tools */
  tools: AnyTool[];
  /** Model to use */
  model?: string;
}

/**
 * Chat result from agent.
 */
export interface ChatResult {
  /** Response text */
  response: string;
  /** Tool calls made during this turn */
  toolCalls: Array<{
    tool: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
}

// =============================================================================
// Message Conversion Types
// =============================================================================

/**
 * Convert context to messages for LLM.
 */
export type ContextToMessages = (ctx: Context) => CoreMessage[];
