import { randomUUID } from "crypto";
import type {
  Entity,
  EntityContent,
  EntityMetadata,
  EntityType,
  LoadingStrategy,
  Verbosity,
} from "./types.js";

// =============================================================================
// Entity Creation
// =============================================================================

/**
 * Options for creating an entity.
 */
export interface CreateEntityOptions {
  /** Full content (required) */
  content: string;
  /** Entity type */
  type: EntityType;
  /** Summary content (optional) */
  summary?: string;
  /** Digest content (optional) */
  digest?: string;
  /** Loading strategy (default: dynamic) */
  loading?: LoadingStrategy;
  /** Whether content is static (default: based on type) */
  static?: boolean;
  /** Priority for loading (default: 0) */
  priority?: number;
  /** Role for message conversion */
  role?: "user" | "assistant" | "system";
  /** Custom ID (optional, will generate UUID if not provided) */
  id?: string;
}

/**
 * Create a new entity.
 */
export function createEntity(options: CreateEntityOptions): Entity {
  const {
    content,
    type,
    summary,
    digest,
    loading = "dynamic",
    priority = 0,
    role,
    id = randomUUID(),
  } = options;

  // Determine if static based on type if not explicitly provided
  const isStatic = options.static ?? isStaticType(type);

  // Determine role based on type if not provided
  const entityRole = role ?? getRoleForType(type);

  const entityContent: EntityContent = {
    full: content,
    summary,
    digest,
  };

  const metadata: EntityMetadata = {
    type,
    loading,
    static: isStatic,
    priority,
    role: entityRole,
    createdAt: Date.now(),
  };

  return {
    id,
    content: entityContent,
    metadata,
  };
}

/**
 * Determine if an entity type is static by default.
 */
function isStaticType(type: EntityType): boolean {
  switch (type) {
    case "system_prompt":
    case "tool_description":
    case "skill":
      return true;
    case "memory":
    case "user_input":
    case "tool_result":
    case "assistant_message":
    case "reasoning":
      return false;
    default:
      return false;
  }
}

/**
 * Get the message role for an entity type.
 */
function getRoleForType(type: EntityType): "user" | "assistant" | "system" {
  switch (type) {
    case "system_prompt":
      return "system";
    case "user_input":
      return "user";
    case "assistant_message":
    case "reasoning":
      return "assistant";
    case "tool_result":
      return "user"; // Tool results are typically sent as user messages
    default:
      return "system";
  }
}

// =============================================================================
// Entity Content Access
// =============================================================================

/**
 * Get entity content at a specific verbosity level.
 * Falls back to more detailed levels if requested level is not available.
 */
export function getEntityContent(entity: Entity, verbosity: Verbosity): string {
  switch (verbosity) {
    case "reference":
      return `[Entity: ${entity.id}]`;
    case "digest":
      return entity.content.digest ?? entity.content.summary ?? entity.content.full;
    case "summary":
      return entity.content.summary ?? entity.content.full;
    case "full":
    default:
      return entity.content.full;
  }
}

/**
 * Estimate token count for entity content.
 * Uses a simple heuristic: ~4 characters per token.
 */
export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

/**
 * Estimate tokens for an entity at a given verbosity.
 */
export function estimateEntityTokens(entity: Entity, verbosity: Verbosity): number {
  const content = getEntityContent(entity, verbosity);
  return estimateTokens(content);
}

// =============================================================================
// Convenience Creators
// =============================================================================

/**
 * Create a system prompt entity.
 */
export function createSystemPrompt(content: string): Entity {
  return createEntity({
    content,
    type: "system_prompt",
    loading: "preloaded",
    priority: 100,
    role: "system",
  });
}

/**
 * Create a user input entity.
 */
export function createUserInput(content: string): Entity {
  return createEntity({
    content,
    type: "user_input",
    loading: "dynamic",
    role: "user",
  });
}

/**
 * Create an assistant message entity.
 */
export function createAssistantMessage(content: string): Entity {
  return createEntity({
    content,
    type: "assistant_message",
    loading: "dynamic",
    role: "assistant",
  });
}

/**
 * Create a tool result entity.
 */
export function createToolResult(
  toolName: string,
  toolCallId: string,
  result: unknown,
  options?: { summary?: string; digest?: string }
): Entity {
  const content = typeof result === "string" ? result : JSON.stringify(result, null, 2);

  return createEntity({
    content,
    type: "tool_result",
    loading: "dynamic",
    summary: options?.summary,
    digest: options?.digest,
    id: `tool-result-${toolCallId}`,
  });
}

/**
 * Create a tool description entity.
 */
export function createToolDescription(
  name: string,
  description: string,
  parameters: Record<string, unknown>
): Entity {
  const fullContent = `Tool: ${name}
Description: ${description}
Parameters: ${JSON.stringify(parameters, null, 2)}`;

  const summaryContent = `${name}: ${description}`;

  return createEntity({
    content: fullContent,
    type: "tool_description",
    loading: "preloaded",
    summary: summaryContent,
    priority: 50,
  });
}
